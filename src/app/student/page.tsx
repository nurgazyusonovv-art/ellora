import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { JoinAnotherClassForm } from "@/components/auth-forms";
import { Card, Chip, Logo, Progress } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatDate, type AttemptRow } from "@/lib/stats";

export const metadata = { title: "Менин сабактарым" };

type A = { id: string; due_at: string | null; lessons: { title: string } | null; classes: { name: string } | null };

export default async function StudentHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { supabase, profile } = await requireRole("student");
  const [{ data: assignments }, { data: attempts }, { data: classes }] = await Promise.all([
    supabase.from("assignments").select("id, due_at, lessons(title), classes(name)").order("created_at", { ascending: false }).returns<A[]>(),
    supabase.from("attempts").select("*").eq("student_id", profile.id).returns<AttemptRow[]>(),
    supabase.from("classes").select("name"),
  ]);
  const totalXp = (attempts ?? []).reduce((s, a) => s + a.xp, 0);
  const attemptOf = (id: string) => attempts?.find((a) => a.assignment_id === id);
  const list = (assignments ?? []).map((a) => ({ ...a, t: attemptOf(a.id) }));
  const todo = list.filter((a) => !a.t?.finished_at);
  const done = list.filter((a) => a.t?.finished_at);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <form action={signOut}>
          <button className="text-sm font-semibold text-accent">Чыгуу</button>
        </form>
      </header>

      {welcome && (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-[#a9d3c7] bg-accent-soft p-5">
          <span className="font-semibold">Кош келдиң! Сенин логиниң:</span>
          <span className="font-mono text-2xl font-semibold tracking-wide">{welcome}</span>
          <span className="text-sm">Аны дептериңе жазып ал. Кийинки жолу ушул логин жана сырсөз менен киресиң.</span>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted">{(classes ?? []).map((c) => c.name).join(", ") || "Класс жок"}</span>
          <h1 className="font-display text-2xl font-bold">Салам, {profile.full_name.split(" ")[0]}!</h1>
        </div>
        <span className="rounded-full bg-amber-soft px-3 py-1 font-mono text-sm font-semibold text-amber">{totalXp} XP</span>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium">Аткаруу керек</h2>
        {todo.length === 0 && <p className="text-muted">Азырынча жаңы сабак жок. Мугалимиң сабак жөнөткөндө бул жерде пайда болот.</p>}
        {todo.map((a) => (
          <Link key={a.id} href={`/student/assignments/${a.id}`} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4 hover:border-accent">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{a.lessons?.title}</span>
              {a.t ? <Chip tone="accent">{a.t.current_stage}/5 бөлүк</Chip> : <Chip tone="warn">Жаңы</Chip>}
            </div>
            {a.t && <Progress value={(a.t.current_stage / 5) * 100} />}
            <span className="text-sm text-muted">
              {a.classes?.name} · Мөөнөт: {formatDate(a.due_at)}
            </span>
          </Link>
        ))}
      </section>

      {done.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium">Бүткөн сабактар</h2>
          {done.map((a) => (
            <Link key={a.id} href={`/student/assignments/${a.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-accent">
              <span className="font-semibold">{a.lessons?.title}</span>
              <span className="shrink-0 font-mono text-sm text-muted">
                {a.t?.exit_score}/{a.t?.exit_total} · {a.t?.xp} XP
              </span>
            </Link>
          ))}
        </section>
      )}

      <Card>
        <JoinAnotherClassForm />
      </Card>
    </main>
  );
}
