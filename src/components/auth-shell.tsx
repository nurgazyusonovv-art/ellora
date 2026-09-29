import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui";

export function AuthShell({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center px-4 py-10">
      <Link href="/" aria-label="Башкы бет">
        <Logo />
      </Link>
      <div className="mt-8 w-full max-w-[420px] rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {sub && <p className="mt-2 text-muted">{sub}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
