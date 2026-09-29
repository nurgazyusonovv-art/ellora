import Link from "next/link";
import { notFound } from "next/navigation";
import { CodeView } from "@/components/code";
import { AccuracyBars, ExitTrendChart, Icon, StatTile, StatusBadge } from "@/components/report";
import { ButtonLink, Card, cx, PageTitle } from "@/components/ui";
import { BadgeGrid } from "@/components/gamification";
import { requireRole } from "@/lib/auth";
import { computeBadges } from "@/lib/badges";
import { formatDate } from "@/lib/stats";
import { getStudentReport } from "@/lib/student-report";

export const metadata = { title: "Окуучунун натыйжалары" };

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("teacher");
  const r = await getStudentReport(supabase, profile.id, id);
  if (!r) notFound();
  const s = r.summary;
  const badges = computeBadges(r);
  const trend = r.lessons
    .map((l, i) => ({ n: i + 1, title: l.title, pct: l.exitPct }))
    .filter((p): p is { n: number; title: string; pct: number } => p.pct !== null);

  return (
    <>
      <PageTitle eyebrow={`${r.classes.join(", ")} · ${r.student.username ?? ""}`} title={r.student.name}>
        <ButtonLink href={`/teacher/students/${id}/report`}>
          <Icon name="book" size={16} />
          PDF отчет
        </ButtonLink>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon="book" label="Бүткөн сабак" value={`${s.finished}/${s.assigned}`} />
        <StatTile icon="target" label="Орточо exit ticket" value={s.avgExitPct === null ? "—" : `${s.avgExitPct}%`} />
        <StatTile icon="bolt" label="Жалпы XP" value={s.totalXp} />
        <StatTile icon="gauge" label="Орточо ишеним" value={s.avgConfidence === null ? "—" : `${s.avgConfidence} / 4`} />
      </div>

      {trend.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
          <Card className="flex flex-col gap-2">
            <h2 className="font-semibold">Exit ticket сабактар боюнча</h2>
            <ExitTrendChart points={trend} />
            <span className="text-xs text-muted">Сан — төмөнкү тизмедеги сабактын номери.</span>
          </Card>
          <Card className="flex flex-col gap-3">
            <h2 className="font-semibold">Биринчи аракетте туура</h2>
            <span className="font-display text-3xl font-bold">{s.firstTryPct === null ? "—" : `${s.firstTryPct}%`}</span>
            <AccuracyBars rows={s.byType} />
          </Card>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium">
          Бейдждер <span className="font-mono text-sm text-muted">{badges.filter((b) => b.earned).length}/{badges.length}</span>
        </h2>
        <BadgeGrid badges={badges} collapseLocked />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium">Сабактар жана жооптор</h2>
        {r.lessons.length === 0 && <p className="text-muted">Бул окуучунун класстарына азырынча сабак жөнөтүлгөн жок.</p>}
        {r.lessons.map((l, i) => (
          <details key={l.assignmentId} className="group rounded-2xl border border-line bg-surface">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1.5 p-4 sm:p-5">
              <span className="font-mono text-sm text-muted">{i + 1}.</span>
              <span className="min-w-0 flex-1 font-semibold">{l.title}</span>
              <span className="text-sm text-muted">{l.className} · {formatDate(l.assignedAt)}</span>
              <span className="font-mono text-sm tabular-nums">{l.exitScore !== null ? `${l.exitScore}/${l.exitTotal}` : `${l.stage}/5`}</span>
              <StatusBadge status={l.status} />
              <svg className="size-4 text-muted transition group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className="flex flex-col border-t border-surface-2">
              {l.blocks.length === 0 && <p className="p-4 text-sm text-muted">Бул сабакта жооп талап кылган тапшырма жок.</p>}
              {l.blocks.map((b) => (
                <div key={b.id} className="flex flex-col gap-1.5 border-b border-surface-2 px-4 py-3 last:border-0 sm:px-5">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
                    <span className="font-semibold tracking-[0.06em] uppercase">{b.stageLabel}</span>
                    <span>· {b.typeLabel}</span>
                    {b.graded && b.answered && (
                      <span
                        className={cx(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                          b.isCorrect ? (b.tries === 1 ? "bg-good-soft text-good" : "bg-amber-soft text-amber") : "bg-bad-soft text-bad",
                        )}
                      >
                        <Icon name={b.isCorrect ? "check" : "alert"} size={12} />
                        {b.isCorrect ? (b.tries === 1 ? "Биринчи аракетте" : `${b.tries} аракетте`) : "Туура эмес"}
                      </span>
                    )}
                    {!b.answered && <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold">Жооп жок</span>}
                  </div>
                  <span className="text-[15px]">{b.prompt}</span>
                  {b.answered && (
                    <span className="text-[15px]">
                      <span className="text-muted">Жообу: </span>
                      <span className="font-semibold whitespace-pre-wrap">{b.answer}</span>
                    </span>
                  )}
                  {b.note && <span className="text-sm text-muted">{b.note}</span>}
                  {b.code && <CodeView code={b.code} className="mt-1 text-[13px]" />}
                </div>
              ))}
            </div>
          </details>
        ))}
      </section>

      <p className="text-sm text-muted">
        <Link href="/teacher/classes" className="font-semibold text-accent">
          ← Класстар
        </Link>
      </p>
    </>
  );
}
