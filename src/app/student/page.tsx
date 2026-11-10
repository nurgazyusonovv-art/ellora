import Link from "next/link";
import { getCoinProfile } from "@/lib/coin-data";
import { CoinProfile } from "@/components/coin-profile";
import { JoinAnotherClassForm } from "@/components/auth-forms";
import { BadgeGrid, Leaderboard } from "@/components/gamification";
import { InstallButton, SignOutButton } from "@/components/pwa";
import { Card, Chip, cx, Logo, Progress } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { computeBadges } from "@/lib/badges";
import { boardMode, classLeaderboard, shortName, weeklyLeaderboard } from "@/lib/leaderboard";
import { lessonTitles } from "@/lib/student-lessons";
import { gameSetTitles } from "@/lib/game-data";
import { reviewStatus } from "@/lib/review-data";
import { liveState, type Delivery, type LiveState } from "@/lib/classroom";
import { lessonStars } from "@/lib/grading";
import { Icon } from "@/components/icons";
import { formatDate, type AttemptRow } from "@/lib/stats";
import { getOwnReport } from "@/lib/student-report";

export const metadata = { title: "Менин сабактарым" };

type A = { id: string; due_at: string | null; lesson_id: string; classes: { name: string } | null };

export default async function StudentHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const { supabase, profile } = await requireRole("student");
  const coinPromise = getCoinProfile(supabase,profile.id);
  const [{ data: assignments }, { data: attempts }, { data: classes }, { data: gameAssignments }, { data: gameProgress }] = await Promise.all([
    supabase.from("assignments").select("id, due_at, lesson_id, classes(name)").order("created_at", { ascending: false }).returns<A[]>(),
    supabase.from("attempts").select("*").eq("student_id", profile.id).returns<AttemptRow[]>(),
    supabase.from("classes").select("*"),
    supabase.from("game_assignments").select("id, set_id, due_at, classes(name)").order("created_at", { ascending: false }).returns<{ id: string; set_id: string; due_at: string | null; classes: { name: string } | null }[]>(),
    supabase.from("game_progress").select("assignment_id, best_score, rounds").eq("student_id", profile.id),
  ]);
  const [coinProfile, review] = await Promise.all([coinPromise, reviewStatus(supabase, profile.id)]);
  const hasProgress = (attempts ?? []).some((t) => t.finished_at || t.current_stage > 2);
  const totalXp = (attempts ?? []).reduce((s, a) => s + a.xp, 0);
  const attemptOf = (id: string) => attempts?.find((a) => a.assignment_id === id);
  // RLS тапшырмаларды окуучунун класстары менен чектеди — аталыштарды ошолор үчүн гана алабыз.
  const titles = await lessonTitles([...new Set((assignments ?? []).map((a) => a.lesson_id))]);
  const list = (assignments ?? []).map((a) => ({ ...a, title: titles.get(a.lesson_id) ?? "Сабак", t: attemptOf(a.id) }));
  // Сабактын абалы (0018): «Класста өтөм» сабагы мугалим баштаганча кулпуланган. Ката болсо — мурункудай.
  const listIds = list.map((a) => a.id);
  const [{ data: deliveries }, { data: sessions }] = listIds.length
    ? await Promise.all([
        supabase.from("assignments").select("id, delivery").in("id", listIds),
        supabase.from("lesson_sessions").select("*").in("assignment_id", listIds),
      ])
    : [{ data: [] }, { data: [] }];
  const stateOf = (id: string): LiveState =>
    liveState((deliveries?.find((d) => d.id === id)?.delivery as Delivery | undefined) ?? "self", (sessions?.find((x) => x.assignment_id === id) as { max_stage: number; paused: boolean; ended: boolean; homework?: boolean } | undefined) ?? null);
  const todo = list.filter((a) => !a.t?.finished_at).map((a) => ({ ...a, live: stateOf(a.id) })).sort((x, y) => Number(y.live === "live" || y.live === "paused") - Number(x.live === "live" || x.live === "paused"));
  // Оюндар: RLS дайындамаларды окуучунун класстары менен чектеди; аталыштар ошолор үчүн гана.
  const gameTitles = await gameSetTitles([...new Set((gameAssignments ?? []).map((g) => g.set_id))]);
  const games = (gameAssignments ?? []).map((g) => ({ ...g, set: gameTitles.get(g.set_id), progress: gameProgress?.find((p) => p.assignment_id === g.id) })).filter((g) => g.set);
  const done = list.filter((a) => a.t?.finished_at);

  // Бейдждер — окуучунун өз жыйынтыгынан (туура жооптор кирбейт).
  const badges = computeBadges(await getOwnReport(supabase, profile));
  // Рейтинг — мугалим жашырбаган класстар үчүн (0006 иштетилбесе — көрсөтүлөт). RLS: окуучу өз класстарын гана көрөт.
  const boards = await Promise.all(
    (classes ?? [])
      .filter((c) => boardMode(c) !== "off")
      .map(async (c) => {
        const mode = boardMode(c);
        const all = mode === "weekly" ? await weeklyLeaderboard(c.id as string) : await classLeaderboard(c.id as string);
        const me = all.find((r) => r.id === profile.id);
        const top = all.slice(0, 5);
        const rows = [...top, ...(me && !top.includes(me) ? [me] : [])].map((r) => ({
          ...r,
          name: r.id === profile.id ? r.name : shortName(r.name),
          me: r.id === profile.id,
        }));
        return { id: c.id as string, name: c.name as string, rows, total: all.length, weekly: mode === "weekly" };
      }),
  );

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-10 sm:px-6">
      <header className="-mx-4 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5 sm:-mx-6 sm:px-6 mobile-app-header">
        <Logo />
        <SignOutButton className="min-h-11 rounded-md border border-line-strong px-3 text-sm font-medium text-ink hover:bg-surface-2 lg:min-h-9" />
      </header>

      {welcome && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-accent/25 bg-accent-soft p-4">
          <span className="text-sm font-medium">Кош келдиң! Сенин логиниң:</span>
          <span className="font-mono text-2xl font-semibold tracking-wide">{welcome}</span>
          <span className="text-sm text-muted">Аны дептериңе жазып ал. Кийинки жолу ушул логин жана сырсөз менен киресиң.</span>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{(classes ?? []).map((c) => c.name).join(", ") || "Класс жок"}</span>
          <h1 className="text-2xl font-medium">Салам, {profile.full_name.split(" ")[0]}!</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber/25 bg-amber-soft px-2.5 py-0.5 font-mono text-sm font-medium text-amber">{totalXp} XP</span>
          <Link
            href="/student/report"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium shadow-xs hover:bg-surface-2 lg:min-h-9"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </svg>
            Менин жыйынтыгым
          </Link>
        </div>
      </div>

      {review && hasProgress && (
        <Link
          href="/student/review"
          className={cx(
            "flex items-center gap-3 rounded-lg border p-4 transition-colors",
            review.doneToday ? "border-good/25 bg-good-soft" : "border-amber/30 bg-amber-soft hover:border-amber/60",
          )}
        >
          <span className={cx("grid size-10 shrink-0 place-items-center rounded-md border bg-surface", review.doneToday ? "border-good/30 text-good" : "border-amber/30 text-amber")}>
            <Icon name={review.doneToday ? "check" : "flame"} size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium text-ink">{review.doneToday ? "Бүгүнкү кайталоо аткарылды" : "Күнүмдүк кайталоо · 3 суроо"}</span>
            <span className="text-sm text-muted">Серия: {review.streak} күн{review.doneToday ? ". Эртең кайра кел!" : review.streak ? ". Үзбө!" : ". Бүгүн башта!"}</span>
          </span>
          {!review.doneToday && <span className="shrink-0 text-sm font-medium text-amber">Баштоо →</span>}
        </Link>
      )}

      <nav aria-label="Кошумча бөлүмдөр" className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
        {[
          { href: "/student/path", label: "Менин жолум" },
          { href: "/student/cards", label: "Билим китеби" },
          { href: "/student/quarters", label: "Чейректик бааларым" },
          { href: "/student/pathways", label: "Мага ылайыктуу кошумча практика" },
          { href: "/student/repetition", label: "Аралык менен кайталоо" },
          { href: "/student/revisions", label: "Мугалимдин пикиринен кийин кайра иштөө" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="flex min-h-12 items-center justify-between gap-3 bg-surface px-4 text-sm font-medium hover:bg-surface-2">
            {l.label}
            <span aria-hidden className="text-muted">→</span>
          </Link>
        ))}
      </nav>

      {coinProfile.available && <CoinProfile {...coinProfile} name={profile.full_name} />}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Аткаруу керек</h2>
        {todo.length === 0 && <p className="text-muted">Азырынча жаңы сабак жок. Мугалимиң сабак жөнөткөндө бул жерде пайда болот.</p>}
        {todo.map((a) => (
          <Link key={a.id} href={`/student/assignments/${a.id}`} className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{a.title}</span>
              {a.live === "live" ? <Chip tone="good">Азыр жүрүп жатат</Chip> : a.live === "paused" ? <Chip tone="warn">Тыныгуу</Chip> : a.live === "waiting" ? <Chip>Мугалим баштаганда ачылат</Chip> : a.live === "ended" ? <Chip>Сабак аяктады</Chip> : a.live === "homework" ? <Chip tone="warn">Үйдө бүтүр</Chip> : a.t ? <Chip tone="accent">{a.t.current_stage}/5 бөлүк</Chip> : <Chip tone="warn">Жаңы</Chip>}
            </div>
            {a.t && <Progress value={(a.t.current_stage / 5) * 100} />}
            <span className="text-sm text-muted">
              {a.classes?.name} · Мөөнөт: {formatDate(a.due_at)}
            </span>
          </Link>
        ))}
      </section>

      {games.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">Оюндар</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {games.map((g) => (
              <Link key={g.id} href={`/student/games/${g.id}`} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2/40">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-medium">{g.set!.title}</span>
                  {g.progress?.rounds ? <Chip tone="good">{g.progress.best_score}%</Chip> : <Chip tone="accent">Жаңы</Chip>}
                </span>
                <span className="text-sm text-muted">
                  {g.set!.count} суроо · {g.classes?.name}
                  {g.due_at ? ` · Мөөнөт: ${formatDate(g.due_at)}` : ""}
                </span>
                <span className="text-sm font-medium text-accent">{g.progress?.rounds ? "Кайра ойноо →" : "Ойноо →"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">Бүткөн сабактар</h2>
          {done.map((a) => (
            <Link key={a.id} href={`/student/assignments/${a.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2/50">
              <span className="font-medium">{a.title}</span>
              <span className="flex shrink-0 items-center gap-2 font-mono text-sm text-muted">
                <Stars n={lessonStars(a.t?.exit_score ?? 0, a.t?.exit_total ?? 0)} />
                {a.t?.exit_score}/{a.t?.exit_total} · {a.t?.xp} XP
              </span>
            </Link>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-medium">Менин бейдждерим</h2>
          <span className="font-mono text-sm text-muted">
            {badges.filter((b) => b.earned).length}/{badges.length}
          </span>
        </div>
        <BadgeGrid badges={badges} seenKey={`ellora:badges:${profile.id}`} collapseLocked />
      </section>

      {boards.map((b) => (
        <section key={b.id} className="flex flex-col gap-3">
          <h2 className="text-base font-medium">{b.weekly ? "Апталык рейтинг" : "Класстын рейтинги"} · {b.name}</h2>
          {b.weekly && <p className="-mt-1.5 text-xs text-muted">Акыркы 7 күн: сабактагы жылдыздар + күнүмдүк кайталоо. Ар жума баары кайра башташат.</p>}
          <Card className="p-3 sm:p-4">
            <Leaderboard rows={b.rows} total={b.total} unit={b.weekly ? "упай" : "XP"} />
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

function Stars({ n }: { n: number }) {
  return (
    <span className="flex" role="img" aria-label={`${n} жылдыз 3төн`}>
      {[1, 2, 3].map((k) => (
        <Icon key={k} name="star" size={14} className={k <= n ? "fill-current text-amber" : "text-line-strong"} />
      ))}
    </span>
  );
}
