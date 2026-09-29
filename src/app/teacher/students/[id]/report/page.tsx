import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { AccuracyBars, ExitTrendChart, Icon, StatTile, StatusBadge } from "@/components/report";
import { cx, Logo } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { CONFIDENCE_LABELS } from "@/lib/lesson-types";
import { formatDate } from "@/lib/stats";
import { getStudentReport } from "@/lib/student-report";

export const metadata = { title: "Окуучунун отчету" };

/** Бир барак A4 болушу үчүн таблицадагы сабактардын саны чектелет (акыркылары). */
const MAX_ROWS = 10;

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("teacher");
  const r = await getStudentReport(supabase, profile.id, id);
  if (!r) notFound();
  const s = r.summary;
  const numbered = r.lessons.map((l, i) => ({ ...l, n: i + 1 }));
  const rows = numbered.slice(-MAX_ROWS);
  const trend = numbered.filter((l) => l.exitPct !== null).map((l) => ({ n: l.n, title: l.title, pct: l.exitPct! }));
  const strong = numbered.filter((l) => (l.exitPct ?? 0) >= 80);
  const review = numbered.filter((l) => l.status === "help" || l.status === "stuck" || (l.exitPct !== null && l.exitPct < 50));
  const notStarted = numbered.filter((l) => l.status === "not_started");
  const now = new Date();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/teacher/students/${id}`} className="text-sm font-semibold text-accent">
          ← Окуучунун барагы
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">Ачылган терезеде «PDF катары сактоо» тандаңыз.</span>
          <PrintButton />
        </div>
      </div>

      <article className="mx-auto flex w-full max-w-[210mm] flex-col gap-4 rounded-2xl border border-line bg-surface p-6 text-ink sm:p-8 print:max-w-none print:gap-3 print:rounded-none print:border-0 print:p-0 print:text-[12px]">
        {/* Башы */}
        <header className="flex items-start justify-between gap-4 border-b-2 border-accent pb-3">
          <div className="flex flex-col gap-1">
            <Logo />
            <span className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Окуучунун жыйынтыгы · Информатика</span>
          </div>
          <div className="text-right text-xs text-muted">
            <div>{`${formatDate(now.toISOString())}, ${now.getFullYear()}-ж.`}</div>
            <div>{profile.school}</div>
          </div>
        </header>

        <section className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-accent text-white">
              <Icon name="user" size={22} />
            </span>
            <div className="flex flex-col">
              <h1 className="font-display text-2xl leading-tight font-bold print:text-xl">{r.student.name}</h1>
              <span className="text-sm text-muted">
                {r.classes.join(", ")}
                {r.student.username && <> · логин <span className="font-mono">{r.student.username}</span></>}
              </span>
            </div>
          </div>
          <span className="text-sm text-muted">Мугалим: {profile.full_name}</span>
        </section>

        <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile icon="book" label="Бүткөн сабак" value={`${s.finished}/${s.assigned}`} sub={notStarted.length ? `${notStarted.length} баштала элек` : "баары башталган"} />
          <StatTile icon="target" label="Орточо exit" value={s.avgExitPct === null ? "—" : `${s.avgExitPct}%`} sub="чыгуу билети" />
          <StatTile icon="bolt" label="Жалпы XP" value={s.totalXp} sub="топтолгон упай" />
          <StatTile
            icon="gauge"
            label="Ишеним"
            value={s.avgConfidence === null ? "—" : `${s.avgConfidence}/4`}
            sub={s.avgConfidence === null ? undefined : CONFIDENCE_LABELS[Math.round(s.avgConfidence) - 1]}
          />
        </section>

        {trend.length > 0 ? (
          <section className="grid gap-4 sm:grid-cols-[3fr_2fr] print:grid-cols-[3fr_2fr]">
            <div className="flex flex-col gap-1.5 rounded-xl border border-line p-3.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Icon name="target" size={15} className="text-accent" />
                Exit ticket сабактар боюнча, %
              </h2>
              <ExitTrendChart points={trend} />
            </div>
            <div className="flex flex-col gap-2.5 rounded-xl border border-line p-3.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Icon name="spark" size={15} className="text-accent" />
                Биринчи аракетте туура
              </h2>
              <span className="font-display text-3xl font-bold print:text-2xl">{s.firstTryPct === null ? "—" : `${s.firstTryPct}%`}</span>
              <AccuracyBars rows={s.byType} />
            </div>
          </section>
        ) : (
          <p className="rounded-xl bg-bg p-4 text-sm text-muted">Окуучу азырынча бир да сабакты бүтүргөн жок — графиктер сабак бүткөндөн кийин пайда болот.</p>
        )}

        <section className="flex flex-col gap-1.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="book" size={15} className="text-accent" />
            Сабактар
            {numbered.length > MAX_ROWS && <span className="font-normal text-muted">(акыркы {MAX_ROWS} / {numbered.length})</span>}
          </h2>
          <table className="w-full border-collapse text-[13px] print:text-[11px]">
            <thead>
              <tr className="border-b border-line text-left text-[11px] tracking-[0.05em] text-muted uppercase">
                <th className="py-1.5 print:py-1 pr-2 font-semibold">№</th>
                <th className="py-1.5 print:py-1 pr-2 font-semibold">Сабак</th>
                <th className="py-1.5 print:py-1 pr-2 font-semibold">Берилген</th>
                <th className="py-1.5 print:py-1 pr-2 text-right font-semibold">Exit</th>
                <th className="py-1.5 print:py-1 pr-2 text-right font-semibold">XP</th>
                <th className="py-1.5 print:py-1 pr-2 text-center font-semibold">Ишеним</th>
                <th className="py-1.5 print:py-1 font-semibold">Абалы</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.assignmentId} className="border-b border-surface-2 align-top">
                  <td className="py-1.5 print:py-1 pr-2 font-mono text-muted">{l.n}</td>
                  <td className="py-1.5 print:py-1 pr-2">
                    <div className="font-semibold">{l.title}</div>
                    {/* Сабак көп болсо — басып чыгарууда тема сабы жашырылат (бир барак A4) */}
                    {l.topic && <div className={cx("text-[11px] text-muted", rows.length > 8 && "print:hidden")}>{l.topic}</div>}
                  </td>
                  <td className="py-1.5 print:py-1 pr-2 whitespace-nowrap">{formatDate(l.assignedAt)}</td>
                  <td className="py-1.5 print:py-1 pr-2 text-right font-mono tabular-nums">{l.exitScore !== null ? `${l.exitScore}/${l.exitTotal}` : "—"}</td>
                  <td className="py-1.5 print:py-1 pr-2 text-right font-mono tabular-nums">{l.xp || "—"}</td>
                  <td className="py-1.5 print:py-1 pr-2 text-center font-mono">{l.confidence ?? "—"}</td>
                  <td className="py-1.5">
                    <StatusBadge status={l.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-sm text-muted">Сабак жөнөтүлө элек.</p>}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
          <Notes
            icon="check"
            tone="text-good"
            title="Жакшы өздөштүргөн темалар"
            items={strong.map((l) => `${l.n}. ${l.topic || l.title} — ${l.exitPct}%`)}
            empty="Азырынча жок (exit ticket 80% жана андан жогору)."
          />
          <Notes
            icon="alert"
            tone="text-bad"
            title="Кайталоо сунушталат"
            items={review.map((l) => `${l.n}. ${l.topic || l.title}${l.exitPct !== null ? ` — ${l.exitPct}%` : " — бүтө элек"}`)}
            empty="Кайталай турган тема жок."
          />
        </section>

        <footer className="mt-auto flex items-end justify-between gap-4 border-t border-line pt-3 text-xs text-muted">
          <span>Мугалимдин колу: ______________________</span>
          <span>ellora · жыйынтык автоматтык түрдө эсептелди</span>
        </footer>
      </article>
    </>
  );
}

function Notes({ icon, tone, title, items, empty }: { icon: "check" | "alert"; tone: string; title: string; items: string[]; empty: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-bg p-3.5 print:p-2.5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icon name={icon} size={15} className={tone} />
        {title}
      </h2>
      {items.length ? (
        <ul className="flex flex-col gap-0.5 text-[13px] print:text-[11px]">
          {items.slice(0, 3).map((t) => (
            <li key={t}>{t}</li>
          ))}
          {items.length > 3 && <li className="text-muted">жана дагы {items.length - 3}</li>}
        </ul>
      ) : (
        <p className="text-[13px] text-muted">{empty}</p>
      )}
    </div>
  );
}
