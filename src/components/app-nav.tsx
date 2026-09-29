"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export function AppNav({ items, name, sub }: { items: Item[]; name: string; sub: string }) {
  const path = usePathname();
  const active = (it: Item) => (it.exact ? path === it.href : path.startsWith(it.href));

  return (
    <>
      {/* Компьютер: капталдагы меню */}
      <nav aria-label="Негизги меню" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-7 bg-nav px-4 py-7 text-[#e5eeec] lg:flex">
        <div className="px-2">
          <Logo light />
        </div>
        <div className="flex flex-col gap-1">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={cx(
                "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px]",
                active(it) ? "bg-[#22363d] font-semibold text-white" : "text-[#b7c7c9] hover:bg-white/5",
              )}
            >
              <Icon name={it.icon} />
              {it.label}
            </Link>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex flex-col gap-2 rounded-xl bg-[#1d2f35] p-3">
          <span className="text-sm font-semibold">{name}</span>
          <span className="text-xs text-[#93a6a9]">{sub}</span>
          <form action={signOut}>
            <button className="mt-1 text-xs font-semibold text-[#7fd8c3] hover:underline">Чыгуу</button>
          </form>
        </div>
      </nav>

      {/* Телефон: үстүнкү жана астыңкы тилке */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-nav px-4 py-3 lg:hidden">
        <Logo light />
        <form action={signOut}>
          <button className="text-sm font-semibold text-[#7fd8c3]">Чыгуу</button>
        </form>
      </header>
      <nav aria-label="Негизги меню" className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={cx("flex flex-1 flex-col items-center gap-1 py-2.5 text-xs", active(it) ? "font-semibold text-accent" : "text-muted")}
          >
            <Icon name={it.icon} />
            {it.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
