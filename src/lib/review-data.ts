import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { McqBlock } from "@/lib/lesson-types";
import { addDays, bishkekDay, pickReview, REVIEW_GAP_DAYS, reviewStreak, type ReviewCandidate, type ReviewItem } from "@/lib/review";
import { lessonsByIds } from "@/lib/student-lessons";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReviewRow = { day: string; items: ReviewItem[]; answers: Record<string, { picked: number; correct: boolean }>; score: number; completed_at: string | null };
export type ReviewQuestion = {
  index: number;
  title: string;
  prompt: string;
  code?: string;
  mono?: boolean;
  options: string[];
  /** Жооп берилгенден кийин гана: тандоо, туурасы, түшүндүрмө. */
  result?: { picked: number; correct: boolean; correctIndex: number; explain?: string };
};

const REVIEW_STAGES = new Set(["practice", "reinforce", "exit"]);

/**
 * Окуучу мурун жооп берген тесттер (Түшүндүрүү бүткөн сабактардан). RLS: дайындамалар, аракеттер жана жооптор —
 * окуучунун өзүнүкү. Сабактын мазмуну ошолор үчүн гана admin менен окулат (туура жооп браузерге жөнөтүлбөйт).
 */
async function candidates(supabase: SupabaseClient, studentId: string) {
  const [{ data: assignments }, { data: attempts }] = await Promise.all([
    supabase.from("assignments").select("id, lesson_id"),
    supabase.from("attempts").select("id, assignment_id, current_stage, finished_at, started_at").eq("student_id", studentId),
  ]);
  const lessonOf = new Map((assignments ?? []).map((a) => [a.id as string, a.lesson_id as string]));
  const ready = (attempts ?? []).filter((t) => lessonOf.has(t.assignment_id as string) && (t.finished_at || (t.current_stage as number) > 2));
  if (!ready.length) return [] as ReviewCandidate[];
  const [{ data: answers }, lessons] = await Promise.all([
    supabase.from("answers").select("attempt_id, block_id, is_correct, tries").in("attempt_id", ready.map((t) => t.id as string)),
    lessonsByIds([...new Set(ready.map((t) => lessonOf.get(t.assignment_id as string)!))]),
  ]);
  const out: ReviewCandidate[] = [];
  for (const t of ready) {
    const lesson = lessons.get(lessonOf.get(t.assignment_id as string)!);
    if (!lesson) continue;
    for (const st of lesson.content.stages) {
      if (!REVIEW_STAGES.has(st.key)) continue;
      for (const b of st.blocks) {
        if (b.type !== "mcq" || b.precheck) continue;
        const a = (answers ?? []).find((x) => x.attempt_id === t.id && x.block_id === b.id);
        if (!a) continue; // көрбөгөн суроо — эстеп жооп берүү эмес
        out.push({ assignmentId: t.assignment_id as string, blockId: b.id, weak: a.is_correct !== true || (a.tries as number) > 1, at: (t.finished_at ?? t.started_at ?? "") as string });
      }
    }
  }
  return out;
}

/** Бүгүнкү кайталоо: бар болсо ошону, жок болсо суроолорду тандап бекитет (service role). Суроо жок болсо — null. */
export async function todayReview(supabase: SupabaseClient, studentId: string): Promise<ReviewRow | null> {
  const day = bishkekDay();
  const { data: existing, error } = await supabase.from("review_days").select("day, items, answers, score, completed_at").eq("student_id", studentId).eq("day", day).maybeSingle<ReviewRow>();
  if (error) return null; // 0022 жок же ката — кайталоо көрсөтүлбөйт
  if (existing) return existing;
  const [list, { data: recent }] = await Promise.all([
    candidates(supabase, studentId),
    supabase.from("review_days").select("items").eq("student_id", studentId).gte("day", addDays(day, -REVIEW_GAP_DAYS)),
  ]);
  const items = pickReview(list, (recent ?? []).flatMap((r) => r.items as ReviewItem[]), `${studentId}:${day}`);
  if (!items.length) return null;
  await createAdminClient().from("review_days").upsert({ student_id: studentId, day, items }, { onConflict: "student_id,day", ignoreDuplicates: true });
  const { data } = await supabase.from("review_days").select("day, items, answers, score, completed_at").eq("student_id", studentId).eq("day", day).maybeSingle<ReviewRow>();
  return data ?? null;
}

/** Бекитилген суроолордун окуучуга көрүнүшү. Туура жооп жана түшүндүрмө — жооп берилгенден кийин гана. */
export async function reviewQuestions(supabase: SupabaseClient, row: ReviewRow): Promise<ReviewQuestion[]> {
  const blocks = await reviewBlocks(supabase, row.items);
  return row.items.flatMap((item, index) => {
    const found = blocks.get(`${item.a}:${item.b}`);
    if (!found) return [];
    const { block, title } = found;
    const ans = row.answers[String(index)];
    return [{
      index,
      title,
      prompt: block.prompt,
      ...(block.code ? { code: block.code } : {}),
      ...(block.mono ? { mono: true } : {}),
      options: block.options,
      ...(ans ? { result: { picked: ans.picked, correct: ans.correct, correctIndex: block.correct, ...(block.explain ? { explain: block.explain } : {}) } } : {}),
    }];
  });
}

/** Суроонун тести: дайындама окуучуга көрүнөрүн RLS менен текшерип, андан кийин гана мазмунду окуйт. */
export async function reviewBlocks(supabase: SupabaseClient, items: ReviewItem[]) {
  const ids = [...new Set(items.map((i) => i.a))];
  const { data: assignments } = ids.length ? await supabase.from("assignments").select("id, lesson_id").in("id", ids) : { data: [] };
  const lessonOf = new Map((assignments ?? []).map((a) => [a.id as string, a.lesson_id as string]));
  const lessons = await lessonsByIds([...new Set([...lessonOf.values()])]);
  const out = new Map<string, { block: McqBlock; title: string }>();
  for (const item of items) {
    const lesson = lessons.get(lessonOf.get(item.a) ?? "");
    const block = lesson?.content.stages.flatMap((s) => s.blocks).find((b) => b.id === item.b);
    if (lesson && block?.type === "mcq") out.set(`${item.a}:${item.b}`, { block, title: lesson.title });
  }
  return out;
}

/** Серия жана бүгүн аткарылдыбы (окуучунун башкы бети үчүн; эч нерсе жазбайт). */
export async function reviewStatus(supabase: SupabaseClient, studentId: string) {
  const today = bishkekDay();
  const { data, error } = await supabase.from("review_days").select("day, completed_at").eq("student_id", studentId).gte("day", addDays(today, -120)).order("day", { ascending: false });
  if (error) return null;
  const completed = (data ?? []).filter((r) => r.completed_at).map((r) => r.day as string);
  return { streak: reviewStreak(completed, today), doneToday: completed.includes(today) };
}
