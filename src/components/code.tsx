import type { ReactNode } from "react";
import { cx } from "@/components/ui";

const KW = /("[^"]*"|'[^']*')|(#.*$)|\b(if|elif|else|for|while|in|def|return|and|or|not|True|False|None|print|input|int|str|float|range|len)\b|\b(\d+)\b/g;

/** Бир сап Python кодун түстөр менен бөлөт. */
export function highlight(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  KW.lastIndex = 0;
  while ((m = KW.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    if (m[1]) out.push(<span key={k++} className="text-code-str">{m[1]}</span>);
    else if (m[2]) out.push(<span key={k++} className="text-code-dim">{m[2]}</span>);
    else if (m[3]) out.push(<span key={k++} className="font-semibold text-code-kw">{m[3]}</span>);
    else out.push(<span key={k++} className="text-code-num">{m[4]}</span>);
    last = KW.lastIndex;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function CodeView({
  code,
  className,
  lineClass,
  onLineClick,
}: {
  code: string;
  className?: string;
  lineClass?: (n: number) => string | undefined;
  onLineClick?: (n: number) => void;
}) {
  const lines = code.split("\n");
  return (
    <pre className={cx("overflow-x-auto rounded-xl bg-code py-3 font-mono text-[14.5px] leading-[1.75] text-code-ink", className)}>
      {lines.map((l, i) => {
        const n = i + 1;
        const content = (
          <>
            <span className="mr-3.5 inline-block w-[2ch] text-right text-code-dim select-none">{n}</span>
            {highlight(l)}
            {l === "" && " "}
          </>
        );
        return onLineClick ? (
          <button
            key={i}
            type="button"
            onClick={() => onLineClick(n)}
            className={cx("block w-full border-l-[3px] border-transparent px-4 text-left whitespace-pre hover:bg-code-hl", lineClass?.(n))}
          >
            {content}
          </button>
        ) : (
          <span key={i} className={cx("block border-l-[3px] border-transparent px-4 whitespace-pre", lineClass?.(n))}>
            {content}
          </span>
        );
      })}
    </pre>
  );
}

/** Жөнөкөй код редактору: Tab 4 боштук кошот. */
export function CodeEditor({ value, onChange, label, rows }: { value: string; onChange: (v: string) => void; label: string; rows?: number }) {
  return (
    <textarea
      aria-label={label}
      value={value}
      spellCheck={false}
      autoCapitalize="none"
      autoCorrect="off"
      rows={rows ?? Math.max(4, value.split("\n").length + 1)}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Tab" && !e.shiftKey) {
          e.preventDefault();
          const t = e.currentTarget;
          const s = t.selectionStart;
          const next = value.slice(0, s) + "    " + value.slice(t.selectionEnd);
          onChange(next);
          requestAnimationFrame(() => t.setSelectionRange(s + 4, s + 4));
        }
      }}
      className="w-full resize-y rounded-xl bg-code px-4 py-3 font-mono text-[14.5px] leading-[1.75] text-code-ink caret-code-kw"
    />
  );
}

export function Console({ output, error }: { output?: string; error?: string }) {
  return (
    <div className="rounded-xl bg-code px-4 py-3 font-mono text-sm whitespace-pre-wrap">
      <span className="text-code-dim">Натыйжа › </span>
      {output && <span className="text-code-str">{output}</span>}
      {error && <span className="block text-[#f5a08c]">{error}</span>}
      {!output && !error && <span className="text-code-dim">(эч нерсе чыккан жок)</span>}
    </div>
  );
}
