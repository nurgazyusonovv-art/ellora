"use server";

import { liveAllows } from "@/lib/classroom";
import { requireRole } from "@/lib/auth";
import { computeXp, exitResult, findBlock, gradeAnswer, stageDone, type Answers, type SavedAnswer } from "@/lib/grading";
import type { Block } from "@/lib/lesson-types";
import { lessonContent } from "@/lib/student-lessons";
import { parsonsSeed, shufflePerm, studentBlock } from "@/lib/student-view";
import { createAdminClient } from "@/lib/supabase/admin";

export type Progress = {
  error?: string;
  answer?: SavedAnswer;
  /** Жооптон кийинки блоктун көрүнүшү (мисалы, чечилгенде туура жооп ачылат). */
  block?: Block;
  xp?: number;
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
  const { data: session, error: sessionError } = await supabase.from("lesson_sessions").select("max_stage, paused").eq("assignment_id", attempt.assignment_id).maybeSingle();
  // Эски база миграцияга чейин өз алдынча режимде иштейт. Башка тармак каталарында жазуу токтойт.
  if (sessionError && sessionError.code !== "PGRST205" && sessionError.code !== "42P01") return null;
  return { attempt, content: lesson.content, answers, session };
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
  if (stageIdx > attempt.current_stage) return { error: "Бул бөлүк али ачыла элек." };

  const stage = content.stages[stageIdx];
  const prev = answers[blockId];
  let raw = response ?? {};
  // Окуучу серверде аралаштырылган саптарды көрөт — анын тартибин баштапкы индекстерге которобуз.
  if (block.type === "parsons" && Array.isArray(raw.order)) {
    const perm = shufflePerm(block.lines.length, parsonsSeed(block.id, attemptId));
    raw = { order: (raw.order as unknown[]).map((k) => (Number.isInteger(k) ? perm[k as number] : k)) };
  }
  const g = gradeAnswer(block, raw, prev, stage.key === "exit");
  if ("error" in g) return { error: g.error };

  const answer: SavedAnswer = { response: g.response, is_correct: g.is_correct, tries: (prev?.tries ?? 0) + 1 };
  answers[blockId] = answer;

  let current_stage = attempt.current_stage;
  if (stageIdx === current_stage && stage.key !== "exit" && stageDone(stage, answers)) current_stage++;
  const xp = computeXp(content, answers, false);

  const admin = createAdminClient();
  const { error: e1 } = await admin.from("answers").upsert({
    attempt_id: attemptId,
    block_id: blockId,
    stage: stageIdx,
    response: answer.response,
    is_correct: answer.is_correct,
    tries: answer.tries,
    updated_at: new Date().toISOString(),
  });
  if (e1) return { error: SAVE_ERROR };
  const { error: e2 } = await admin.from("attempts").update({ xp, current_stage }).eq("id", attemptId);
  if (e2) return { error: SAVE_ERROR };

  return { answer, xp, current_stage, block: studentBlock(block, answer, stage.key === "exit", attemptId) };
}

/** Интерактивдүү блогу жок бөлүктү («Түшүндүм, улантуу») же exit ticket'ти («Билетти тапшыруу») бүтүрөт. */
export async function completeStage(attemptId: string, stageIdx: number): Promise<Progress> {
  const ctx = await load(attemptId);
  if (!ctx) return { error: "Сабак табылган жок." };
  const { attempt, content, answers } = ctx;
  if (attempt.finished_at) {
    const r = exitResult(content, answers);
    return { xp: computeXp(content, answers, true), current_stage: content.stages.length, finished: { score: r.score, total: r.total } };
  }
  if (!liveAllows(ctx.session, stageIdx)) return { error: "Мугалим бөлүктү ачканда уланта аласың." };
  if (stageIdx !== attempt.current_stage) return { error: "Бул бөлүк азыр ачык эмес." };
  const stage = content.stages[stageIdx];
  if (!stage || !stageDone(stage, answers)) return { error: "Адегенде бардык тапшырмаларды аткар." };

  const admin = createAdminClient();
  if (stage.key !== "exit") {
    const { error } = await admin.from("attempts").update({ current_stage: stageIdx + 1 }).eq("id", attemptId);
    return error ? { error: SAVE_ERROR } : { current_stage: stageIdx + 1, xp: computeXp(content, answers, false) };
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
  return { xp, current_stage: content.stages.length, finished: { score: r.score, total: r.total } };
}
