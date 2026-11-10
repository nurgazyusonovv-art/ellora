"use client";

import { Button } from "@/components/ui";
import { STATIONS, type KnowledgeCard, type Quest } from "@/lib/quest";
import { STAGE_KEYS } from "@/lib/lesson-types";

const inputCls = "w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-[15px] text-ink shadow-xs placeholder:text-muted/70";
const label = "flex flex-col gap-1.5 text-sm font-medium";

/** Сабак — бир миссия: окуя жана билим карталары (2-этап). Окуя/карта кошулбаса сабак мурункудай көрүнөт. */
export function QuestEditor({ quest, cards, onChange }: { quest?: Quest; cards?: KnowledgeCard[]; onChange: (next: { quest?: Quest; cards?: KnowledgeCard[] }) => void }) {
  const list = cards ?? [];
  const setCard = (i: number, patch: Partial<KnowledgeCard>) => onChange({ quest, cards: list.map((k, j) => (j === i ? { ...k, ...patch } : k)) });
  const nextId = () => {
    let n = list.length + 1;
    while (list.some((k) => k.id === `k${n}`)) n++;
    return `k${n}`;
  };

  return (
    <details className="rounded-lg border border-line bg-surface" open={!!quest || list.length > 0}>
      <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-medium">
        Миссия жана билим карталары {quest || list.length ? "" : "(кошумча)"}
      </summary>
      <div className="flex flex-col gap-5 border-t border-line p-4">
        <p className="text-sm text-muted">
          Окуя кошулса, 5 бөлүк окуучуга бекет болуп көрүнөт: {STAGE_KEYS.map((k) => STATIONS[k]).join(" → ")}. Билим карталары окуучу Түшүндүрүү бөлүгүн бүткөндө ачылат жана анын «Билим китебине» кошулат.
        </p>

        {quest ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>Миссиянын аталышы<input className={inputCls} maxLength={150} value={quest.title} onChange={(e) => onChange({ quest: { ...quest, title: e.target.value }, cards })} placeholder="Мисалы: Мектептин коңгуроосун программала" /></label>
            <label className={label}>Максат<input className={inputCls} maxLength={500} value={quest.goal} onChange={(e) => onChange({ quest: { ...quest, goal: e.target.value }, cards })} placeholder="Окуучу эмнеге жетиши керек?" /></label>
            <label className={`${label} sm:col-span-2`}>Окуя (2–3 сүйлөм)<textarea className={inputCls} rows={3} maxLength={1500} value={quest.story} onChange={(e) => onChange({ quest: { ...quest, story: e.target.value }, cards })} /></label>
            <Button type="button" variant="ghost" className="self-start text-xs" onClick={() => onChange({ cards })}>Окуяны алып салуу</Button>
          </div>
        ) : (
          <Button type="button" variant="secondary" className="self-start" onClick={() => onChange({ quest: { title: "", story: "", goal: "" }, cards })}>+ Окуя (миссия) кошуу</Button>
        )}

        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium">Билим карталары · {list.length}/3</span>
          {list.map((k, i) => (
            <fieldset key={k.id} className="grid gap-3 rounded-md border border-line p-3 sm:grid-cols-2">
              <label className={`${label} sm:col-span-2`}>Картанын аталышы<input className={inputCls} maxLength={120} value={k.title} onChange={(e) => setCard(i, { title: e.target.value })} placeholder="Мисалы: if шарты" /></label>
              <label className={label}>Эреже<textarea className={inputCls} rows={3} maxLength={600} value={k.rule} onChange={(e) => setCard(i, { rule: e.target.value })} /></label>
              <label className={label}>Мисал<textarea className={inputCls} rows={3} maxLength={600} value={k.example} onChange={(e) => setCard(i, { example: e.target.value })} placeholder="`код` же кыска мисал" /></label>
              <Button type="button" variant="ghost" className="self-start text-xs" onClick={() => onChange({ quest, cards: list.filter((_, j) => j !== i) })}>Картаны өчүрүү</Button>
            </fieldset>
          ))}
          {list.length < 3 && (
            <Button type="button" variant="secondary" className="self-start" onClick={() => onChange({ quest, cards: [...list, { id: nextId(), title: "", rule: "", example: "" }] })}>+ Билим картасы</Button>
          )}
        </div>
      </div>
    </details>
  );
}
