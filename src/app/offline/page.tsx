import { Logo } from "@/components/ui";

export const metadata = { title: "Интернет жок" };

/** Service worker интернет жок болгондо жана барак мурун ачылбаган болсо көрсөтөт (public/sw.js). */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-4 py-10 text-center">
      <Logo />
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted" aria-hidden>
        <path d="M2 8.8a15 15 0 0 1 4.2-2.6M9.5 5.2A15 15 0 0 1 22 8.8M5 12.9a10 10 0 0 1 3.2-2M13 10.1a10 10 0 0 1 6 2.8M8.5 16.4a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" />
      </svg>
      <h1 className="font-display text-xl font-bold">Интернет жок</h1>
      <p className="text-muted">
        Бул барак азырынча сакталган эмес. Интернет калыбына келгенде кайра ачыңыз. Мурун ачылган сабактар интернетсиз да ачылат.
      </p>
      {/* Link эмес: интернет келгенин текшерүү үчүн баракты толук кайра жүктөйбүз. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-5 font-semibold text-white">
        Кайра аракет кылуу
      </a>
    </main>
  );
}
