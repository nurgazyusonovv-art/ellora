import { AdminResetPasswordForm } from "@/components/admin-forms";
import { Button, Card, PageTitle } from "@/components/ui";
import { loadAdminData } from "@/lib/admin-data";
import { studentRows } from "@/lib/admin-stats";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Окуучулар" };

const LIMIT = 100;

export default async function AdminStudents({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const all = studentRows(await loadAdminData(), q);
  const rows = all.slice(0, LIMIT);

  return (
    <>
      <PageTitle eyebrow="Админ" title={`Окуучулар · ${all.length}`} />
      <form action="/admin/students" className="flex flex-wrap items-end gap-2.5">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-sm font-semibold sm:max-w-sm">
          Издөө
          <input
            name="q"
            defaultValue={q}
            placeholder="Аты же логини"
            className="min-h-11 rounded-[10px] border border-line bg-surface px-3 text-base font-normal"
          />
        </label>
        <Button variant="secondary">Издөө</Button>
      </form>

      <Card className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs tracking-[0.06em] text-muted uppercase">
              <th className="px-5 py-3 font-semibold">Окуучу</th>
              <th className="px-3 py-3 font-semibold">Логин</th>
              <th className="px-3 py-3 font-semibold">Класс</th>
              <th className="px-3 py-3 text-right font-semibold">Бүткөн</th>
              <th className="px-3 py-3 text-right font-semibold">XP</th>
              <th className="px-5 py-3 font-semibold">Жардам</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-surface-2 align-middle">
                <td className="px-5 py-3 font-semibold">{s.name}</td>
                <td className="px-3 py-3 font-mono">{s.username}</td>
                <td className="px-3 py-3">{s.classes.join(", ") || "—"}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums">{s.finished}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums">{s.xp}</td>
                <td className="px-5 py-2">
                  <AdminResetPasswordForm studentId={s.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-5 pb-5 text-sm text-muted">{q ? "Мындай окуучу табылган жок." : "Окуучу жок."}</p>}
      </Card>
      {all.length > LIMIT && <p className="text-sm text-muted">Алгачкы {LIMIT} окуучу көрсөтүлдү. Калганын табуу үчүн издөөнү колдонуңуз.</p>}
    </>
  );
}
