"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { answerGameQuestion, finishGameRound, type GameAnswerResult, type RoundResult } from "@/app/actions/game-sets";
import { CodeView } from "@/components/code";
import { Icon } from "@/components/icons";
import { Button, cx, Progress, RichText } from "@/components/ui";
import type { Reveal, StudentQuestion } from "@/lib/game-questions";

/** Ката кетирилген суроо ушунча суроодон кийин кайра чыгат. */
const RETRY_GAP = 2;

const newRound = () => crypto.randomUUID();

type Feedback = { correct: boolean; reveal: Reveal; explain?: string; response: Record<string, unknown> };

/** Жоопту баалоо жана раундду жабуу. Демейки — сервер аракеттери; `/lab/game` демосу өзүнүн ишин берет. */
export type GameApi = {
  answer: (roundId: string, questionId: string, response: Record<string, unknown>) => Promise<GameAnswerResult>;
  finish: (roundId: string) => Promise<RoundResult>;
};

export function GamePlayer({ assignmentId, title, questions, best, backHref, api, embedded }: { assignmentId: string; title: string; questions: StudentQuestion[]; best: number | null; backHref: string; api?: GameApi; embedded?: boolean }) {
  const answer = api?.answer ?? ((round, qid, response) => answerGameQuestion(assignmentId, round, qid, response));
  const finish = api?.finish ?? ((round) => finishGameRound(assignmentId, round));
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const [roundId, setRoundId] = useState(newRound);
  const [queue, setQueue] = useState(() => questions.map((q) => q.id));
  const [solved, setSolved] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [pending, start] = useTransition();
  const [attempt, setAttempt] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);

  const current = queue[0] ? byId.get(queue[0]) : undefined;
  const total = questions.length;

  const submit = (response: Record<string, unknown>) => {
    if (!current || pending) return;
    setError(null);
    start(async () => {
      const r: GameAnswerResult = await answer(roundId, current.id, response);
      if (r.error || r.correct === undefined || !r.reveal) return setError(r.error ?? "Жооп сакталган жок.");
      setFeedback({ correct: r.correct, reveal: r.reveal, explain: r.explain, response });
      setStreak((s) => (r.correct ? s + 1 : 0));
    });
  };

  const next = () => {
    if (!feedback || !current) return;
    const rest = queue.slice(1);
    let nextQueue = rest;
    if (feedback.correct) setSolved((n) => n + 1);
    else {
      nextQueue = [...rest.slice(0, RETRY_GAP), current.id, ...rest.slice(RETRY_GAP)];
      setMissed((m) => (m.includes(current.id) ? m : [...m, current.id]));
    }
    setFeedback(null);
    setAttempt((n) => n + 1);
    setQueue(nextQueue);
    if (nextQueue.length === 0)
      start(async () => {
        setResult(await finish(roundId));
      });
  };

  const restart = () => {
    setRoundId(newRound());
    setQueue(questions.map((q) => q.id));
    setSolved(0);
    setStreak(0);
    setFeedback(null);
    setResult(null);
    setError(null);
    setMissed([]);
    setAttempt((n) => n + 1);
  };

  if (queue.length === 0)
    return (
      <Shell title={title} backHref={backHref} solved={total} total={total} streak={streak} embedded={embedded}>
        <section className="flex flex-col items-start gap-4 rounded-lg border border-line bg-surface p-5 shadow-xs sm:p-6" aria-live="polite">
          {!result ? (
            <p className="text-muted">Жыйынтык эсептелүүдө…</p>
          ) : result.error ? (
            <>
              <p role="alert" className="text-bad">{result.error}</p>
              <Button onClick={() => start(async () => setResult(await finish(roundId)))}>Кайра аракет кылуу</Button>
            </>
          ) : (
            <>
              <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                <Icon name="trophy" size={14} className="text-amber" /> Раунд бүттү
              </span>
              <span className="font-mono text-5xl font-medium tracking-tight text-accent tabular-nums">{result.score}%</span>
              <p>
                Биринчи аракетте туура: <b>{result.firstTry}/{result.total}</b>. Калган суроолорду кайра чечип, баарын бүтүрдүң.
              </p>
              {typeof result.best === "number" && <p className="text-sm text-muted">Эң жакшы натыйжаң: {result.best}%</p>}
              <div className="flex flex-wrap gap-2.5">
                <Button onClick={restart}>
                  <Icon name="repeat" size={16} /> Кайра ойноо
                </Button>
                {!embedded && (
                  <Link href={backHref} className="inline-flex min-h-11 items-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium shadow-xs hover:bg-surface-2 lg:min-h-9">
                    Башкы бетке
                  </Link>
                )}
              </div>
            </>
          )}
        </section>
      </Shell>
    );

  if (!current) return null;
  const retry = missed.includes(current.id);

  return (
    <Shell title={title} backHref={backHref} solved={solved} total={total} streak={streak} best={best} embedded={embedded}>
      <section key={`${current.id}-${attempt}`} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{TYPE_LABEL[current.type]}</span>
          {retry && <span className="rounded-full border border-amber/25 bg-amber-soft px-2 py-0.5 text-xs font-medium text-amber">Кайра аракет</span>}
        </div>
        <RichText text={current.prompt} className="text-[17px] font-medium" />
        {current.type === "choice" && <Choice q={current} feedback={feedback} disabled={pending} onSubmit={submit} />}
        {current.type === "match" && <Match q={current} feedback={feedback} disabled={pending} onSubmit={submit} />}
        {current.type === "order" && <Order q={current} feedback={feedback} disabled={pending} onSubmit={submit} />}
        {current.type === "sort" && <Sort q={current} feedback={feedback} disabled={pending} onSubmit={submit} />}
        {error && <p role="alert" className="rounded-md border border-bad/25 bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
        {feedback && (
          <div role="status" className={cx("flex flex-col gap-3 rounded-md border p-3.5", feedback.correct ? "border-good/25 bg-good-soft" : "border-amber/25 bg-amber-soft")}>
            <p className={cx("flex items-center gap-2 font-medium", feedback.correct ? "text-good" : "text-amber")}>
              {feedback.correct ? <Icon name="check" size={18} /> : <Icon name="repeat" size={18} />}
              {feedback.correct ? (streak >= 3 ? `Туура! ${streak} катары менен` : "Туура!") : "Туура эмес. Туура жоопту карап ал — бул суроо кайра чыгат."}
            </p>
            {feedback.explain && <RichText text={feedback.explain} className="text-sm text-ink" />}
            <Button onClick={next} className="self-start" autoFocus>
              {queue.length === 1 && feedback.correct ? "Жыйынтыкты көрүү" : "Кийинки суроо"} <Icon name="arrow" size={16} />
            </Button>
          </div>
        )}
      </section>
    </Shell>
  );
}

