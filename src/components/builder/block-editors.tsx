"use client";

import type { ComponentProps, ReactNode } from "react";
import { CodeEditor } from "@/components/code";
import { cx } from "@/components/ui";
import type { Block, BugHuntBlock, CodeTaskBlock, McqBlock } from "@/lib/lesson-types";

type EditorProps<B extends Block> = { block: B; onChange: (b: B) => void };

const inputCls =
  "w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[15px] font-normal text-ink placeholder:text-muted/70";

function Label({ text, hint, children }: { text: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {text}
      {children}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

function Input({ label, hint, ...p }: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <Label text={label} hint={hint}>
      <input className={inputCls} {...p} />
    </Label>
  );
}

function Area({
  label,
  hint,
  value,
  onValue,
  mono,
  rows = 3,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onValue: (v: string) => void;
  mono?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <Label text={label} hint={hint}>
      <textarea
        className={cx(inputCls, "resize-y leading-relaxed", mono && "font-mono text-sm")}
        rows={rows}
        value={value}
        placeholder={placeholder}
        spellCheck={!mono}
        onChange={(e) => onValue(e.target.value)}
      />
    </Label>
  );
}

function Code({ label, hint, value, onValue }: { label: string; hint?: string; value: string; onValue: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <CodeEditor label={label} value={value} onChange={onValue} rows={Math.max(3, value.split("\n").length + 1)} />
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </div>
  );
}

function Check({ label, checked, onValue }: { label: string; checked: boolean; onValue: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 items-center gap-2.5 text-[15px]">
      <input type="checkbox" className="size-5 accent-accent" checked={checked} onChange={(e) => onValue(e.target.checked)} />
      {label}
    </label>
  );
}

function SmallButton({ className, ...p }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border border-line bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-surface-2",
        className,
      )}
      {...p}
    />
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-11 shrink-0 place-items-center rounded-[10px] text-muted hover:bg-bad-soft hover:text-bad"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

function XpField({ value, onValue }: { value?: number; onValue: (v: number | undefined) => void }) {
  return (
    <div className="max-w-40">
      <Input
        label="Упай (XP)"
        type="number"
        min={0}
        max={100}
        inputMode="numeric"
        value={value ?? ""}
        placeholder="10"
        onChange={(e) => onValue(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    </div>
  );
}

const opt = (s: string) => (s.trim() ? s : undefined);

/* ─────────────────────────── Блок түрлөрү ─────────────────────────── */

export function BlockEditor({ block, onChange }: EditorProps<Block>) {
  switch (block.type) {
    case "text":
      return (
        <div className="flex flex-col gap-4">
          <Input label="Аталышы (милдеттүү эмес)" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: opt(e.target.value) })} />
          <Area
            label="Текст"
            hint="**калың** жана `код` белгилери иштейт. Абзацтарды бош сап менен бөлүңүз."
            rows={6}
            value={block.body}
            onValue={(body) => onChange({ ...block, body })}
          />
        </div>
      );

    case "code_example":
      return (
        <div className="flex flex-col gap-4">
          <Code label="Python коду" value={block.code} onValue={(code) => onChange({ ...block, code })} />
          <Input label="Түшүндүрмө (милдеттүү эмес)" value={block.caption ?? ""} onChange={(e) => onChange({ ...block, caption: opt(e.target.value) })} />
          <Check
            label="Окуучу кодду өзгөртүп, иштетип көрө алат"
            checked={!!block.runnable}
            onValue={(runnable) => onChange({ ...block, runnable: runnable || undefined })}
          />
        </div>
      );

    case "mcq":
      return <McqEditor block={block} onChange={onChange} />;

    case "code_task":
      return <CodeTaskEditor block={block} onChange={onChange} />;

    case "parsons":
      return (
        <div className="flex flex-col gap-4">
          <Area label="Тапшырма" value={block.prompt} onValue={(prompt) => onChange({ ...block, prompt })} />
          <Area
            label="Саптар — туура тартипте"
            hint="Ар бир сап өзүнчө катарда. Ичкериге жылдыруу (боштуктар) сакталат. Окуучуга аралаштырылып көрсөтүлөт."
            mono
            rows={Math.max(4, block.lines.length + 1)}
            value={block.lines.join("\n")}
            onValue={(v) => onChange({ ...block, lines: v.split("\n") })}
          />
          <XpField value={block.xp} onValue={(xp) => onChange({ ...block, xp })} />
        </div>
      );

    case "bug_hunt":
      return <BugHuntEditor block={block} onChange={onChange} />;

    case "open":
      return (
        <div className="flex flex-col gap-4">
          <Area label="Суроо" value={block.prompt} onValue={(prompt) => onChange({ ...block, prompt })} />
          <Input
            label="Жооп талаасындагы мисал (милдеттүү эмес)"
            value={block.placeholder ?? ""}
            onChange={(e) => onChange({ ...block, placeholder: opt(e.target.value) })}
          />
          <Check label="Жооп берүү милдеттүү эмес" checked={!!block.optional} onValue={(v) => onChange({ ...block, optional: v || undefined })} />
          <Area
            label="Жооптон кийин көрсөтүлүүчү түшүндүрмө (милдеттүү эмес)"
            value={block.feedback ?? ""}
            onValue={(v) => onChange({ ...block, feedback: opt(v) })}
          />
          <Code
            label="Түшүндүрмөдөгү код (милдеттүү эмес)"
            value={block.feedbackCode ?? ""}
            onValue={(v) => onChange({ ...block, feedbackCode: opt(v) })}
          />
        </div>
      );

    case "confidence":
      return (
        <Area
          label="Суроо"
          hint="Окуучу 4 деңгээлдин бирин тандайт: түшүнбөдүм → башкага түшүндүрө алам."
          value={block.prompt}
          onValue={(prompt) => onChange({ ...block, prompt })}
        />
      );
  }
}

