import Link from "next/link";
import { ButtonLink, Card, PageTitle } from "@/components/ui";
import { CreateClassForm } from "@/components/teacher-forms";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Класстар" };

export default async function ClassesPage() {
  const { supabase, profile } = await requireRole("teacher");
  const [{ data: classes }, { data: members }] = await Promise.all([
    supabase.from("classes").select("id, name, join_code").eq("teacher_id", profile.id).order("name"),
    supabase.from("class_members").select("class_id"),
  ]);
  const count = (id: string) => (members ?? []).filter((m) => m.class_id === id).length;

  return (
    <>
      <PageTitle title="Класстар"><ButtonLink href="/teacher/quality">Билим сапаты</ButtonLink></PageTitle>
      <Card>
        <CreateClassForm />
      </Card>
      {(classes?.length ?? 0) === 0 ? (
        <p className="text-muted">Азырынча класс жок. Жогорудан биринчи классыңызды ачыңыз.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes!.map((c) => (
            <Link key={c.id} href={`/teacher/classes/${c.id}`} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-2/40">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-medium">{c.name}</span>
                <span className="text-sm text-muted">{count(c.id)} окуучу</span>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Кошулуу коду</span>
                <span className="font-mono text-lg tracking-[0.15em]">{c.join_code}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