const TYPE_LABEL: Record<StudentQuestion["type"], string> = { choice: "Тест", match: "Жуп табуу", order: "Иреттөө", sort: "Топторго бөлүү" };

function Shell({ title, backHref, solved, total, streak, best, embedded, children }: { title: string; backHref: string; solved: number; total: number; streak: number; best?: number | null; embedded?: boolean; children: React.ReactNode }) {
  if (embedded)
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex min-w-0 flex-1 items-center gap-2 font-medium"><Icon name="trophy" size={16} className="shrink-0 text-amber" />{title}</span>
          {streak >= 2 && <span className="flex items-center gap-1 rounded-full border border-amber/25 bg-amber-soft px-2 py-0.5 font-mono text-xs font-medium text-amber"><Icon name="flame" size={12} /> {streak}</span>}
          {typeof best === "number" && <span className="rounded-full border border-line-strong bg-surface px-2 py-0.5 font-mono text-xs text-muted">Рекорд {best}%</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1"><Progress value={(solved / total) * 100} tone="good" /></div>
          <span className="font-mono text-sm text-muted tabular-nums">{solved}/{total}</span>
        </div>
        {children}
      </div>
    );
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-4 px-4 pt-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Link href={backHref} className="flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">← Артка</Link>
        <div className="flex items-center gap-2">
          {streak >= 2 && (
            <span className="flex items-center gap-1 rounded-full border border-amber/25 bg-amber-soft px-2.5 py-0.5 font-mono text-sm font-medium text-amber" aria-label={`${streak} туура жооп катары менен`}>
              <Icon name="flame" size={14} /> {streak}
            </span>
          )}
          {typeof best === "number" && <span className="rounded-full border border-line-strong bg-surface px-2.5 py-0.5 font-mono text-xs text-muted">Рекорд {best}%</span>}
        </div>
      </header>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-medium sm:text-2xl">{title}</h1>
        <div className="flex items-center gap-3">
          <div className="flex-1"><Progress value={(solved / total) * 100} tone="good" /></div>
          <span className="font-mono text-sm text-muted tabular-nums">{solved}/{total}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

type QProps<T extends StudentQuestion["type"]> = { q: Extract<StudentQuestion, { type: T }>; feedback: Feedback | null; disabled: boolean; onSubmit: (r: Record<string, unknown>) => void };

const optionCls = "flex min-h-12 w-full min-w-0 items-center gap-3 rounded-md border px-3.5 py-2.5 text-left text-[15px] transition-colors break-words";

function Choice({ q, feedback, disabled, onSubmit }: QProps<"choice">) {
  const reveal = feedback?.reveal.type === "choice" ? feedback.reveal : null;
  const picked = feedback?.response.pick;
  return (
    <div className="flex flex-col gap-3">
      {q.code && <CodeView code={q.code} />}
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((o, i) => {
          const state = reveal ? (i === reveal.correct ? "good" : i === picked ? "bad" : "idle") : "idle";
          return (
            <button
              key={i}
              type="button"
              disabled={disabled || !!feedback}
              onClick={() => onSubmit({ pick: i })}
              className={cx(
                optionCls,
                state === "good" ? "border-good bg-good-soft text-good" : state === "bad" ? "border-bad bg-bad-soft text-bad" : "border-line-strong bg-surface hover:border-accent hover:bg-accent-soft/40",
                feedback && state === "idle" && "opacity-60",
              )}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded border border-current/30 font-mono text-xs">{String.fromCharCode(65 + i)}</span>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Match({ q, feedback, disabled, onSubmit }: QProps<"match">) {
  const [picks, setPicks] = useState<number[]>(() => q.lefts.map(() => -1));
  const [active, setActive] = useState<number | null>(0);
  const reveal = feedback?.reveal.type === "match" ? feedback.reveal : null;
  const locked = disabled || !!feedback;
  const chooseRight = (k: number) => {
    if (locked || active === null) return;
    const next = picks.map((p) => (p === k ? -1 : p));
    next[active] = k;
    setPicks(next);
    const empty = next.findIndex((p) => p < 0);
    setActive(empty >= 0 ? empty : null);
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Сол жактагы сапты танда, анан ага дал келген вариантты бас.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <ol className="flex flex-col gap-2">
          {q.lefts.map((l, i) => {
            const ok = reveal ? reveal.picks[i] === picks[i] : null;
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => setActive(i)}
                  aria-pressed={active === i}
                  className={cx(optionCls, "flex-col items-start gap-1", ok === true ? "border-good bg-good-soft" : ok === false ? "border-bad bg-bad-soft" : active === i && !locked ? "border-accent bg-accent-soft/60 ring-1 ring-accent/30" : "border-line-strong bg-surface")}
                >
                  <span className="font-medium">{l}</span>
                  <span className={cx("text-sm", picks[i] < 0 ? "text-muted" : "text-ink")}>
                    {picks[i] < 0 ? "— тандала элек" : `→ ${q.rights[picks[i]]}`}
                  </span>
                  {ok === false && <span className="text-sm text-good">Туурасы: {q.rights[reveal!.picks[i]]}</span>}
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-col gap-2" aria-label="Варианттар">
          {q.rights.map((r, k) => {
            const used = picks.includes(k);
            return (
              <button key={k} type="button" disabled={locked || active === null} onClick={() => chooseRight(k)} className={cx(optionCls, used ? "border-line bg-surface-2 text-muted" : "border-line-strong bg-surface hover:border-accent hover:bg-accent-soft/40")}>
                {r}
              </button>
            );
          })}
        </div>
      </div>
      {!feedback && (
        <Button className="self-start" disabled={locked || picks.some((p) => p < 0)} onClick={() => onSubmit({ picks })}>
          Текшерүү
        </Button>
      )}
    </div>
  );
}

function Order({ q, feedback, disabled, onSubmit }: QProps<"order">) {
  const [order, setOrder] = useState<number[]>([]);
  const reveal = feedback?.reveal.type === "order" ? feedback.reveal : null;
  const locked = disabled || !!feedback;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Кадамдарды туура иретте бас. Тандалган кадамды кайра бассаң, ал тизмеден чыгат.</p>
      <ol aria-label="Сен түзгөн ирет" className="flex min-h-14 flex-col gap-2 rounded-md border border-dashed border-line-strong bg-surface-2 p-2">
        {order.length === 0 && <li className="px-1.5 py-2 text-sm text-muted">Биринчи кадамды төмөндөн танда.</li>}
        {order.map((k, i) => {
          const ok = reveal ? reveal.order[i] === k : null;
          return (
            <li key={k}>
              <button type="button" disabled={locked} onClick={() => setOrder(order.filter((x) => x !== k))} className={cx(optionCls, ok === true ? "border-good bg-good-soft" : ok === false ? "border-bad bg-bad-soft" : "border-accent/40 bg-surface")}>
                <span className="grid size-6 shrink-0 place-items-center rounded bg-accent font-mono text-xs text-white">{i + 1}</span>
                {q.steps[k]}
              </button>
            </li>
          );
        })}
      </ol>
      {!feedback && (
        <div className="flex flex-col gap-2" aria-label="Тандала элек кадамдар">
          {q.steps.map((s, k) =>
            order.includes(k) ? null : (
              <button key={k} type="button" disabled={locked} onClick={() => setOrder([...order, k])} className={cx(optionCls, "border-line-strong bg-surface hover:border-accent hover:bg-accent-soft/40")}>
                {s}
              </button>
            ),
          )}
        </div>
      )}
      {reveal && !feedback?.correct && (
        <div className="rounded-md border border-line bg-surface-2 p-3 text-sm">
          <p className="mb-1.5 font-medium">Туура ирет:</p>
          <ol className="list-decimal pl-5">{reveal.order.map((k) => <li key={k}>{q.steps[k]}</li>)}</ol>
        </div>
      )}
      {!feedback && (
        <Button className="self-start" disabled={locked || order.length !== q.steps.length} onClick={() => onSubmit({ order })}>
          Текшерүү
        </Button>
      )}
    </div>
  );
}

function Sort({ q, feedback, disabled, onSubmit }: QProps<"sort">) {
  const [groups, setGroups] = useState<number[]>(() => q.items.map(() => -1));
  const [active, setActive] = useState<number | null>(0);
  const reveal = feedback?.reveal.type === "sort" ? feedback.reveal : null;
  const locked = disabled || !!feedback;
  const place = (c: number) => {
    if (locked || active === null) return;
    const next = [...groups];
    next[active] = c;
    setGroups(next);
    const empty = next.findIndex((g) => g < 0);
    setActive(empty >= 0 ? empty : null);
  };
  const chip = (i: number) => {
    const ok = reveal ? reveal.groups[i] === groups[i] : null;
    return (
      <button
        key={i}
        type="button"
        disabled={locked}
        onClick={() => setActive(i)}
        aria-pressed={active === i}
        className={cx(
          "min-h-10 max-w-full rounded-md border px-3 py-1.5 text-left text-sm break-words transition-colors",
          ok === true ? "border-good bg-good-soft text-good" : ok === false ? "border-bad bg-bad-soft text-bad" : active === i && !locked ? "border-accent bg-accent-soft ring-1 ring-accent/30" : "border-line-strong bg-surface",
        )}
      >
        {q.items[i]}
        {ok === false && <span className="block text-xs text-ink">→ {q.categories[reveal!.groups[i]]}</span>}
      </button>
    );
  };
  const unplaced = q.items.map((_, i) => i).filter((i) => groups[i] < 0);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Объектти танда, анан анын тобун бас. Жайгашкан объектти басып, башка топко которсоң болот.</p>
      {unplaced.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-md border border-dashed border-line-strong bg-surface-2 p-2.5" aria-label="Жайгаштырыла элек объекттер">
          {unplaced.map(chip)}
        </div>
      )}
      <div className={cx("grid gap-2.5", q.categories.length > 2 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {q.categories.map((name, c) => (
          <div key={c} className="flex min-w-0 flex-col gap-2 rounded-md border border-line bg-surface p-2.5">
            <button type="button" disabled={locked || active === null} onClick={() => place(c)} className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-accent/25 bg-accent-soft px-3 text-left text-sm font-medium text-accent-dark hover:bg-accent-soft/70 disabled:opacity-100">
              {name}
              {active !== null && !locked && <span className="font-mono text-xs">+ кошуу</span>}
            </button>
            <div className="flex flex-wrap gap-1.5">{q.items.map((_, i) => (groups[i] === c ? chip(i) : null))}</div>
          </div>
        ))}
      </div>
      {!feedback && (
        <Button className="self-start" disabled={locked || groups.some((g) => g < 0)} onClick={() => onSubmit({ groups })}>
          Текшерүү
        </Button>
      )}
    </div>
  );
}
