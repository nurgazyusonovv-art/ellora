"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Натыйжалар барагын ар бир N секундда жаңыртып турат (сабак жүрүп жатканда пайдалуу). */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
