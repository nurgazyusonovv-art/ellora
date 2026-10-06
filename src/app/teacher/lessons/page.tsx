import Link from "next/link";
import { addLibraryLesson } from "@/app/actions/teacher";
import { LessonArt } from "@/components/lesson-art";
import { Icon } from "@/components/icons";
import { Button, ButtonLink, Chip, PageTitle } from "@/components/ui";
import { DeleteLessonButton } from "@/components/teacher-forms";
import { LIBRARY } from "@/content";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Сабактар" };

export default async function LessonsPage({ searchParams }: { searchParams: Promise<{ q?: string; grade?: string; status?: string }> }) {
  const filters = await searchParams;
  const matches = (l: { title: string; grade: number | null }) => (!filters.q || l.title.toLocaleLowerCase().includes(filters.q.trim().toLocaleLowerCase())) && (!filters.grade || String(l.grade) === filters.grade);
  const { supabase, profile } = await requireRole("teacher");
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, grade, topic, status, updated_at, assignments(count)")
    .eq("author_id", profile.id)
    .order("updated_at", { ascending: false });

  const visibleLessons = (lessons ?? []).filter(l => matches(l) && (!filters.status || l.status === filters.status));
  const library = LIBRARY.filter(matches);

  return (
    <>
      <PageTitle title="Менин сабактарым">
        <ButtonLink href="/teacher/lessons/new">Жаңы сабак</ButtonLink>
      </PageTitle>

      <form className="flex flex-wrap items-center gap-3" action="/teacher/lessons">
        <span className="text-sm font-medium text-muted">Тандоо:</span>
        <label className="flex min-h-11 min-w-0 flex-1 basis-full items-center gap-2 rounded-full bg-surface-2 px-4 sm:basis-0">
          <Icon name="book" size={16} className="text-muted" />
          <input name="q" aria-label="Сабакты издөө" defaultValue={filters.q} placeholder="Сабакты издөө" className="w-full min-w-0 bg-transparent py-3 text-sm" />
        </label>
        <select name="grade" aria-label="Класс боюнча тандоо" defaultValue={filters.grade ?? ""} className="min-h-11 rounded-full bg-surface-2 px-4 text-sm text-muted">
          <option value="">Бардык класстар</option>{[5, 6, 7, 8, 9, 10, 11].map(g => <option value={g} key={g}>{g}-класс</option>)}
        </select>
        <select name="status" aria-label="Сабактын абалы" defaultValue={filters.status ?? ""} className="min-h-11 rounded-full bg-surface-2 px-4 text-sm text-muted">
          <option value="">Бардык абалдар</option><option value="published">Даяр</option><option value="draft">Долбоор</option>
        </select>
        <Button variant="secondary">Издөө</Button>
        {(filters.q || filters.grade || filters.status) && <ButtonLink href="/teacher/lessons" variant="ghost">Тазалоо</ButtonLink>}
      </form>
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-medium">Менин сабактарым</h2>
        {visibleLessons.length === 0 ? (
          <div className="rounded-3xl bg-accent-soft p-6 text-muted">{(lessons?.length ?? 0) === 0 ? "Азырынча сабак жок. Жаңы сабак түзүңүз же китепканадан даяр сабакты алыңыз." : "Тандалган шарттарга ылайык сабак табылган жок."}</div>
        ) : (
          <div className="flex flex-col gap-5">
            {visibleLessons.map((l) => {
              const assigned = (l.assignments as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
              return (
                <div key={l.id} className="lesson-tile flex flex-col gap-5 rounded-[28px] p-5 sm:flex-row sm:items-center sm:p-7">
                  <LessonArt className="mx-auto w-40 shrink-0 sm:w-44" />
                  <div className="flex min-w-0 flex-1 flex-col gap-3 text-ink">
                  <Link href={`/teacher/lessons/${l.id}`} className="flex flex-col gap-2 hover:text-accent">
                    <span className="text-xl font-semibold sm:text-2xl">{l.title}</span>
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
                  <Link href={`/teacher/lessons/${l.id}`} aria-label={`${l.title}: ачуу`} className="flex size-12 shrink-0 items-center justify-center self-end rounded-full bg-current"><Icon name="arrow" className="text-white" size={24} /></Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium">Сабак китепканасы</h2>
        <p className="text-sm text-muted">Даяр сабакты өзүңүздүн сабактарыңызга көчүрүп, класска жөнөтө аласыз.</p>
        <div className="flex flex-col gap-5">
          {library.length === 0 && <p className="text-sm text-muted">Китепканадан ылайыктуу сабак табылган жок.</p>}
          {library.map((l) => (
            <div key={l.slug} className="lesson-tile flex flex-col gap-5 rounded-[28px] p-5 sm:flex-row sm:items-center sm:p-7">
              <LessonArt className="mx-auto w-40 shrink-0 sm:w-44" />
              <div className="flex min-w-0 flex-1 flex-col gap-3 text-ink">
                <span className="text-xl font-semibold sm:text-2xl">{l.title}</span>
                <span className="text-sm text-muted">
                  {l.grade}-класс · {l.content.stages.reduce((s, st) => s + st.minutes, 0)} мүнөт · 5 бөлүк
                </span>
                <span className="text-[13px] text-muted">Тема: {l.topic}</span>
              <form className="mt-2" action={addLibraryLesson.bind(null, l.slug)}>
                <Button variant="secondary">Сабактарыма кошуу</Button>
              </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
