"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { CodeView } from "@/components/code";
import { Icon } from "@/components/icons";
import { Button, RichText, cx } from "@/components/ui";
import type { BoardSlide } from "@/lib/board-slides";

/**
 * Тактадагы бөлүктүн мазмуну: бир слайд — бир экран. ← → баскычтары же клавиатура (←/→, PageUp/PageDown — пульт).
 * Бөлүк алмашканда баштан башталат (ата компонент `key` менен).
 */
export function BoardStage({ slides, stageLabel }: { slides: BoardSlide[]; stageLabel: string }) {
  const [i, setI] = useState(0);
  const at = Math.min(i, slides.length - 1);
  const go = useCallback((d: number) => setI((x) => Math.max(0, Math.min(slides.length - 1, x + d))), [slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(1); }
      if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const s = slides[at];
  return (
    <section className="flex flex-1 flex-col gap-6" aria-roledescription="слайддар" aria-label={stageLabel}>
      <div className="flex min-h-0 flex-1 flex-col justify-center" aria-live="polite">
        <SlideView s={s} stageLabel={stageLabel} />
      </div>
      <nav className="flex items-center gap-4 border-t border-line pt-4 print:hidden" aria-label="Слайддар">
        <Button variant="ghost" disabled={at === 0} onClick={() => go(-1)}>← Мурунку</Button>
        <ol className="flex min-w-0 flex-1 flex-wrap justify-center gap-1.5" aria-hidden>
          {slides.map((_, k) => (
            <li key={k}>
              <button type="button" tabIndex={-1} onClick={() => setI(k)} className={cx("block h-2 rounded-full transition-all", k === at ? "w-6 bg-accent" : "w-2 bg-line-strong hover:bg-muted")} />
            </li>
          ))}
        </ol>
        <span className="font-mono text-sm text-muted tabular-nums">{at + 1}/{slides.length}</span>
        <Button disabled={at >= slides.length - 1} onClick={() => go(1)}>Кийинки →</Button>
      </nav>
    </section>
  );
}

function SlideView({ s, stageLabel }: { s: BoardSlide; stageLabel: string }) {
  if (s.kind === "intro")
    return (
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
        <p className="font-mono text-base uppercase tracking-[0.1em] text-accent">{stageLabel}</p>
        <h1 className="text-5xl leading-tight font-medium lg:text-6xl">{s.title}</h1>
        {s.intro && <RichText text={s.intro} className="max-w-4xl text-2xl text-muted lg:text-3xl" />}
        {s.mission && (
          <div className="flex w-full max-w-4xl flex-col gap-3 rounded-lg border border-accent/30 bg-accent-soft p-6 text-left">
            <p className="font-mono text-sm uppercase tracking-[0.08em] text-accent">Миссия · {s.mission.title}</p>
            <p className="text-2xl leading-snug whitespace-pre-wrap">{s.mission.story}</p>
            <p className="text-xl"><b className="font-medium">Максат:</b> {s.mission.goal}</p>
          </div>
        )}
      </div>
    );

  if (s.kind === "slide") {
    const sl = s.slide;
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <p className="font-mono text-sm text-muted">{s.deck} · {s.n}/{s.of}</p>
        <h2 className="text-4xl leading-tight font-medium lg:text-5xl">{sl.title}</h2>
        <div className={cx("grid gap-8", sl.image && "lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]")}>
          <RichText text={sl.body} className="text-2xl leading-relaxed lg:text-3xl" />
          {sl.image && (
            <figure className="min-w-0">
              <Image unoptimized width={900} height={600} src={sl.image.src} alt={sl.image.alt} className="mx-auto h-auto max-h-[50vh] w-auto max-w-full rounded-lg object-contain" />
              {(sl.image.caption || sl.image.credit) && (
                <figcaption className="mt-2 text-base text-muted">{sl.image.caption}{sl.image.credit && ` · Булак: ${sl.image.credit}`}</figcaption>
              )}
            </figure>
          )}
        </div>
        {sl.diagram.length > 0 && (
          <ol className="flex flex-col gap-3 lg:flex-row" aria-label="Схема">
            {sl.diagram.map((label, k) => (
              <li key={k} className="flex min-w-0 flex-1 items-center gap-3">
                {k > 0 && <Icon name="arrow" size={24} className="hidden text-accent lg:block" />}
                <span className="min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-4 py-3 text-xl font-medium break-words">{label}</span>
              </li>
            ))}
          </ol>
        )}
        {sl.question && <p className="border-t border-line pt-5 text-2xl font-medium">Ойлонуп көр: {sl.question}</p>}
      </div>
    );
  }

  if (s.kind === "text")
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {s.title && <h2 className="text-4xl leading-tight font-medium lg:text-5xl">{s.title}</h2>}
        <RichText text={s.body} className="text-2xl leading-relaxed lg:text-3xl" />
      </div>
    );

  if (s.kind === "code")
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <p className="font-mono text-sm uppercase tracking-[0.08em] text-muted">Код мисалы</p>
        <CodeView code={s.code} className="text-2xl lg:text-3xl" />
        {s.caption && <RichText text={s.caption} className="text-2xl text-muted" />}
      </div>
    );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <p className="font-mono text-sm uppercase tracking-[0.08em] text-accent">{s.label}</p>
      <RichText text={s.prompt} className="text-3xl leading-snug font-medium lg:text-4xl" />
      {s.code && <CodeView code={s.code} className="text-xl lg:text-2xl" />}
      {s.options && (
        <ul className="grid gap-3 lg:grid-cols-2">
          {s.options.map((o, k) => (
            <li key={k} className="flex min-h-16 items-center gap-4 rounded-lg border border-line-strong bg-surface px-4 py-3 text-2xl">
              <span className="grid size-11 shrink-0 place-items-center rounded-md border border-line-strong font-mono text-xl">{String.fromCharCode(65 + k)}</span>
              <span className={cx("min-w-0 flex-1 break-words", s.mono && "font-mono")}>{o}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-lg text-muted">Жоопту өз телефонуңда / компьютериңде бер.</p>
    </div>
  );
}
