import { Icon } from "@/components/icons";
import { RichText, cx } from "@/components/ui";
import type { KnowledgeCard } from "@/lib/quest";

/** Билим картасы: эреже + мисал. Ойноткучта (ачылганда) жана «Билим китебинде» колдонулат. */
export function KnowledgeCardView({ card, source, className }: { card: KnowledgeCard; source?: string; className?: string }) {
  return (
    <article className={cx("flex min-w-0 flex-col gap-2.5 rounded-lg border border-accent/25 bg-surface p-4 shadow-xs", className)}>
      <header className="flex items-start gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-md border border-accent/20 bg-accent-soft text-accent" aria-hidden>
          <Icon name="book" size={16} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Билим картасы</span>
          <h3 className="break-words font-medium">{card.title}</h3>
        </span>
      </header>
      <RichText text={card.rule} className="text-[15px]" />
      <div className="rounded-md border border-line bg-surface-2 px-3 py-2 text-sm">
        <span className="mb-1 block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Мисал</span>
        <RichText text={card.example} />
      </div>
      {source && <p className="text-xs text-muted">Сабак: {source}</p>}
    </article>
  );
}
