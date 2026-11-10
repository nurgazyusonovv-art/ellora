import Link from "next/link";
import { JoinForm } from "@/components/live-play";
import { StudentTabBar } from "@/components/student-tab-bar";
import { Logo } from "@/components/ui";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Оюнга кошулуу" };

export default async function PlayJoin() {
  await requireRole("student");
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 px-4 py-10">
      <Logo />
      <div className="flex w-full flex-col gap-4 rounded-lg border border-line bg-surface p-6 shadow-xs">
        <h1 className="text-xl font-medium">Оюнга кошулуу</h1>
        <p className="text-sm text-muted">Мугалимдин тактасындагы 6 сандан турган PIN кодду жаз.</p>
        <JoinForm />
      </div>
      <Link href="/student" className="flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">← Башкы бет</Link>
      <StudentTabBar />
    </main>
  );
}
