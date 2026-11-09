"use server";
import {practicalSnapshot} from "@/lib/practical-evidence";
import {missionAllows,missionChallenge,missionStudentBlock} from "@/lib/missions";

import {readLiveSession} from "@/lib/live-session";
import { liveAllows } from "@/lib/classroom";
import { requireRole } from "@/lib/auth";
import { computeXp, exitResult, findBlock, gradeAnswer, stageDone, type Answers, type SavedAnswer } from "@/lib/grading";
import type { Block } from "@/lib/lesson-types";
import { lessonContent } from "@/lib/student-lessons";
import { interactiveResponse } from "@/lib/interactive-tasks";
import { parsonsSeed, shufflePerm, studentBlock } from "@/lib/student-view";
import { createAdminClient } from "@/lib/supabase/admin";

export type Progress = {
  error?: string;
  answer?: SavedAnswer;
  /** Жооптон кийинки блоктун көрүнүшү (мисалы, чечилгенде туура жооп ачылат). */
  block?: Block;
  xp?: number;
  coinBalance?: number;
  current_stage?: number;
  finished?: { score: number; total: number };
};

/**
 * Аракетти окуучунун өз укугу менен окуйт (RLS: өз аракети, өз классынын тапшырмасы), андан кийин гана сабакты.
 * Жазуу admin клиент менен гана — окуучу answers/attempts таблицаларына түз жаза албайт (0003).
 */
async function load(attemptId: string) {
  const { supabase, profile } = await requireRole("student");
  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, assignment_id, current_stage, finished_at")
    .eq("id", attemptId)
    .eq("student_id", profile.id)
    .maybeSingle<{ id: string; assignment_id: string; current_stage: number; finished_at: string | null }>();
  if (!attempt) return null;
  const { data: assignment } = await supabase.from("assignments").select("lesson_id").eq("id", attempt.assignment_id).maybeSingle();
  const lesson = assignment ? await lessonContent(assignment.lesson_id) : null;
  if (!lesson) return null;
  const { data: rows } = await supabase.from("answers").select("block_id, response, is_correct, tries").eq("attempt_id", attemptId);
  const answers: Answers = {};
  for (const r of rows ?? []) answers[r.block_id] = { response: r.response ?? {}, is_correct: r.is_correct, tries: r.tries };
  let session;try{session=await readLiveSession(supabase,attempt.assignment_id);}catch{return null;}
  return { attempt, content: lesson.content, answers, session, supabase, profile };
}

async function coinBalance(ctx: NonNullable<Awaited<ReturnType<typeof load>>>) {
  const {data} = await ctx.supabase.from("coin_wallets").select("balance").eq("student_id",ctx.profile.id).maybeSingle();
  return typeof data?.balance === "number" ? {coinBalance:data.balance} : {};
}

const SAVE_ERROR = "Жооп сакталган жок. Интернетти текшерип, кайра аракет кыл.";

