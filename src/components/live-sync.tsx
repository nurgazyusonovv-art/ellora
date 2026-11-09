"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { cx } from "@/components/ui";
import { useLessonChannel } from "@/lib/use-lesson-channel";

type Ctx = { online: Set<string>; connected: boolean; notify: (event: "session" | "activity") => void };
const LiveContext = createContext<Ctx>({ online: new Set(), connected: false, notify: () => {} });
export const useLive = () => useContext(LiveContext);

/**
 * Мугалимдин жандуу экраны: Realtime сигналы келгенде (жооп, сессия) баракты жаңыртат — 1,5 секундда бир жолудан көп эмес.
 * Туташпаса же сигнал жок болсо запас катары: туташканда ар 20 сек, болбосо ар 4 сек.
 */
export function LiveSync({ assignmentId, teacherId, active, children }: { assignmentId: string; teacherId: string; active: boolean; children: ReactNode }) {
  const router = useRouter();
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = useRef(0);
  const refresh = () => {
    if (pending.current) return;
    const wait = Math.max(0, 1500 - (Date.now() - last.current));
    pending.current = setTimeout(() => {
      pending.current = null;
      last.current = Date.now();
      if (document.visibilityState === "visible") router.refresh();
    }, wait);
  };
  const { connected, online, notify } = useLessonChannel({ assignmentId, presenceKey: teacherId, onSession: refresh, onActivity: refresh });

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, connected ? 20000 : active ? 4000 : 15000);
    return () => clearInterval(t);
  }, [connected, active, router]);
  useEffect(() => () => {
    if (pending.current) clearTimeout(pending.current);
  }, []);

  return <LiveContext.Provider value={{ online: new Set(online), connected, notify }}>{children}</LiveContext.Provider>;
}

/** Окуучунун карточкасындагы онлайн белгиси (presence). */
export function OnlineDot({ id }: { id: string }) {
  const { online, connected } = useLive();
  if (!connected) return null;
  const on = online.has(id);
  return (
    <span
      title={on ? "Онлайн" : "Офлайн"}
      aria-label={on ? "Онлайн" : "Офлайн"}
      className={cx("absolute -right-1 -bottom-1 size-3 rounded-full border-2 border-surface", on ? "bg-good" : "bg-line-strong")}
    />
  );
}

/** «Онлайн 18/26» — Realtime туташпаса «—». */
export function OnlineCount({ ids }: { ids: string[] }) {
  const { online, connected } = useLive();
  return <>{connected ? `${ids.filter((id) => online.has(id)).length}/${ids.length}` : "—"}</>;
}

/** Туташуу абалы: мугалим өзгөрүүлөр дароо жетип жатабы же сурам менен экенин билет. */
export function LiveStatus() {
  const { connected } = useLive();
  return (
    <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted" role="status">
      <span className={cx("size-2 rounded-full", connected ? "bg-good" : "bg-amber")} aria-hidden />
      {connected ? "Ыкчам байланыш" : "Жай байланыш (ар 4 сек)"}
    </span>
  );
}
