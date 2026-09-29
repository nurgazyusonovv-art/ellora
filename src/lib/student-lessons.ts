import "server-only";
import type { LessonContent } from "@/lib/lesson-types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Окуучу `lessons` таблицасын түз окуй албайт (0004): туура жооптор браузерге жетпесин.
 * Бул функцияларды тапшырманы окуучунун өз клиенти менен (RLS: өз классы) тапкандан кийин гана чакырыңыз.
 */
export async function lessonTitles(lessonIds: string[]) {
  if (!lessonIds.length) return new Map<string, string>();
  const { data } = await createAdminClient().from("lessons").select("id, title").in("id", lessonIds);
  return new Map((data ?? []).map((l) => [l.id as string, l.title as string]));
}

export async function lessonContent(lessonId: string) {
  const { data } = await createAdminClient().from("lessons").select("title, content").eq("id", lessonId).maybeSingle();
  return data ? { title: data.title as string, content: data.content as LessonContent } : null;
}
