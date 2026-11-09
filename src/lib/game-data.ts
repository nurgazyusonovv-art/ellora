import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { studentQuestion, type GameQuestion } from "@/lib/game-questions";
import type { LessonContent } from "@/lib/lesson-types";

export type GameSetRow = { id: string; title: string; grade: number | null; topic: string | null; questions: GameQuestion[] };

/**
 * Окуучу game_sets таблицасын түз окуй албайт (0017): туура жооптор браузерге жетпесин.
 * Дайындаманы окуучунун өз клиенти менен (RLS: өз классы) тапкандан кийин гана топтом admin менен окулат.
 */
export async function studentGame(supabase: SupabaseClient, assignmentId: string) {
  const { data: assignment } = await supabase.from("game_assignments").select("id, set_id, class_id, due_at").eq("id", assignmentId).maybeSingle<{ id: string; set_id: string; class_id: string; due_at: string | null }>();
  if (!assignment) return null;
  const { data: set } = await createAdminClient().from("game_sets").select("id, title, grade, topic, questions").eq("id", assignment.set_id).maybeSingle<GameSetRow>();
  return set ? { assignment, set } : null;
}

/** Окуучуга көрүнгөн оюндардын аталыштары (дайындама RLS менен табылгандан кийин). */
export async function gameSetTitles(setIds: string[]) {
  if (!setIds.length) return new Map<string, { title: string; count: number }>();
  const { data } = await createAdminClient().from("game_sets").select("id, title, questions").in("id", setIds);
  return new Map((data ?? []).map((s) => [s.id as string, { title: s.title as string, count: Array.isArray(s.questions) ? s.questions.length : 0 }]));
}

/**
 * Сабактагы оюн блокторуна суроолорду кошот (серверде). Топтом сабактын авторуна тиешелүү болсо гана.
 * `answerKey` — мугалимдин алдын ала көрүүсү үчүн гана (окуучунун барагында эч качан берилбейт).
 */
export async function withGameQuestions(content: LessonContent, authorId: string, viewerId: string, opts: { answerKey?: boolean } = {}): Promise<LessonContent> {
  const ids = [...new Set(content.stages.flatMap((s) => s.blocks.flatMap((b) => (b.type === "game" && b.setId ? [b.setId] : []))))];
  if (!ids.length) return content;
  const { data } = await createAdminClient().from("game_sets").select("id, author_id, questions").in("id", ids);
  const sets = new Map((data ?? []).filter((s) => s.author_id === authorId).map((s) => [s.id as string, s.questions as GameQuestion[]]));
  return {
    ...content,
    stages: content.stages.map((st) => ({
      ...st,
      blocks: st.blocks.map((b) => {
        if (b.type !== "game") return b;
        const qs = sets.get(b.setId) ?? [];
        return { ...b, questions: qs.map((q) => studentQuestion(q, viewerId)), ...(opts.answerKey ? { answerKey: qs } : {}) };
      }),
    })),
  };
}
