"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, Logo } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-5 px-4 py-10 text-center">
      <Logo />
      <h1 className="font-display text-xl font-bold">Бир нерсе туура эмес болуп кетти</h1>
      <p className="text-muted">
        Интернет байланышын текшерип, кайра аракет кылыңыз. Ката кайталанса, баракты жаңыртыңыз.
        {error.digest && <span className="mt-2 block font-mono text-xs">Ката коду: {error.digest}</span>}
      </p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <Button onClick={reset}>Кайра аракет кылуу</Button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-[10px] border border-line bg-surface px-4 font-semibold hover:bg-surface-2">
          Башкы бетке
        </Link>
      </div>
    </main>
  );
}
