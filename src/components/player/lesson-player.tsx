"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BugHunt,
  CodeExample,
  CodeTask,
  Confidence,
  Mcq,
  Open,
  Parsons,
  type AnswerFn,
  type SavedAnswer,
} from "@/components/player/blocks";
import { Button, cx, RichText } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { isGraded, isInteractive, STAGE_META, type Block, type LessonContent } from "@/lib/lesson-types";
import { warmUpPython } from "@/lib/python";

type Attempt = { id: string; current_stage: number; xp: number; exit_score: number | null; exit_total: number | null };

type Props = {
  title: string;
  content: LessonContent;
  backHref: string;
  /** Окуучу режими: жооптор базага сакталат. Жок болсо — мугалимдин алдын ала көрүүсү. */
  attempt?: Attempt;
  initialAnswers?: Record<string, SavedAnswer>;
};

export function LessonPlayer({ title, content, backHref, attempt, initialAnswers = {} }: Props) {
  const preview = !attempt;
  const stages = content.stages;
  const [answers, setAnswers] = useState<Record<string, SavedAnswer>>(initialAnswers);
  const [unlocked, setUnlocked] = useState(attempt?.current_stage ?? 0); // 5 = бүттү
  const [xp, setXp] = useState(attempt?.xp ?? 0);
  const [view, setView] = useState(Math.min(attempt?.current_stage ?? 0, stages.length - 1));
  const [saveError, setSaveError] = useState(false);
  const [finished, setFinished] = useState<{ score: number; total: number } | null>(
    attempt && attempt.current_stage >= stages.length ? { score: attempt.exit_score ?? 0, total: attempt.exit_total ?? 0 } : null,
  );
  const supabase = useMemo(() => (preview ? null : createClient()), [preview]);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stages.some((s) => s.blocks.some((b) => b.type === "code_task" || (b.type === "code_example" && b.runnable)))) {
      const t = setTimeout(warmUpPython, 1500);
      return () => clearTimeout(t);
    }
  }, [stages]);

  const stageDone = useCallback(
    (i: number, a: Record<string, SavedAnswer>) => {
      const st = stages[i];
      const exit = st.key === "exit";
      return st.blocks.filter(isInteractive).every((b) => {
        const ans = a[b.id];
        if (!ans) return false;
        return exit || !isGraded(b) ? true : ans.is_correct === true;
      });
    },
    [stages],
  );

  const persist = useCallback(
    async (fn: () => PromiseLike<{ error: unknown }>) => {
      if (!supabase) return;
      const { error } = await fn();
      setSaveError(!!error);
    },
    [supabase],
  );

  /** Бөлүктү бүтүрүп, кийинкисин ачат. Акыркы бөлүк (exit ticket) болсо — натыйжаны эсептейт. */
  const completeStage = (stageIdx: number, all: Record<string, SavedAnswer>, currentXp: number) => {
    const patch: Record<string, unknown> = {};
    const newStage = stageIdx + 1;
    setUnlocked(newStage);
    patch.current_stage = newStage;
    if (newStage >= stages.length) {
      const exit = stages[stageIdx];
      const mcqs = exit.blocks.filter((b) => b.type === "mcq");
      const score = mcqs.filter((b) => all[b.id]?.is_correct).length;
      const conf = exit.blocks.find((b) => b.type === "confidence");
      const total = currentXp + 20;
      Object.assign(patch, {
        exit_score: score,
        exit_total: mcqs.length,
        confidence: conf ? ((all[conf.id]?.response.value as number) ?? null) : null,
        finished_at: new Date().toISOString(),
        xp: total,
      });
      setXp(total);
      setFinished({ score, total: mcqs.length });
    } else if (newStage > view) {
      setTimeout(() => go(newStage), 900);
    }
    return patch;
  };

  const onAnswer = (stageIdx: number, block: Block): AnswerFn => (response, isCorrect) => {
    const prev = answers[block.id];
    const next: SavedAnswer = { response, is_correct: isCorrect, tries: (prev?.tries ?? 0) + 1 };
    const all = { ...answers, [block.id]: next };
    setAnswers(all);

    let gained = 0;
    if (isCorrect && !prev?.is_correct && "xp" in block && block.xp && stages[stageIdx].key !== "exit") gained = block.xp;
    const newXp = xp + gained;
    if (gained) setXp(newXp);

    let patch: Record<string, unknown> = {};
    const autoAdvance = stages[stageIdx].key !== "exit";
    if (autoAdvance && stageIdx === unlocked && stageDone(stageIdx, all)) patch = completeStage(stageIdx, all, newXp);
    if (gained && patch.xp === undefined) patch.xp = newXp;

    if (!attempt) return;
    void persist(() =>
      supabase!.from("answers").upsert({
        attempt_id: attempt.id,
        block_id: block.id,
        stage: stageIdx,
        response,
        is_correct: isCorrect,
        tries: next.tries,
        updated_at: new Date().toISOString(),
      }),
    ).then(() => {
      if (Object.keys(patch).length) void persist(() => supabase!.from("attempts").update(patch).eq("id", attempt.id));
    });
  };

  /** Интерактивдүү блогу жок бөлүк же exit ticket'ти тапшыруу баскычы үчүн. */
  const manualComplete = () => {
    const patch = completeStage(view, answers, xp);
    if (attempt) void persist(() => supabase!.from("attempts").update(patch).eq("id", attempt.id));
  };

  const go = (i: number) => {
    setView(i);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const st = stages[view];
  const canNext = view < stages.length - 1 && (preview || unlocked > view);
  const isExit = st.key === "exit";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-4 pb-16 sm:px-6" ref={topRef}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="text-sm font-semibold text-accent">
          ← Артка
        </Link>
        <div className="flex items-center gap-2">
          {preview && <span className="rounded-full bg-amber-soft px-2.5 py-1 text-xs font-semibold text-amber">Алдын ала көрүү · жооптор сакталбайт</span>}
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1 text-sm">
            <b className="rounded-full bg-amber-soft px-2.5 py-0.5 font-mono whitespace-nowrap text-amber">{xp} XP</b>
          </span>
        </div>
      </header>
      <h1 className="font-display text-xl font-bold sm:text-2xl">{title}</h1>

      <nav aria-label="Сабактын бөлүктөрү" className="sticky top-0 z-10 -mx-4 bg-bg px-4 py-2 sm:-mx-6 sm:px-6">
        <ol className="grid grid-cols-5 gap-1.5">
          {stages.map((s, i) => {
            const locked = !preview && i > unlocked;
            const done = preview ? false : i < unlocked;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => go(i)}
                  aria-current={i === view ? "step" : undefined}
                  className={cx(
                    "flex w-full flex-col items-start gap-0.5 overflow-hidden rounded-[10px] border bg-surface px-2 py-1.5 text-left sm:px-2.5 sm:py-2",
                    i === view ? "border-accent shadow-[inset_0_-3px_0_var(--color-accent)]" : "border-line",
                    locked && "opacity-45",
                  )}
                >
                  <span className="font-mono text-[11px] text-muted">
                    {i + 1}/5 {done && <span className="font-bold text-good">✓</span>}
                  </span>
                  <span className="w-full truncate text-xs font-semibold sm:text-sm">{STAGE_META[s.key].label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${(Math.min(unlocked, stages.length) / stages.length) * 100}%` }} />
        </div>
      </nav>

      {saveError && (
        <p role="alert" className="rounded-[10px] bg-bad-soft px-4 py-2.5 text-sm text-bad">
          Жооп сакталган жок. Интернетти текшерип, кайра аракет кыл.
        </p>
      )}

      {finished && isExit ? (
        <FinishCard score={finished.score} total={finished.total} xp={xp} backHref={backHref} preview={preview} />
      ) : (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-[0.07em] text-muted uppercase">
              {view + 1}-бөлүк · {STAGE_META[st.key].label} · ~{st.minutes} мүн
            </span>
            <h2 className="font-display text-xl font-bold">{st.title}</h2>
            {st.intro && <p className="text-muted">{st.intro}</p>}
          </div>

          {st.blocks.map((b) => (
            <div key={b.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
              {renderBlock(b, answers[b.id], onAnswer(view, b), isExit)}
            </div>
          ))}

          {view === unlocked && (isExit || !st.blocks.some(isInteractive)) && (
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={manualComplete} disabled={!stageDone(view, answers)}>
                {isExit ? "Билетти тапшыруу" : "Түшүндүм, улантуу"}
              </Button>
              {isExit && !stageDone(view, answers) && <span className="text-sm text-muted">Бардык суроолорго жооп бер.</span>}
            </div>
          )}
        </section>
      )}

      <div className="flex justify-between gap-3">
        <Button variant="secondary" disabled={view === 0} onClick={() => go(view - 1)}>
          ← Мурунку
        </Button>
        {view < stages.length - 1 && (
          <Button disabled={!canNext} onClick={() => go(view + 1)}>
            {canNext ? "Кийинки бөлүк →" : "Тапшырмаларды бүтүр"}
          </Button>
        )}
      </div>
    </div>
  );
}

function renderBlock(b: Block, saved: SavedAnswer | undefined, onAnswer: AnswerFn, exitMode: boolean) {
  switch (b.type) {
    case "text":
      return (
        <>
          {b.title && <h3 className="font-semibold">{b.title}</h3>}
          <RichText text={b.body} />
        </>
      );
    case "code_example":
      return <CodeExample block={b} />;
    case "mcq":
      return <Mcq block={b} saved={saved} onAnswer={onAnswer} exitMode={exitMode} />;
    case "code_task":
      return <CodeTask block={b} saved={saved} onAnswer={onAnswer} />;
    case "parsons":
      return <Parsons block={b} saved={saved} onAnswer={onAnswer} />;
    case "bug_hunt":
      return <BugHunt block={b} saved={saved} onAnswer={onAnswer} />;
    case "open":
      return <Open block={b} saved={saved} onAnswer={onAnswer} />;
    case "confidence":
      return <Confidence block={b} saved={saved} onAnswer={onAnswer} />;
  }
}

function FinishCard({ score, total, xp, backHref, preview }: { score: number; total: number; xp: number; backHref: string; preview: boolean }) {
  const msg = score === total ? "Мыкты! Тема толук өздөштүрүлдү." : score >= total / 2 ? "Жакшы натыйжа." : "Бул теманы дагы бир кайталап алалы.";
  return (
    <section className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-surface p-6">
      <span className="font-display text-5xl font-bold text-accent tabular-nums">
        {score}/{total}
      </span>
      <h2 className="font-display text-xl font-bold">{msg}</h2>
      <p className="text-muted">
        {preview ? "Алдын ала көрүү: окуучу ушул экранды көрөт." : `Жоопторуң мугалимге жөнөтүлдү. Бул сабактан ${xp} XP топтодуң.`}
      </p>
      <Link href={backHref} className="font-semibold text-accent">
        {preview ? "Сабакка кайтуу →" : "Сабактарыма кайтуу →"}
      </Link>
    </section>
  );
}
