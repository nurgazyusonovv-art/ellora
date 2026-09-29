import { notFound } from "next/navigation";
import { LessonBuilder } from "@/components/builder/lesson-builder";
import { requireRole } from "@/lib/auth";
import { getPickerPlans } from "@/lib/ktp";
import type { LessonContent } from "@/lib/lesson-types";

export const metadata = { title: "Сабак конструктору" };

export default async function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("teacher");
  const [{ data: lesson }, plans] = await Promise.all([
    supabase.from("lessons").select("id, title, grade, topic, content, status").eq("id", id).eq("author_id", profile.id).maybeSingle(),
    getPickerPlans(supabase),
  ]);
  if (!lesson) notFound();
  return (
    <LessonBuilder
      key={lesson.id}
      id={lesson.id}
      plans={plans}
      initialStatus={lesson.status === "published" ? "published" : "draft"}
      initial={{ title: lesson.title, grade: lesson.grade, topic: lesson.topic ?? "", content: lesson.content as LessonContent }}
    />
  );
}
