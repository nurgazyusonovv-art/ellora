import { CodeView } from "@/components/code";
import { RichText, cx } from "@/components/ui";
import type { BoardResult } from "@/lib/live-results";
import { CONFIDENCE_LABELS } from "@/lib/lesson-types";

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

/** Проектор үчүн чоң, атсыз жыйынтык. `reveal` — туура вариант мугалим ачканда гана белгиленет. */
export function BoardView({ prompt, code, result, reveal, total }: { prompt: string; code?: string; result: BoardResult; reveal: boolean; total: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <RichText text={prompt} className="text-2xl leading-snug font-medium sm:text-3xl lg:text-4xl" />
      {code && <CodeView code={code} className="text-lg lg:text-xl" />}
      <p className="font-mono text-sm uppercase tracking-[0.08em] text-muted">Жооп берди: {result.answered}/{total}</p>

      {result.kind === "choice" && (
        <ul className="flex flex-col gap-3">
          {result.options.map((o, k) => {
            const p = pct(o.n, result.answered);
            const good = reveal && o.correct;
            return (
              <li key={k} className={cx("relative overflow-hidden rounded-lg border bg-surface", good ? "border-good" : "border-line-strong")}>
                <span className={cx("absolute inset-y-0 left-0 transition-[width] duration-500", good ? "bg-good-soft" : "bg-accent-soft")} style={{ width: `${p}%` }} aria-hidden />
                <span className="relative flex min-h-16 items-center gap-4 px-4 py-3 text-xl lg:text-2xl">
                  <span className={cx("grid size-10 shrink-0 place-items-center rounded-md border font-mono text-lg", good ? "border-good bg-good text-white" : "border-line-strong bg-surface")}>{String.fromCharCode(65 + k)}</span>
                  <span className="min-w-0 flex-1 break-words">{o.text}</span>
                  <span className="shrink-0 font-mono tabular-nums">{o.n} · {p}%</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {result.kind === "scale" && (
        <ul className="grid gap-3 sm:grid-cols-4">
          {result.counts.map((n, i) => (
            <li key={i} className="flex flex-col gap-2 rounded-lg border border-line-strong bg-surface p-4">
              <span className="font-mono text-4xl font-medium tabular-nums">{n}</span>
              <span className="text-lg">{i + 1} · {CONFIDENCE_LABELS[i]}</span>
            </li>
          ))}
        </ul>
      )}

      {result.kind === "score" && (
        <div className="flex flex-wrap items-end gap-6 rounded-lg border border-line-strong bg-surface p-6">
          <span className="font-mono text-7xl font-medium tracking-tight text-accent tabular-nums">{pct(result.correct, result.answered)}%</span>
          <span className="pb-2 text-2xl text-muted">туура аткарды ({result.correct}/{result.answered})</span>
        </div>
      )}

      {result.kind === "texts" &&
        (result.items.length === 0 ? (
          <p className="text-xl text-muted">Азырынча көрсөтүлө турган жооп жок.</p>
        ) : (
          <ul className="columns-1 gap-3 sm:columns-2 xl:columns-3">
            {result.items.slice(0, 30).map((x) => (
              <li key={x.key} className="mb-3 break-inside-avoid rounded-lg border border-line-strong bg-surface p-4 text-lg leading-relaxed break-words lg:text-xl">
                {x.text}
              </li>
            ))}
            {result.items.length > 30 && <li className="text-lg text-muted">Дагы {result.items.length - 30} жооп…</li>}
          </ul>
        ))}
    </div>
  );
}
