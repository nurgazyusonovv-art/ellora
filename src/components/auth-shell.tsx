import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui";

export function AuthShell({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center px-4 py-10">
      <div aria-hidden="true" className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <Link href="/" aria-label="Башкы бет" className="relative">
        <Logo />
      </Link>
      <div className="relative mt-8 w-full max-w-[400px] rounded-lg border border-line bg-surface p-6 shadow-xs sm:p-8">
        <h1 className="text-2xl font-medium">{title}</h1>
        {sub && <p className="mt-1.5 text-sm text-muted">{sub}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
