"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { clearOfflinePages } from "@/components/pwa";
import { cx, Logo } from "@/components/ui";

type Item = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean };

const ICONS = {
  home: <path d="M3 10.5 12 3l9 7.5V21H3z" />,
  lessons: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M4 9h16M9 9v11" />
    </>
  ),
  stats: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4.5 4-6.5 8-6.5s7 2 8 6.5" />
    </>
  ),
  admin: (
    <>
      <path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  ktp: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M7.5 14h3M7.5 17h6" />
    </>
  ),
  classes: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14.5c2.3.3 3.9 2 4.5 5" />
    </>
  ),
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export function AppNav({ items, name, sub, demo=false }: { items: Item[]; name: string; sub: string; demo?:boolean }) {
  const path = usePathname();
  const active = (it: Item) => (it.exact ? path === it.href : path.startsWith(it.href));

  return (
    <>
      {/* Компьютер: Supabase стилиндеги капталдагы меню — ак фон, жука чек ара, тыгыз пункттар */}
      <nav aria-label="Негизги меню" className="sticky top-0 hidden print:!hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface text-sm lg:flex">
        <div className="flex h-14 items-center border-b border-line px-4">
          <Logo />
        </div>
        <div className="flex flex-col gap-0.5 p-2">
          <span className="px-2.5 pt-2 pb-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Меню</span>
          {items.map((it) => (
            <Link
              key={it.href}
              aria-current={active(it) ? "page" : undefined}
              href={it.href}
              className={cx(
                "flex h-9 items-center gap-2.5 rounded-md px-2.5 transition-colors",
                active(it) ? "bg-accent-soft font-medium text-accent-dark" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              <span className={active(it) ? "text-accent" : undefined}>
                <Icon name={it.icon} />
              </span>
              {it.label}
            </Link>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2.5 border-t border-line p-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-accent-soft text-sm font-semibold text-accent">
            {name.slice(0, 1)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-ink">{name}</span>
            <span className="truncate text-xs text-muted">{sub}</span>
          </div>
          {!demo && (
            <form action={signOut} onSubmit={clearOfflinePages}>
              <button className="h-8 rounded-md border border-line-strong px-2 text-xs font-medium text-ink hover:bg-surface-2">Чыгуу</button>
            </form>
          )}
        </div>
      </nav>

      {/* Телефон: үстүнкү жана астыңкы тилке */}
      <header className="mobile-app-header sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden print:hidden">
        <Logo />
        {demo && <span className="flex min-h-11 items-center text-sm text-muted">Үлгү</span>}
        {!demo && (
          <form action={signOut} onSubmit={clearOfflinePages}>
            <button className="min-h-11 rounded-md border border-line-strong px-3 text-sm font-medium text-ink">Чыгуу</button>
          </form>
        )}
      </header>
      <nav aria-label="Негизги меню" className="mobile-app-nav fixed inset-x-0 bottom-0 print:hidden z-20 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {items.map((it) => (
          <Link
            key={it.href}
            aria-current={active(it) ? "page" : undefined}
            href={it.href}
            className={cx("flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2.5 text-center text-[11px]", active(it) ? "font-medium text-accent" : "text-muted")}
          >
            <Icon name={it.icon} />
            {it.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
