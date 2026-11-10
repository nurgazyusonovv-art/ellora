"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { bishkekDay } from "@/lib/review";
import { reviewBlocks, reviewStatus, type ReviewRow } from "@/lib/review-data";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReviewAnswerResult = {
  error?: string;
  correct?: boolean;
  correctIndex?: number;
  explain?: string;
  done?: boolean;
  score?: number;
  total?: number;
  streak?: number;
};

/** Күнүмдүк кайталоонун бир жообу: бир аракет; сервер баалайт жана туура жоопту ачат. */
export async function answerReview(index: number, picked: number): Promise<ReviewAnswerResult> {
  const { supabase, profile } = await requireRole("student");
  if (!Number.isInteger(index) || index < 0 || index > 4 || !Number.isInteger(picked) || picked < 0) return { error: "Жооп туура эмес." };
  const day = bishkekDay();
  const { data: row } = await supabase.from("review_days").select("day, items, answers, score, completed_at").eq("student_id", profile.id).eq("day", day).maybeSingle<ReviewRow>();
  const item = row?.items[index];
  if (!row || !item) return { error: "Бүгүнкү кайталоо табылган жок. Баракты жаңырт." };
  if (row.answers[String(index)]) return { error: "Бул суроого жооп берилген." };
  const block = (await reviewBlocks(supabase, [item])).get(`${item.a}:${item.b}`)?.block;
  if (!block || picked >= block.options.length) return { error: "Суроо табылган жок." };

  const correct = picked === block.correct;
  const answers = { ...row.answers, [String(index)]: { picked, correct } };
  const done = row.items.every((_, i) => answers[String(i)]);
  const score = Object.values(answers).filter((a) => a.correct).length;
  // Жазуу service role менен гана (0022: окуучу түз жаза албайт). Бүткөн кайталоо өзгөрбөйт.
  const { data: saved, error } = await createAdminClient()
    .from("review_days")
    .update({ answers, score, ...(done ? { completed_at: new Date().toISOString() } : {}) })
    .eq("student_id", profile.id)
    .eq("day", day)
    .is("completed_at", null)
    .select("day");
  if (error) return { error: "Жооп сакталган жок. Кайра аракет кыл." };
  if (!saved?.length) return { error: "Жооптор өзгөрдү. Баракты жаңырт." };
  revalidatePath("/student");
  const status = done ? await reviewStatus(supabase, profile.id) : null;
  return { correct, correctIndex: block.correct, ...(block.explain ? { explain: block.explain } : {}), done, score, total: row.items.length, ...(status ? { streak: status.streak } : {}) };
}
