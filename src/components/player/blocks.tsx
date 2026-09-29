"use client";

import { useEffect, useMemo, useState } from "react";
import { CodeEditor, CodeView, Console, highlight } from "@/components/code";
import { Button, cx, RichText } from "@/components/ui";
import type {
  BugHuntBlock,
  CodeExampleBlock,
  CodeTaskBlock,
  ConfidenceBlock,
  McqBlock,
  OpenBlock,
  ParsonsBlock,
} from "@/lib/lesson-types";
import { CONFIDENCE_LABELS } from "@/lib/lesson-types";
import { explainError, outputMatches, runPython, type RunResult } from "@/lib/python";
import { shufflePerm } from "@/lib/student-view";

import type { SavedAnswer } from "@/lib/grading";
export type { SavedAnswer };
export type AnswerFn = (response: Record<string, unknown>, isCorrect: boolean | null) => void;
/** `failed` — сервер жоопту кабыл албаганда көбөйөт: блок «текшерилүүдө» абалынан чыгып, кайра аракет кылууга болот. */
type Props<B> = { block: B; saved?: SavedAnswer; onAnswer: AnswerFn; exitMode?: boolean; failed?: number };

function Feedback({ tone, title, text }: { tone: "good" | "bad" | "info"; title?: string; text?: string }) {
  const cls = tone === "good" ? "bg-good-soft text-good" : tone === "bad" ? "bg-bad-soft text-bad" : "bg-accent-soft text-ink";
  return (
    <div role="status" className={cx("rounded-[10px] px-4 py-3 text-[15px]", cls)}>
      {title && <strong className="mr-1">{title}</strong>}
      {text && <RichText text={text} className="inline" />}
    </div>
  );
}

/* ─────────────── Тест ─────────────── */
/** Жооп серверге кетти, натыйжасы келе элек. `saved` өзгөргөндө тазаланат. */
function usePending<T>(saved: SavedAnswer | undefined, failed: number | undefined) {
  const [pending, setPending] = useState<T | null>(null);
  useEffect(() => setPending(null), [saved, failed]);
  return [pending, setPending] as const;
}

