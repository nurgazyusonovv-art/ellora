"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { cx } from "@/components/ui";

const TABS: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: "/student", label: "Башкы", icon: "home", exact: true },
  { href: "/student/review", label: "Кайталоо", icon: "flame" },
  { href: "/play", label: "Оюн", icon: "bolt" },
  { href: "/student/path", label: "Жолум", icon: "target" },
  { href: "/student/cards", label: "Китеп", icon: "book" },
];

/** Сабак же оюн учурунда меню жашырылат — экран толугу менен тапшырмага. */
const HIDDEN = ["/student/assignments/", "/student/games/"];

/** Окуучунун телефондогу ылдыйкы менюсу (lg'ден кичине экранда гана). Бош аянт мазмунду менюнун астына калтырбайт. */
export function StudentTabBar() {
  const path = usePathname() ?? "";
  if (HIDDEN.some((h) => path.startsWith(h))) return null;
  const active = (t: (typeof TABS)[number]) => (t.exact ? path === t.href : path === t.href || path.startsWith(`${t.href}/`));
  return (
    <>
      <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden print:hidden" />
      <nav aria-label="Окуучунун менюсу" className="mobile-app-nav fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden print:hidden">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active(t) ? "page" : undefined}
            className={cx("flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px]", active(t) ? "font-medium text-accent" : "text-muted")}
          >
            <Icon name={t.icon} size={20} />
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
