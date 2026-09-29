"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { completeStage, submitAnswer, type Progress } from "@/app/actions/student";
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
import { EXIT_BONUS_XP, exitResult, stageDone } from "@/lib/grading";
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
  // Окуучу режиминде блоктор жооптон кийин серверден жаңыланат (туура жооп ачылат).
  const [stages, setStages] = useState(content.stages);
  const [answers, setAnswers] = useState<Record<string, SavedAnswer>>(initialAnswers);
  const [unlocked, setUnlocked] = useState(attempt?.current_stage ?? 0); // 5 = бүттү
  const [xp, setXp] = useState(attempt?.xp ?? 0);
  const [view, setView] = useState(Math.min(attempt?.current_stage ?? 0, stages.length - 1));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState<{ score: number; total: number } | null>(
    attempt && attempt.current_stage >= stages.length ? { score: attempt.exit_score ?? 0, total: attempt.exit_total ?? 0 } : null,
  );
  const topRef = useRef<HTMLDivElement>(null);
  /** Серверге жооптор ирети менен жөнөтүлөт — XP жана бөлүк туура эсептелсин. */
  const queue = useRef<Promise<void>>(Promise.resolve());
  const unlockedRef = useRef(unlocked);

  useEffect(() => {
    if (content.stages.some((s) => s.blocks.some((b) => b.type === "code_task" || (b.type === "code_example" && b.runnable)))) {
      const t = setTimeout(warmUpPython, 1500);
      return () => clearTimeout(t);
    }
  }, [content.stages]);

  const go = (i: number) => {
    setView(i);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** Сервердин жообу — чечүүчү: XP, ачылган бөлүк жана натыйжа ушундан алынат. */
  const send = (blockId: string | null, fn: () => Promise<Progress>) => {
    queue.current = queue.current.then(async () => {
      const r = await fn().catch((): Progress => ({ error: "Жооп сакталган жок. Интернетти текшерип, кайра аракет кыл." }));
      if (r.error) {
        if (blockId) setFailed((f) => ({ ...f, [blockId]: (f[blockId] ?? 0) + 1 }));
        return setSaveError(r.error);
      }
      setSaveError(null);
      if (blockId && r.answer) setAnswers((a) => ({ ...a, [blockId]: r.answer! }));
      // Чечилгенде сервер блоктун ачык көрүнүшүн жиберет (туура жооп, түшүндүрмө…).
      if (r.block) {
        const nb = r.block;
        setStages((all) => all.map((st) => ({ ...st, blocks: st.blocks.map((b) => (b.id === nb.id ? nb : b)) })));
      }
      if (r.xp !== undefined) setXp(r.xp);
      if (r.finished) setFinished(r.finished);
      if (r.current_stage !== undefined) {
        const next = r.current_stage;
        if (next > unlockedRef.current && next < stages.length) setTimeout(() => go(next), 900);
        unlockedRef.current = next;
        setUnlocked(next);
      }
    });
  };

  /* ───── Алдын ала көрүү: баары браузерде, эч нерсе сакталбайт ───── */
  const previewAdvance = (stageIdx: number, all: Record<string, SavedAnswer>, currentXp: number) => {
    const newStage = stageIdx + 1;
    setUnlocked(newStage);
    if (newStage >= stages.length) {
      const r = exitResult({ ...content, stages }, all);
      setXp(currentXp + EXIT_BONUS_XP);
      setFinished({ score: r.score, total: r.total });
    } else if (newStage > view) setTimeout(() => go(newStage), 900);
  };

  const onAnswer = (stageIdx: number, block: Block): AnswerFn => (response, isCorrect) => {
    const prev = answers[block.id];
    const all = { ...answers, [block.id]: { response, is_correct: isCorrect, tries: (prev?.tries ?? 0) + 1 } };

    if (attempt) {
      // Туура жообу жашырылган блокто сервердин чечимин күтөбүз; калгандарын дароо көрсөтөбүз.
      if (!(isGraded(block) && isCorrect === null)) setAnswers(all);
      return send(block.id, () => submitAnswer(attempt.id, block.id, response));
    }
    setAnswers(all);

    const gained = isCorrect && !prev?.is_correct && "xp" in block && block.xp && stages[stageIdx].key !== "exit" ? block.xp : 0;
    const newXp = xp + gained;
    if (gained) setXp(newXp);
    if (stages[stageIdx].key !== "exit" && stageIdx === unlocked && stageDone(stages[stageIdx], all)) previewAdvance(stageIdx, all, newXp);
  };

  /** Интерактивдүү блогу жок бөлүк же exit ticket'ти тапшыруу баскычы үчүн. */
  const manualComplete = () => {
    if (attempt) return send(null, () => completeStage(attempt.id, view));
    previewAdvance(view, answers, xp);
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
          {saveError}
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
              {renderBlock(b, answers[b.id], onAnswer(view, b), isExit, failed[b.id])}
            </div>
          ))}

          {view === unlocked && (isExit || !st.blocks.some(isInteractive)) && (
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={manualComplete} disabled={!stageDone(st, answers)}>
                {isExit ? "Билетти тапшыруу" : "Түшүндүм, улантуу"}
              </Button>
              {isExit && !stageDone(st, answers) && <span className="text-sm text-muted">Бардык суроолорго жооп бер.</span>}
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

function renderBlock(b: Block, saved: SavedAnswer | undefined, onAnswer: AnswerFn, exitMode: boolean, failed?: number) {
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
      return <Mcq block={b} saved={saved} onAnswer={onAnswer} exitMode={exitMode} failed={failed} />;
    case "code_task":
      return <CodeTask block={b} saved={saved} onAnswer={onAnswer} />;
    case "parsons":
      return <Parsons block={b} saved={saved} onAnswer={onAnswer} failed={failed} />;
    case "bug_hunt":
      return <BugHunt block={b} saved={saved} onAnswer={onAnswer} failed={failed} />;
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
