/** Окуучунун отчету үчүн иконкалар жана графиктер (SVG, серверде түзүлөт — PDF'те да так чыгат). */
import type { ReactNode } from "react";
import { cx } from "@/components/ui";
import { STATUS_META, type StudentStatus } from "@/lib/stats";

const ICONS = {
  book: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 19V5M19 17H6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" />
    </>
  ),
  bolt: <path d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12z" />,
  gauge: (
    <>
      <path d="M4 17a8 8 0 1 1 16 0" />
      <path d="m12 17 4-5" />
    </>
  ),
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16.5 9.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2.5 20h19z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  dash: (
    <>
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4.5 4-6.5 8-6.5s7 2 8 6.5" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cx("shrink-0", className)}
    >
      {ICONS[name]}
    </svg>
  );
}

const STATUS_ICON: Record<StudentStatus, IconName> = {
  done: "check",
  attention: "alert",
  help: "alert",
  stuck: "clock",
  started: "clock",
  not_started: "dash",
};
const TONE_CLS = {
  good: "bg-good-soft text-good",
  warn: "bg-amber-soft text-amber",
  bad: "bg-bad-soft text-bad",
  accent: "bg-accent-soft text-accent-dark",
  neutral: "bg-surface-2 text-muted",
} as const;

/** Абал ар дайым иконка + сөз менен (түс гана эмес). */
export function StatusBadge({ status }: { status: StudentStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", TONE_CLS[m.tone])}>
      <Icon name={STATUS_ICON[status]} size={13} />
      {m.label}
    </span>
  );
}

export function StatTile({ icon, label, value, sub }: { icon: IconName; label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 print:rounded-lg print:p-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-dark print:size-8">
        <Icon name={icon} size={18} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">{label}</span>
        <span className="font-display text-xl leading-tight font-bold tabular-nums print:text-lg">{value}</span>
        {sub && <span className="text-xs text-muted">{sub}</span>}
      </span>
    </div>
  );
}

/**
 * Exit ticket'тин натыйжасы сабак боюнча (%). Бир серия — бир түс; маанилер таблицада, тилкелердин
 * үстүндө акыркысы гана жазылат. Сабактын номери таблицадагы номерге дал келет.
 */
export function ExitTrendChart({ points }: { points: { n: number; title: string; pct: number }[] }) {
  const W = 520;
  const H = 150;
  const left = 34;
  const bottom = 22;
  const top = 14;
  const plotH = H - bottom - top;
  const band = (W - left - 8) / Math.max(points.length, 1);
  const bw = Math.min(24, band * 0.6);
  const y = (pct: number) => top + plotH * (1 - pct / 100);
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Exit ticket'тин натыйжасы сабактар боюнча, пайыз менен">
      {[0, 50, 100].map((v) => (
        <g key={v}>
          <line x1={left} x2={W - 4} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeWidth="1" />
          <text x={left - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">
            {v}%
          </text>
        </g>
      ))}
      {points.map((p, i) => {
        const cx = left + band * i + band / 2;
        const h = Math.max(plotH * (p.pct / 100), p.pct > 0 ? 3 : 0);
        const x = cx - bw / 2;
        const yb = top + plotH;
        const r = Math.min(4, h, bw / 2);
        const d = h
          ? `M${x},${yb} V${yb - h + r} Q${x},${yb - h} ${x + r},${yb - h} H${x + bw - r} Q${x + bw},${yb - h} ${x + bw},${yb - h + r} V${yb} Z`
          : "";
        return (
          <g key={p.n}>
            <title>{`${p.n}. ${p.title}: ${p.pct}%`}</title>
            {/* Кеңирээк чекит — hover'ду жеңилдетет */}
            <rect x={cx - band / 2} y={top} width={band} height={plotH} fill="transparent" />
            {d && <path d={d} fill="var(--color-accent)" />}
            {p.pct === 0 && <line x1={x} x2={x + bw} y1={yb - 1} y2={yb - 1} stroke="var(--color-bad)" strokeWidth="2" />}
            <text x={cx} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
              {p.n}
            </text>
          </g>
        );
      })}
      {last && (
        <text x={left + band * (points.length - 1) + band / 2} y={y(last.pct) - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-ink)">
          {last.pct}%
        </text>
      )}
    </svg>
  );
}

/** Тапшырма түрлөрү боюнча биринчи аракеттеги тактык. Тилкелер аз — ар биринин маанисин учуна жазабыз. */
export function AccuracyBars({ rows }: { rows: { label: string; pct: number; n: number }[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(0,128px)_1fr_40px] items-center gap-2 text-[13px] print:text-[11px]">
          <span className="truncate">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface-2" title={`${r.label}: ${r.pct}% (${r.n} тапшырма)`}>
            <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(r.pct, 2)}%` }} />
          </span>
          <span className="text-right font-mono tabular-nums">{r.pct}%</span>
        </div>
      ))}
    </div>
  );
}
