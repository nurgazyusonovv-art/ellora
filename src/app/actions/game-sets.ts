"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { GAME_SETS } from "@/content/game-sets";
import { gradeQuestion, roundScore, validateQuestions, type GradeResult } from "@/lib/game-questions";
import { studentGame } from "@/lib/game-data";
import { createAdminClient } from "@/lib/supabase/admin";

export type AssignGameState = { error?: string; ok?: string } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Даяр топтомду мугалимдин өзүнө көчүрөт (бир жолу) жана тандалган класска дайындайт. */
export async function assignGameSet(_: AssignGameState, fd: FormData): Promise<AssignGameState> {
  const { supabase, profile } = await requireRole("teacher");
  const ownSetId = String(fd.get("set_id") ?? "");
  const template = GAME_SETS.find((g) => g.slug === fd.get("slug"));
  if (!template && !UUID.test(ownSetId)) return { error: "Оюн табылган жок." };
  const classId = String(fd.get("class_id") ?? "");
  if (!UUID.test(classId)) return { error: "Классты тандаңыз." };
  const due = String(fd.get("due_at") ?? "").trim();
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "Датаны туура жазыңыз." };
  if (template && validateQuestions(template.questions).length) return { error: "Оюндун суроолорун текшерүү керек." };

  const { data: cls } = await supabase.from("classes").select("id").eq("id", classId).eq("teacher_id", profile.id).maybeSingle();
  if (!cls) return { error: "Класс табылган жок." };

  let { data: set } = template
    ? await supabase.from("game_sets").select("id").eq("author_id", profile.id).eq("source", template.slug).maybeSingle()
    : await supabase.from("game_sets").select("id").eq("author_id", profile.id).eq("id", ownSetId).maybeSingle();
  if (!set && !template) return { error: "Оюн табылган жок." };
  if (!set && template) {
    const { data, error } = await supabase
      .from("game_sets")
      .insert({ author_id: profile.id, title: template.title, grade: template.grade, topic: template.description, skills: template.skills, questions: template.questions, source: template.slug })
      .select("id")
      .single();
    if (error || !data) return { error: "Оюн сакталган жок. Кайра аракет кылыңыз." };
    set = data;
  }
  if (!set) return { error: "Оюн табылган жок." };
  const { error } = await supabase.from("game_assignments").insert({ set_id: set.id, class_id: classId, due_at: due ? new Date(`${due}T23:59:00+06:00`).toISOString() : null });
  if (error) return { error: "Оюн класска жөнөтүлгөн жок. Кайра аракет кылыңыз." };
  revalidatePath("/teacher/games");
  return { ok: "Оюн класска жөнөтүлдү." };
}

export async function deleteGameAssignment(assignmentId: string) {
  const { supabase } = await requireRole("teacher");
  if (!UUID.test(assignmentId)) return;
  // RLS: мугалим өз классынын дайындамасын гана өчүрө алат.
  await supabase.from("game_assignments").delete().eq("id", assignmentId);
  revalidatePath("/teacher/games");
}

export type GameAnswerResult = { error?: string } & Partial<GradeResult>;

/** Машыгуудагы бир жооп: сервер баалайт, жазат жана туура жоопту көрсөтөт. */
export async function answerGameQuestion(assignmentId: string, roundId: string, questionId: string, response: Record<string, unknown>): Promise<GameAnswerResult> {
  const { supabase, profile } = await requireRole("student");
  if (!UUID.test(assignmentId) || !UUID.test(roundId) || typeof questionId !== "string") return { error: "Суроо табылган жок." };
  const game = await studentGame(supabase, assignmentId);
  const question = game?.set.questions.find((q) => q.id === questionId);
  if (!game || !question) return { error: "Суроо табылган жок." };
  const result = gradeQuestion(question, profile.id, response);
  if (!result) return { error: "Жооп толук эмес." };
  // Жооптун түрүнө тиешелүү талаа гана сакталат; кардардын башка маанилери эске алынбайт.
  const field = { choice: "pick", match: "picks", order: "order", sort: "groups" }[question.type];
  const { error } = await createAdminClient().from("game_answers").insert({
    assignment_id: assignmentId,
    student_id: profile.id,
    round_id: roundId,
    question_id: questionId,
    is_correct: result.correct,
    response: { [field]: response[field] },
  });
  if (error) return { error: "Жооп сакталган жок. Интернетти текшерип, кайра аракет кыл." };
  return result;
}

export type RoundResult = { error?: string; score?: number; firstTry?: number; total?: number; best?: number };

