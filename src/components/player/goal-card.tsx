"use client";

import { useState, useTransition } from "react";
import { submitGoalCheck } from "@/app/actions/student";
import { Icon } from "@/components/icons";
import { Button, cx } from "@/components/ui";

/** Сабактын башы: «Бүгүнкү максат» жана «Ийгилик критерийлери». Мугалим ушуну тактада да түшүндүрөт. */
export function GoalCard({ objectives, criteria }: { objectives: string[]; criteria: string[] }) {
  return (
    <section aria-label="Бүгүнкү максат" className="flex flex-col gap-4 rounded-lg border border-accent/30 bg-surface p-4 shadow-xs sm:p-5">
      {objectives.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 font-medium text-accent-dark"><Icon name="target" size={18} className="text-accent" /> Бүгүнкү максат</h2>
          <ul className="flex flex-col gap-1.5 pl-1">
            {objectives.map((x) => <li key={x} className="flex gap-2 text-[15px]"><span aria-hidden className="text-accent">•</span>{x}</li>)}
          </ul>
        </div>
      )}
      {criteria.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <h3 className="text-sm font-medium">Сабактын аягында мен…</h3>
          <ul className="flex flex-col gap-1.5">
            {criteria.map((x) => <li key={x} className="flex gap-2 text-sm"><Icon name="check" size={16} className="mt-0.5 text-good" />{x}</li>)}
          </ul>
          <p className="text-xs text-muted">Сабактын аягында ушул тизме боюнча өзүңдү баалайсың.</p>
        </div>
      )}
    </section>
  );
}

/** Exit: ар бир критерий боюнча «кыла алам / азырынча жок». Баага кирбейт — мугалимге жардам керек жерди көрсөтөт. */
export function GoalCheck({ criteria, attemptId, initial }: { criteria: string[]; attemptId?: string; initial: boolean[] | null }) {
  const [met, setMet] = useState<(boolean | null)[]>(() => initial ?? criteria.map(() => null));
  const [saved, setSaved] = useState(!!initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ready = met.every((v) => v !== null);
  const set = (i: number, v: boolean) => {
    setMet((m) => m.map((x, k) => (k === i ? v : x)));
    setSaved(false);
  };
  const save = () =>
    start(async () => {
      setError(null);
      if (!attemptId) return setSaved(true); // алдын ала көрүү: сакталбайт
      const r = await submitGoalCheck(attemptId, met);
      if (r.error) setError(r.error);
      else setSaved(true);
    });

  return (
    <section aria-label="Максатка жеттимби" className="flex flex-col gap-3 rounded-lg border border-accent/30 bg-surface p-4 shadow-xs sm:p-5">
      <h2 className="flex items-center gap-2 font-medium"><Icon name="target" size={18} className="text-accent" /> Максатка жеттимби?</h2>
      <p className="text-sm text-muted">Чынчыл белгиле — бул баага кирбейт. Мугалим ким эмнеге жардам керек экенин көрөт.</p>
      <ul className="flex flex-col gap-3">
        {criteria.map((c, i) => (
          <li key={c} className="flex flex-col gap-2 rounded-md border border-line p-3">
            <span className="text-[15px]">{c}</span>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label={c}>
              <button type="button" aria-pressed={met[i] === true} onClick={() => set(i, true)} className={cx("min-h-11 rounded-md border px-3 text-sm font-medium", met[i] === true ? "border-good bg-good-soft text-good" : "border-line-strong bg-surface hover:bg-surface-2")}>
                ✓ Кыла алам
              </button>
              <button type="button" aria-pressed={met[i] === false} onClick={() => set(i, false)} className={cx("min-h-11 rounded-md border px-3 text-sm font-medium", met[i] === false ? "border-amber bg-amber-soft text-amber" : "border-line-strong bg-surface hover:bg-surface-2")}>
                Азырынча жок
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" disabled={!ready || pending || saved} onClick={save}>{pending ? "Сакталууда…" : saved ? "Сакталды" : "Белгилеп бүттүм"}</Button>
        {saved && <span role="status" className="text-sm text-good">Рахмат! Мугалимиң көрөт.</span>}
        {error && <span role="alert" className="text-sm text-bad">{error}</span>}
      </div>
    </section>
  );
}
