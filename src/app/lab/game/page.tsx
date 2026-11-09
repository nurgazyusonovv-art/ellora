import Link from "next/link";
import { GameDemo } from "@/components/game-demo";
import { GAME_SETS } from "@/content/game-sets";

export const metadata = { title: "Оюндун үлгүсү" };

export default async function GameLab({ searchParams }: { searchParams: Promise<{ set?: string }> }) {
  const { set: slug } = await searchParams;
  const set = GAME_SETS.find((g) => g.slug === slug) ?? GAME_SETS[0];
  return (
    <main className="min-h-dvh bg-surface-2">
      <nav aria-label="Оюндар" className="mx-auto flex max-w-2xl flex-wrap gap-1.5 px-4 pt-4 sm:px-6">
        {GAME_SETS.map((g) => (
          <Link key={g.slug} href={`/lab/game?set=${g.slug}`} aria-current={g.slug === set.slug ? "page" : undefined} className={`rounded-full border px-2.5 py-1 text-xs ${g.slug === set.slug ? "border-accent/30 bg-accent-soft text-accent-dark" : "border-line-strong bg-surface text-muted hover:text-ink"}`}>
            {g.title}
          </Link>
        ))}
      </nav>
      <p className="mx-auto max-w-2xl px-4 pt-3 text-xs text-muted sm:px-6">Үлгү: жооптор сакталбайт.</p>
      <GameDemo key={set.slug} title={set.title} questions={set.questions} />
    </main>
  );
}
