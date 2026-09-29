import { cx } from "@/components/ui";

/** Жүктөлүп жаткан мазмундун ордундагы боз сөлөкөт. Кыймылды азайтуу тандалса — анимация жок. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("rounded-xl bg-surface-2 motion-safe:animate-pulse", className)} />;
}

/** Барак жүктөлүп жатканда: аталыш, карточкалар, тизме. */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex w-full flex-col gap-6">
      <span className="sr-only">Жүктөлүүдө…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-64 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </div>
  );
}