function McqEditor({ block, onChange }: EditorProps<McqBlock>) {
  const setOption = (i: number, v: string) => onChange({ ...block, options: block.options.map((o, j) => (j === i ? v : o)) });
  const remove = (i: number) =>
    onChange({
      ...block,
      options: block.options.filter((_, j) => j !== i),
      correct: block.correct === i ? -1 : block.correct > i ? block.correct - 1 : block.correct,
    });
  return (
    <div className="flex flex-col gap-4">
      <Area label="Суроо" value={block.prompt} onValue={(prompt) => onChange({ ...block, prompt })} />
      <Code
        label="Суроодогу код (милдеттүү эмес)"
        value={block.code ?? ""}
        onValue={(v) => onChange({ ...block, code: opt(v) })}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">Варианттар — туурасын белгилеңиз</legend>
        {block.options.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <label className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] hover:bg-surface-2" title="Туура жооп">
              <input
                type="radio"
                name={`correct-${block.id}`}
                className="size-5 accent-good"
                checked={block.correct === i}
                onChange={() => onChange({ ...block, correct: i })}
                aria-label={`${i + 1}-вариант туура`}
              />
            </label>
            <input
              className={cx(inputCls, block.mono && "font-mono", block.correct === i && "border-good bg-good-soft")}
              value={o}
              placeholder={`${i + 1}-вариант`}
              onChange={(e) => setOption(i, e.target.value)}
            />
            {block.options.length > 2 && <RemoveButton label={`${i + 1}-вариантты өчүрүү`} onClick={() => remove(i)} />}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          {block.options.length < 6 && (
            <SmallButton onClick={() => onChange({ ...block, options: [...block.options, ""] })}>+ Вариант кошуу</SmallButton>
          )}
          <Check label="Варианттар код түрүндө" checked={!!block.mono} onValue={(v) => onChange({ ...block, mono: v || undefined })} />
        </div>
      </fieldset>
      <Area
        label="Туура жооптон кийинки түшүндүрмө (милдеттүү эмес)"
        value={block.explain ?? ""}
        onValue={(v) => onChange({ ...block, explain: opt(v) })}
      />
      <Area label="Кеңеш — ката жооптон кийин (милдеттүү эмес)" value={block.hint ?? ""} onValue={(v) => onChange({ ...block, hint: opt(v) })} />
      <XpField value={block.xp} onValue={(xp) => onChange({ ...block, xp })} />
    </div>
  );
}