/** Раундду жабат: упайды серверде сакталган жооптордон эсептейт. Бир раунд бир гана жолу эсептелет. */
export async function finishGameRound(assignmentId: string, roundId: string): Promise<RoundResult> {
  const { supabase, profile } = await requireRole("student");
  if (!UUID.test(assignmentId) || !UUID.test(roundId)) return { error: "Оюн табылган жок." };
  const game = await studentGame(supabase, assignmentId);
  if (!game) return { error: "Оюн табылган жок." };
  const { data: rows } = await supabase
    .from("game_answers")
    .select("question_id, is_correct")
    .eq("assignment_id", assignmentId)
    .eq("student_id", profile.id)
    .eq("round_id", roundId)
    .order("id");
  const ids = game.set.questions.map((q) => q.id);
  const r = roundScore(ids, rows ?? []);
  if (!r.complete) return { error: "Бардык суроолорду чечип бүтүр." };

  const admin = createAdminClient();
  const { data: prev } = await admin.from("game_progress").select("rounds, best_score, last_round, completed_at").eq("assignment_id", assignmentId).eq("student_id", profile.id).maybeSingle();
  if (prev?.last_round === roundId) return { score: r.score, firstTry: r.firstTry, total: ids.length, best: prev.best_score };
  const best = Math.max(prev?.best_score ?? 0, r.score);
  const now = new Date().toISOString();
  const { error } = await admin.from("game_progress").upsert({
    assignment_id: assignmentId,
    student_id: profile.id,
    rounds: (prev?.rounds ?? 0) + 1,
    last_score: r.score,
    best_score: best,
    last_round: roundId,
    completed_at: prev?.completed_at ?? now,
    updated_at: now,
  });
  if (error) return { error: "Жыйынтык сакталган жок. Кайра аракет кыл." };
  revalidatePath("/student");
  return { score: r.score, firstTry: r.firstTry, total: ids.length, best };
}

/** Даяр топтомду мугалимдин өзүнө бир жолу көчүрөт (сабактын оюн блогу үчүн). */
export async function ensureGameSet(slug: string): Promise<{ error?: string; id?: string; title?: string }> {
  const { supabase, profile } = await requireRole("teacher");
  const template = GAME_SETS.find((g) => g.slug === slug);
  if (!template || validateQuestions(template.questions).length) return { error: "Оюн табылган жок." };
  const { data: found } = await supabase.from("game_sets").select("id, title").eq("author_id", profile.id).eq("source", template.slug).maybeSingle();
  if (found) return { id: found.id, title: found.title };
  const { data, error } = await supabase
    .from("game_sets")
    .insert({ author_id: profile.id, title: template.title, grade: template.grade, topic: template.description, skills: template.skills, questions: template.questions, source: template.slug })
    .select("id, title")
    .single();
  if (error || !data) return { error: "Оюн сакталган жок. Кайра аракет кылыңыз." };
  return { id: data.id, title: data.title };
}

/** Жаңы бош оюн (мугалимдин топтому) — редакторго өтөт. */
export async function createGameSet() {
  const { supabase, profile } = await requireRole("teacher");
  const { data, error } = await supabase
    .from("game_sets")
    .insert({ author_id: profile.id, title: "Жаңы оюн", questions: [{ id: "q1", type: "choice", prompt: "Суроону жазыңыз", options: ["Вариант 1", "Вариант 2"], correct: 0, time: 20 }] })
    .select("id")
    .single();
  if (error || !data) throw new Error("Оюн түзүлгөн жок. 0017 база жаңыртуусун текшериңиз.");
  redirect(`/teacher/games/sets/${data.id}`);
}

export type SaveSetState = { error?: string; ok?: string; issues?: string[] } | undefined;

/** Редактордон сактоо: суроолор текшерилет; RLS — автор гана. */
export async function saveGameSet(id: string, title: string, questions: unknown): Promise<SaveSetState> {
  const { supabase, profile } = await requireRole("teacher");
  if (!UUID.test(id)) return { error: "Оюн табылган жок." };
  const t = title.trim();
  if (!t || t.length > 150) return { error: "Оюндун атын жазыңыз (150 белгиге чейин)." };
  const issues = validateQuestions(questions);
  if (issues.length) return { error: "Суроолордо ката бар.", issues };
  const { data, error } = await supabase.from("game_sets").update({ title: t, questions, updated_at: new Date().toISOString() }).eq("id", id).eq("author_id", profile.id).select("id");
  if (error || !data?.length) return { error: "Сакталган жок. Кайра аракет кылыңыз." };
  revalidatePath("/teacher/games");
  return { ok: "Сакталды." };
}

export async function deleteGameSet(id: string) {
  const { supabase, profile } = await requireRole("teacher");
  if (!UUID.test(id)) return;
  // Дайындамалар, жандуу оюндар жана жыйынтыктар кошо өчөт (on delete cascade).
  await supabase.from("game_sets").delete().eq("id", id).eq("author_id", profile.id);
  revalidatePath("/teacher/games");
  redirect("/teacher/games");
}
