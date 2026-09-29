import Link from "next/link";
import { ButtonLink, Card, Chip, PageTitle, Progress } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatDate, studentStatus, type AttemptRow } from "@/lib/stats";

export const metadata = { title: "Башкы бет" };

type AssignmentRow = {
  id: string;
  due_at: string | null;
  class_id: string;
  lessons: { title: string } | null;
  classes: { name: string } | null;
};

export default async function TeacherHome() {
  const { supabase, profile } = await requireRole("teacher");

  const [{ data: classes }, { data: members }, { data: assignments }, { data: attempts }, { data: students }] =
    await Promise.all([
      supabase.from("classes").select("id, name, join_code").eq("teacher_id", profile.id).order("name"),
      supabase.from("class_members").select("class_id, student_id"),
      supabase
        .from("assignments")
        .select("id, due_at, class_id, lessons(title), classes(name)")
        .order("created_at", { ascending: false })
        .limit(8)
        .returns<AssignmentRow[]>(),
      supabase.from("attempts").select("*").returns<AttemptRow[]>(),
      supabase.from("profiles").select("id, full_name").eq("role", "student"),
    ]);

  const nameOf = new Map((students ?? []).map((s) => [s.id, s.full_name]));
  const membersOf = (cid: string) => (members ?? []).filter((m) => m.class_id === cid);
  const hasClasses = (classes?.length ?? 0) > 0;

  const rows = (assignments ?? []).map((a) => {
    const total = membersOf(a.class_id).length;
    const atts = (attempts ?? []).filter((t) => t.assignment_id === a.id);
    const done = atts.filter((t) => t.finished_at).length;
    const help = atts.filter((t) => ["help", "stuck"].includes(studentStatus(t))).length;
    return { ...a, total, done, help, notStarted: total - atts.length };
  });

  const needHelp = (attempts ?? [])
    .filter((t) => studentStatus(t) === "help")
    .slice(0, 5)
    .map((t) => ({ ...t, name: nameOf.get(t.student_id) ?? "Окуучу", a: assignments?.find((x) => x.id === t.assignment_id) }));

  const hour = new Date(Date.now() + 6 * 36e5).getUTCHours();
  const greet = hour < 12 ? "Кутман таң" : hour < 18 ? "Кутман күн" : "Кутман кеч";

  return (
    <>
      <PageTitle eyebrow={greet} title={profile.full_name ? profile.full_name.split(" ")[0] + "!" : "Саламатсызбы!"}>
        <ButtonLink href="/teacher/classes" variant="secondary">Класстар</ButtonLink>
        <ButtonLink href="/teacher/lessons">Сабактар</ButtonLink>
      </PageTitle>

      {rows.length === 0 && (
        <Card className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-medium">Баштоо үчүн үч кадам</h2>
          <ol className="flex flex-col gap-3">
            <Step n={1} done={hasClasses} href="/teacher/classes" text="Класс ачып, окуучуларга кошулуу кодун бериңиз" />
            <Step n={2} href="/teacher/lessons" text="Китепканадан даяр сабакты алыңыз же өзүңүз түзүңүз" />
            <Step n={3} href="/teacher/lessons" text="Сабакты класска жөнөтүп, натыйжаны көрүңүз" />
          </ol>
        </Card>
      )}

      {rows.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
          <Card className="flex flex-col gap-4">
            <h2 className="font-display text-lg font-medium">Жүрүп жаткан тапшырмалар</h2>
            {rows.map((r) => (
              <Link key={r.id} href={`/teacher/assignments/${r.id}`} className="flex flex-col gap-2.5 rounded-xl border border-line p-4 hover:border-accent">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-semibold">{r.lessons?.title}</span>
                    <span className="text-sm text-muted">
                      {r.classes?.name} · Мөөнөт: {formatDate(r.due_at)}
                    </span>
                  </div>
                  {r.help > 0 ? (
                    <Chip tone="bad">{r.help} окуучуга жардам керек</Chip>
                  ) : r.notStarted > 0 ? (
                    <Chip tone="warn">{r.notStarted} окуучу баштай элек</Chip>
                  ) : (
                    <Chip tone="good">Жакшы жүрүүдө</Chip>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Progress value={r.total ? (r.done / r.total) * 100 : 0} />
                  </div>
                  <span className="font-mono text-sm text-muted tabular-nums">
                    {r.done}/{r.total} бүттү
                  </span>
                </div>
              </Link>
            ))}
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-medium">Көңүл буруңуз</h2>
            {needHelp.length === 0 && <p className="text-sm text-muted">Азырынча жардамга муктаж окуучу жок.</p>}
            {needHelp.map((h) => (
              <Link key={h.id} href={`/teacher/assignments/${h.assignment_id}`} className="flex flex-col gap-0.5 border-b border-surface-2 pb-3 last:border-0">
                <span className="font-semibold">
                  {h.name} · {h.a?.classes?.name}
                </span>
                <span className="text-sm text-muted">
                  Exit ticket {h.exit_score}/{h.exit_total} · {h.a?.lessons?.title}
                </span>
              </Link>
            ))}
          </Card>
        </div>
      )}

      {hasClasses && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium">Менин класстарым</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {classes!.map((c) => (
              <Link key={c.id} href={`/teacher/classes/${c.id}`} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 hover:border-accent">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-xl font-bold">{c.name}</span>
                  <span className="text-sm text-muted">{membersOf(c.id).length} окуучу</span>
                </div>
                <span className="font-mono text-base tracking-[0.15em]">{c.join_code}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Step({ n, text, href, done }: { n: number; text: string; href: string; done?: boolean }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-xl border border-line p-3.5 hover:border-accent">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full font-mono text-sm ${done ? "bg-good text-white" : "bg-accent-soft text-accent-dark"}`}>
          {done ? "✓" : n}
        </span>
        <span className={done ? "text-muted line-through" : ""}>{text}</span>
      </Link>
    </li>
  );
}
