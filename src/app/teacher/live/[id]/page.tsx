import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveStatus, LiveSync, OnlineCount, OnlineDot } from "@/components/live-sync";
import { Icon } from "@/components/icons";
import { LiveControls } from "@/components/live-controls";
import { LessonReportCard } from "@/components/lesson-report";
import { lessonReport } from "@/lib/live-report";
import { BoardButtons, HideAnswer } from "@/components/board-controls";
import { Card, Chip, cx, Progress } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { liveState, type Delivery, type LiveState } from "@/lib/classroom";
import { blockSummary } from "@/lib/lesson-edit";
import { readLiveSession } from "@/lib/live-session";
import { isGraded, isInteractive, stageMeta, type LessonContent } from "@/lib/lesson-types";

export const metadata = { title: "Жандуу сабак" };

type A = { id: string; class_id: string; delivery?: Delivery; lessons: { title: string; content: LessonContent } | null; classes: { name: string } | null };
type Att = { id: string; student_id: string; current_stage: number; finished_at: string | null; exit_score: number | null; exit_total: number | null };
type Ans = { attempt_id: string; block_id: string; is_correct: boolean | null; tries: number; response: Record<string, unknown> | null; updated_at: string | null };

const STATE: Record<LiveState, { label: string; tone: "neutral" | "good" | "warn" | "accent" }> = {
  waiting: { label: "Башталган жок", tone: "neutral" },
  self: { label: "Өз алдынча режим", tone: "neutral" },
  live: { label: "Жүрүп жатат", tone: "good" },
  paused: { label: "Тыныгуу", tone: "warn" },
  ended: { label: "Бүттү", tone: "accent" },
  homework: { label: "Үйдө бүтүрүүдө", tone: "accent" },
};

const ago = (iso: string | null) => {
  if (!iso) return null;
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "азыр эле" : m < 60 ? `${m} мүн мурун` : null;
};

