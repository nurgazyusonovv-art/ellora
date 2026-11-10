"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { answerLive, joinLive, playState, type JoinState, type PlayState } from "@/app/actions/live-games";
import { Icon } from "@/components/icons";
import { Button, FormError, RichText, cx } from "@/components/ui";
import { OPTION_STYLES } from "@/lib/live-colors";
import { useLessonChannel } from "@/lib/use-lesson-channel";

/** PIN киргизүү (окуучу өз аккаунту менен; өз классынын оюну гана табылат). */
export function JoinForm() {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinLive, undefined);
  return (
    <form action={action} className="flex w-full flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Оюндун PIN коду
        <input
          name="pin"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9 ]*"
          maxLength={7}
          required
          autoFocus
          placeholder="123456"
          className="min-h-14 rounded-md border border-line-strong bg-surface px-4 text-center font-mono text-3xl tracking-[0.3em] shadow-xs"
        />
      </label>
      <Button disabled={pending} className="min-h-12 text-base">{pending ? "Кошулууда…" : "Кошулуу"}</Button>
      <FormError message={state?.error} />
    </form>
  );
}

/** Окуучунун оюн экраны: чоң баскычтар, жооптон кийин күтүү, суроо жабылганда жыйынтык. */
export function LivePlay({ liveId, studentId, initial }: { liveId: string; studentId: string; initial: PlayState }) {
  const [s, setS] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [deadline, setDeadline] = useState(() => Date.now() + initial.remainingMs);
  const [now, setNow] = useState(Date.now());
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await playState(liveId);
      if (!("error" in r)) {
        setS(r);
        setDeadline(Date.now() + r.remainingMs);
      }
    } finally {
      busy.current = false;
    }
  }, [liveId]);
  const { connected, notify } = useLessonChannel({ assignmentId: liveId, kind: "game", presenceKey: studentId, onSession: refresh });

  useEffect(() => {
    if (s.status === "ended") return;
    const t = setInterval(refresh, connected ? 8000 : 2000);
    return () => clearInterval(t);
  }, [refresh, connected, s.status]);
  useEffect(() => {
    if (s.status !== "question") return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [s.status]);

  const pick = (k: number) => {
    if (pending || s.mine || s.status !== "question") return;
    setError(null);
    setS((x) => ({ ...x, mine: { picked: k } }));
    start(async () => {
      const r = await answerLive(liveId, s.qIndex, k);
      if (r.error) {
        setError(r.error);
        await refresh();
      } else notify("activity");
    });
  };

  const left = Math.max(0, deadline - now);
  const q = s.question;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-4 py-5">
      <header className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm text-muted">{s.status === "lobby" ? "Күтүү залы" : s.status === "ended" ? "Оюн бүттү" : `${s.qIndex + 1}/${s.total}`}</span>
        <span className="rounded-full border border-amber/30 bg-amber-soft px-3 py-1 font-mono text-sm font-medium text-amber tabular-nums">{s.score} упай</span>
      </header>

      {s.status === "lobby" && (
        <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Icon name="users" size={40} className="text-accent" />
          <h1 className="text-2xl font-medium">Сен кошулдуң!</h1>
          <p className="text-muted">Атың тактада көрүнүп турат. Мугалим баштаганда суроо ушул жерге чыгат.</p>
          <p className="font-mono text-sm text-muted">{s.players} оюнчу</p>
        </section>
      )}

      {s.status === "question" && q && (
        <section className="flex flex-1 flex-col gap-4">
          <div className="h-2 overflow-hidden rounded-full bg-line" role="timer" aria-label={`${Math.ceil(left / 1000)} секунд калды`}>
            <div className="h-full bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${Math.min(100, (left / (q.time * 1000)) * 100)}%` }} />
          </div>
          <RichText text={q.prompt} className="text-lg font-medium" />
          {s.mine ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-line bg-surface p-6 text-center" role="status">
              <span className={cx("grid size-16 place-items-center rounded-lg border-2 font-mono text-3xl font-semibold", OPTION_STYLES[s.mine.picked].tile)}>{OPTION_STYLES[s.mine.picked].letter}</span>
              <p className="text-lg font-medium">Жооп кабыл алынды</p>
              <p className="text-sm text-muted">Башкалар жооп берип бүткөнчө күт. Жыйынтык тактада ачылат.</p>
            </div>
          ) : (
            <div className="grid flex-1 grid-cols-2 gap-3">
              {q.options.map((o, k) => (
                <button
                  key={k}
                  type="button"
                  disabled={pending || left <= 0}
                  onClick={() => pick(k)}
                  className={cx("flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 text-center text-base font-medium break-words shadow-xs active:scale-[0.98] disabled:opacity-50", OPTION_STYLES[k].tile)}
                >
                  <span className="font-mono text-3xl font-semibold">{OPTION_STYLES[k].letter}</span>
                  <span className="line-clamp-3">{o}</span>
                </button>
              ))}
            </div>
          )}
          {left <= 0 && !s.mine && <p className="text-center text-sm text-muted" role="status">Убакыт бүттү.</p>}
        </section>
      )}

      {s.status === "reveal" && q && (
        <section className="flex flex-1 flex-col items-center justify-center gap-4 text-center" role="status">
          {s.mine?.correct ? (
            <>
              <span className="grid size-20 place-items-center rounded-full bg-good text-white"><Icon name="check" size={40} /></span>
              <h1 className="text-3xl font-medium text-good">Туура!</h1>
              <p className="font-mono text-2xl text-good">+{s.mine.points}</p>
            </>
          ) : (
            <>
              <span className="grid size-20 place-items-center rounded-full bg-bad-soft text-bad"><Icon name="repeat" size={36} /></span>
              <h1 className="text-3xl font-medium text-bad">{s.mine ? "Туура эмес" : "Жооп берген жоксуң"}</h1>
              {s.correctIndex !== undefined && (
                <p className="text-muted">
                  Туурасы: <b className="text-ink">{OPTION_STYLES[s.correctIndex].letter}. {q.options[s.correctIndex]}</b>
                </p>
              )}
            </>
          )}
          {s.rank && <p className="text-lg">Сен азыр <b>{s.rank}-орунда</b> ({s.players} оюнчудан)</p>}
        </section>
      )}

      {s.status === "ended" && (
        <section className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <Icon name="trophy" size={44} className="text-amber" />
          <h1 className="text-3xl font-medium">{s.rank ? `${s.rank}-орун` : "Оюн бүттү"}</h1>
          <p className="font-mono text-xl">{s.score} упай</p>
          {s.podium && (
            <ol className="flex w-full flex-col gap-2">
              {s.podium.map((p) => (
                <li key={`${p.rank}-${p.name}`} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-2.5">
                  <span className="font-mono text-lg font-semibold text-accent">{p.rank}</span>
                  <span className="flex-1 text-left">{p.name}</span>
                  <span className="font-mono text-sm text-muted">{p.score}</span>
                </li>
              ))}
            </ol>
          )}
          <Link href="/student" className="flex min-h-11 items-center text-sm font-medium text-accent hover:underline">Башкы бетке →</Link>
        </section>
      )}

      {error && <p role="alert" className="rounded-md border border-bad/25 bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
    </main>
  );
}
