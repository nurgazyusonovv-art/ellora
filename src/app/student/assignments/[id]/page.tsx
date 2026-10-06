import { notFound } from "next/navigation";
import type { SavedAnswer } from "@/components/player/blocks";
import { LessonPlayer } from "@/components/player/lesson-player";
import { requireRole } from "@/lib/auth";
import { lessonContent } from "@/lib/student-lessons";
import { studentContent } from "@/lib/student-view";

export default async function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("student");

  // RLS: окуучу өз классынын тапшырмасын гана көрөт. Сабактын өзү — ошондон кийин, серверде.
  const { data: a } = await supabase.from("assignments").select("id, lesson_id").eq("id", id).maybeSingle();
  const lesson = a ? await lessonContent(a.lesson_id) : null;
  if (!a || !lesson) notFound();

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

  // Туура жооптор браузерге чечилгенден кийин гана жөнөтүлөт.
  const content = studentContent(lesson.content, answers, attempt.id);
  const [{ data: session }, { data: reviews }] = await Promise.all([
    supabase.from("lesson_sessions").select("max_stage, paused").eq("assignment_id", id).maybeSingle(),
    supabase.from("answer_reviews").select("block_id, criteria_met, feedback").eq("attempt_id", attempt.id),
  ]);
  return <LessonPlayer title={lesson.title} content={content} backHref="/student" attempt={attempt} initialAnswers={answers} liveSession={session} reviews={reviews ?? []} />;
}
