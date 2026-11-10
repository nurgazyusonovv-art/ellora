import { notFound } from "next/navigation";
import { duplicateLesson } from "@/app/actions/teacher";
import { LessonBuilder } from "@/components/builder/lesson-builder";
import { Button } from "@/components/ui";
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
  // Окуучулар жооп берген сабактын мазмуну бекитилет (0025): мурунку жооптор жана баалар өзгөрбөшү үчүн.
  const { data: assigned } = await supabase.from("assignments").select("id").eq("lesson_id", id);
  const { data: tries } = assigned?.length ? await supabase.from("attempts").select("id").in("assignment_id", assigned.map((a) => a.id)) : { data: [] };
  const { count: answered } = tries?.length ? await supabase.from("answers").select("block_id", { count: "exact", head: true }).in("attempt_id", tries.map((t) => t.id)) : { count: 0 };
  return (
    <>
      {!!answered && (
        <form action={duplicateLesson.bind(null, id)} className="flex flex-col gap-3 rounded-lg border border-amber/30 bg-amber-soft p-4 text-sm text-amber sm:flex-row sm:items-center">
          <p className="flex-1">
            <b className="font-medium">Окуучулар бул сабакка жооп берген</b>, ошондуктан анын мазмуну бекитилген — мурунку жооптор жана баалар өзгөрбөшү керек. Өзгөртүү үчүн көчүрмө түзүп, аны класска кайра жөнөтүңүз.
          </p>
          <Button variant="secondary" className="shrink-0">Көчүрмө түзүү</Button>
        </form>
      )}
    <LessonBuilder
      key={lesson.id}
      id={lesson.id}
      plans={plans}
      gameOptions={gameOptions}
      initialStatus={lesson.status === "published" ? "published" : "draft"}
      initial={{ title: lesson.title, grade: lesson.grade, topic: lesson.topic ?? "", content: lesson.content as LessonContent }}
    />
    </>
  );
}
