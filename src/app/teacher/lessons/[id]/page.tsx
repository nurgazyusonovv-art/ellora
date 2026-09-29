import { notFound } from "next/navigation";
import { ButtonLink, Card, PageTitle } from "@/components/ui";
import { AssignForm } from "@/components/teacher-forms";
import { requireRole } from "@/lib/auth";
import { STAGE_META, type LessonContent } from "@/lib/lesson-types";

const BLOCK_LABELS: Record<string, string> = {
  text: "Текст",
  code_example: "Код мисалы",
  mcq: "Тест",
  code_task: "Код тапшырмасы",
  parsons: "Саптарды иреттөө",
  bug_hunt: "Катаны тап",
  open: "Ачык жооп",
  confidence: "Ишеним шкаласы",
};

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("teacher");
  const [{ data: lesson }, { data: classes }] = await Promise.all([
    supabase.from("lessons").select("id, title, grade, topic, content").eq("id", id).eq("author_id", profile.id).maybeSingle(),
    supabase.from("classes").select("id, name").eq("teacher_id", profile.id).order("name"),
  ]);
  if (!lesson) notFound();
  const content = lesson.content as LessonContent;
  const minutes = content.stages.reduce((s, st) => s + st.minutes, 0);

  return (
    <>
      <PageTitle eyebrow={`${lesson.grade ?? ""}-класс · ${minutes} мүнөт`} title={lesson.title}>
        <ButtonLink href={`/teacher/lessons/${id}/preview`} variant="secondary">
          Окуучу катары көрүү
        </ButtonLink>
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
        <Card className="flex flex-col gap-1">
          <h2 className="mb-2 font-display text-lg font-medium">Сабактын түзүлүшү</h2>
          {content.stages.map((st, i) => (
            <div key={st.key} className="flex flex-col gap-1.5 border-b border-surface-2 py-3 last:border-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">
                  {i + 1}. {STAGE_META[st.key].label} <span className="font-normal text-muted">· {st.title}</span>
                </span>
                <span className="shrink-0 text-sm text-muted">~{st.minutes} мүн</span>
              </div>
              <span className="text-sm text-muted">{st.blocks.map((b) => BLOCK_LABELS[b.type]).join(" · ")}</span>
            </div>
          ))}
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-medium">Класска жөнөтүү</h2>
          <AssignForm lessonId={lesson.id} classes={classes ?? []} />
        </Card>
      </div>
    </>
  );
}
