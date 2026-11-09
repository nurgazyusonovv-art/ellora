import { notFound } from "next/navigation";
import { LessonBuilder } from "@/components/builder/lesson-builder";
import { requireRole } from "@/lib/auth";
import { getPickerPlans } from "@/lib/ktp";
import type { LessonContent } from "@/lib/lesson-types";
import { GAME_SETS } from "@/content/game-sets";

export const metadata = { title: "Сабак конструктору" };

export default async function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("teacher");
  const [{ data: lesson }, plans, { data: sets }] = await Promise.all([
    supabase.from("lessons").select("id, title, grade, topic, content, status").eq("id", id).eq("author_id", profile.id).maybeSingle(),
    getPickerPlans(supabase),
    supabase.from("game_sets").select("id, title, questions, source").eq("author_id", profile.id).order("created_at"),
  ]);
  // 0017 иштетиле элек болсо да конструктор ачылат: оюн тизмеси бош болот.
  const gameOptions = {
    own: (sets ?? []).map((s) => ({ id: s.id as string, title: s.title as string, count: Array.isArray(s.questions) ? s.questions.length : 0, source: (s.source as string | null) ?? null })),
    templates: GAME_SETS.map((g) => ({ slug: g.slug, title: g.title, count: g.questions.length, grade: g.grade })),
  };
  if (!lesson) notFound();
  return (
    <LessonBuilder
      key={lesson.id}
      id={lesson.id}
      plans={plans}
      gameOptions={gameOptions}
      initialStatus={lesson.status === "published" ? "published" : "draft"}
      initial={{ title: lesson.title, grade: lesson.grade, topic: lesson.topic ?? "", content: lesson.content as LessonContent }}
    />
  );
}
