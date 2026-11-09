"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/** Realtime туташканда запас сурамдын аралыгы (мс); туташпаса — мурунку тез аралык колдонулат. */
export const POLL_CONNECTED = 15000;

type Options = {
  assignmentId: string | null | undefined;
  /** Presence ачкычы — колдонуучунун id'си. Жок болсо presence'ке катталбайт. */
  presenceKey?: string;
  /** Сессия өзгөрдү (мугалим бөлүктү которду, баштады, токтотту…). Абалды серверден кайра окуу керек. */
  onSession?: () => void;
  /** Окуучу жооп берди — мугалимдин экраны жаңыланышы керек. */
  onActivity?: () => void;
};

/**
 * Жандуу сабактын Realtime каналы.
 * - Postgres Changes `lesson_sessions` (0019): RLS боюнча гана келет, ишенимдүү сигнал.
 * - Broadcast `session`/`activity`: тез сигнал; мазмуну жок — абал ар дайым серверден окулат,
 *   ошондуктан жасалма билдирүү бир жолу ашыкча жаңыртуудан башка эч нерсе кыла албайт.
 * - Presence: ким онлайн (ачкыч — колдонуучунун id'си, аты жөнөтүлбөйт).
 * Канал туташпаса (Realtime өчүк, тармак) — `connected=false`, чакыруучу тез сурамга кайтат.
 */
export function useLessonChannel({ assignmentId, presenceKey, onSession, onActivity }: Options) {
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const handlers = useRef({ onSession, onActivity });
  handlers.current = { onSession, onActivity };

  useEffect(() => {
    if (!assignmentId || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }
    const channel = supabase.channel(`lesson:${assignmentId}`, { config: { presence: { key: presenceKey ?? "" }, broadcast: { self: false } } });
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "lesson_sessions", filter: `assignment_id=eq.${assignmentId}` }, () => handlers.current.onSession?.())
      .on("broadcast", { event: "session" }, () => handlers.current.onSession?.())
      .on("broadcast", { event: "activity" }, () => handlers.current.onActivity?.())
      .on("presence", { event: "sync" }, () => setOnline(Object.keys(channel.presenceState()).filter(Boolean)))
      .subscribe((status) => {
        const ok = status === "SUBSCRIBED";
        setConnected(ok);
        if (ok && presenceKey) void channel.track({ at: Date.now() }).catch(() => {});
      });
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      setConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [assignmentId, presenceKey]);

  /** Башкаларга «жаңырт» деген белги жөнөтөт (мазмунсуз). Туташпаса — эч нерсе кылбайт. */
  const notify = useCallback((event: "session" | "activity") => {
    void channelRef.current?.send({ type: "broadcast", event, payload: {} }).catch(() => {});
  }, []);

  return { connected, online, notify };
}
