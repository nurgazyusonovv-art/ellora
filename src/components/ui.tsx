import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const btnVariants = {
  primary: "bg-accent text-white hover:bg-accent-dark",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
  ghost: "text-accent hover:bg-accent-soft",
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
  return <div className={cx("rounded-2xl border border-line bg-surface p-5 sm:p-6", className)} {...p} />;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="text-xs font-semibold uppercase tracking-[0.07em] text-muted">{children}</span>;
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="font-display text-2xl font-bold sm:text-[28px]">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2.5">{children}</div>}
    </div>
  );
}

const chipTones = {
  neutral: "bg-surface-2 text-muted",
  good: "bg-good-soft text-good",
  warn: "bg-amber-soft text-amber",
  bad: "bg-bad-soft text-bad",
  accent: "bg-accent-soft text-accent-dark",
} as const;

export function Chip({ tone = "neutral", children }: { tone?: keyof typeof chipTones; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", chipTones[tone])}>
      {children}
    </span>
  );
}

export function Field({ label, hint, ...p }: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <input
        className="rounded-[10px] border border-line bg-surface px-3 py-2.5 text-base font-normal text-ink placeholder:text-muted/70"
        {...p}
      />
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function Progress({ value, tone = "accent" }: { value: number; tone?: "accent" | "good" | "bad" }) {
  const color = tone === "good" ? "bg-good" : tone === "bad" ? "bg-bad" : "bg-accent";
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="presentation">
      <div className={cx("h-full rounded-full", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[10px] bg-bad-soft px-3.5 py-2.5 text-sm text-bad">
      {message}
    </p>
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-[9px] bg-[#3dc3a5] font-mono text-sm font-semibold text-[#0b1b17]">
        if
      </span>
      <span className={cx("font-display text-lg font-bold", light ? "text-white" : "text-ink")}>ellora</span>
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
        <code key={k++} className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[0.92em]">
          {t.slice(1, -1)}
        </code>,
      );
    last = re.lastIndex;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
