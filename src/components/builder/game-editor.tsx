"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { ensureGameSet } from "@/app/actions/game-sets";
import type { GameBlock } from "@/lib/lesson-types";

/** Конструктордо тандала турган оюндар: мугалимдин топтомдору жана али көчүрүлө элек даяр оюндар. */
export type GameOptions = { own: { id: string; title: string; count: number; source: string | null }[]; templates: { slug: string; title: string; count: number; grade: number }[] };
export const GameOptionsContext = createContext<GameOptions>({ own: [], templates: [] });

const selectCls = "min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-base shadow-xs lg:min-h-9 lg:text-sm";

export function GameEditor({ block, onChange }: { block: GameBlock; onChange: (b: GameBlock) => void }) {
  const options = useContext(GameOptionsContext);
  const [own, setOwn] = useState(options.own);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const copied = new Set(own.map((o) => o.source));
  const templates = options.templates.filter((t) => !copied.has(t.slug));

  const pick = (value: string) => {
    setError(null);
    if (value.startsWith("own:")) {
      const set = own.find((o) => o.id === value.slice(4));
      if (set) onChange({ ...block, setId: set.id, title: set.title });
      return;
    }
    if (!value.startsWith("tpl:")) return;
    const slug = value.slice(4);
    start(async () => {
      const r = await ensureGameSet(slug);
      if (!r.id || !r.title) return setError(r.error ?? "Оюн сакталган жок.");
      const t = options.templates.find((x) => x.slug === slug);
      setOwn((list) => (list.some((o) => o.id === r.id) ? list : [...list, { id: r.id!, title: r.title!, count: t?.count ?? 0, source: slug }]));
      onChange({ ...block, setId: r.id, title: r.title });
    });
  };

  const current = own.find((o) => o.id === block.setId);
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Оюн
        <select className={selectCls} value={current ? `own:${current.id}` : ""} disabled={pending} onChange={(e) => pick(e.target.value)}>
          <option value="">— Оюнду тандаңыз —</option>
          {own.length > 0 && (
            <optgroup label="Менин оюндарым">
              {own.map((o) => <option key={o.id} value={`own:${o.id}`}>{o.title} · {o.count} суроо</option>)}
            </optgroup>
          )}
          {templates.length > 0 && (
            <optgroup label="Даяр оюндар">
              {templates.map((t) => <option key={t.slug} value={`tpl:${t.slug}`}>{t.title} · {t.grade}-класс · {t.count} суроо</option>)}
            </optgroup>
          )}
        </select>
      </label>
      {pending && <p className="text-sm text-muted">Оюн даярдалууда…</p>}
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      {block.setId && !current && !pending && <p className="text-sm text-bad">Тандалган оюн табылган жок. Башка оюн тандаңыз.</p>}
      <p className="text-sm text-muted">
        Окуучу оюнду ушул бөлүктүн ичинде ойнойт. Ката кетирилген суроо кайра чыгат; бардык суроо туура чечилгенде бөлүк аткарылды деп эсептелет.
        Оюндун натыйжасы баага кошулбайт.
      </p>
    </div>
  );
}
