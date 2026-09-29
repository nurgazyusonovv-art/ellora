import Link from "next/link";
import { addLibraryLesson } from "@/app/actions/teacher";
import { Button, ButtonLink, Card, Chip, PageTitle } from "@/components/ui";
import { DeleteLessonButton } from "@/components/teacher-forms";
import { LIBRARY } from "@/content/python-if";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Сабактар" };

export default async function LessonsPage() {
  const { supabase, profile } = await requireRole("teacher");
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, grade, topic, status, updated_at, assignments(count)")
    .eq("author_id", profile.id)
    .order("updated_at", { ascending: false });

  return (
    <>
      <PageTitle title="Сабактар">
        <ButtonLink href="/teacher/lessons/new">Жаңы сабак</ButtonLink>
      </PageTitle>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium">Менин сабактарым</h2>
        {(lessons?.length ?? 0) === 0 ? (
          <p className="text-muted">Азырынча сабак жок. «Жаңы сабак» баскычы менен өзүңүз түзүңүз же төмөнкү китепканадан даяр сабакты алыңыз.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {lessons!.map((l) => {
              const assigned = (l.assignments as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
              return (
                <div key={l.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
                  <Link href={`/teacher/lessons/${l.id}`} className="flex flex-col gap-2 hover:text-accent">
                    <span className="font-semibold">{l.title}</span>
                    <span className="text-sm text-muted">
                      {l.grade ? `${l.grade}-класс · ` : ""}
                      {l.topic}
                    </span>
                  </Link>
                  <span className="flex flex-wrap items-center gap-2">
                    {l.status === "published" ? <Chip tone="good">Даяр</Chip> : <Chip>Долбоор</Chip>}
                    {assigned > 0 && <span className="text-xs text-muted">{assigned} класска жөнөтүлгөн</span>}
                  </span>
                  <div className="-mx-2 mt-auto flex flex-wrap items-center gap-1 border-t border-surface-2 pt-2">
                    <ButtonLink href={`/teacher/lessons/${l.id}/preview`} variant="ghost" className="min-h-11 px-3">
                      Көрүү
                    </ButtonLink>
                    <ButtonLink href={`/teacher/lessons/${l.id}/edit`} variant="ghost" className="min-h-11 px-3">
                      Өзгөртүү
                    </ButtonLink>
                    <span className="flex-1" />
                    <DeleteLessonButton id={l.id} title={l.title} assigned={assigned} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium">Сабак китепканасы</h2>
        <p className="text-sm text-muted">Даяр сабакты өзүңүздүн сабактарыңызга көчүрүп, класска жөнөтө аласыз.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {LIBRARY.map((l) => (
            <Card key={l.slug} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-semibold">{l.title}</span>
                <span className="text-sm text-muted">
                  {l.grade}-класс · {l.content.stages.reduce((s, st) => s + st.minutes, 0)} мүнөт · 5 бөлүк
                </span>
              </div>
              <form action={addLibraryLesson.bind(null, l.slug)}>
                <Button variant="secondary">Сабактарыма кошуу</Button>
              </form>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
