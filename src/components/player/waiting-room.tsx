"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { pollLessonClock } from "@/app/actions/lesson-clock";
import { POLL_CONNECTED, useLessonChannel } from "@/lib/use-lesson-channel";
import { Logo } from "@/components/ui";

/** «Класста өтөм» сабагы мугалим баштаганча. Ар 3 секундда текшерет; башталса барак жаңыланып, 1-бөлүк ачылат. */
export function WaitingRoom({ assignmentId, viewerId, attemptId, title, className, backHref }: { assignmentId: string; viewerId: string; attemptId: string; title: string; className?: string; backHref: string }) {
  const router = useRouter();
  // Realtime: мугалим «Баштоо» басканда дароо; туташпаса — ар 3 сек сурам. Presence менен мугалим «онлайн» деп көрөт.
  const { connected } = useLessonChannel({ assignmentId, presenceKey: viewerId, onSession: () => router.refresh() });
  useEffect(() => {
    let active = true;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await pollLessonClock(attemptId);
        if (active && r.session !== undefined && !r.session?.waiting) router.refresh();
      } catch {
        /* байланыш жок — кийинки текшерүүдө */
      }
    };
    const t = setInterval(check, connected ? POLL_CONNECTED : 3000);
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", check);
    };
  }, [attemptId, router, connected]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <Logo />
      <div className="flex w-full flex-col items-center gap-4 rounded-lg border border-line bg-surface p-6 shadow-xs">
        <span className="relative flex size-3" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-50 motion-reduce:hidden" />
          <span className="relative inline-flex size-3 rounded-full bg-accent" />
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{className ?? "Сабак"}</span>
        <h1 className="text-xl font-medium">{title}</h1>
        <p role="status" className="text-muted">Мугалим сабакты баштаганда ушул жерде ачылат. Барактан чыкпай күт.</p>
      </div>
      <Link href={backHref} className="text-sm font-medium text-muted hover:text-ink">← Башкы бетке</Link>
    </main>
  );
}
