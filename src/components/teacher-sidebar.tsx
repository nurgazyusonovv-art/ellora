"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";
import { Icon } from "@/components/icons";

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

export function TeacherSidebar({ name, school, today, classes }: {
  name: string; school: string; today: string; classes: { id: string; name: string }[];
}) {
  const path = usePathname();
  const [year, month, day] = today.split("-").map(Number);
  const [offset, setOffset] = useState(0);
  if (path !== "/teacher" && path !== "/teacher/lessons") return null;
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const start = (date.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return (
    <aside className="teacher-sidebar flex flex-col gap-6 p-5 print:hidden">
      <div className="flex items-center justify-end gap-3 border-b border-line pb-5">
        <div className="min-w-0 text-right"><p className="truncate font-semibold">{name}</p><p className="text-xs text-muted">{school}</p></div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-accent-soft text-sm font-semibold text-accent">{name.slice(0, 1)}</span>
      </div>
      <section aria-label="Календарь" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-medium text-ink">{MONTHS[m]} {y}</h2>
          <div className="flex">
            <button aria-label="Мурунку ай" onClick={() => setOffset(offset - 1)} className="flex size-9 items-center justify-center rounded-md border border-transparent hover:border-line hover:bg-surface-2"><Icon name="arrow" className="rotate-180" /></button>
            <button aria-label="Кийинки ай" onClick={() => setOffset(offset + 1)} className="flex size-9 items-center justify-center rounded-md border border-transparent hover:border-line hover:bg-surface-2"><Icon name="arrow" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs">
          {["Дш", "Шш", "Шр", "Бш", "Жм", "Иш", "Жш"].map(d => <span key={d} className="py-1.5 font-mono text-[10px] uppercase text-muted">{d}</span>)}
          {Array.from({ length: start }, (_, i) => <span key={`empty-${i}`} />)}
          {Array.from({ length: count }, (_, i) => <span key={i} aria-current={offset === 0 && i + 1 === day ? "date" : undefined} className={cx("mx-auto flex size-8 items-center justify-center rounded-md", offset === 0 && i + 1 === day ? "bg-accent font-semibold text-white" : "text-muted")}>{i + 1}</span>)}
        </div>
        {offset !== 0 && <button className="min-h-11 text-sm font-semibold text-accent" onClick={() => setOffset(0)}>Бүгүнкү күнгө кайтуу</button>}
      </section>
      <section className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2"><h2 className="text-base font-medium text-ink">Менин класстарым</h2><Link href="/teacher/classes" className="flex min-h-11 items-center text-sm text-muted hover:text-accent">Баары <Icon name="arrow" size={14} className="ml-1" /></Link></div>
        {classes.length === 0 && <p className="text-sm leading-relaxed text-muted">Алгач класс ачыңыз. Андан кийин окуучуларды чакырып, сабак жөнөтө аласыз.</p>}
        {classes.slice(0, 5).map((c, i) => <Link key={c.id} href={`/teacher/classes/${c.id}`} className="flex min-h-12 items-center gap-3 rounded-md px-2 hover:bg-surface-2"><span className={cx("flex size-8 shrink-0 items-center justify-center rounded-md border border-line", i % 2 ? "bg-lilac-soft text-lilac" : "bg-accent-soft text-accent")}><Icon name="users" size={16} /></span><div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted">Классты көрүү</p></div><Icon name="arrow" size={14} className="ml-auto text-muted" /></Link>)}
      </section>
      <div className="mt-auto rounded-lg border border-accent/20 bg-accent-soft p-4"><Icon name="book" size={18} className="mb-2 text-accent" /><p className="text-sm font-medium text-accent-dark">Бир сабак — беш бөлүк</p><p className="mt-2 text-sm leading-relaxed text-muted">Кызыгуудан баштап, өз алдынча колдонууга чейин.</p><Link href="/teacher/lessons/new" className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold text-accent">Сабак түзүү <Icon name="arrow" size={16} /></Link></div>
    </aside>
  );
}
