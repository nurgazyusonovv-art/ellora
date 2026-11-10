"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { answerReview } from "@/app/actions/review";
import { CodeView } from "@/components/code";
import { Icon } from "@/components/icons";
import { Progress, RichText, cx } from "@/components/ui";
import type { ReviewQuestion } from "@/lib/review-data";

/** Күнүмдүк кайталоо: бир суроого бир аракет, андан кийин туура жооп жана түшүндүрмө. */
export function ReviewQuiz({ questions: initial, streak: initialStreak }: { questions: ReviewQuestion[]; streak: number }) {
  const [questions, setQuestions] = useState(initial);
  const [streak, setStreak] = useState(initialStreak);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const answered = questions.filter((q) => q.result).length;
  const done = answered === questions.length;
  const score = questions.filter((q) => q.result?.correct).length;

  const pick = (q: ReviewQuestion, i: number) => {
    if (q.result || pending) return;
    setError(null);
    start(async () => {
      const r = await answerReview(q.index, i);
      if (r.error || r.correct === undefined || r.correctIndex === undefined) return setError(r.error ?? "Жооп сакталган жок.");
      setQuestions((list) => list.map((x) => (x.index === q.index ? { ...x, result: { picked: i, correct: r.correct!, correctIndex: r.correctIndex!, explain: r.explain } } : x)));
      if (typeof r.streak === "number") setStreak(r.streak);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex-1"><Progress value={(answered / questions.length) * 100} tone="good" /></div>
        <span className="font-mono text-sm text-muted tabular-nums">{answered}/{questions.length}</span>
      </div>

      {questions.map((q, n) => (
        <section key={q.index} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-xs sm:p-5" aria-label={`${n + 1}-суроо`}>
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{n + 1}-суроо · {q.title}</span>
          <RichText text={q.prompt} className="font-medium" />
          {q.code && <CodeView code={q.code} />}
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((o, i) => {
              const r = q.result;
              const state = r ? (i === r.correctIndex ? "good" : i === r.picked ? "bad" : "idle") : "idle";
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!!r || pending}
                  onClick={() => pick(q, i)}
                  className={cx(
                    "flex min-h-11 items-center gap-3 rounded-md border px-3.5 py-2.5 text-left break-words transition-colors",
                    q.mono && "font-mono",
                    state === "good" ? "border-good bg-good-soft text-good" : state === "bad" ? "border-bad bg-bad-soft text-bad" : "border-line-strong bg-surface hover:border-accent hover:bg-accent-soft/40",
                    r && state === "idle" && "opacity-60",
                  )}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded border border-current/30 font-mono text-xs">{String.fromCharCode(65 + i)}</span>
                  {o}
                </button>
              );
            })}
          </div>
          {q.result && (
            <div role="status" className={cx("rounded-md border p-3 text-sm", q.result.correct ? "border-good/25 bg-good-soft text-good" : "border-amber/25 bg-amber-soft text-amber")}>
              <p className="font-medium">{q.result.correct ? "Туура — эсиңде калыптыр!" : "Туура эмес. Туура жоопту карап, эсиңе түйүп ал."}</p>
              {q.result.explain && <RichText text={q.result.explain} className="mt-1.5 text-ink" />}
            </div>
          )}
        </section>
      ))}

      {error && <p role="alert" className="rounded-md border border-bad/25 bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}

      {done && (
        <section className="flex flex-col items-start gap-3 rounded-lg border border-good/25 bg-good-soft p-5" role="status">
          <p className="flex items-center gap-2 font-medium text-good"><Icon name="flame" size={20} /> Бүгүнкү кайталоо бүттү: {score}/{questions.length}</p>
          <p className="text-sm text-ink">Серия: <b>{streak}</b> күн катары менен. Эртең кайра кел — мээ эстеген сайын билим бекемделет.</p>
          <Link href="/student" className="text-sm font-medium text-accent hover:underline">Башкы бетке →</Link>
        </section>
      )}
    </div>
  );
}
