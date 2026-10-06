import { notFound } from "next/navigation";
import { duplicateLesson } from "@/app/actions/teacher";
import { Button, ButtonLink, Card, Chip, PageTitle } from "@/components/ui";
import { AssignForm } from "@/components/teacher-forms";
import { requireRole } from "@/lib/auth";
import { BLOCK_LABELS } from "@/lib/lesson-edit";
import { stageMeta, type LessonContent } from "@/lib/lesson-types";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("teacher");
  const [{ data: lesson }, { data: classes }] = await Promise.all([
    supabase.from("lessons").select("id, title, grade, topic, content, status").eq("id", id).eq("author_id", profile.id).maybeSingle(),
    supabase.from("classes").select("id, name").eq("teacher_id", profile.id).order("name"),
  ]);
  if (!lesson) notFound();
  const content = lesson.content as LessonContent;
  const minutes = content.stages.reduce((s, st) => s + st.minutes, 0);
  const published = lesson.status === "published";

  return (
    <>
      <PageTitle eyebrow={`${lesson.grade ? `${lesson.grade}-класс · ` : ""}${minutes} мүнөт`} title={lesson.title}>
        <ButtonLink href={`/teacher/lessons/${id}/preview`} variant="secondary">
          Окуучу катары көрүү
        </ButtonLink>
        <form action={duplicateLesson.bind(null, id)}>
          <Button variant="secondary">Көчүрмө жасоо</Button>
        </form>
        <ButtonLink href={`/teacher/lessons/${id}/edit`}>Түзөтүү</ButtonLink>
      </PageTitle>
      <div>{published ? <Chip tone="good">Жарыяланган</Chip> : <Chip>Долбоор</Chip>}</div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
        <Card className="flex flex-col gap-1">
          <h2 className="mb-2 font-display text-lg font-medium">Сабактын түзүлүшү</h2>
          {content.stages.map((st, i) => (
            <div key={st.key} className="flex flex-col gap-1.5 border-b border-surface-2 py-3 last:border-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">
                  {i + 1}. {stageMeta(content, st.key).label} <span className="font-normal text-muted">· {st.title}</span>
                </span>
                <span className="shrink-0 text-sm text-muted">~{st.minutes} мүн</span>
              </div>
              <span className="text-sm text-muted">{st.blocks.length ? st.blocks.map((b) => BLOCK_LABELS[b.type]).join(" · ") : "Блок жок"}</span>
            </div>
          ))}
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-medium">Класска жөнөтүү</h2>
          {published ? (
            <AssignForm lessonId={lesson.id} classes={classes ?? []} />
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">Сабак азырынча долбоор. Класска жөнөтүү үчүн конструктордо текшерип, «Жарыялоо» баскычын басыңыз.</p>
              <ButtonLink href={`/teacher/lessons/${id}/edit`} variant="secondary" className="self-start">
                Конструкторду ачуу
              </ButtonLink>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
