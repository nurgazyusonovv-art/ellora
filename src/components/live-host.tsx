"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { controlLive, hostState, type HostState } from "@/app/actions/live-games";
import { CodeView } from "@/components/code";
import { FullscreenButton } from "@/components/fullscreen-button";
import { Icon } from "@/components/icons";
import { Button, Logo, RichText, cx } from "@/components/ui";
import { OPTION_STYLES } from "@/lib/live-colors";
import { useLessonChannel } from "@/lib/use-lesson-channel";

/** Проектор экраны: мугалим оюнду башкарат. Суроо убакыты бүткөндө жооп өзү ачылат. */
export function LiveHost({ liveId, teacherId, initial, joinUrl }: { liveId: string; teacherId: string; initial: HostState; joinUrl: string }) {
  const [s, setS] = useState(initial);
  const [offset, setOffset] = useState(Date.now() - initial.serverNow);
  const [now, setNow] = useState(Date.now());
  const [pending, start] = useTransition();
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const next = await hostState(liveId);
      if (next) {
        setS(next);
        setOffset(Date.now() - next.serverNow);
      }
    } finally {
      busy.current = false;
    }
  }, [liveId]);
  const { connected, notify } = useLessonChannel({ assignmentId: liveId, kind: "game", presenceKey: teacherId, onSession: refresh, onActivity: refresh });

  // Запас: суроо учурунда ар 1,5 сек (жооп берилгендердин саны), башка учурда ар 4 сек (кошулгандар).
  useEffect(() => {
    const t = setInterval(refresh, s.status === "question" ? 1500 : connected ? 6000 : 3000);
    return () => clearInterval(t);
  }, [refresh, s.status, connected]);
  useEffect(() => {
    if (s.status !== "question") return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [s.status]);

  const command = (cmd: "next" | "end") =>
    start(async () => {
      await controlLive(liveId, cmd, { status: s.status, q_index: s.qIndex });
      notify("session");
      await refresh();
    });

  const remaining = s.status === "question" && s.question && s.startedAt ? Math.min(s.question.time * 1000, Math.max(0, s.question.time * 1000 - (now - offset - new Date(s.startedAt).getTime()))) : 0;
  // Убакыт бүттү же баары жооп берди — жооп өзү ачылат (бир жолу).
  const autoKey = useRef("");
  useEffect(() => {
    if (s.status !== "question" || pending) return;
    const allIn = s.players.length > 0 && s.answered >= s.players.length;
    const key = `${s.qIndex}`;
    if ((remaining <= 0 || allIn) && autoKey.current !== key) {
      autoKey.current = key;
      command("next");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, s.answered, s.players.length, s.status, s.qIndex]);

  const top = s.players.slice(0, 5);

  return (
    <main className="flex min-h-dvh flex-col gap-6 bg-surface-2 px-5 py-5 sm:px-10">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line pb-4">
        <Logo />
        <span className="font-mono text-sm text-muted">
          {s.status === "lobby" ? "Күтүү залы" : s.status === "ended" ? "Оюн бүттү" : `${s.qIndex + 1}/${s.total}-суроо`}
        </span>
        <span className="flex-1" />
        <span className="font-mono text-sm text-muted">{s.players.length} оюнчу</span>
        <FullscreenButton />
        {s.status !== "ended" && <Button variant="ghost" disabled={pending} onClick={() => command("end")}>Бүтүрүү</Button>}
      </header>

      {s.status === "lobby" && (
        <section className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xl text-muted">Телефондон: <b className="text-ink">{joinUrl}</b> → PIN</p>
            <p className="font-mono text-7xl font-semibold tracking-[0.15em] text-accent sm:text-8xl" aria-label={`PIN ${s.pin.split("").join(" ")}`}>{s.pin}</p>
            <p className="text-sm text-muted">{s.speedBonus ? "Туура жооп — 500 упай + ылдамдык үчүн 500гө чейин." : "Туура жооп — 1000 упай. Ылдамдык эсептелбейт."}</p>
          </div>
          <ul className="flex max-w-4xl flex-wrap justify-center gap-2" aria-label="Кошулган оюнчулар">
            {s.players.map((p) => <li key={p.id} className="rounded-full border border-line-strong bg-surface px-4 py-2 text-lg font-medium">{p.name}</li>)}
            {!s.players.length && <li className="text-lg text-muted">Оюнчулар күтүлүүдө…</li>}
          </ul>
          <Button className="min-h-14 px-10 text-lg" disabled={pending || !s.players.length} onClick={() => command("next")}>
            <Icon name="bolt" size={20} /> Оюнду баштоо
          </Button>
        </section>
      )}

      {(s.status === "question" || s.status === "reveal") && s.question && (
        <section className="flex flex-1 flex-col gap-6">
          <div className="flex items-start gap-6">
            <RichText text={s.question.prompt} className="min-w-0 flex-1 text-3xl leading-snug font-medium lg:text-4xl" />
            {s.status === "question" ? (
              <span className="grid size-24 shrink-0 place-items-center rounded-full border-4 border-accent bg-surface font-mono text-4xl font-semibold text-accent tabular-nums" role="timer" aria-live="off">
                {Math.ceil(remaining / 1000)}
              </span>
            ) : null}
          </div>
          {s.question.code && <CodeView code={s.question.code} className="text-xl" />}
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            {s.question.options.map((o, k) => {
              const st = OPTION_STYLES[k];
              const reveal = s.status === "reveal";
              const right = k === s.question!.correct;
              const n = s.counts[k] ?? 0;
              return (
                <div key={k} className={cx("relative flex min-h-24 items-center gap-4 overflow-hidden rounded-lg border-2 px-5 py-4 text-2xl font-medium transition-opacity", st.tile, reveal && !right && "opacity-35")}>
                  <span className="grid size-12 shrink-0 place-items-center rounded-md bg-white/20 font-mono text-2xl">{st.letter}</span>
                  <span className="min-w-0 flex-1 break-words">{o}</span>
                  {reveal && (
                    <span className="flex shrink-0 items-center gap-2 font-mono">
                      {right && <Icon name="check" size={28} />}
                      {n}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-mono text-lg text-muted">{s.answered}/{s.players.length} жооп берди</span>
            <span className="flex-1" />
            {s.status === "question" ? (
              <Button variant="secondary" disabled={pending} onClick={() => command("next")}>Жоопту азыр ачуу</Button>
            ) : (
              <Button className="min-h-12 px-6 text-base" disabled={pending} onClick={() => command("next")}>
                {s.qIndex + 1 < s.total ? "Кийинки суроо" : "Жыйынтыкты көрсөтүү"} <Icon name="arrow" size={18} />
              </Button>
            )}
          </div>
          {s.status === "reveal" && top.length > 0 && (
            <ol className="grid gap-2 sm:grid-cols-5" aria-label="Алдыңкы 5 оюнчу">
              {top.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                  <span className="font-mono text-xl font-semibold text-accent">{p.rank}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                  <span className="font-mono text-sm text-muted tabular-nums">{p.score}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {s.status === "ended" && (
        <section className="flex flex-1 flex-col items-center gap-8">
          <h1 className="text-4xl font-medium">Жыйынтык</h1>
          <ol className="flex items-end justify-center gap-4" aria-label="Подиум">
            {[1, 0, 2].map((i) => {
              const p = s.players[i];
              if (!p) return <li key={i} className="w-40" />;
              const h = i === 0 ? "h-48" : i === 1 ? "h-36" : "h-28";
              return (
                <li key={p.id} className="flex w-40 flex-col items-center gap-2 text-center">
                  <span className="text-xl font-medium break-words">{p.name}</span>
                  <span className="font-mono text-muted tabular-nums">{p.score}</span>
                  <span className={cx("flex w-full items-start justify-center rounded-t-lg border-2 pt-3 font-mono text-4xl font-semibold", h, OPTION_STYLES[i].tile)}>{p.rank}</span>
                </li>
              );
            })}
          </ol>
          <ol className="flex w-full max-w-2xl flex-col divide-y divide-line rounded-lg border border-line bg-surface">
            {s.players.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-8 font-mono text-muted">{p.rank}</span>
                <span className="flex-1">{p.name}</span>
                <span className="font-mono tabular-nums">{p.score}</span>
              </li>
            ))}
          </ol>
          <Link href="/teacher/games" className="text-sm font-medium text-accent hover:underline">← Оюндарга кайтуу</Link>
        </section>
      )}
    </main>
  );
}
