import Link from "next/link";
import { DailyBars, StatTile } from "@/components/report";
import { Card, PageTitle } from "@/components/ui";
import { loadAdminData } from "@/lib/admin-data";
import { overview, teacherRows } from "@/lib/admin-stats";
import { requireAdmin } from "@/lib/auth";
import { formatDate, todayLabel } from "@/lib/stats";

export const metadata = { title: "Жалпы көрүнүш" };

export default async function AdminHome() {
  await requireAdmin();
  const data = await loadAdminData();
  const o = overview(data);
  const recent = [...teacherRows(data)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <>
      <PageTitle eyebrow={todayLabel()} title="Платформанын абалы" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon="user" label="Мугалим" value={o.teachers} />
        <StatTile icon="users" label="Окуучу" value={o.students} sub={`${o.activeStudents} — акыркы 7 күндө активдүү`} />
        <StatTile icon="layers" label="Класс" value={o.classes} />
        <StatTile icon="book" label="Сабак" value={o.published} sub={o.lessons - o.published ? `+ ${o.lessons - o.published} долбоор` : undefined} />
        <StatTile icon="file" label="Жөнөтүлгөн тапшырма" value={o.assignments} />
        <StatTile icon="check" label="Бүткөн сабак" value={o.finished} sub="окуучулардын аракети" />
        <StatTile icon="target" label="Орточо exit ticket" value={o.avgExitPct === null ? "—" : `${o.avgExitPct}%`} />
        <StatTile icon="chart" label="Мектеп" value={o.schools.filter((s) => s.name !== "Мектеп көрсөтүлгөн эмес").length} />
      </div>

      <Card className="flex flex-col gap-2">
        <h2 className="font-semibold">Акыркы 14 күн: бүткөн сабактар</h2>
        <DailyBars days={o.days} unit="бүткөн сабак" />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium">Мектептер</h2>
          {o.schools.length === 0 && <p className="text-sm text-muted">Азырынча мугалим катталган жок.</p>}
          <ul className="flex flex-col">
            {o.schools.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-3 border-b border-surface-2 py-2.5 last:border-0">
                <span className="min-w-0 truncate font-semibold">{s.name}</span>
                <span className="shrink-0 text-sm text-muted">
                  {s.teachers} мугалим · {s.students} окуучу
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-medium">Жаңы катталган мугалимдер</h2>
            <Link href="/admin/teachers" className="text-sm font-semibold text-accent">
              Баары
            </Link>
          </div>
          <ul className="flex flex-col">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 border-b border-surface-2 py-2.5 last:border-0">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold">{t.name}</span>
                  <span className="truncate text-sm text-muted">{t.school || "Мектеп көрсөтүлгөн эмес"}</span>
                </span>
                <span className="shrink-0 text-sm text-muted">{formatDate(t.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
