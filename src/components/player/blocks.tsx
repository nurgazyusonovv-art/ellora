"use client";

import {useLessonDraft} from "./lesson-draft";
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
  InvestigationBlock,
  ParsonsBlock,
  MatchingBlock,
  OrderingBlock,
} from "@/lib/lesson-types";
import { CONFIDENCE_LABELS } from "@/lib/lesson-types";
import { explainError, outputMatches, runPython, type RunResult } from "@/lib/python";
import { shufflePerm } from "@/lib/student-view";
import { CodeTraceLab } from "@/components/code-trace-lab";

import type { SavedAnswer } from "@/lib/grading";
export type { SavedAnswer };
export type AnswerFn = (response: Record<string, unknown>, isCorrect: boolean | null) => void;
/** `failed` — сервер жоопту кабыл албаганда көбөйөт: блок «текшерилүүдө» абалынан чыгып, кайра аракет кылууга болот. */
type Props<B> = { block: B; saved?: SavedAnswer; onAnswer: AnswerFn; exitMode?: boolean; failed?: number };

function Feedback({ tone, title, text }: { tone: "good" | "bad" | "info"; title?: string; text?: string }) {
  const cls = tone === "good" ? "bg-good-soft text-good" : tone === "bad" ? "bg-bad-soft text-bad" : "bg-accent-soft text-ink";
  return (
    <div role="status" className={cx("rounded-md px-4 py-3 text-[15px]", cls)}>
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
                "min-h-11 rounded-md border px-4 py-2.5 text-left transition",
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
  const [code, setCode] = useLessonDraft(block.id,"code",(saved?.response.code as string) ?? block.starter);
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
                <tr className="border-b border-line bg-surface-2 text-left font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
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
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Аралашкан саптар</span>
            {pool.map((i) => lineBtn(i))}
          </div>
        )}
        <div className="flex min-h-28 flex-col gap-1.5 rounded-xl border border-dashed border-line p-2.5">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Сенин программаң</span>
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
export function Open({ block, saved, onAnswer, comparison }: Props<OpenBlock> & { comparison?: string }) {
  const [text, setText] = useLessonDraft(block.id,"text",(saved?.response.text as string) ?? "");
  const submitted = !!saved;
  return (
    <div className="flex flex-col gap-3">
      {comparison && <div className="rounded-xl bg-accent-soft p-4 border border-accent/20"><p className="mb-2 text-sm font-semibold">Баштапкы оюң</p><p className="whitespace-pre-wrap">{comparison}</p></div>}
      {block.rubric?.length ? <div className="text-sm text-muted"><p className="font-semibold">Баалоо критерийлери</p><ul className="list-disc pl-5">{block.rubric.map(x => <li key={x}>{x}</li>)}</ul></div> : null}
      <label className="flex flex-col gap-2">
        <RichText text={block.prompt} className="font-semibold" />
        {!block.optional && !block.feedback && <span className="text-sm text-muted">{block.rubric?.length ? "Мугалим жообуңду ушул критерийлер менен баалайт." : "Туура же туура эмес деген баа коюлбайт."}</span>}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            // Милдеттүү эмес жоопту окуучу баскычты баспаса да сактап коёбуз.
            if (block.optional && text.trim() && text.trim() !== saved?.response.text) onAnswer({ text: text.trim() }, null);
          }}
          rows={3}
          placeholder={block.placeholder}
          readOnly={submitted && (!!block.feedback || !!block.lockOnSubmit)}
          className="rounded-md border border-line bg-bg px-3 py-2.5"
        />
      </label>
      {!(submitted && (block.feedback || block.lockOnSubmit)) && (
        <div>
          <Button type="button" variant={submitted ? "secondary" : "primary"} disabled={text.trim().length < 2} onClick={() => onAnswer({ text: text.trim() }, null)}>
            {submitted ? "Жоопту жаңылоо" : block.feedback ? "Жоопту салыштыруу" : "Жөнөтүү"}
          </Button>
        </div>
      )}
      {submitted && block.lockOnSubmit && <p role="status" className="text-sm text-accent">Жообуң сакталды жана бекитилди. Кайра иштөө керек болсо, мугалим өзүнчө мүмкүнчүлүк ачат.</p>}
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
              "flex min-h-16 flex-col gap-0.5 rounded-md border px-3 py-2.5 text-left text-sm",
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


