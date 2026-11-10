import Link from "next/link";
import { Icon } from "@/components/icons";
import { cx } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { lessonStars } from "@/lib/grading";
import { pathGroups, type PathStop } from "@/lib/review";
import { lessonTitles } from "@/lib/student-lessons";

export const metadata = { title: "Менин жолум" };

type A = { id: string; lesson_id: string; created_at: string; quarter?: number | null };

export default async function StudentPath() {
  const { supabase, profile } = await requireRole("student");
  // RLS: окуучунун класстарынын дайындамалары жана өз аракеттери. Чейрек талаасы (0016) жок болсо — чейрексиз.
  const first = await supabase.from("assignments").select("id, lesson_id, created_at, quarter").returns<A[]>();
  const assignments = first.error ? (await supabase.from("assignments").select("id, lesson_id, created_at").returns<A[]>()).data : first.data;
  const [{ data: attempts }, titles] = await Promise.all([
    supabase.from("attempts").select("assignment_id, current_stage, finished_at, exit_score, exit_total").eq("student_id", profile.id),
    lessonTitles([...new Set((assignments ?? []).map((a) => a.lesson_id))]),
  ]);
  const stops: PathStop[] = (assignments ?? []).map((a) => {
    const t = attempts?.find((x) => x.assignment_id === a.id);
    return {
      id: a.id,
      title: titles.get(a.lesson_id) ?? "Сабак",
      quarter: a.quarter ?? null,
      createdAt: a.created_at,
      stage: t ? (t.current_stage as number) : null,
      finished: !!t?.finished_at,
      stars: t?.finished_at ? lessonStars((t.exit_score as number) ?? 0, (t.exit_total as number) ?? 0) : null,
    };
  });
  const groups = pathGroups(stops);
  const done = stops.filter((s) => s.finished).length;
  const stars = stops.reduce((n, s) => n + (s.stars ?? 0), 0);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
      <Link href="/student" className="flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">← Башкы бет</Link>
      <header className="flex flex-col gap-1 border-b border-line pb-5">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{done}/{stops.length} сабак · {stars} жылдыз</span>
        <h1 className="text-2xl font-medium">Менин жолум</h1>
        <p className="text-sm text-muted">Ар бир сабак — жолдогу бекет. Жылдыздар Акыркы сынактын жыйынтыгы боюнча.</p>
      </header>
      {groups.length === 0 && <p className="rounded-lg border border-dashed border-line-strong p-5 text-sm text-muted">Азырынча сабак жок.</p>}
      {groups.map((g) => (
        <section key={g.quarter ?? "none"} className="flex flex-col gap-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{g.quarter ? `${g.quarter}-чейрек` : "Чейрекке бекитилбеген"}</h2>
          <ol className="relative flex flex-col gap-3 pl-6 before:absolute before:top-3 before:bottom-3 before:left-[11px] before:w-0.5 before:bg-line-strong">
            {g.stops.map((s) => (
              <li key={s.id} className="relative">
                <span
                  aria-hidden
                  className={cx(
                    "absolute top-4 -left-6 grid size-6 place-items-center rounded-full border-2",
                    s.finished ? "border-good bg-good text-white" : s.stage !== null ? "border-accent bg-surface text-accent" : "border-line-strong bg-surface",
                  )}
                >
                  {s.finished ? <Icon name="check" size={12} /> : s.stage !== null ? <span className="size-2 rounded-full bg-accent" /> : null}
                </span>
                <Link href={`/student/assignments/${s.id}`} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3.5 transition-colors hover:border-line-strong hover:bg-surface-2/40">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium break-words">{s.title}</span>
                    <span className="text-xs text-muted">{s.finished ? "Бүттү" : s.stage !== null ? `${Math.min(s.stage + 1, 5)}/5-бөлүктө` : "Баштала элек"}</span>
                  </span>
                  {s.stars !== null && (
                    <span className="flex shrink-0" role="img" aria-label={`${s.stars} жылдыз 3төн`}>
                      {[1, 2, 3].map((k) => <Icon key={k} name="star" size={16} className={k <= s.stars! ? "fill-current text-amber" : "text-line-strong"} />)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
