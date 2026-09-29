"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { publishLesson, saveLesson, type LessonDraft } from "@/app/actions/teacher";
import { BlockEditor } from "@/components/builder/block-editors";
import { TopicPicker } from "@/components/topic-picker";
import type { Ktp } from "@/content/ktp";
import { Button, ButtonLink, Chip, cx, Eyebrow } from "@/components/ui";
import {
  BLOCK_LABELS,
  BLOCK_TYPES,
  blockSummary,
  DEFAULT_DURATION,
  distributeMinutes,
  DURATION_OPTIONS,
  newBlock,
  nextBlockId,
  validateLesson,
  type BlockType,
  type Issue,
} from "@/lib/lesson-edit";
import { isGraded, STAGE_META, type Block, type Stage } from "@/lib/lesson-types";

type SaveState =
  | { state: "saved"; at?: string }
  | { state: "dirty" }
  | { state: "saving" }
  | { state: "blocked" }
  | { state: "error"; message: string };

const inputCls = "w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-muted/70";

export function LessonBuilder({
  id,
  initial,
  initialStatus,
  plans,
}: {
  id: string;
  initial: LessonDraft;
  initialStatus: "draft" | "published";
  plans: Record<number, Ktp>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [status, setStatus] = useState(initialStatus);
  const [save, setSave] = useState<SaveState>({ state: "saved" });
  const [stageIdx, setStageIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showIssues, setShowIssues] = useState(false);
  const [busy, setBusy] = useState(false);

  const latest = useRef(draft);
  const version = useRef(0);
  const inflight = useRef<Promise<boolean> | null>(null);

  const issues = useMemo(() => validateLesson(draft.title, draft.content), [draft]);
  const published = status === "published";

  /* ───────── Сактоо ───────── */

  const update = useCallback((fn: (d: LessonDraft) => LessonDraft) => {
    const next = fn(latest.current);
    latest.current = next;
    version.current++;
    setDraft(next);
    setSave({ state: "dirty" });
  }, []);

  /** Акыркы абалды сактайт. true — сакталды (же сактоо керек эмес). */
  const flush = useCallback(async (): Promise<boolean> => {
    if (inflight.current) await inflight.current;
    const v = version.current;
    const d = latest.current;
    if (published && validateLesson(d.title, d.content).length) {
      setSave({ state: "blocked" });
      return false;
    }
    const run = (async () => {
      setSave({ state: "saving" });
      const r = await saveLesson(id, d).catch(() => ({ error: "Интернет байланышын текшериңиз.", savedAt: undefined }));
      if (r.error) {
        setSave({ state: "error", message: r.error });
        return false;
      }
      setSave(version.current === v ? { state: "saved", at: r.savedAt } : { state: "dirty" });
      return true;
    })();
    inflight.current = run;
    const ok = await run;
    inflight.current = null;
    return ok;
  }, [id, published]);

  useEffect(() => {
    if (save.state !== "dirty") return;
    const t = setTimeout(flush, 1000);
    return () => clearTimeout(t);
  }, [draft, save.state, flush]);

  // Жарыяланган сабакта ката оңдолгондо кайра сактоого аракет кылабыз.
  useEffect(() => {
    if (save.state === "blocked" && issues.length === 0) setSave({ state: "dirty" });
  }, [issues.length, save.state]);

  useEffect(() => {
    const unsaved = save.state !== "saved";
    if (!unsaved) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [save.state]);

  const flushed = async () => (save.state === "saved" && !inflight.current ? true : flush());

  const preview = async () => {
    setBusy(true);
    const ok = await flushed();
    setBusy(false);
    // Жарыяланган сабакта ката болсо — акыркы сакталган (туура) версия көрсөтүлөт.
    if (ok || (published && issues.length)) router.push(`/teacher/lessons/${id}/preview?from=edit`);
  };

  const publish = async () => {
    if (issues.length) return setShowIssues(true);
    setBusy(true);
    const ok = await flushed();
    const r = ok ? await publishLesson(id) : { error: "Адегенде сабак сакталышы керек." };
    setBusy(false);
    if (r.error) setSave({ state: "error", message: r.error });
    else {
      setStatus("published");
      router.refresh();
    }
  };

  /* ───────── Блоктор ───────── */

  const stage = draft.content.stages[stageIdx];

  const setStage = (fn: (s: Stage) => Stage) =>
    update((d) => ({ ...d, content: { ...d.content, stages: d.content.stages.map((s, i) => (i === stageIdx ? fn(s) : s)) } }));

  const addBlock = (type: BlockType) => {
    const bid = nextBlockId(latest.current.content, stage.key);
    setStage((s) => ({ ...s, blocks: [...s.blocks, newBlock(type, bid)] }));
    setSelected(bid);
    requestAnimationFrame(() => document.getElementById(`block-${bid}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const changeBlock = (b: Block) => setStage((s) => ({ ...s, blocks: s.blocks.map((x) => (x.id === b.id ? b : x)) }));

  const removeBlock = (b: Block) => {
    const msg = published
      ? "Бул блокту өчүрөсүзбү? Сабак жарыяланган — окуучулардын бул блокко берген жооптору натыйжаларда көрүнбөй калат."
      : "Бул блокту өчүрөсүзбү?";
    if (!window.confirm(msg)) return;
    setStage((s) => ({ ...s, blocks: s.blocks.filter((x) => x.id !== b.id) }));
    if (selected === b.id) setSelected(null);
  };

  const moveBlock = (i: number, dir: -1 | 1) =>
    setStage((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.blocks.length) return s;
      const blocks = [...s.blocks];
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...s, blocks };
    });

  const byBlock = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const x of issues) if (x.blockId) m.set(x.blockId, [...(m.get(x.blockId) ?? []), x.message]);
    return m;
  }, [issues]);
  const stageIssues = (i: number) => issues.filter((x) => x.stage === i).length;
  const totalMinutes = draft.content.stages.reduce((s, st) => s + (st.minutes || 0), 0);
  const duration = draft.content.duration ?? DEFAULT_DURATION;

  const setDuration = (d: number) => update((x) => ({ ...x, content: { ...x.content, duration: d } }));
  const spreadMinutes = () => {
    const m = distributeMinutes(duration);
    update((x) => ({ ...x, content: { ...x.content, stages: x.content.stages.map((s, i) => ({ ...s, minutes: m[i] })) } }));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ───────── Башы ───────── */}
      <header className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Link href={`/teacher/lessons/${id}`} className="text-sm font-semibold text-accent hover:underline">
            ← Сабактын барагына
          </Link>
          <input
            aria-label="Сабактын аты"
            value={draft.title}
            placeholder="Сабактын аты"
            onChange={(e) => update((d) => ({ ...d, title: e.target.value }))}
            className="-mx-2 rounded-[10px] border border-transparent bg-transparent px-2 py-1 font-display text-2xl font-bold hover:border-line focus:border-line focus:bg-surface sm:text-[26px]"
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
            {published ? <Chip tone="good">Жарыяланган</Chip> : <Chip>Долбоор</Chip>}
            <span>
              {totalMinutes} / {duration} мүнөт
            </span>
            <SaveBadge save={save} issues={issues.length} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="secondary" onClick={preview} disabled={busy}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Окуучу катары көрүү
          </Button>
          {published ? (
            <ButtonLink href={`/teacher/lessons/${id}`}>Класска жөнөтүү</ButtonLink>
          ) : (
            <Button onClick={publish} disabled={busy}>
              Жарыялоо
            </Button>
          )}
        </div>
      </header>

      {showIssues && issues.length > 0 && (
        <IssueList
          issues={issues}
          onGo={(x) => {
            if (x.stage >= 0) setStageIdx(x.stage);
            if (x.blockId) setSelected(x.blockId);
            setShowIssues(false);
          }}
          onClose={() => setShowIssues(false)}
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[210px_minmax(0,1fr)_240px] xl:items-start">
        {/* ───────── 5 бөлүк ───────── */}
        <nav aria-label="Сабактын бөлүктөрү" className="flex flex-col gap-2 xl:sticky xl:top-6">
          <span className="hidden xl:block">
            <Eyebrow>Сабактын 5 бөлүгү</Eyebrow>
          </span>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 xl:mx-0 xl:flex-col xl:overflow-visible xl:px-0">
            {draft.content.stages.map((st, i) => {
              const n = stageIssues(i);
              return (
                <button
                  key={st.key}
                  type="button"
                  aria-current={i === stageIdx ? "true" : undefined}
                  onClick={() => {
                    setStageIdx(i);
                    setSelected(null);
                  }}
                  className={cx(
                    "flex min-w-36 shrink-0 flex-col gap-0.5 rounded-xl border px-3.5 py-3 text-left xl:min-w-0",
                    i === stageIdx ? "border-2 border-accent bg-accent-soft" : "border-line bg-surface hover:bg-surface-2",
                  )}
                >
                  <span className="font-semibold">
                    {i + 1}. {STAGE_META[st.key].label}
                  </span>
                  <span className="text-[13px] text-muted">
                    {st.blocks.length} блок · ~{st.minutes || 0} мүн
                  </span>
                  {n > 0 && <span className="text-[13px] font-semibold text-bad">{n} ката</span>}
                </button>
              );
            })}
          </div>
          <TimeBox total={totalMinutes} duration={duration} onDuration={setDuration} onSpread={spreadMinutes} />
        </nav>

        {/* ───────── Бөлүктүн блоктору ───────── */}
        <section className="flex min-w-0 flex-col gap-4" aria-label={`${STAGE_META[stage.key].label}: блоктор`}>
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <Eyebrow>
              {stageIdx + 1}-бөлүк · {STAGE_META[stage.key].label}
            </Eyebrow>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Аталышы
                <input className={inputCls} value={stage.title} onChange={(e) => setStage((s) => ({ ...s, title: e.target.value }))} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                Мүнөт
                <input
                  className={inputCls}
                  type="number"
                  min={1}
                  max={90}
                  inputMode="numeric"
                  value={stage.minutes || ""}
                  onChange={(e) => setStage((s) => ({ ...s, minutes: Number(e.target.value) }))}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Киришүү сөз (милдеттүү эмес)
              <textarea
                className={cx(inputCls, "resize-y")}
                rows={2}
                value={stage.intro ?? ""}
                onChange={(e) => setStage((s) => ({ ...s, intro: e.target.value.trim() ? e.target.value : undefined }))}
              />
            </label>
          </div>

          {stage.blocks.length === 0 && (
            <p className="rounded-2xl border-2 border-dashed border-line px-5 py-8 text-center text-muted">
              Бул бөлүктө азырынча блок жок. Оң жактагы тизмеден блок түрүн тандаңыз.
            </p>
          )}

          {stage.blocks.map((b, i) => {
            const open = selected === b.id;
            const errs = byBlock.get(b.id);
            return (
              <article
                key={b.id}
                id={`block-${b.id}`}
                className={cx("scroll-mt-4 rounded-2xl border bg-surface", open ? "border-2 border-accent" : errs ? "border-bad/40" : "border-line")}
              >
                <div className="flex items-center gap-2 p-2 pl-4">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setSelected(open ? null : b.id)}
                    className="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1 text-left"
                  >
                    <Chip tone={open ? "accent" : "neutral"}>{BLOCK_LABELS[b.type]}</Chip>
                    <span className={cx("min-w-0 flex-1 truncate font-semibold", !blockSummary(b) && "font-normal text-muted")}>
                      {blockSummary(b) || "Бош блок — толтуруу үчүн басыңыз"}
                    </span>
                    {isGraded(b) && "xp" in b && <span className="font-mono text-[13px] text-muted">{b.xp ?? 10} XP</span>}
                    {errs && !open && <Chip tone="bad">{errs.length} ката</Chip>}
                  </button>
                  <IconButton label="Жогору жылдыруу" disabled={i === 0} onClick={() => moveBlock(i, -1)} d="M18 15l-6-6-6 6" />
                  <IconButton label="Төмөн жылдыруу" disabled={i === stage.blocks.length - 1} onClick={() => moveBlock(i, 1)} d="M6 9l6 6 6-6" />
                  <IconButton label="Блокту өчүрүү" danger onClick={() => removeBlock(b)} d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                </div>
                {open && (
                  <div className="flex flex-col gap-4 border-t border-surface-2 p-4 sm:p-5">
                    {errs && (
                      <ul className="flex flex-col gap-1 rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">
                        {errs.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    )}
                    <BlockEditor block={b} onChange={changeBlock} />
                  </div>
                )}
              </article>
            );
          })}
        </section>

        {/* ───────── Блок түрлөрү жана сабак жөнүндө ───────── */}
        <aside className="flex flex-col gap-6 xl:sticky xl:top-6" aria-label="Блок кошуу">
          <div className="flex flex-col gap-2.5">
            <Eyebrow>Блок кошуу · {STAGE_META[stage.key].label}</Eyebrow>
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addBlock(t)}
                  className="flex min-h-11 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3 py-2 text-left text-sm hover:border-accent hover:bg-accent-soft"
                >
                  <span aria-hidden className="font-semibold text-accent">
                    +
                  </span>
                  {BLOCK_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-5">
            <Eyebrow>Сабак жөнүндө</Eyebrow>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Класс
              <input
                className={inputCls}
                type="number"
                min={1}
                max={11}
                inputMode="numeric"
                value={draft.grade ?? ""}
                onChange={(e) => update((d) => ({ ...d, grade: e.target.value ? Number(e.target.value) : null }))}
              />
            </label>
            <TopicPicker plans={plans} grade={draft.grade} value={draft.topic} onChange={(topic) => update((d) => ({ ...d, topic }))} />
            {issues.length > 0 && (
              <button type="button" onClick={() => setShowIssues(true)} className="text-left text-sm font-semibold text-bad hover:underline">
                Жарыялоого чейин {issues.length} катаны оңдоо керек →
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function TimeBox({
  total,
  duration,
  onDuration,
  onSpread,
}: {
  total: number;
  duration: number;
  onDuration: (d: number) => void;
  onSpread: () => void;
}) {
  const diff = duration - total;
  const options = DURATION_OPTIONS.includes(duration) ? DURATION_OPTIONS : [...DURATION_OPTIONS, duration].sort((a, b) => a - b);
  return (
    <div className="mt-1 flex flex-col gap-2.5 rounded-xl bg-amber-soft p-3.5 text-[13px] leading-relaxed text-amber">
      <label className="flex flex-col gap-1.5 font-semibold">
        Сабактын узактыгы
        <select
          value={duration}
          onChange={(e) => onDuration(Number(e.target.value))}
          className="min-h-11 rounded-[10px] border border-line bg-surface px-3 text-[15px] font-normal text-ink"
        >
          {options.map((m) => (
            <option key={m} value={m}>
              {m} мүнөт
            </option>
          ))}
        </select>
      </label>
      <span>
        Бөлүктөрдө: <b>{total} мүн</b> / {duration} мүн
        <br />
        {diff === 0 ? (
          <span className="font-semibold text-good">Убакыт дал келет.</span>
        ) : diff > 0 ? (
          <span>{diff} мүн бош калды.</span>
        ) : (
          <span className="font-semibold text-bad">{-diff} мүн ашып кетти.</span>
        )}
      </span>
      {diff !== 0 && (
        <button type="button" onClick={onSpread} className="min-h-11 rounded-[10px] border border-amber/30 bg-surface px-3 text-left font-semibold text-ink hover:bg-surface-2">
          {duration} мүнөттү бөлүктөргө бөлүштүрүү
        </button>
      )}
    </div>
  );
}

function SaveBadge({ save, issues }: { save: SaveState; issues: number }) {
  switch (save.state) {
    case "saved":
      return (
        <span className="text-good" role="status">
          Сакталды{save.at && ` · ${new Date(save.at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`}
        </span>
      );
    case "dirty":
      return <span role="status">Өзгөртүүлөр бар…</span>;
    case "saving":
      return <span role="status">Сакталууда…</span>;
    case "blocked":
      return (
        <span className="font-semibold text-bad" role="alert">
          Сабак жарыяланган: {issues} ката оңдолмоюнча сакталбайт
        </span>
      );
    case "error":
      return (
        <span className="font-semibold text-bad" role="alert">
          {save.message}
        </span>
      );
  }
}

function IssueList({ issues, onGo, onClose }: { issues: Issue[]; onGo: (x: Issue) => void; onClose: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-bad/30 bg-bad-soft p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <strong className="text-bad">Жарыялоого чейин ушул каталарды оңдоңуз</strong>
        <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm font-semibold text-bad hover:underline">
          Жабуу
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {issues.map((x, i) => (
          <li key={i}>
            <button type="button" onClick={() => onGo(x)} className="min-h-9 text-left text-sm text-ink hover:underline">
              <span className="font-semibold">{x.stage >= 0 ? `${x.stage + 1}-бөлүк${x.blockId ? ` · ${x.blockId}` : ""}: ` : ""}</span>
              {x.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IconButton({ label, d, onClick, disabled, danger }: { label: string; d: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "grid size-11 shrink-0 place-items-center rounded-[10px] text-muted disabled:opacity-30",
        danger ? "hover:bg-bad-soft hover:text-bad" : "hover:bg-surface-2 hover:text-ink",
      )}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={d} />
      </svg>
    </button>
  );
}
