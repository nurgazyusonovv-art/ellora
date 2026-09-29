import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/player/lesson-player";
import { requireRole } from "@/lib/auth";
import type { LessonContent } from "@/lib/lesson-types";

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
  const { supabase, profile } = await requireRole("teacher");
  const { data: lesson } = await supabase.from("lessons").select("title, content").eq("id", id).eq("author_id", profile.id).maybeSingle();
  if (!lesson) notFound();
  const backHref = from === "edit" ? `/teacher/lessons/${id}/edit` : `/teacher/lessons/${id}`;
  return <LessonPlayer title={lesson.title} content={lesson.content as LessonContent} backHref={backHref} />;
}
