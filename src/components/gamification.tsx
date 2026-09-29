"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { cx } from "@/components/ui";
import type { Badge } from "@/lib/badges";

/**
 * Бейдждер. `seenKey` берилсе (окуучунун өз барагы) — мурун көрүлбөгөн бейдж «Жаңы!» деп белгиленет
 * (localStorage — ар бир браузерде өзүнчө; жок болсо белгисиз эле көрүнөт).
 */
export function BadgeGrid({ badges, seenKey, collapseLocked }: { badges: Badge[]; seenKey?: string; collapseLocked?: boolean }) {
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(!collapseLocked);

  useEffect(() => {
    if (!seenKey) return;
    try {
      const earned = badges.filter((b) => b.earned).map((b) => b.id);
      const raw = localStorage.getItem(seenKey);
      const seen = new Set<string>(raw ? JSON.parse(raw) : []);
      // Биринчи жолу ачканда баарын «көрүлдү» деп эсептейбиз — эски бейдждер «жаңы» болуп калбасын.
      if (raw) setFresh(new Set(earned.filter((id) => !seen.has(id))));
      localStorage.setItem(seenKey, JSON.stringify(earned));
    } catch {
      /* localStorage жок — «Жаңы!» белгиси жок эле көрүнөт */
    }
  }, [badges, seenKey]);

  const earned = badges.filter((b) => b.earned);
  // Алына электер — максатка эң жакындары биринчи.
  const locked = badges.filter((b) => !b.earned).sort((a, b) => b.progress.value / b.progress.target - a.progress.value / a.progress.target);
  const shownLocked = showAll ? locked : locked.slice(0, 3);

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {[...earned, ...shownLocked].map((b) => (
          <li
            key={b.id}
            className={cx("relative flex items-center gap-3 rounded-xl border p-3", b.earned ? "border-line bg-surface" : "border-dashed border-line bg-bg")}
            title={b.how}
          >
            <span
              className={cx(
                "grid size-11 shrink-0 place-items-center rounded-full",
                b.earned ? "bg-amber-soft text-amber ring-2 ring-[#f3c66e]" : "bg-surface-2 text-muted",
              )}
            >
              <Icon name={b.earned ? b.icon : "lock"} size={20} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className={cx("text-sm leading-tight font-semibold", !b.earned && "text-muted")}>{b.title}</span>
              {b.earned ? (
                <span className="text-xs leading-snug text-muted">{b.how}</span>
              ) : (
                <>
                  <span className="text-xs leading-snug text-muted">{b.how}</span>
                  {b.progress.target > 1 && (
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${(b.progress.value / b.progress.target) * 100}%` }} />
                      </span>
                      <span className="font-mono text-[11px] text-muted tabular-nums">
                        {b.progress.value}/{b.progress.target}
                      </span>
                    </span>
                  )}
                </>
              )}
            </span>
            {fresh.has(b.id) && (
              <span className="absolute -top-2 -right-1.5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">Жаңы!</span>
            )}
          </li>
        ))}
      </ul>
      {collapseLocked && locked.length > 3 && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="min-h-11 self-start text-sm font-semibold text-accent hover:underline">
          {showAll ? "Азыраак көрсөтүү" : `Дагы ${locked.length - 3} бейдж`}
        </button>
      )}
    </div>
  );
}

export type BoardRow = { id: string; name: string; xp: number; finished: number; rank: number; me?: boolean };

const MEDAL = ["bg-[#f3c66e] text-[#5e4104]", "bg-[#d5deda] text-ink", "bg-[#e8c3a0] text-[#6b3d14]"];

/** Класстык рейтинг. `rows` — көрсөтүлө турган саптар (окуучуга: алгачкы 5 + өзү). */
export function Leaderboard({ rows, total }: { rows: BoardRow[]; total: number }) {
  if (!rows.length) return <p className="text-sm text-muted">Класста азырынча окуучу жок.</p>;
  return (
    <ol className="flex flex-col">
      {rows.map((r, i) => (
        <li key={r.id} className="contents">
          {i > 0 && r.me && r.rank > rows[i - 1].rank + 1 && (
            <span aria-hidden className="py-1 text-center text-muted">
              ⋯
            </span>
          )}
          <span
            className={cx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5",
              r.me ? "bg-accent-soft font-semibold" : "border-b border-surface-2 last:border-0",
            )}
          >
            <span
              className={cx(
                "grid size-8 shrink-0 place-items-center rounded-full font-mono text-sm font-semibold",
                r.rank <= 3 && r.xp > 0 ? MEDAL[r.rank - 1] : "bg-surface-2 text-muted",
              )}
            >
              {r.rank}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {r.name}
              {r.me && <span className="ml-1.5 text-xs font-normal text-accent-dark">(сен)</span>}
            </span>
            <span className="hidden text-xs text-muted sm:inline">{r.finished} сабак</span>
            <span className="rounded-full bg-amber-soft px-2.5 py-0.5 font-mono text-sm font-semibold text-amber tabular-nums">{r.xp} XP</span>
          </span>
        </li>
      ))}
      <li className="pt-2 text-xs text-muted">{`${total} окуучу · XP бааланган тапшырмалардан жана exit ticket'тен топтолот`}</li>
    </ol>
  );
}