export function Investigation({ block, saved, onAnswer }: Props<InvestigationBlock>) {
  const [prediction, setPrediction] = useLessonDraft(block.id,"prediction",(saved?.response.prediction as string) ?? "");
  const [locked, setLocked] = useState(!!saved);
  const [observations, setObservations] = useLessonDraft(block.id,"observations",(saved?.response.observations as string) ?? "");
  const [conclusion, setConclusion] = useLessonDraft(block.id,"conclusion",(saved?.response.conclusion as string) ?? "");
  const area = "w-full rounded-xl border border-line bg-bg px-3 py-3";
  return <div className="flex flex-col gap-4">
    <RichText text={block.prompt} className="font-semibold" />
    <label className="flex flex-col gap-2 font-semibold">1. Божомолуң<textarea className={area} rows={3} value={prediction} readOnly={locked} onChange={e => setPrediction(e.target.value)} /></label>
    {!locked && <Button type="button" disabled={!prediction.trim()} onClick={() => { setLocked(true); onAnswer({ phase: "prediction", prediction }, null); }}>Божомолду бекитүү жана сынап көрүү</Button>}
    {locked && <>
      <div className="rounded-xl bg-accent-soft p-4 border border-accent/20"><p className="mb-2 font-semibold">2. Сынап көр</p><RichText text={block.procedure} /></div>
      {block.simulation && <CodeTraceLab key={`${block.id}:${block.simulation}`} initialKind={block.simulation} embedded />}
      {block.code && <CodeExample block={{ id: block.id + "-code", type: "code_example", code: block.code, runnable: true }} />}
      <label className="flex flex-col gap-2 font-semibold">3. Эмнени байкадың?<textarea className={area} rows={4} value={observations} onChange={e => setObservations(e.target.value)} /></label>
      <label className="flex flex-col gap-2 font-semibold">4. Далилге таянган жыйынтык<textarea className={area} rows={3} value={conclusion} onChange={e => setConclusion(e.target.value)} /></label>
      <p className="text-sm text-muted">Божомол туура эмес чыкса да болот. Кайсы байкоо оюңду өзгөрттү?</p>
      <Button type="button" disabled={!observations.trim() || !conclusion.trim()} onClick={() => onAnswer({ prediction, observations, conclusion }, null)}>{saved ? "Байкоону жаңылоо" : "Изилдөөнү сактоо"}</Button>
      {saved?.response.conclusion ? <p role="status" className="text-sm text-accent">Изилдөө сакталды. Жыйынтыгыңды мугалим карай алат.</p> : null}
    </>}
  </div>;
}

export { Presentation } from "./presentation";


