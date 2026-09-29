import { notFound } from "next/navigation";
import type { SavedAnswer } from "@/components/player/blocks";
import { LessonPlayer } from "@/components/player/lesson-player";
import { requireRole } from "@/lib/auth";
import type { LessonContent } from "@/lib/lesson-types";

export default async function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("student");

  const { data: a } = await supabase
    .from("assignments")
    .select("id, opens_at, lessons(title, content)")
    .eq("id", id)
    .maybeSingle<{ id: string; opens_at: string; lessons: { title: string; content: LessonContent } | null }>();
  if (!a || !a.lessons) notFound();

  // Аракет жок болсо — түзөбүз (бир окуучуга бир дайындамада бир гана аракет).
  let { data: attempt } = await supabase
    .from("attempts")
    .select("id, current_stage, xp, exit_score, exit_total")
    .eq("assignment_id", id)
    .eq("student_id", profile.id)
    .maybeSingle();
  if (!attempt) {
    const ins = await supabase
      .from("attempts")
      .insert({ assignment_id: id, student_id: profile.id })
      .select("id, current_stage, xp, exit_score, exit_total")
      .single();
    attempt = ins.data;
    if (!attempt) {
      const again = await supabase
        .from("attempts")
        .select("id, current_stage, xp, exit_score, exit_total")
        .eq("assignment_id", id)
        .eq("student_id", profile.id)
        .single();
      attempt = again.data;
    }
  }
  if (!attempt) notFound();

  const { data: rows } = await supabase.from("answers").select("block_id, response, is_correct, tries").eq("attempt_id", attempt.id);
  const answers: Record<string, SavedAnswer> = {};
  for (const r of rows ?? []) answers[r.block_id] = { response: r.response ?? {}, is_correct: r.is_correct, tries: r.tries };

  return <LessonPlayer title={a.lessons.title} content={a.lessons.content} backHref="/student" attempt={attempt} initialAnswers={answers} />;
}
