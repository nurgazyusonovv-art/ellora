import { Card, Progress } from "@/components/ui";
import type { LessonReport } from "@/lib/live-report";

const label = "font-mono text-[11px] uppercase tracking-[0.08em] text-muted";

function Names({ title, names, empty }: { title: string; names: string[]; empty: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={label}>{title} · {names.length}</span>
      <p className="text-sm">{names.length ? names.join(", ") : <span className="text-muted">{empty}</span>}</p>
    </div>
  );
}

/** Сабак бүткөндөн кийинки жыйынтык (жандуу экранда). */
export function LessonReportCard({ report, homework }: { report: LessonReport; homework: boolean }) {
  return (
    <section className="flex flex-col gap-4" aria-label="Сабактын отчету">
      <h2 className="text-base font-medium">Сабактын жыйынтыгы</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="flex flex-col gap-1.5">
          <span className={label}>Узактыгы</span>
          <span className="font-mono text-2xl font-medium tabular-nums">{report.minutes !== null ? `${report.minutes} мүн` : "—"}</span>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <span className={label}>Кошулду</span>
          <span className="font-mono text-2xl font-medium tabular-nums">{report.joined}/{report.total}</span>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <span className={label}>Класста бүттү</span>
          <span className="font-mono text-2xl font-medium tabular-nums">{report.finishedInClass}</span>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <span className={label}>Кийин бүттү</span>
          <span className="font-mono text-2xl font-medium tabular-nums">{report.finishedLater}</span>
          {homework && <span className="text-xs text-muted">Үйдө бүтүрүү ачык</span>}
        </Card>
      </div>

      {report.growth && (
        <Card className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className={label}>Класстын өсүшү</span>
          <span className="font-mono text-2xl font-medium tabular-nums">
            {report.growth.before}% <span className="text-muted">→</span> <span className="text-good">{report.growth.after}%</span>
          </span>
          <span className="text-xs text-muted">Сабактын башындагы текшерүү ↔ Баалоо, {report.growth.n} окуучу боюнча орточо.</span>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card className="flex flex-col gap-3">
          <span className={label}>Бөлүктөр боюнча бүтүргөндөр</span>
          {report.stages.map((s) => (
            <div key={s.label} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-sm">
              <span className="truncate">{s.label}</span>
              <Progress value={report.total ? (s.done / report.total) * 100 : 0} tone="good" />
              <span className="text-right font-mono text-xs text-muted tabular-nums">{s.done}/{report.total}</span>
            </div>
          ))}
        </Card>
        <Card className="flex flex-col gap-4">
          <Names title="Бүтө элек" names={report.notFinished} empty="Баштагандардын баары бүттү." />
          <Names title="Кошулган жок" names={report.notStarted} empty="Баары кошулду." />
          <Names title="Баалоодо 50%дан аз" names={report.lowExit} empty="Мындай окуучу жок." />
        </Card>
      </div>

      {report.hardest.length > 0 && (
        <Card className="flex flex-col gap-3">
          <span className={label}>Кийинки сабакта кайталоо керек</span>
          {report.hardest.map((h) => (
            <div key={h.id} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-3 text-sm">
                <span>{h.summary}</span>
                <span className="shrink-0 font-mono text-xs text-muted tabular-nums">{h.pct}% · {h.n} жооп</span>
              </div>
              <Progress value={h.pct} tone="bad" />
            </div>
          ))}
          <p className="text-xs text-muted">Биринчи аракетте туура жооп бергендердин үлүшү 70%дан аз суроолор.</p>
        </Card>
      )}
    </section>
  );
}
