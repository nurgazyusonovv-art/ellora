"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {KtpMetadataFields} from "./ktp-metadata-fields";
import {addQuarterlyWorks,suggestMissingSkills,ensureKtpIds} from "@/content/ktp/enrichment";
import {KTP_TEMPLATES} from "@/content/ktp";
import { deleteKtp, saveKtp } from "@/app/actions/ktp";
import { Button, cx } from "@/components/ui";
import { planHours, sectionHours, type KtpSection, type KtpTopic } from "@/content/ktp";

type Save = { state: "saved" | "dirty" | "saving"; at?: string } | { state: "error"; message: string };

const inputCls = "min-h-11 w-full rounded-md border border-line bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-muted/70";
const hoursCls = "min-h-11 w-20 shrink-0 rounded-md border border-line bg-surface px-2.5 py-2.5 text-center font-mono text-[15px]";

function move<T>(arr: T[], i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const out = [...arr];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export function KtpEditor({
  grade,
  preview=false,
  initialYear,
  initialSections,
  source,
  hasOwn,
  hasTemplate,
}: {
  grade: number;
  preview?:boolean;
  initialYear: string;
  initialSections: KtpSection[];
  source?: string;
  /** Мугалимдин өз көчүрмөсү барбы (жок болсо — үлгү көрсөтүлүп, биринчи өзгөртүүдө көчүрмө түзүлөт). */
  hasOwn: boolean;
  hasTemplate: boolean;
}) {
  const [own, setOwn] = useState(hasOwn);
  const [year, setYear] = useState(initialYear);
  const [sections, setSections] = useState(()=>ensureKtpIds(initialSections));
  const [save, setSave] = useState<Save>({ state: "saved" });
  const latest = useRef({ year, sections });
  const version = useRef(0);

  const change = (next: { year?: string; sections?: KtpSection[] }) => {
    latest.current = { ...latest.current, ...next };
    version.current++;
    if (next.year !== undefined) setYear(next.year);
    if (next.sections) setSections(next.sections);
    setSave({ state: "dirty" });
  };
  const setSec = (fn: (s: KtpSection[]) => KtpSection[]) => change({ sections: ensureKtpIds(fn(latest.current.sections)) });
  const setOne = (si: number, patch: Partial<KtpSection>) => setSec((all) => all.map((s, i) => (i === si ? { ...s, ...patch } : s)));
  const setTopics = (si: number, fn: (t: KtpTopic[]) => KtpTopic[]) => setSec((all) => all.map((s, i) => (i === si ? { ...s, topics: fn(s.topics) } : s)));

  const flush = useCallback(async () => {
    if(preview)return;
    const v = version.current;
    setSave({ state: "saving" });
    const r = await saveKtp(grade, latest.current).catch(() => ({ error: "Интернет байланышын текшериңиз.", savedAt: undefined }));
    if (r.error) return setSave({ state: "error", message: r.error });
    setOwn(true);
    setSave(version.current === v ? { state: "saved", at: r.savedAt } : { state: "dirty" });
  }, [grade,preview]);

  useEffect(() => {
    if (preview||save.state !== "dirty") return;
    const t = setTimeout(flush, 1000);
    return () => clearTimeout(t);
  }, [sections, year, save.state, flush,preview]);

  useEffect(() => {
    if (preview||save.state === "saved") return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [save.state,preview]);

  const total = planHours({ sections });
  const topicsCount = sections.reduce((a, s) => a + s.topics.length, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Окуу жылы
          <input className={cx(inputCls, "w-40")} value={year} placeholder="2026–2027" onChange={(e) => change({ year: e.target.value })} />
        </label>
        <div className="flex flex-col gap-0.5 text-sm text-muted">
          <span>
            {sections.length} бөлүм · {topicsCount} тема · <b className="font-mono text-ink">{total}</b> саат
          </span>
          {preview?<span>Үлгү: өзгөртүүлөр базага сакталбайт.</span>:own || save.state !== "saved" ? (
            <SaveBadge save={save} />
          ) : (
            <span>{hasTemplate ? "Ылайыктоочу үлгү. Өзгөртсөңүз — сиздин көчүрмөңүз болуп сакталат." : "Бөлүм жана темаларды кошуңуз — өзү сакталат."}</span>
          )}
        </div>
        <div className="flex-1" />
        {own && !preview && (
          <form
            action={deleteKtp.bind(null, grade)}
            onSubmit={(e) => {
              const msg = hasTemplate
                ? `${grade}-класстын КТП'синдеги өзгөртүүлөрүңүздү өчүрүп, үлгүгө кайтасызбы? Сабактардагы темалар өзгөрбөйт.`
                : `${grade}-класстын КТП'син толугу менен өчүрөсүзбү? Сабактардагы темалар өзгөрбөйт.`;
              if (!window.confirm(msg)) e.preventDefault();
            }}
          >
            <Button variant="ghost" className="text-bad hover:bg-bad-soft">
              {hasTemplate ? "Үлгүгө кайтаруу" : "КТП'ни өчүрүү"}
            </Button>
          </form>
        )}
      </div>
      {source && (
        <p className="text-sm text-muted">
          Үлгүдөн көчүрүлгөн:{" "}
          <a href={source} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
            {"КТП'нин түпнускасы (PDF)"}
          </a>
          {preview?". Бул үлгүдөгү өзгөртүүлөр сакталбайт.":". Өзгөртүүлөрүңүз сиздин гана КТП'ңизге сакталат, башка мугалимдерге таасир этпейт."}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4"><p className="text-sm text-muted">Көндүмдөр жана иштин түрлөрү — мугалим текшерчү сунуштар. Чейректик иштердин темасын, ордун жана саатын чындап өтүлгөн планга ылайыктаңыз; кошуу жылдык саатты автоматтык көбөйтпөйт.</p><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={!KTP_TEMPLATES[grade]} onClick={()=>setSec(all=>suggestMissingSkills(all,KTP_TEMPLATES[grade]))}>Көндүмү жок темаларга сунуш кошуу</Button><Button variant="secondary" onClick={()=>setSec(all=>addQuarterlyWorks(all,grade))}>Төрт чейректик ишти кошуу</Button></div><p className="text-sm text-muted">Темага жазылган сааттар: {sections.reduce((n,s)=>n+sectionHours(s),0)} · бөлүмдөрдө: {total}. Сааты такталбаган практикалык/чейректик иштер: {sections.flatMap(s=>s.topics).filter(t=>(t.kind==="practical"||t.kind==="quarterly")&&!t.hours).length}.</p></div>
      {sections.map((sec, si) => {
        const th = sectionHours(sec);
        return (
          <section key={si} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5" aria-label={`${si + 1}-бөлүм`}>
            <div className="flex items-start gap-2">
              <span className="mt-2.5 w-7 shrink-0 font-display text-lg font-semibold tracking-tight text-accent">{si + 1}.</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <input
                  aria-label={`${si + 1}-бөлүмдүн аталышы`}
                  className={cx(inputCls, "font-semibold")}
                  value={sec.title}
                  placeholder="Бөлүмдүн аталышы"
                  onChange={(e) => setOne(si, { title: e.target.value })}
                />
                {th > 0 && th !== sec.hours && (
                  <span className="text-xs text-amber">Темалардын сааттары: {th}, бөлүмдө: {sec.hours}</span>
                )}
              </div>
              <label className="flex shrink-0 flex-col items-center text-xs text-muted">
                <input
                  aria-label={`${si + 1}-бөлүмдүн сааты`}
                  className={hoursCls}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={sec.hours || ""}
                  onChange={(e) => setOne(si, { hours: Number(e.target.value) || 0 })}
                />
                саат
              </label>
              <Icon label="Бөлүмдү жогору" d="M18 15l-6-6-6 6" disabled={si === 0} onClick={() => setSec((a) => move(a, si, -1))} />
              <Icon label="Бөлүмдү төмөн" d="M6 9l6 6 6-6" disabled={si === sections.length - 1} onClick={() => setSec((a) => move(a, si, 1))} />
              <Icon
                label="Бөлүмдү өчүрүү"
                danger
                d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
                onClick={() => {
                  if (window.confirm(`«${sec.title || `${si + 1}-бөлүм`}» бөлүмүн жана анын ${sec.topics.length} темасын өчүрөсүзбү?`))
                    setSec((a) => a.filter((_, i) => i !== si));
                }}
              />
            </div>

            <ol className="flex flex-col gap-2 sm:pl-9">
              {sec.topics.map((t, ti) => (
                <li key={t.id ?? ti} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-10 shrink-0 text-right font-mono text-sm text-muted">
                    {si + 1}.{ti + 1}
                  </span>
                  <input
                    aria-label={`${si + 1}.${ti + 1}-тема`}
                    className={cx(inputCls,"min-w-0 flex-1 basis-48")}
                    value={t.title}
                    placeholder="Сабактын темасы"
                    onChange={(e) => setTopics(si, (all) => all.map((x, i) => (i === ti ? { ...x, title: e.target.value } : x)))}
                  />
                  <input
                    aria-label={`${si + 1}.${ti + 1}-теманын сааты`}
                    className={hoursCls}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="—"
                    value={t.hours ?? ""}
                    onChange={(e) =>
                      setTopics(si, (all) => all.map((x, i) => (i === ti ? { ...x, hours: e.target.value ? Number(e.target.value) : undefined } : x)))
                    }
                  />
                  <Icon label="Теманы жогору" d="M18 15l-6-6-6 6" disabled={ti === 0} onClick={() => setTopics(si, (a) => move(a, ti, -1))} />
                  <Icon label="Теманы төмөн" d="M6 9l6 6 6-6" disabled={ti === sec.topics.length - 1} onClick={() => setTopics(si, (a) => move(a, ti, 1))} />
                  <Icon
                    label="Теманы өчүрүү"
                    danger
                    d="M6 6l12 12M18 6L6 18"
                    onClick={() => {
                      if (!t.title.trim() || window.confirm(`«${t.title}» темасын өчүрөсүзбү?`)) setTopics(si, (a) => a.filter((_, i) => i !== ti));
                    }}
                  />
                </div>
                <details className="rounded-xl border border-line p-3 sm:ml-12">
                  <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-accent">Көндүмдөр жана сабактардын планы ({t.sessions?.length ?? 0})</summary>
                  <KtpMetadataFields prefix={`${si+1}.${ti+1}-тема`} value={t} onChange={patch=>setTopics(si,all=>all.map((x,i)=>i===ti?{...x,...patch}:x))}/>
                  <p className="mb-3 mt-4 text-sm text-muted">Саат санынан өзүнчө пландаңыз. Ар сабакка жаңы максат жана жыйынтык жазыңыз. Сактагандан кийин «Жаңы сабак» бетинде теманы жана сериядагы сабакты тандаңыз.</p>
                  {(t.sessions ?? []).map((lesson, li) => (
                    <fieldset key={lesson.id} className="mb-3 flex min-w-0 flex-col gap-2 rounded-xl bg-surface-2 p-3 border border-line">
                      <legend className="text-sm font-semibold">{li + 1}-сабак</legend>
                      <KtpMetadataFields prefix={`${si+1}.${ti+1}.${li+1}-сабак`} value={lesson} inherited={t} product={false} onChange={patch=>setTopics(si,all=>all.map((x,i)=>i===ti?{...x,sessions:x.sessions?.map(item=>item.id===lesson.id?{...item,...patch}:item)}:x))}/>
                      {([['title', 'Сабактын аталышы'], ['objective', 'Жаңы окуу максаты'], ['product', 'Практикалык жыйынтык']] as const).map(([field, label]) => (
                        <label key={field} className="text-sm">{label}<input className={inputCls} maxLength={2000} value={lesson[field]} onChange={e => setTopics(si, all => all.map((x, i) => i === ti ? {...x, sessions: x.sessions?.map(item => item.id === lesson.id ? {...item, [field]: e.target.value} : item)} : x))} /></label>
                      ))}
                      <button type="button" className="min-h-11 self-start px-3 text-sm text-bad" onClick={() => { if (window.confirm('Бул сабактын планын өчүрөсүзбү?')) setTopics(si, all => all.map((x, i) => i === ti ? {...x, sessions: x.sessions?.filter(item => item.id !== lesson.id)} : x)); }}>Планды өчүрүү</button>
                    </fieldset>
                  ))}
                  <button type="button" disabled={(t.sessions?.length ?? 0) >= 40} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-accent disabled:opacity-40" onClick={() => setTopics(si, all => all.map((x, i) => i === ti ? {...x, id: x.id ?? crypto.randomUUID(), sessions: [...(x.sessions ?? []), {id: crypto.randomUUID(), title: '', objective: '', product: ''}]} : x))}>+ Сабактын планын кошуу</button>
                </details>
                </li>
              ))}
            </ol>
            <button type="button" className="min-h-11 self-start px-3 text-sm font-semibold text-accent" onClick={()=>setTopics(si,all=>[...all,{title:"Жаңы практикалык сабак",kind:"practical",skills:[],product:""}])}>+ Практикалык сабак кошуу</button>
            <button
              type="button"
              onClick={() => setTopics(si, (a) => [...a, { title: "" }])}
              className="min-h-11 self-start rounded-md px-3 text-sm font-semibold text-accent hover:bg-accent-soft sm:ml-9"
            >
              + Тема кошуу
            </button>
          </section>
        );
      })}

      <button
        type="button"
        onClick={() => setSec((a) => [...a, { title: "", hours: 0, topics: [{ title: "" }] }])}
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong font-semibold text-accent hover:border-accent hover:bg-accent-soft"
      >
        + Бөлүм кошуу
      </button>
    </div>
  );
}

function SaveBadge({ save }: { save: Save }) {
  if (save.state === "error")
    return (
      <span role="alert" className="font-semibold text-bad">
        {save.message}
      </span>
    );
  if (save.state === "saving") return <span role="status">Сакталууда…</span>;
  if (save.state === "dirty") return <span role="status">Өзгөртүүлөр бар…</span>;
  return (
    <span role="status" className="text-good">
      Сакталды{save.at && ` · ${new Date(save.at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`}
    </span>
  );
}

function Icon({ label, d, onClick, disabled, danger }: { label: string; d: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "size-11 shrink-0 place-items-center rounded-md text-muted disabled:opacity-30",
        // Телефондо орун аз: жылдыруу баскычтары жашырылат, өчүрүү калат.
        danger ? "grid hover:bg-bad-soft hover:text-bad" : "hidden hover:bg-surface-2 hover:text-ink sm:grid",
      )}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={d} />
      </svg>
    </button>
  );
}

