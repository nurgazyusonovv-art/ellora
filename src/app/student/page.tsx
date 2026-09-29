import Link from "next/link";
import { JoinAnotherClassForm } from "@/components/auth-forms";
import { BadgeGrid, Leaderboard } from "@/components/gamification";
import { InstallButton, SignOutButton } from "@/components/pwa";
import { Card, Chip, Logo, Progress } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { computeBadges } from "@/lib/badges";
import { classLeaderboard, shortName } from "@/lib/leaderboard";
import { lessonTitles } from "@/lib/student-lessons";
import { formatDate, type AttemptRow } from "@/lib/stats";
import { getOwnReport } from "@/lib/student-report";

export const metadata = { title: "Менин сабактарым" };

type A = { id: string; due_at: string | null; lesson_id: string; classes: { name: string } | null };

export default async function StudentHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { supabase, profile } = await requireRole("student");
  const [{ data: assignments }, { data: attempts }, { data: classes }] = await Promise.all([
    supabase.from("assignments").select("id, due_at, lesson_id, classes(name)").order("created_at", { ascending: false }).returns<A[]>(),
    supabase.from("attempts").select("*").eq("student_id", profile.id).returns<AttemptRow[]>(),
    supabase.from("classes").select("*"),
  ]);
  const totalXp = (attempts ?? []).reduce((s, a) => s + a.xp, 0);
  const attemptOf = (id: string) => attempts?.find((a) => a.assignment_id === id);
  // RLS тапшырмаларды окуучунун класстары менен чектеди — аталыштарды ошолор үчүн гана алабыз.
  const titles = await lessonTitles([...new Set((assignments ?? []).map((a) => a.lesson_id))]);
  const list = (assignments ?? []).map((a) => ({ ...a, title: titles.get(a.lesson_id) ?? "Сабак", t: attemptOf(a.id) }));
  const todo = list.filter((a) => !a.t?.finished_at);
  const done = list.filter((a) => a.t?.finished_at);

  // Бейдждер — окуучунун өз жыйынтыгынан (туура жооптор кирбейт).
  const badges = computeBadges(await getOwnReport(supabase, profile));
  // Рейтинг — мугалим жашырбаган класстар үчүн (0006 иштетилбесе — көрсөтүлөт). RLS: окуучу өз класстарын гана көрөт.
  const boards = await Promise.all(
    (classes ?? [])
      .filter((c) => c.show_leaderboard !== false)
      .map(async (c) => {
        const all = await classLeaderboard(c.id as string);
        const me = all.find((r) => r.id === profile.id);
        const top = all.slice(0, 5);
        const rows = [...top, ...(me && !top.includes(me) ? [me] : [])].map((r) => ({
          ...r,
          name: r.id === profile.id ? r.name : shortName(r.name),
          me: r.id === profile.id,
        }));
        return { id: c.id as string, name: c.name as string, rows, total: all.length };
      }),
  );

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

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg font-medium">Менин бейдждерим</h2>
          <span className="font-mono text-sm text-muted">
            {badges.filter((b) => b.earned).length}/{badges.length}
          </span>
        </div>
        <BadgeGrid badges={badges} seenKey={`ellora:badges:${profile.id}`} collapseLocked />
      </section>

      {boards.map((b) => (
        <section key={b.id} className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium">Класстын рейтинги · {b.name}</h2>
          <Card className="p-3 sm:p-4">
            <Leaderboard rows={b.rows} total={b.total} />
          </Card>
        </section>
      ))}

      <InstallButton />

      <Card>
        <JoinAnotherClassForm />
      </Card>
    </main>
  );
}
