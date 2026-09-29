import Link from "next/link";
import { JoinAnotherClassForm } from "@/components/auth-forms";
import { InstallButton, SignOutButton } from "@/components/pwa";
import { Card, Chip, Logo, Progress } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { lessonTitles } from "@/lib/student-lessons";
import { formatDate, type AttemptRow } from "@/lib/stats";

export const metadata = { title: "Менин сабактарым" };

type A = { id: string; due_at: string | null; lesson_id: string; classes: { name: string } | null };

export default async function StudentHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { supabase, profile } = await requireRole("student");
  const [{ data: assignments }, { data: attempts }, { data: classes }] = await Promise.all([
    supabase.from("assignments").select("id, due_at, lesson_id, classes(name)").order("created_at", { ascending: false }).returns<A[]>(),
    supabase.from("attempts").select("*").eq("student_id", profile.id).returns<AttemptRow[]>(),
    supabase.from("classes").select("name"),
  ]);
  const totalXp = (attempts ?? []).reduce((s, a) => s + a.xp, 0);
  const attemptOf = (id: string) => attempts?.find((a) => a.assignment_id === id);
  // RLS тапшырмаларды окуучунун класстары менен чектеди — аталыштарды ошолор үчүн гана алабыз.
  const titles = await lessonTitles([...new Set((assignments ?? []).map((a) => a.lesson_id))]);
  const list = (assignments ?? []).map((a) => ({ ...a, title: titles.get(a.lesson_id) ?? "Сабак", t: attemptOf(a.id) }));
  const todo = list.filter((a) => !a.t?.finished_at);
  const done = list.filter((a) => a.t?.finished_at);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <SignOutButton className="min-h-11 text-sm font-semibold text-accent" />
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
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-soft px-3 py-1 font-mono text-sm font-semibold text-amber">{totalXp} XP</span>
          <Link
            href="/student/report"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3.5 text-sm font-semibold hover:bg-surface-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </svg>
            Менин жыйынтыгым
          </Link>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium">Аткаруу керек</h2>
        {todo.length === 0 && <p className="text-muted">Азырынча жаңы сабак жок. Мугалимиң сабак жөнөткөндө бул жерде пайда болот.</p>}
        {todo.map((a) => (
          <Link key={a.id} href={`/student/assignments/${a.id}`} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4 hover:border-accent">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{a.title}</span>
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
              <span className="font-semibold">{a.title}</span>
              <span className="shrink-0 font-mono text-sm text-muted">
                {a.t?.exit_score}/{a.t?.exit_total} · {a.t?.xp} XP
              </span>
            </Link>
          ))}
        </section>
      )}

      <InstallButton />

      <Card>
        <JoinAnotherClassForm />
      </Card>
    </main>
  );
}
