import { setAdmin } from "@/app/actions/admin";
import { Button, Card, Chip, PageTitle } from "@/components/ui";
import { loadAdminData } from "@/lib/admin-data";
import { teacherRows } from "@/lib/admin-stats";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/stats";

export const metadata = { title: "Мугалимдер" };

export default async function AdminTeachers() {
  const { profile } = await requireAdmin();
  const rows = teacherRows(await loadAdminData());

  return (
    <>
      <PageTitle eyebrow="Админ" title={`Мугалимдер · ${rows.length}`} />
      <Card className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-left font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
              <th className="px-5 py-2.5 font-medium">Мугалим</th>
              <th className="px-3 py-2.5 font-medium">Мектеп</th>
              <th className="px-3 py-2.5 text-right font-medium">Класс</th>
              <th className="px-3 py-2.5 text-right font-medium">Окуучу</th>
              <th className="px-3 py-2.5 text-right font-medium">Сабак</th>
              <th className="px-3 py-2.5 font-medium">Катталган</th>
              <th className="px-3 py-2.5 font-medium">Акыркы кирүү</th>
              <th className="px-5 py-2.5 font-medium">Админ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-line transition-colors hover:bg-surface-2/50 align-middle">
                <td className="px-5 py-3">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-muted">{t.email ?? "—"}</div>
                </td>
                <td className="max-w-56 px-3 py-3 text-muted">{t.school || "—"}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums">{t.classes}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums">{t.students}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums">{t.lessons}</td>
                <td className="px-3 py-3 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                <td className="px-3 py-3 whitespace-nowrap">{t.lastSignIn ? formatDate(t.lastSignIn) : "—"}</td>
                <td className="px-5 py-3">
                  {t.id === profile.id ? (
                    <Chip tone="accent">Сиз</Chip>
                  ) : (
                    <form action={setAdmin.bind(null, t.id, !t.isAdmin)} className="flex items-center gap-2">
                      {t.isAdmin && <Chip tone="accent">Админ</Chip>}
                      <Button variant="ghost" className="min-h-11 px-2.5 text-sm">
                        {t.isAdmin ? "Алуу" : "Админ кылуу"}
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-5 pb-5 text-sm text-muted">Мугалим жок.</p>}
      </Card>
      <p className="text-sm text-muted">Админ — платформадагы бардык мугалимдерди, класстарды жана окуучуларды көрөт. Бул укукту ишенимдүү адамга гана бериңиз.</p>
    </>
  );
}