/* Колдонуудагы машыгуу жана Баалоодогу бир жолку өз алдынча тапшырма. */
export function InteractiveTask({block,saved,onAnswer,exitMode,failed}:Props<MatchingBlock|OrderingBlock>) {
 const matching=block.type==="matching";
 const n=matching?block.pairs.length:block.steps.length;
 const perm=useMemo(()=>block.shuffled?Array.from({length:n},(_,i)=>i):shufflePerm(n,block.id),[block,n]);
 const texts=matching?perm.map(i=>block.pairs[i].right):perm.map(i=>block.steps[i]);
 const field=matching?"picks":"order";
 const [values,setValues]=useState<number[]>(()=>Array.isArray(saved?.response[field])?saved!.response[field] as number[]:matching?Array(n).fill(-1):[]);
 const [pending,setPending]=usePending<boolean>(saved,failed);
 const locked=!!pending || saved?.is_correct===true || !!exitMode&&!!saved;
 const [edited,setEdited]=useState(false);
 const positions=!edited?saved?.response.positions as boolean[]|undefined:undefined;
 const change=(next:number[])=>{setEdited(true);setValues(next);};
 const submit=()=>{
  if(locked||values.length!==n||values.some(v=>v<0))return;
  const correct=values.map((v,i)=>perm[v]===i);
  setEdited(false);setPending(true);
  onAnswer({[field]:values,...(!exitMode&&!block.shuffled?{positions:correct}:{})},block.shuffled?null:correct.every(Boolean));
 };
 return <div className="flex min-w-0 flex-col gap-4">
  <h3 className="font-semibold"><RichText text={block.prompt}/></h3>
  <p className="text-sm text-muted">{matching?"Ар бир сапка бирден дал келген вариант танда.":"Кадамдарды басып, туура иретке чогулт. Тандалган кадамды кайра бассаң, ал тизмеден алынат."} {exitMode?"Бир жолу тапшырылат. Жооптор тапшырганга чейин текшерилбейт.":"Тапшыр, пикирди карап оңдоп көр."}</p>
  {matching?<div className="flex flex-col gap-3">{block.pairs.map((p,i)=><label key={i} className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface p-3"><span className="break-words text-sm font-semibold">{i+1}. {p.left}</span><select aria-label={`${i+1}-сапка дал келген вариант`} className="shadow-xs min-h-11 w-full min-w-0 rounded-xl border border-line-strong bg-surface px-3 text-sm" disabled={locked} value={values[i]??-1} onChange={e=>change(values.map((v,j)=>i===j?Number(e.target.value):v))}><option value={-1}>Вариант танда</option>{texts.map((text,j)=><option key={j} value={j} disabled={values.includes(j)&&values[i]!==j}>{text}</option>)}</select>{positions&&<span className={`text-sm ${positions[i]?"text-good":"text-bad"}`}>{positions[i]?"✓ Дал келди":"↻ Бул байланыштын маанисин кайра салыштыр."}</span>}</label>)}</div>:<>
   <ol aria-label="Сен түзгөн ирет" className="flex flex-col gap-2 rounded-xl border border-line p-3">{values.length===0&&<li className="text-sm text-muted">Төмөндөн биринчи кадамды танда.</li>}{values.map((v,i)=><li key={v}><button type="button" disabled={locked} className="min-h-11 w-full break-words rounded-xl bg-accent-soft p-3 text-left text-sm border border-accent/20" onClick={()=>change(values.filter(x=>x!==v))}>{i+1}. {texts[v]}{positions&&<span className="mt-1 block font-semibold">{positions[i]?"✓ Орду туура":"↻ Алдынкы жана кийинки кадамды текшер."}</span>}</button></li>)}</ol>
   <div aria-label="Тандала элек кадамдар" className="flex flex-col gap-2">{texts.map((text,i)=>!values.includes(i)&&<button key={i} type="button" disabled={locked} onClick={()=>change([...values,i])} className="min-h-11 break-words rounded-xl border border-line bg-surface p-3 text-left text-sm">+ {text}</button>)}</div>
  </>}
  <Button type="button" disabled={locked||values.length!==n||values.some(v=>v<0)} onClick={submit}>{pending?"Сакталууда…":saved&&exitMode?"Жооп тапшырылды":saved?.is_correct?"Аткарылды":"Жоопту тапшыруу"}</Button>
  {exitMode&&saved?<Feedback tone="info" text="Жообуң сакталды. Калган тапшырмаларды өз алдынча улант."/>:!exitMode&&saved&&!edited&&<Feedback tone={saved.is_correct?"good":"info"} title={saved.is_correct?"Аткарылды!":"Кайра салыштырып көр."} text={saved.is_correct?block.explain:"Ар бир тандоонун себебин ойлон. Кадамдар бири-бирине кандай байланышат?"}/>}
 </div>;
}
