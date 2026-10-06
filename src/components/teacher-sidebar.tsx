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
    <aside className="teacher-sidebar flex flex-col gap-10 bg-surface-2/40 p-6 sm:p-8 print:hidden">
      <div className="flex items-center justify-end gap-3">
        <div className="min-w-0 text-right"><p className="truncate font-semibold">{name}</p><p className="text-xs text-muted">{school}</p></div>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg font-semibold text-accent">{name.slice(0, 1)}</span>
      </div>
      <section aria-label="Календарь" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-accent">{MONTHS[m]} {y}</h2>
          <div className="flex">
            <button aria-label="Мурунку ай" onClick={() => setOffset(offset - 1)} className="flex size-11 items-center justify-center rounded-full hover:bg-accent-soft"><Icon name="arrow" className="rotate-180" /></button>
            <button aria-label="Кийинки ай" onClick={() => setOffset(offset + 1)} className="flex size-11 items-center justify-center rounded-full hover:bg-accent-soft"><Icon name="arrow" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
          {["Дш", "Шш", "Шр", "Бш", "Жм", "Иш", "Жш"].map(d => <span key={d} className="py-2 text-xs text-muted">{d}</span>)}
          {Array.from({ length: start }, (_, i) => <span key={`empty-${i}`} />)}
          {Array.from({ length: count }, (_, i) => <span key={i} aria-current={offset === 0 && i + 1 === day ? "date" : undefined} className={cx("mx-auto flex size-9 items-center justify-center rounded-full", offset === 0 && i + 1 === day ? "bg-accent font-semibold text-white" : "text-muted")}>{i + 1}</span>)}
        </div>
        {offset !== 0 && <button className="min-h-11 text-sm font-semibold text-accent" onClick={() => setOffset(0)}>Бүгүнкү күнгө кайтуу</button>}
      </section>
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-2"><h2 className="text-xl font-semibold text-accent">Менин класстарым</h2><Link href="/teacher/classes" className="flex min-h-11 items-center text-sm text-muted hover:text-accent">Баары <Icon name="arrow" size={14} className="ml-1" /></Link></div>
        {classes.length === 0 && <p className="text-sm leading-relaxed text-muted">Алгач класс ачыңыз. Андан кийин окуучуларды чакырып, сабак жөнөтө аласыз.</p>}
        {classes.slice(0, 5).map((c, i) => <Link key={c.id} href={`/teacher/classes/${c.id}`} className="flex min-h-14 items-center gap-3 rounded-2xl hover:bg-accent-soft/50"><span className={cx("flex size-12 shrink-0 items-center justify-center rounded-full", i % 2 ? "bg-lilac-soft text-lilac" : "bg-accent-soft text-accent")}><Icon name="users" size={22} /></span><div><p className="font-semibold">{c.name}</p><p className="text-xs text-muted">Классты көрүү</p></div><Icon name="arrow" size={16} className="ml-auto text-accent" /></Link>)}
      </section>
      <div className="mt-auto rounded-3xl bg-accent-soft p-5"><Icon name="book" size={26} className="mb-3 text-accent" /><p className="font-semibold text-accent">Бир сабак — беш бөлүк</p><p className="mt-2 text-sm leading-relaxed text-muted">Кызыгуудан баштап, өз алдынча колдонууга чейин.</p><Link href="/teacher/lessons/new" className="mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold text-accent">Сабак түзүү <Icon name="arrow" size={16} /></Link></div>
    </aside>
  );
}