export default async function LiveLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("teacher");
  // 0018 иштетиле элек болсо `delivery` жок — мурунку дайындама катары окулат.
  const first = await supabase.from("assignments").select("id, class_id, delivery, lessons(title, content), classes(name)").eq("id", id).maybeSingle<A>();
  const a = first.error ? (await supabase.from("assignments").select("id, class_id, lessons(title, content), classes(name)").eq("id", id).maybeSingle<A>()).data : first.data;
  if (!a?.lessons) notFound();
  const content = a.lessons.content;

  const [session, { data: members }, { data: attempts }] = await Promise.all([
    readLiveSession(supabase, id).catch(() => null),
    supabase.from("class_members").select("student_id, profiles(full_name)").eq("class_id", a.class_id).returns<{ student_id: string; profiles: { full_name: string } | null }[]>(),
    supabase.from("attempts").select("id, student_id, current_stage, finished_at, exit_score, exit_total").eq("assignment_id", id).returns<Att[]>(),
  ]);
  const ids = (attempts ?? []).map((t) => t.id);
  const { data: answers } = ids.length
    ? await supabase.from("answers").select("attempt_id, block_id, is_correct, tries, response, updated_at").in("attempt_id", ids).returns<Ans[]>()
    : { data: [] as Ans[] };

  const state = liveState(a.delivery ?? "self", session);
  const stage = session?.max_stage ?? 0;
  const running = state === "live" || state === "paused";
  const st = content.stages[stage];
  const stageBlocks = st.blocks.filter((b) => isInteractive(b));
  // Такта (0020): мугалим кайсы тапшырманы проекторго чыгарганы.
  const spot = (session ?? {}) as { spotlight_block?: string | null; spotlight_reveal?: boolean; spotlight_hidden?: string[] | null };
  const spotBlock = spot.spotlight_block ? content.stages.flatMap((x) => x.blocks).find((b) => b.id === spot.spotlight_block) : undefined;
  const hiddenSet = new Set(spot.spotlight_hidden ?? []);
  const stageIds = new Set(stageBlocks.map((b) => b.id));
  const attemptOf = new Map((attempts ?? []).map((t) => [t.student_id, t]));

  const students = (members ?? [])
    .map((m) => {
      const t = attemptOf.get(m.student_id);
      const mine = (answers ?? []).filter((x) => x.attempt_id === t?.id);
      const last = mine.reduce<string | null>((acc, x) => (x.updated_at && (!acc || x.updated_at > acc) ? x.updated_at : acc), null);
      const done = !!t && (!!t.finished_at || t.current_stage > stage);
      // Учурдагы бөлүктө туура эмес жооп бар же 3 жолудан ашык аракет — мугалимдин көңүлү керек.
      const struggling = !done && mine.some((x) => stageIds.has(x.block_id) && x.is_correct === false && x.tries >= 2);
      const behind = !!t && !t.finished_at && t.current_stage < stage;
      return { id: m.student_id, name: m.profiles?.full_name || "Окуучу", t, done, struggling, behind, last };
    })
    .sort((x, y) => Number(y.struggling) - Number(x.struggling) || Number(!!x.t) - Number(!!y.t) || Number(x.done) - Number(y.done) || x.name.localeCompare(y.name, "ky"));
  const joined = students.filter((s) => s.t).length;
  const doneN = students.filter((s) => s.done).length;

  const blockStats = stageBlocks.map((b) => {
    const rows = (answers ?? []).filter((x) => x.block_id === b.id);
    const right = rows.filter((x) => x.is_correct === true).length;
    const options = b.type === "mcq" ? b.options.map((o, k) => ({ o, k, n: rows.filter((x) => x.response?.picked === k).length, correct: k === b.correct })) : null;
    return { b, n: rows.length, right, graded: isGraded(b), options };
  });

  return (
    <LiveSync assignmentId={id} teacherId={profile.id} active={running}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Link href={`/teacher/assignments/${id}`} className="text-sm font-medium text-muted hover:text-ink">← Натыйжалар барагы</Link>
        <span className="flex items-center gap-4">
          <LiveStatus />
          <a href={`/board/${id}`} target="_blank" rel="noopener" className="text-sm font-medium text-accent hover:underline">Тактаны ачуу ↗</a>
        </span>
      </div>
      <header className="flex flex-col gap-2 border-b border-line pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{a.classes?.name} · Жандуу сабак</span>
          <Chip tone={STATE[state].tone}>{STATE[state].label}</Chip>
        </div>
        <h1 className="text-2xl font-medium sm:text-[28px]">{a.lessons.title}</h1>
      </header>

      {session?.timed && !session.ended ? (
        <Card className="text-sm">
          Бул сабак жалпы таймер менен жүрүп жатат. Аны <Link href={`/teacher/assignments/${id}`} className="font-medium text-accent">натыйжалар барагынан</Link> башкарыңыз.
        </Card>
      ) : (
        <Card className="sticky top-[calc(var(--mobile-header-height,0px)+0.5rem)] z-10 flex flex-col gap-3 shadow-xs lg:top-4">
          <LiveControls assignmentId={id} state={state} stage={stage} stages={content.stages.map((s) => stageMeta(content, s.key).label)} />
        </Card>
      )}

      {(state === "ended" || state === "homework") && (
        <LessonReportCard
          homework={state === "homework"}
          report={lessonReport({
            content,
            members: (members ?? []).map((m) => ({ id: m.student_id, name: m.profiles?.full_name || "Окуучу" })),
            attempts: attempts ?? [],
            answers: answers ?? [],
            startedAt: session?.started_at,
            endedAt: session?.ended_at,
          })}
        />
      )}

      {state === "waiting" && (
        <p className="rounded-lg border border-accent/20 bg-accent-soft p-4 text-sm text-ink">
          Окуучулар сабакты ачса, «Мугалим баштаганда ачылат» деген күтүү экранын көрүшөт. «Сабакты баштоо» баскан замат 1-бөлүк баарына ачылат.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Онлайн · кошулду</span>
          <span className="font-mono text-2xl font-medium tabular-nums"><OnlineCount ids={students.map((s) => s.id)} /></span>
          <span className="text-xs text-muted">Сабакка кошулду: {joined}/{students.length}</span>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{running ? `${stage + 1}-бөлүктү бүттү` : "Сабакты бүттү"}</span>
          <span className="font-mono text-2xl font-medium tabular-nums">{running ? doneN : students.filter((s) => s.t?.finished_at).length}/{students.length}</span>
          {running && <Progress value={students.length ? (doneN / students.length) * 100 : 0} tone="good" />}
        </Card>
        <Card className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Көңүл буруңуз</span>
          <span className="font-mono text-2xl font-medium tabular-nums">{students.filter((s) => s.struggling || s.behind).length}</span>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <section className="flex flex-col gap-3" aria-label="Окуучулар">
          <h2 className="text-base font-medium">Окуучулар</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {students.map((s) => (
              <li
                key={s.id}
                className={cx(
                  "flex min-w-0 items-center gap-3 rounded-lg border p-3",
                  s.struggling ? "border-bad/30 bg-bad-soft" : s.done ? "border-good/25 bg-good-soft" : "border-line bg-surface",
                  !s.t && "opacity-70",
                )}
              >
                <span className={cx("relative grid size-8 shrink-0 place-items-center rounded-md border text-sm font-semibold", s.done ? "border-good/30 text-good" : "border-line text-muted")}>
                  {s.done ? <Icon name="check" size={16} /> : s.name.slice(0, 1)}
                  <OnlineDot id={s.id} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <Link href={`/teacher/students/${s.id}`} className="truncate text-sm font-medium hover:text-accent">{s.name}</Link>
                  <span className="truncate text-xs text-muted">
                    {!s.t ? "Кошула элек"
                      : s.t.finished_at ? "Сабакты бүттү"
                      : s.struggling ? "Кыйналып жатат"
                      : s.behind ? `Артта: ${s.t.current_stage + 1}-бөлүктө`
                      : s.done ? "Бөлүктү бүттү"
                      : "Иштеп жатат"}
                    {s.last && ago(s.last) ? ` · ${ago(s.last)}` : ""}
                  </span>
                </span>
              </li>
            ))}
            {students.length === 0 && <li className="text-sm text-muted">Класста окуучу жок.</li>}
          </ul>
        </section>

        <section className="flex flex-col gap-3" aria-label="Учурдагы бөлүктүн тапшырмалары">
          <h2 className="text-base font-medium">{stage + 1}-бөлүк: {stageMeta(content, st.key).label}</h2>
          {spotBlock && running && !stageBlocks.some((b) => b.id === spotBlock.id) && (
            <Card className="flex flex-col gap-2 border-accent/30">
              <p className="text-sm"><span className="text-muted">Тактада (башка бөлүктөн):</span> {blockSummary(spotBlock)}</p>
              <BoardButtons assignmentId={id} blockId={spotBlock.id} active reveal={!!spot.spotlight_reveal} canReveal={spotBlock.type === "mcq"} />
            </Card>
          )}
          {spotBlock && running && (spotBlock.type === "open" || spotBlock.type === "investigation") && (
            <Card className="flex flex-col gap-2">
              <p className="text-sm font-medium">Тактадагы жооптор</p>
              <p className="text-xs text-muted">Тактада аттар көрүнбөйт. Ылайыксыз жоопту жашырыңыз.</p>
              <ul className="flex flex-col divide-y divide-line">
                {(answers ?? [])
                  .filter((x) => x.block_id === spotBlock.id && x.response)
                  .map((x) => {
                    const who = (attempts ?? []).find((t) => t.id === x.attempt_id);
                    const name = (members ?? []).find((m) => m.student_id === who?.student_id)?.profiles?.full_name ?? "Окуучу";
                    const r = x.response as Record<string, unknown>;
                    const text = String((spotBlock.type === "open" ? r.text : r.conclusion || r.prediction) ?? "").trim();
                    if (!text) return null;
                    const hidden = hiddenSet.has(x.attempt_id);
                    return (
                      <li key={x.attempt_id} className={cx("flex items-start gap-3 py-2.5", hidden && "opacity-60")}>
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="font-medium">{name}:</span> <span className="break-words">{text}</span>
                        </span>
                        <HideAnswer assignmentId={id} attemptId={x.attempt_id} hidden={hidden} />
                      </li>
                    );
                  })}
              </ul>
            </Card>
          )}
          {blockStats.length === 0 && <p className="text-sm text-muted">Бул бөлүктө жооп талап кылган тапшырма жок.</p>}
          {blockStats.map(({ b, n, right, graded, options }) => (
            <Card key={b.id} className="flex flex-col gap-2.5">
              <p className="text-sm font-medium">{blockSummary(b)}</p>
              {running && <BoardButtons assignmentId={id} blockId={b.id} active={spot.spotlight_block === b.id} reveal={!!spot.spotlight_reveal} canReveal={b.type === "mcq"} />}
              <div className="flex items-center gap-3">
                <div className="flex-1"><Progress value={students.length ? (n / students.length) * 100 : 0} /></div>
                <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                  {n}/{students.length} жооп{graded && n ? ` · ${Math.round((right / n) * 100)}% туура` : ""}
                </span>
              </div>
              {options && n > 0 && (
                <ul className="flex flex-col gap-1.5 border-t border-line pt-2.5">
                  {options.map(({ o, k, n: c, correct }) => (
                    <li key={k} className="flex items-center gap-2 text-xs">
                      <span className={cx("w-5 shrink-0 font-mono", correct ? "text-good" : "text-muted")}>{String.fromCharCode(65 + k)}</span>
                      <span className="min-w-0 flex-1 truncate">{o}</span>
                      <span className="w-20 shrink-0"><Progress value={(c / n) * 100} tone={correct ? "good" : "bad"} /></span>
                      <span className="w-6 shrink-0 text-right font-mono tabular-nums text-muted">{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </section>
      </div>
    </LiveSync>
  );
}