export async function submitAnswer(attemptId: string, blockId: string, response: Record<string, unknown>): Promise<Progress> {
  const ctx = await load(attemptId);
  if (!ctx) return { error: "Сабак табылган жок." };
  const { attempt, content, answers } = ctx;
  if (attempt.finished_at) return { error: "Сабак бүткөн, жоопторду өзгөртүүгө болбойт." };

  const found = findBlock(content, blockId);
  if (!found) return { error: "Тапшырма табылган жок." };
  const { block, stageIdx } = found;
  if (!liveAllows(ctx.session, stageIdx)) return { error: "Мугалим бөлүктү ачканда уланта аласың." };
  if (!ctx.session?.timed && stageIdx > attempt.current_stage) return { error: "Бул бөлүк али ачыла элек." };

  const stage = content.stages[stageIdx];
  const prev = answers[blockId];
  if(!missionAllows(stage,blockId,answers))return {error:"Адегенде миссиянын мурунку тапшырмасын бүтүр."};
  if(missionChallenge(stage,blockId)&&prev)return {error:"Жеке ишиң тапшырылган. Мугалимдин пикиринен кийин өзүнчө кайра иштөө мүмкүнчүлүгүн колдон."};
  let raw = response ?? {};
  // Окуучу серверде аралаштырылган саптарды көрөт — анын тартибин баштапкы индекстерге которобуз.
  if (block.type === "parsons" && Array.isArray(raw.order)) {
    const perm = shufflePerm(block.lines.length, parsonsSeed(block.id, attemptId));
    raw = { order: (raw.order as unknown[]).map((k) => (Number.isInteger(k) ? perm[k as number] : k)) };
  }
  if(block.type==="classification"||block.type==="matching"||block.type==="ordering")raw=interactiveResponse(block,raw,attemptId);
  const g = gradeAnswer(block, raw, prev, stage.key === "exit");
  if ("error" in g) return { error: g.error };

  if((block.type==="matching"||block.type==="ordering")&&!prev?.is_correct) {
    const field=block.type==="matching"?"picks":"order";
    // Окуучуга өзүнүн экрандагы тандоолору гана кайтарылат; баштапкы индекстер ачылбайт.
    g.response[field]=response[field];
  }
  if(block.type==="classification"&&!prev?.is_correct){
    g.response.groups=response.groups;
    if(Array.isArray(g.response.positions)) {
      const positions=g.response.positions,perm=shufflePerm(block.items.length,parsonsSeed(block.id,attemptId));
      g.response.positions=perm.map(i=>positions[i]);
    }
  }
  const task=practicalSnapshot(block,attemptId);if(task&&!prev?.is_correct)g.response.task=task;
  const snapshot=structuredClone(answers);
  const answer: SavedAnswer = { response: g.response, is_correct: g.is_correct, tries: (prev?.tries ?? 0) + 1 };
  answers[blockId] = answer;

  let current_stage = attempt.current_stage;
  if (stageIdx === current_stage && stage.key !== "exit" && !(content.model === "5e" && stage.key === "practice") && stageDone(stage, answers)) current_stage++;
  const xp = computeXp(content, answers, false);

  const admin = createAdminClient();
  if(ctx.session?.timed){
    const {data,error}=await admin.rpc("save_clock_answer",{p_attempt:attemptId,p_student:ctx.profile.id,p_block:blockId,p_stage:stageIdx,p_response:answer.response,p_correct:answer.is_correct,p_tries:answer.tries,p_xp:xp,p_next:current_stage,p_snapshot:snapshot});
    if(error||data!=="ok")return {error:data==="version"?"Жооптор өзгөрдү. Баракты жаңыртып кайра жөнөт.":"Бул бөлүктүн убактысы же режими өзгөрдү. Терген жообуң бул түзмөктө сакталды."};
    return {...await coinBalance(ctx),answer,xp,current_stage,block:missionStudentBlock(stage,studentBlock(block,answer,stage.key==="exit",attemptId))};
  }
  const payload={attempt_id:attemptId,block_id:blockId,stage:stageIdx,response:answer.response,is_correct:answer.is_correct,tries:answer.tries,updated_at:new Date().toISOString()};
  // Баалоодо параллелдүү эки сурам да биринчи жоопту басып кетпейт: unique ачкыч insert'ти коргойт.
  const singleSubmission=missionChallenge(stage,blockId)||stage.key==="exit"&&(block.type==="classification"||block.type==="spreadsheet"||block.type==="matching"||block.type==="ordering");
  const {error:e1}=singleSubmission?await admin.from("answers").insert(payload):await admin.from("answers").upsert(payload);
  if (e1) return { error: SAVE_ERROR };
  const { error: e2 } = await admin.from("attempts").update({ xp, current_stage }).eq("id", attemptId);
  if (e2) return { error: SAVE_ERROR };

  return { ...await coinBalance(ctx), answer, xp, current_stage, block: missionStudentBlock(stage,studentBlock(block, answer, stage.key === "exit", attemptId)) };
}

/** Интерактивдүү блогу жок бөлүктү («Түшүндүм, улантуу») же exit ticket'ти («Билетти тапшыруу») бүтүрөт. */
export async function completeStage(attemptId: string, stageIdx: number): Promise<Progress> {
  const ctx = await load(attemptId);
  if (!ctx) return { error: "Сабак табылган жок." };
  const { attempt, content, answers } = ctx;
  if (attempt.finished_at) {
    const r = exitResult(content, answers);
    return { ...await coinBalance(ctx), xp: computeXp(content, answers, true), current_stage: content.stages.length, finished: { score: r.score, total: r.total } };
  }
  if (!liveAllows(ctx.session, stageIdx)) return { error: "Мугалим бөлүктү ачканда уланта аласың." };
  if(ctx.session?.timed){
    if(stageIdx!==4)return {error:"Кийинки бөлүккө жалпы таймер же мугалим өткөрөт."};
    if(!content.stages.every(stage=>stageDone(stage,answers)))return {error:"Сабакта аяктай элек тапшырмалар бар. Мугалим менен такта."};
    const r=exitResult(content,answers);const xp=computeXp(content,answers,true);
    const {data,error}=await createAdminClient().rpc("finish_clock_attempt",{p_attempt:attemptId,p_student:ctx.profile.id,p_snapshot:answers,p_xp:xp,p_score:r.score,p_total:r.total,p_confidence:r.confidence??null});
    return error||data!=="ok"?{error:"Жалпы сабактын абалы өзгөрдү. Жоопторуң сакталган."}:{...await coinBalance(ctx),xp,current_stage:5,finished:{score:r.score,total:r.total}};
  }
  if (stageIdx !== attempt.current_stage) return { error: "Бул бөлүк азыр ачык эмес." };
  const stage = content.stages[stageIdx];
  if (!stage || !stageDone(stage, answers)) return { error: "Адегенде бардык тапшырмаларды аткар." };

  const admin = createAdminClient();
  if (stage.key !== "exit") {
    const { error } = await admin.from("attempts").update({ current_stage: stageIdx + 1 }).eq("id", attemptId);
    return error ? { error: SAVE_ERROR } : { ...await coinBalance(ctx), current_stage: stageIdx + 1, xp: computeXp(content, answers, false) };
  }

  const r = exitResult(content, answers);
  const xp = computeXp(content, answers, true);
  const { error } = await admin
    .from("attempts")
    .update({
      current_stage: content.stages.length,
      xp,
      exit_score: r.score,
      exit_total: r.total,
      confidence: r.confidence,
      finished_at: new Date().toISOString(),
    })
    .eq("id", attemptId);
  if (error) return { error: SAVE_ERROR };
  return { ...await coinBalance(ctx), xp, current_stage: content.stages.length, finished: { score: r.score, total: r.total } };
}
