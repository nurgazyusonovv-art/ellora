import Link from "next/link";
import { Card, PageTitle } from "@/components/ui";
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
      <PageTitle title="Класстар" />
      <Card>
        <CreateClassForm />
      </Card>
      {(classes?.length ?? 0) === 0 ? (
        <p className="text-muted">Азырынча класс жок. Жогорудан биринчи классыңызды ачыңыз.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes!.map((c) => (
            <Link key={c.id} href={`/teacher/classes/${c.id}`} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 hover:border-accent">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-2xl font-bold">{c.name}</span>
                <span className="text-sm text-muted">{count(c.id)} окуучу</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-[0.07em] text-muted uppercase">Кошулуу коду</span>
                <span className="font-mono text-lg tracking-[0.15em]">{c.join_code}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