export function Mcq({ block, saved, onAnswer, exitMode, failed }: Props<McqBlock>) {
  const wrong = (saved?.response.wrong as number[] | undefined) ?? [];
  const picked = saved?.response.picked as number | undefined;
  const solved = exitMode ? picked !== undefined : saved?.is_correct === true;
  // Окуучу режиминде туура жооп жашырылган (correct = -1) — баалоону сервер кылат.
  const hidden = block.correct < 0;
  const [pending, setPending] = usePending<number>(saved, failed);

  const pick = (i: number) => {
    if (solved || pending !== null) return;
    if (hidden) {
      setPending(i);
      return onAnswer(exitMode ? { picked: i } : { picked: i, wrong }, null);
    }
    if (exitMode) return onAnswer({ picked: i }, i === block.correct);
    if (i === block.correct) onAnswer({ picked: i, wrong }, true);
    else onAnswer({ picked: i, wrong: [...wrong, i] }, false);
  };

  return (
    <div className="flex flex-col gap-3">
      <RichText text={block.prompt} className="font-semibold" />
      {block.code && <CodeView code={block.code} />}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
        {block.options.map((o, i) => {
          const isRight = !exitMode && solved && i === block.correct;
          const isWrong = !exitMode && wrong.includes(i);
          const isPicked = (exitMode && picked === i) || pending === i;
          return (
            <button
              key={i}
              type="button"
              aria-busy={pending === i}
              disabled={solved || isWrong || (pending !== null && pending !== i)}
              onClick={() => pick(i)}
              className={cx(
                "min-h-11 rounded-[10px] border px-4 py-2.5 text-left transition",
                block.mono && "text-center font-mono text-lg",
                isRight && "border-good bg-good-soft font-semibold text-good",
                isWrong && "border-bad bg-bad-soft text-bad",
                isPicked && "border-accent bg-accent-soft font-semibold",
                !isRight && !isWrong && !isPicked && "border-line bg-bg hover:border-accent",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
      {!exitMode && solved && <Feedback tone="good" title="Туура!" text={block.explain} />}
      {!exitMode && !solved && wrong.length > 0 && <Feedback tone="bad" title="Дагы бир жолу аракет кыл." text={block.hint} />}
      {exitMode && solved && <p className="text-sm text-muted">Жооп кабыл алынды.</p>}
    </div>
  );
}

/* ─────────────── Код мисалы ─────────────── */
export function CodeExample({ block }: { block: CodeExampleBlock }) {
  const [code, setCode] = useState(block.code);
  const [res, setRes] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState(false);
  if (!block.runnable)
    return (
      <div className="flex flex-col gap-2">
        <CodeView code={block.code} />
        {block.caption && <p className="text-sm text-muted">{block.caption}</p>}
      </div>
    );
  return (
    <div className="flex flex-col gap-2.5">
      <CodeEditor value={code} onChange={setCode} label="Код мисалы" />
      {block.caption && <p className="text-sm text-muted">{block.caption}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setRes(await runPython(code));
            setBusy(false);
          }}
        >
          {busy ? "Иштеп жатат…" : "▶ Иштетүү"}
        </Button>
        {code !== block.code && (
          <Button type="button" variant="secondary" onClick={() => setCode(block.code)}>
            Баштапкы код
          </Button>
        )}
      </div>
      {res && <Console output={res.output} error={res.error && explainError(res.error)} />}
    </div>
  );
}

/* ─────────────── Код тапшырмасы ─────────────── */
type TestRow = { input: string; expected: string; got: string; ok: boolean; error?: string };

export function CodeTask({ block, saved, onAnswer }: Props<CodeTaskBlock>) {
  const [code, setCode] = useState((saved?.response.code as string) ?? block.starter);
  const [rows, setRows] = useState<TestRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(false);
  const solved = saved?.is_correct === true;

  const check = async () => {
    setBusy(true);
    const out: TestRow[] = [];
    for (const t of block.tests) {
      const r = await runPython(code, t.input);
      out.push({ ...t, got: r.output.trim(), ok: !r.error && outputMatches(r.output, t.expected), error: r.error });
      if (r.error) break;
    }
    setRows(out);
    setBusy(false);
    const pass = out.length === block.tests.length && out.every((r) => r.ok);
    onAnswer({ code, passed: out.filter((r) => r.ok).length }, pass);
  };

  const firstError = rows?.find((r) => r.error)?.error;
  const passed = rows?.filter((r) => r.ok).length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <RichText text={block.prompt} className="font-semibold" />
      <CodeEditor value={code} onChange={setCode} label="Сенин кодуң" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={check} disabled={busy}>
          {busy ? "Текшерилүүдө…" : "Текшерүү"}
        </Button>
        {block.hint && !solved && (
          <Button type="button" variant="secondary" onClick={() => setHint(true)}>
            Кеңеш
          </Button>
        )}
      </div>
      {busy && !rows && <p className="text-sm text-muted">Биринчи жолу Python жүктөлүп жатат, бир аз күтө тур…</p>}
      {hint && !solved && <Feedback tone="info" title="Кеңеш:" text={block.hint} />}
      {firstError && <Feedback tone="bad" title="Ката:" text={explainError(firstError)} />}
      {rows && !firstError && (
        <>
          <Feedback
            tone={solved ? "good" : "bad"}
            title={`${passed}/${block.tests.length} тест өттү.`}
            text={solved ? "Мыкты!" : "Кайсы учурда ката кетип жатканын таблицадан кара."}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-[0.06em] text-muted uppercase">
                  <th className="py-1.5 pr-3">Кирүү</th>
                  <th className="py-1.5 pr-3">Күтүлгөн</th>
                  <th className="py-1.5 pr-3">Сенин программаң</th>
                  <th className="py-1.5">Тест</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-2 pr-3 font-mono">{r.input}</td>
                    <td className="py-2 pr-3">{r.expected}</td>
                    <td className="py-2 pr-3">{r.got || "—"}</td>
                    <td className={cx("py-2 font-semibold", r.ok ? "text-good" : "text-bad")}>{r.ok ? "Өттү" : "Өтпөдү"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {solved && !rows && <Feedback tone="good" title="Аткарылды." text="Бардык тесттер өткөн." />}
    </div>
  );
}

/* ─────────────── Саптарды иреттөө ─────────────── */
export function Parsons({ block, saved, onAnswer, failed }: Props<ParsonsBlock>) {
  const solved = saved?.is_correct === true;
  // Окуучу режиминде саптар серверде аралаштырылып келет, туура тартибин сервер гана билет.
  const hidden = !!block.shuffled;
  const initialPool = useMemo(
    () => (block.shuffled ? block.lines.map((_, i) => i) : shufflePerm(block.lines.length, block.id)),
    [block],
  );
  const [answer, setAnswer] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean[] | null>(null);
  const [pending, setPending] = usePending<true>(saved, failed);
  const pool = initialPool.filter((i) => !answer.includes(i));
  // Чечилгенде блок туура тартиптеги саптар менен келет.
  const shown = solved ? block.lines.map((_, i) => i) : answer;

  useEffect(() => {
    const positions = saved?.response.positions as boolean[] | undefined;
    if (hidden && pending === null && positions && positions.length === answer.length) setChecked(positions);
    // жооп келгенде гана (saved) — саптарды жылдырганда эмес
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const move = (i: number) => {
    if (solved || pending) return;
    setChecked(null);
    setAnswer((a) => (a.includes(i) ? a.filter((x) => x !== i) : [...a, i]));
  };
  const check = () => {
    if (hidden) {
      setPending(true);
      return onAnswer({ order: answer }, null);
    }
    // Бирдей саптар болсо да текст боюнча салыштырабыз.
    const res = answer.map((i, pos) => block.lines[i] === block.lines[pos]);
    setChecked(res);
    onAnswer({ order: answer, positions: res }, answer.length === block.lines.length && res.every(Boolean));
  };

  const lineBtn = (i: number, pos?: number) => (
    <button
      key={i}
      type="button"
      onClick={() => move(i)}
      className={cx(
        "overflow-x-auto rounded-lg border bg-code px-3 py-2 text-left font-mono text-sm whitespace-pre text-code-ink",
        pos !== undefined && checked ? (checked[pos] ? "border-good" : "border-bad") : "border-transparent hover:border-code-kw",
      )}
    >
      {highlight(block.lines[i])}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <RichText text={block.prompt} className="font-semibold" />
      {!solved && <p className="text-sm text-muted">Сапты басып, «Сенин программаң» кутусуна кош. Кайтаруу үчүн кайра бас.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {!solved && (
          <div className="flex min-h-28 flex-col gap-1.5 rounded-xl border border-dashed border-line p-2.5">
            <span className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">Аралашкан саптар</span>
            {pool.map((i) => lineBtn(i))}
          </div>
        )}
        <div className="flex min-h-28 flex-col gap-1.5 rounded-xl border border-dashed border-line p-2.5">
          <span className="text-xs font-semibold tracking-[0.06em] text-muted uppercase">Сенин программаң</span>
          {shown.map((i, pos) => lineBtn(i, pos))}
        </div>
      </div>
      {!solved && (
        <div className="flex gap-2">
          <Button type="button" onClick={check} disabled={answer.length < block.lines.length || !!pending}>
            {pending ? "Текшерилүүдө…" : "Текшерүү"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => (setAnswer([]), setChecked(null))}>
            Башынан
          </Button>
        </div>
      )}
      {checked && !solved && (
        <Feedback tone="bad" title={`${checked.filter(Boolean).length}/${block.lines.length} сап өз ордунда.`} text="Кызыл саптардын ордун алмаштырып көр." />
      )}
      {solved && <Feedback tone="good" title="Мыкты!" text="Программа туура курулду." />}
    </div>
  );
}

/* ─────────────── Катаны тап ─────────────── */
export function BugHunt({ block, saved, onAnswer, failed }: Props<BugHuntBlock>) {
  const found = new Set((saved?.response.found as number[] | undefined) ?? []);
  const [miss, setMiss] = useState<number | null>(null);
  // Окуучу режиминде `bugs`те табылгандары гана турат, жалпы саны — `bugCount`.
  const hidden = block.bugCount !== undefined;
  const total = block.bugCount ?? block.bugs.length;
  const solved = found.size === total;
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    if (pending === null) return;
    const now = new Set((saved?.response.found as number[] | undefined) ?? []);
    if (!now.has(pending) && now.size >= found.size) setMiss(pending);
    setPending(null);
    // жооп келгенде (же сервер ката бергенде) гана
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, failed]);

  const click = (n: number) => {
    if (solved || pending !== null || found.has(n)) return;
    if (hidden) {
      setMiss(null);
      setPending(n);
      return onAnswer({ found: [...found, n] }, null);
    }
    if (block.bugs.some((b) => b.line === n)) {
      if (found.has(n)) return;
      const next = [...found, n];
      setMiss(null);
      onAnswer({ found: next }, next.length === block.bugs.length);
    } else setMiss(n);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RichText text={block.prompt} className="font-semibold" />
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
          {found.size} / {total} табылды
        </span>
      </div>
      <CodeView
        code={block.code}
        onLineClick={click}
        lineClass={(n) => (found.has(n) ? "!border-[#f07a70] bg-[#4a1f1c]" : n === pending ? "bg-code-hl" : undefined)}
      />
      {block.bugs
        .filter((b) => found.has(b.line))
        .map((b) => (
          <Feedback key={b.line} tone="good" text={b.explain} />
        ))}
      {miss && <Feedback tone="bad" text={`${miss}-сап туура жазылган. Башкасын изде.`} />}
      {solved && block.fixed && (
        <>
          <p className="text-sm text-muted">Оңдолгон вариант:</p>
          <CodeView code={block.fixed} />
        </>
      )}
    </div>
  );
}

/* ─────────────── Ачык жооп ─────────────── */
export function Open({ block, saved, onAnswer }: Props<OpenBlock>) {
  const [text, setText] = useState((saved?.response.text as string) ?? "");
  const submitted = !!saved;
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        <RichText text={block.prompt} className="font-semibold" />
        {!block.optional && !block.feedback && <span className="text-sm text-muted">Туура же туура эмес деген баа коюлбайт.</span>}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            // Милдеттүү эмес жоопту окуучу баскычты баспаса да сактап коёбуз.
            if (block.optional && text.trim() && text.trim() !== saved?.response.text) onAnswer({ text: text.trim() }, null);
          }}
          rows={3}
          placeholder={block.placeholder}
          readOnly={submitted && !!block.feedback}
          className="rounded-[10px] border border-line bg-bg px-3 py-2.5"
        />
      </label>
      {!(submitted && block.feedback) && (
        <div>
          <Button type="button" variant={submitted ? "secondary" : "primary"} disabled={text.trim().length < 2} onClick={() => onAnswer({ text: text.trim() }, null)}>
            {submitted ? "Жоопту жаңылоо" : block.feedback ? "Жоопту салыштыруу" : "Жөнөтүү"}
          </Button>
        </div>
      )}
      {submitted && block.feedback && (
        <>
          <Feedback tone="info" text={block.feedback} />
          {block.feedbackCode && <CodeView code={block.feedbackCode} />}
        </>
      )}
    </div>
  );
}

/* ─────────────── Ишеним шкаласы ─────────────── */
export function Confidence({ block, saved, onAnswer }: Props<ConfidenceBlock>) {
  const value = saved?.response.value as number | undefined;
  return (
    <div className="flex flex-col gap-3">
      <RichText text={block.prompt} className="font-semibold" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CONFIDENCE_LABELS.map((l, i) => (
          <button
            key={l}
            type="button"
            aria-pressed={value === i + 1}
            onClick={() => onAnswer({ value: i + 1 }, null)}
            className={cx(
              "flex min-h-16 flex-col gap-0.5 rounded-[10px] border px-3 py-2.5 text-left text-sm",
              value === i + 1 ? "border-accent bg-accent-soft" : "border-line bg-bg hover:border-accent",
            )}
          >
            <b className="font-mono text-lg">{i + 1}</b>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
