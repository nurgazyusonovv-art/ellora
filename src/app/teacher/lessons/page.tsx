import Link from "next/link";
import { addLibraryLesson } from "@/app/actions/teacher";
import { Button, Card, Chip, PageTitle } from "@/components/ui";
import { LIBRARY } from "@/content/python-if";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Сабактар" };

export default async function LessonsPage() {
  const { supabase, profile } = await requireRole("teacher");
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, grade, topic, status, updated_at")
    .eq("author_id", profile.id)
    .order("updated_at", { ascending: false });

  return (
    <>
      <PageTitle title="Сабактар" />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium">Менин сабактарым</h2>
        {(lessons?.length ?? 0) === 0 ? (
          <p className="text-muted">Азырынча сабак жок. Төмөнкү китепканадан даяр сабакты алып баштаңыз.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {lessons!.map((l) => (
              <Link key={l.id} href={`/teacher/lessons/${l.id}`} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 hover:border-accent">
                <span className="font-semibold">{l.title}</span>
                <span className="text-sm text-muted">
                  {l.grade ? `${l.grade}-класс · ` : ""}
                  {l.topic}
                </span>
                <span>{l.status === "published" ? <Chip tone="good">Даяр</Chip> : <Chip>Долбоор</Chip>}</span>
              </Link>
            ))}
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
        <p className="text-sm text-muted">Сабак конструктору кийинки этапта кошулат.</p>
      </section>
    </>
  );
}
