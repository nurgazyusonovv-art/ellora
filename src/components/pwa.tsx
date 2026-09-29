"use client";

import { useEffect, useState } from "react";
import { signOut } from "@/app/actions/auth";

/** Service worker'ди каттайт (production'до гана — dev'де кэш кодду эскиртип коёт). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

/** Чыгуудан мурун: сакталган барактарды тазалоо (жалпы компьютерде башка окуучу көрбөсүн). */
export function clearOfflinePages() {
  try {
    navigator.serviceWorker?.controller?.postMessage("clear-pages");
    void caches?.keys().then((keys) => keys.filter((k) => k.startsWith("ellora-pages-")).forEach((k) => caches.delete(k)));
  } catch {
    /* кэш жок — эч нерсе кылбайбыз */
  }
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** «Телефонго орнотуу» баскычы: Android/Chrome'до системанын терезеси, iPhone'до — кыска нуска. */
export function InstallButton() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!evt && !ios)) return null;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={async () => {
          if (evt) {
            await evt.prompt();
            setEvt(null);
          } else setHelp((h) => !h);
        }}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-[10px] border border-line bg-surface px-3.5 text-sm font-semibold hover:bg-surface-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="6" y="2" width="12" height="20" rx="2.5" />
          <path d="M12 7v7M9 11l3 3 3-3M11 18h2" />
        </svg>
        Телефонго орнотуу
      </button>
      {help && (
        <p className="rounded-[10px] bg-accent-soft px-3.5 py-2.5 text-sm">
          {"Safari'де"} ылдыйдагы <b>«Бөлүшүү»</b> баскычын басып, <b>«На экран Домой» / «Add to Home Screen»</b> тандаңыз.
        </p>
      )}
    </div>
  );
}

/** «Чыгуу»: сакталган барактарды тазалап, андан кийин чыгат. */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOut} onSubmit={clearOfflinePages}>
      <button className={className}>Чыгуу</button>
    </form>
  );
}
