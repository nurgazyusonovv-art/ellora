"use client";

import { useState, useTransition } from "react";
import { saveGameSet, type SaveSetState } from "@/app/actions/game-sets";
import { Icon } from "@/components/icons";
import { Button, FormError, cx } from "@/components/ui";
import type { ChoiceQuestion, GameQuestion } from "@/lib/game-questions";
import { OPTION_STYLES } from "@/lib/live-colors";
import { DEFAULT_TIME, TIME_OPTIONS } from "@/lib/live-game";

const input = "w-full min-w-0 rounded-md border border-line-strong bg-surface px-3 py-2 text-[15px] shadow-xs placeholder:text-muted/70";

const newQuestion = (questions: GameQuestion[]): ChoiceQuestion => {
  let n = questions.length + 1;
  while (questions.some((q) => q.id === `q${n}`)) n++;
  return { id: `q${n}`, type: "choice", prompt: "", options: ["", ""], correct: 0, time: DEFAULT_TIME };
};

/**
 * Оюн түзүү: тест суроолору (жандуу оюн жана машыгуу). Даяр оюндан көчүрүлгөн башка түрдөгү суроолор
 * (жуп, иреттөө, топко бөлүү) сакталат, бирок бул жерде өзгөртүлбөйт жана жандуу оюнда ойнолбойт.
 */
export function GameSetEditor({ id, initialTitle, initialQuestions }: { id: string; initialTitle: string; initialQuestions: GameQuestion[] }) {
  const [title, setTitle] = useState(initialTitle);
  const [questions, setQuestions] = useState<GameQuestion[]>(initialQuestions);
  const [state, setState] = useState<SaveSetState>(undefined);
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);

  const change = (next: GameQuestion[]) => {
    setQuestions(next);
    setDirty(true);
    setState(undefined);
  };
  const patch = (i: number, p: Partial<ChoiceQuestion>) => change(questions.map((q, j) => (j === i && q.type === "choice" ? { ...q, ...p } : q)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= questions.length) return;
    const next = [...questions];
    [next[i], next[j]] = [next[j], next[i]];
    change(next);
  };
  const save = () =>
    start(async () => {
      const cleaned = questions.map((q) => (q.type === "choice" ? { ...q, code: q.code?.trim() ? q.code : undefined, explain: q.explain?.trim() ? q.explain : undefined } : q));
      const r = await saveGameSet(id, title, cleaned);
      setState(r);
      if (r?.ok) setDirty(false);
    });

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Оюндун аты
        <input className={cx(input, "text-lg font-medium")} maxLength={150} value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
      </label>

      <ol className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <li key={q.id} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{i + 1}-суроо</span>
              <span className="flex-1" />
              <button type="button" aria-label="Жогору" onClick={() => move(i, -1)} disabled={i === 0} className="grid size-9 place-items-center rounded-md border border-line text-muted hover:bg-surface-2 disabled:opacity-40"><Icon name="arrow" size={14} className="-rotate-90" /></button>
              <button type="button" aria-label="Ылдый" onClick={() => move(i, 1)} disabled={i === questions.length - 1} className="grid size-9 place-items-center rounded-md border border-line text-muted hover:bg-surface-2 disabled:opacity-40"><Icon name="arrow" size={14} className="rotate-90" /></button>
              <button type="button" onClick={() => change(questions.filter((_, j) => j !== i))} disabled={questions.length === 1} className="min-h-9 rounded-md px-2.5 text-xs text-muted hover:bg-bad-soft hover:text-bad disabled:opacity-40">Өчүрүү</button>
            </div>

            {q.type !== "choice" ? (
              <p className="rounded-md border border-dashed border-line-strong bg-surface-2 p-3 text-sm text-muted">
                «{q.prompt}» — бул суроонун түрү машыгуу үчүн гана (жандуу оюнда ойнолбойт) жана бул жерде өзгөртүлбөйт.
              </p>
            ) : (
              <>
                <textarea className={input} rows={2} maxLength={1000} placeholder="Суроо" value={q.prompt} onChange={(e) => patch(i, { prompt: e.target.value })} />
                <details open={!!q.code}>
                  <summary className="min-h-9 cursor-pointer text-sm text-muted">Код кошуу (милдеттүү эмес)</summary>
                  <textarea className={cx(input, "mt-2 font-mono text-sm")} rows={3} maxLength={1500} placeholder="print(2 + 2)" value={q.code ?? ""} onChange={(e) => patch(i, { code: e.target.value })} />
                </details>
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((o, k) => (
                    <div key={k} className={cx("flex items-center gap-2 rounded-md border p-2", q.correct === k ? "border-good bg-good-soft" : "border-line")}>
                      <span className={cx("grid size-8 shrink-0 place-items-center rounded-md border font-mono text-sm font-semibold", OPTION_STYLES[k].tile)}>{OPTION_STYLES[k].letter}</span>
                      <input className={cx(input, "py-1.5")} maxLength={300} placeholder={`${k + 1}-вариант`} value={o} onChange={(e) => patch(i, { options: q.options.map((x, j) => (j === k ? e.target.value : x)) })} />
                      <label className="flex shrink-0 items-center gap-1 text-xs text-muted" title="Туура жооп">
                        <input type="radio" name={`correct-${q.id}`} checked={q.correct === k} onChange={() => patch(i, { correct: k })} className="size-4 accent-good" />
                        Туура
                      </label>
                      {q.options.length > 2 && (
                        <button type="button" aria-label="Вариантты өчүрүү" onClick={() => patch(i, { options: q.options.filter((_, j) => j !== k), correct: q.correct === k ? 0 : q.correct > k ? q.correct - 1 : q.correct })} className="grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-bad-soft hover:text-bad">×</button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {q.options.length < 4 && <Button type="button" variant="ghost" className="text-xs" onClick={() => patch(i, { options: [...q.options, ""] })}>+ Вариант</Button>}
                  <label className="flex items-center gap-2 text-sm text-muted">
                    Убакыт
                    <select className="min-h-9 rounded-md border border-line-strong bg-surface px-2 text-sm" value={q.time ?? DEFAULT_TIME} onChange={(e) => patch(i, { time: Number(e.target.value) })}>
                      {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t} сек</option>)}
                    </select>
                  </label>
                </div>
                <input className={cx(input, "text-sm")} maxLength={1000} placeholder="Түшүндүрмө (жооптон кийин көрсөтүлөт, милдеттүү эмес)" value={q.explain ?? ""} onChange={(e) => patch(i, { explain: e.target.value })} />
              </>
            )}
          </li>
        ))}
      </ol>

      <Button type="button" variant="secondary" className="self-start" onClick={() => change([...questions, newQuestion(questions)])} disabled={questions.length >= 40}>
        + Суроо кошуу
      </Button>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface/95 p-3 shadow-xs backdrop-blur">
        <Button type="button" onClick={save} disabled={pending}>{pending ? "Сакталууда…" : "Сактоо"}</Button>
        <span className="text-sm text-muted">{questions.length} суроо{dirty ? " · сакталбаган өзгөртүүлөр бар" : ""}</span>
        {state?.ok && <span role="status" className="text-sm text-good">{state.ok}</span>}
      </div>
      <FormError message={state?.error} />
      {state?.issues && (
        <ul className="list-disc rounded-md border border-bad/25 bg-bad-soft py-2 pr-3 pl-7 text-sm text-bad">
          {state.issues.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
    </div>
  );
}