function CodeTaskEditor({ block, onChange }: EditorProps<CodeTaskBlock>) {
  const setTest = (i: number, patch: Partial<CodeTaskBlock["tests"][number]>) =>
    onChange({ ...block, tests: block.tests.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  return (
    <div className="flex flex-col gap-4">
      <Area label="Тапшырманын шарты" value={block.prompt} onValue={(prompt) => onChange({ ...block, prompt })} />
      <Code
        label="Баштапкы код"
        hint="Окуучу ушул коддон баштайт. Бош калтырсаңыз болот."
        value={block.starter}
        onValue={(starter) => onChange({ ...block, starter })}
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-sm font-semibold">Тесттер</legend>
        <p className="text-xs text-muted">
          Программага «Кирүү» берилет (input() аркылуу, ар бир маани өзүнчө сапта), чыккан текст «Күтүлгөн натыйжага»
          дал келсе — тест өттү.
        </p>
        {block.tests.map((t, i) => (
          <div key={i} className="grid gap-2 rounded-xl bg-bg p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
            <Area label={`${i + 1}-тест: кирүү`} mono rows={2} value={t.input} onValue={(input) => setTest(i, { input })} placeholder="18" />
            <Area label="Күтүлгөн натыйжа" mono rows={2} value={t.expected} onValue={(expected) => setTest(i, { expected })} placeholder="Кире аласыз" />
            <div className="sm:pt-6">
              <RemoveButton label={`${i + 1}-тестти өчүрүү`} onClick={() => onChange({ ...block, tests: block.tests.filter((_, j) => j !== i) })} />
            </div>
          </div>
        ))}
        <SmallButton className="self-start" onClick={() => onChange({ ...block, tests: [...block.tests, { input: "", expected: "" }] })}>
          + Тест кошуу
        </SmallButton>
      </fieldset>
      <Area label="Кеңеш (окуучу сураса)" value={block.hint ?? ""} onValue={(v) => onChange({ ...block, hint: opt(v) })} />
      <XpField value={block.xp} onValue={(xp) => onChange({ ...block, xp })} />
    </div>
  );
}

function BugHuntEditor({ block, onChange }: EditorProps<BugHuntBlock>) {
  const n = block.code.split("\n").length;
  const setBug = (i: number, patch: Partial<BugHuntBlock["bugs"][number]>) =>
    onChange({ ...block, bugs: block.bugs.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  return (
    <div className="flex flex-col gap-4">
      <Area label="Тапшырма" value={block.prompt} onValue={(prompt) => onChange({ ...block, prompt })} />
      <Code label="Каталуу код" value={block.code} onValue={(code) => onChange({ ...block, code })} />
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-sm font-semibold">Каталар</legend>
        {block.bugs.map((b, i) => (
          <div key={i} className="grid gap-2 rounded-xl bg-bg p-3 sm:grid-cols-[120px_1fr_auto] sm:items-start">
            <Label text="Сап">
              <select className={inputCls} value={b.line} onChange={(e) => setBug(i, { line: Number(e.target.value) })}>
                {Array.from({ length: Math.max(n, b.line) }, (_, k) => k + 1).map((k) => (
                  <option key={k} value={k}>
                    {k}-сап
                  </option>
                ))}
              </select>
            </Label>
            <Area label="Эмне үчүн ката" rows={2} value={b.explain} onValue={(explain) => setBug(i, { explain })} />
            <div className="sm:pt-6">
              <RemoveButton label={`${i + 1}-катаны өчүрүү`} onClick={() => onChange({ ...block, bugs: block.bugs.filter((_, j) => j !== i) })} />
            </div>
          </div>
        ))}
        <SmallButton className="self-start" onClick={() => onChange({ ...block, bugs: [...block.bugs, { line: 1, explain: "" }] })}>
          + Ката кошуу
        </SmallButton>
      </fieldset>
      <Code
        label="Оңдолгон код (милдеттүү эмес)"
        hint="Окуучу бардык каталарды тапкандан кийин көрсөтүлөт."
        value={block.fixed ?? ""}
        onValue={(v) => onChange({ ...block, fixed: opt(v) })}
      />
      <XpField value={block.xp} onValue={(xp) => onChange({ ...block, xp })} />
    </div>
  );
}
