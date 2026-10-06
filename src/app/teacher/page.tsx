import { LessonArt } from "@/components/lesson-art";
import { headers } from "next/headers";
import Link from "next/link";
import { CopyButton } from "@/components/teacher-forms";
import { ButtonLink, Card, Chip, cx, PageTitle, Progress } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { blockSummary } from "@/lib/lesson-edit";
import { isGraded, type LessonContent } from "@/lib/lesson-types";
import { daysUntil, dueLabel, formatDate, studentStatus, todayLabel, type AttemptRow } from "@/lib/stats";

export const metadata = { title: "Башкы бет" };

type AssignmentRow = {
  id: string;
  due_at: string | null;
  class_id: string;
  created_at: string;
  lessons: { title: string; content: LessonContent } | null;
  classes: { name: string } | null;
};

type AnswerRow = { attempt_id: string; block_id: string; is_correct: boolean | null; tries: number };

const plain = (s: string) => s.replace(/\*\*|`/g, "");

export default async function TeacherHome() {
  const { supabase, profile } = await requireRole("teacher");

  const [{ data: classes }, { data: members }, { data: assignments }, { data: attempts }, { data: students }, { data: lessons }] =
    await Promise.all([
      supabase.from("classes").select("id, name, join_code").eq("teacher_id", profile.id).order("name"),
      supabase.from("class_members").select("class_id, student_id"),
      supabase
        .from("assignments")
        .select("id, due_at, class_id, created_at, lessons(title, content), classes(name)")
        .order("created_at", { ascending: false })
        .limit(8)
        .returns<AssignmentRow[]>(),
      supabase.from("attempts").select("*").returns<AttemptRow[]>(),
      supabase.from("profiles").select("id, full_name").eq("role", "student"),
      supabase.from("lessons").select("status").eq("author_id", profile.id),
    ]);

  const recentIds = new Set((assignments ?? []).map((a) => a.id));
  const recentAttempts = (attempts ?? []).filter((t) => recentIds.has(t.assignment_id));
  const { data: answers } = recentAttempts.length
    ? await supabase
        .from("answers")
        .select("attempt_id, block_id, is_correct, tries")
        .in(
          "attempt_id",
          recentAttempts.map((t) => t.id),
        )
        .returns<AnswerRow[]>()
    : { data: [] as AnswerRow[] };

  const nameOf = new Map((students ?? []).map((s) => [s.id, s.full_name as string]));
  const membersOf = (cid: string) => (members ?? []).filter((m) => m.class_id === cid);
  const hasClasses = (classes?.length ?? 0) > 0;
  const studentCount = new Set((members ?? []).map((m) => m.student_id)).size;
  const published = (lessons ?? []).filter((l) => l.status === "published").length;
  const drafts = (lessons ?? []).length - published;

  /* ───────── Тапшырмалар ───────── */
  const rows = (assignments ?? [])
    .map((a) => {
      const roster = membersOf(a.class_id);
      const atts = (attempts ?? []).filter((t) => t.assignment_id === a.id);
      const started = new Set(atts.map((t) => t.student_id));
      const done = atts.filter((t) => t.finished_at).length;
      const help = atts.filter((t) => ["help", "stuck"].includes(studentStatus(t))).length;
      const notStarted = roster.filter((m) => !started.has(m.student_id)).map((m) => nameOf.get(m.student_id) ?? "Окуучу");
      return { ...a, total: roster.length, done, help, notStarted };
    })
    // Бүтө элек тапшырмалар өйдө
    .sort((x, y) => Number(x.total > 0 && x.done >= x.total) - Number(y.total > 0 && y.done >= y.total));

  const assignmentOf = new Map((assignments ?? []).map((a) => [a.id, a]));
  const finishedTotal = (attempts ?? []).filter((t) => t.finished_at).length;

  /* ───────── Көңүл буруңуз ───────── */
  const needHelp = (attempts ?? [])
    .filter((t) => ["help", "stuck"].includes(studentStatus(t)))
    .map((t) => ({ ...t, status: studentStatus(t), name: nameOf.get(t.student_id) ?? "Окуучу", a: assignmentOf.get(t.assignment_id) }))
    .filter((t) => t.a)
    .slice(0, 4);

  // Эң кыйын суроо: биринчи аракетте туура жооп бергендердин үлүшү эң аз бааланган блок.
  const attemptOf = new Map(recentAttempts.map((t) => [t.id, t]));
  const byBlock = new Map<string, { n: number; ok: number; assignmentId: string; blockId: string }>();
  for (const r of answers ?? []) {
    const t = attemptOf.get(r.attempt_id);
    if (!t) continue;
    const k = `${t.assignment_id}:${r.block_id}`;
    const s = byBlock.get(k) ?? { n: 0, ok: 0, assignmentId: t.assignment_id, blockId: r.block_id };
    s.n++;
    if (r.is_correct && r.tries === 1) s.ok++;
    byBlock.set(k, s);
  }
  let hardest: { prompt: string; pct: number; n: number; a: AssignmentRow } | null = null;
  for (const s of byBlock.values()) {
    const a = assignmentOf.get(s.assignmentId);
    const block = a?.lessons?.content.stages.flatMap((st) => st.blocks).find((b) => b.id === s.blockId);
    if (!a || !block || !isGraded(block)) continue;
    const pct = Math.round((s.ok / s.n) * 100);
    if (pct < 80 && (!hardest || pct < hardest.pct || (pct === hardest.pct && s.n > hardest.n)))
      hardest = { prompt: plain(blockSummary(block)), pct, n: s.n, a };
  }

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const reminders = rows
    .filter((r) => r.notStarted.length > 0 && (!r.due_at || daysUntil(r.due_at) >= 0))
    .slice(0, 2)
    .map((r) => ({
      ...r,
      text:
        `${r.classes?.name} классынын окуучулары! «${r.lessons?.title}» сабагын ` +
        `${r.due_at ? `${formatDate(r.due_at)} чейин ` : ""}бүтүргүлө.\n` +
        `Кирүү: ${origin}/student-login\n\n` +
        `Азырынча баштай электер: ${r.notStarted.join(", ")}.`,
    }));
  const attentionEmpty = needHelp.length === 0 && !hardest && reminders.length === 0;

  /* ───────── Класстардын орточо exit ticket'и ───────── */
  const avgExit = (cid: string) => {
    const fin = (attempts ?? []).filter((t) => t.finished_at && t.exit_total && (assignments ?? []).some((a) => a.id === t.assignment_id && a.class_id === cid));
    if (!fin.length) return null;
    return Math.round((fin.reduce((s, t) => s + (t.exit_score ?? 0) / t.exit_total!, 0) / fin.length) * 100);
  };

  const firstName = profile.full_name?.split(" ")[0];

  return (
    <>
      <PageTitle eyebrow={todayLabel()} title={firstName ? `Саламатсызбы, ${firstName}!` : "Саламатсызбы!"}>
        <ButtonLink href="/teacher/classes" variant="secondary">
          Класс ачуу
        </ButtonLink>
        <ButtonLink href="/teacher/lessons/new">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Жаңы сабак
        </ButtonLink>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Класс" value={classes?.length ?? 0} href="/teacher/classes" />
        <Stat label="Окуучу" value={studentCount} href="/teacher/classes" />
        <Stat label="Сабак" value={published} sub={drafts ? `+ ${drafts} долбоор` : undefined} href="/teacher/lessons" />
        <Stat label="Бүткөн сабак" value={finishedTotal} sub="окуучулардын аракети" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr] lg:items-start">
        <Card className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-medium">Жүрүп жаткан тапшырмалар</h2>
          {rows.length === 0 && (
            <p className="text-sm text-muted">
              Азырынча тапшырма жок.{" "}
              <Link href="/teacher/lessons" className="font-semibold text-accent hover:underline">
                Сабакты класска жөнөтүңүз
              </Link>{" "}
              — окуучулардын жүрүшү ушул жерде көрүнөт.
            </p>
          )}
          {rows.map((r) => (
            <Link key={r.id} href={`/teacher/assignments/${r.id}`} className="lesson-tile flex flex-col gap-4 rounded-3xl p-5 hover:ring-2 hover:ring-accent">
              <div className="flex items-center gap-4">
                <LessonArt className="hidden w-28 shrink-0 sm:block" />
              <div className="flex flex-1 flex-wrap items-center justify-between gap-2 text-ink">
                <div className="flex flex-col">
                  <span className="font-semibold">{r.lessons?.title}</span>
                  <span className="text-sm text-muted">
                    {r.classes?.name} · {r.due_at ? `Мөөнөт: ${formatDate(r.due_at)}` : "Мөөнөтсүз"}
                  </span>
                </div>
                {r.help > 0 ? (
                  <Chip tone="bad">{r.help} окуучуга жардам керек</Chip>
                ) : r.notStarted.length > 0 ? (
                  <Chip tone="warn">{r.notStarted.length} окуучу баштай элек</Chip>
                ) : r.total > 0 && r.done >= r.total ? (
                  <Chip tone="good">Баары бүтүрдү</Chip>
                ) : r.total === 0 ? (
                  <Chip>Класста окуучу жок</Chip>
                ) : (
                  <Chip tone="good">Жакшы жүрүүдө</Chip>
                )}
              </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Progress value={r.total ? (r.done / r.total) * 100 : 0} />
                </div>
                <span className="font-mono text-sm text-muted tabular-nums">
                  {r.done}/{r.total} бүттү
                </span>
              </div>
            </Link>
          ))}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium">Көңүл буруңуз</h2>
          {attentionEmpty && <p className="text-sm text-muted">Азырынча баары жакшы: жардамга муктаж окуучу жок.</p>}

          {needHelp.map((t) => (
            <Link
              key={t.id}
              href={`/teacher/assignments/${t.assignment_id}`}
              className="flex flex-col gap-0.5 border-b border-surface-2 pb-3 last:border-0 hover:text-accent"
            >
              <span className="font-semibold">
                {t.name} · {t.a?.classes?.name}
              </span>
              <span className="text-sm text-muted">
                {t.status === "stuck"
                  ? `«${t.a?.lessons?.title}» сабагын баштап, бир суткадан ашык бүтүргөн жок.`
                  : `«${t.a?.lessons?.title}»: exit ticket ${t.exit_score}/${t.exit_total}` +
                    (t.confidence ? `, ишеними ${t.confidence}/4` : "") +
                    ". Жеке сүйлөшүү сунушталат."}
              </span>
            </Link>
          ))}

          {hardest && (
            <Link href={`/teacher/assignments/${hardest.a.id}`} className="flex flex-col gap-0.5 border-b border-surface-2 pb-3 last:border-0 hover:text-accent">
              <span className="font-semibold">Эң кыйын суроо</span>
              <span className="text-sm text-muted">
                «{hardest.prompt}» · {hardest.a.classes?.name} класстын {hardest.pct}%ы гана биринчи аракетте туура жооп берди ({hardest.n}{" "}
                окуучу).
              </span>
            </Link>
          )}

          {reminders.map((r) => (
            <div key={r.id} className="flex flex-col gap-0.5 border-b border-surface-2 pb-3 last:border-0">
              <span className="font-semibold">
                {r.classes?.name} · {r.notStarted.length} окуучу баштай элек
              </span>
              <span className="text-sm text-muted">
                «{r.lessons?.title}». {dueLabel(r.due_at)}.
              </span>
              <div className="mt-1.5">
                <CopyButton text={r.text} label="Эскертме көчүрүү" />
              </div>
            </div>
          ))}
        </Card>
      </div>

      {hasClasses && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium">Менин класстарым</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {classes!.map((c) => {
              const avg = avgExit(c.id);
              return (
                <Link key={c.id} href={`/teacher/classes/${c.id}`} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 hover:border-accent">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-xl font-bold">{c.name}</span>
                    <span className="text-sm text-muted">{membersOf(c.id).length} окуучу</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">Кошулуу коду</span>
                    <span className="font-mono text-base tracking-[0.15em]">{c.join_code}</span>
                  </div>
                  <span className="text-[13px] text-muted">{avg === null ? "Натыйжа азырынча жок" : `Орточо exit ticket: ${avg}%`}</span>
                </Link>
              );
            })}
            <Link
              href="/teacher/classes"
              className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line font-semibold text-accent hover:border-accent hover:bg-accent-soft"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Жаңы класс
            </Link>
          </div>
        </section>
      )}
    </>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: number; sub?: string; href?: string }) {
  const body = (
    <>
      <span className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold tabular-nums">{value}</span>
        {sub && <span className="text-xs text-muted">{sub}</span>}
      </span>
    </>
  );
  const cls = "flex flex-col gap-2 rounded-3xl bg-surface-2 px-5 py-5";
  return href ? (
    <Link href={href} className={cx(cls, "hover:border-accent")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
