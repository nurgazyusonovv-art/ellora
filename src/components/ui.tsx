import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// Supabase стили: тыгыз, 6px радиус, жука чек ара. Телефондо globals.css 44px бийиктикти камсыз кылат.
const btnBase =
  "inline-flex items-center justify-center gap-2 min-h-11 lg:min-h-9 rounded-md border px-4 py-2 lg:px-3 lg:py-1.5 text-sm font-medium shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const btnVariants = {
  primary: "border-accent-dark bg-accent text-white hover:bg-accent-dark",
  secondary: "border-line-strong bg-surface text-ink hover:border-muted/40 hover:bg-surface-2",
  ghost: "border-transparent text-ink shadow-none hover:bg-surface-2",
} as const;

type Variant = keyof typeof btnVariants;

export function Button({ variant = "primary", className, ...p }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cx(btnBase, btnVariants[variant], className)} {...p} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...p
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cx(btnBase, btnVariants[variant], className)} {...p} />;
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cx("min-w-0 rounded-lg border border-line bg-surface p-4 sm:p-5", className)} {...p} />;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{children}</span>;
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="text-2xl font-medium text-ink sm:text-[28px]">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2.5">{children}</div>}
    </div>
  );
}

const chipTones = {
  neutral: "border-line-strong bg-surface-2 text-muted",
  good: "border-good/25 bg-good-soft text-good",
  warn: "border-amber/25 bg-amber-soft text-amber",
  bad: "border-bad/25 bg-bad-soft text-bad",
  accent: "border-accent/25 bg-accent-soft text-accent-dark",
} as const;

export function Chip({ tone = "neutral", children }: { tone?: keyof typeof chipTones; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", chipTones[tone])}>
      {children}
    </span>
  );
}

export function Field({ label, hint, ...p }: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
      <span className="text-muted">{label}</span>
      <input
        className="rounded-md border border-line-strong bg-surface px-3 py-2 text-sm font-normal text-ink shadow-xs outline-none transition-colors placeholder:text-muted/70 hover:border-muted/40 focus:border-accent focus:ring-2 focus:ring-accent/20 focus-visible:outline-none"
        {...p}
      />
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function Progress({ value, tone = "accent" }: { value: number; tone?: "accent" | "good" | "bad" }) {
  const color = tone === "good" ? "bg-good" : tone === "bad" ? "bg-bad" : "bg-accent";
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-line" role="presentation">
      <div className={cx("h-full rounded-full", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-bad/25 bg-bad-soft px-3 py-2 text-sm text-bad">
      {message}
    </p>
  );
}

/** Белги: «e» + терилип жаткан курсор — «el»lora жана код жазуу. Караңгы фондо (`dark`) ачык түстө. */
export function LogoMark({ size = 32, dark, className }: { size?: number; dark?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={cx("shrink-0", className)}>
      <rect width="32" height="32" rx="7" fill={dark ? "#3dc3a5" : "var(--color-accent)"} />
      <path
        d="M7.2 16.4h11.4a5.9 5.9 0 1 0-1.75 4.35"
        fill="none"
        stroke={dark ? "#0b1b17" : "#fff"}
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="22" y="9.6" width="3" height="13.4" rx="1.5" fill="var(--color-code-str)" />
    </svg>
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark dark={light} />
      <span className={cx("font-display text-[17px] font-semibold tracking-tight", light ? "text-white" : "text-ink")}>ellora</span>
    </span>
  );
}

/** `**калың**` жана `код` белгилерин колдогон жөнөкөй текст. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const paras = text.split(/\n\s*\n/);
  return (
    <div className={cx("flex flex-col gap-3 leading-relaxed", className)}>
      {paras.map((p, i) => (
        <p key={i}>{inline(p)}</p>
      ))}
    </div>
  );
}

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else
      out.push(
        <code key={k++} className="rounded-sm border border-line bg-surface-2 px-1 py-0.5 font-mono text-[0.88em]">
          {t.slice(1, -1)}
        </code>,
      );
    last = re.lastIndex;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
