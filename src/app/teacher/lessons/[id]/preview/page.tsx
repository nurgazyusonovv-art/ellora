import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/player/lesson-player";
import { requireRole } from "@/lib/auth";
import type { LessonContent } from "@/lib/lesson-types";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("teacher");
  const { data: lesson } = await supabase.from("lessons").select("title, content").eq("id", id).eq("author_id", profile.id).maybeSingle();
  if (!lesson) notFound();
  return <LessonPlayer title={lesson.title} content={lesson.content as LessonContent} backHref={`/teacher/lessons/${id}`} />;
}
