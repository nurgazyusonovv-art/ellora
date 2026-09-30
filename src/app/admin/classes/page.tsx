import { Card, PageTitle } from "@/components/ui";
import { loadAdminData } from "@/lib/admin-data";
import { classRows } from "@/lib/admin-stats";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Класстар" };

export default async function AdminClasses() {
  await requireAdmin();
  const rows = classRows(await loadAdminData());

  return (
    <>
      <PageTitle eyebrow="Админ" title={`Класстар · ${rows.length}`} />
      <Card className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs tracking-[0.06em] text-muted uppercase">
              <th className="px-5 py-3 font-semibold">Класс</th>
              <th className="px-3 py-3 font-semibold">Мугалим</th>
              <th className="px-3 py-3 font-semibold">Код</th>
              <th className="px-3 py-3 text-right font-semibold">Окуучу</th>
              <th className="px-3 py-3 text-right font-semibold">Тапшырма</th>
              <th className="px-3 py-3 text-right font-semibold">Бүткөн</th>
              <th className="px-5 py-3 text-right font-semibold">Орточо exit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-surface-2">
                <td className="px-5 py-3 font-semibold">{c.name}</td>
                <td className="px-3 py-3">
                  <div>{c.teacher}</div>
                  {c.school && <div className="text-muted">{c.school}</div>}
                </td>
                <td className="px-3 py-3 font-mono tracking-[0.12em]">{c.joinCode}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums">{c.students}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums">{c.assignments}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums">{c.finished}</td>
                <td className="px-5 py-3 text-right font-mono tabular-nums">{c.avgExitPct === null ? "—" : `${c.avgExitPct}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-5 pb-5 text-sm text-muted">Класс жок.</p>}
      </Card>
    </>
  );
}
