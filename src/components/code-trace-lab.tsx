"use client";

import { useState } from "react";
import { Button, cx } from "@/components/ui";
import { createTrace, type TraceConfig } from "@/lib/code-trace";

const inputClass = "min-h-11 rounded-xl border border-line bg-surface px-3 py-2";

export function CodeTraceLab({ initialKind = "condition", embedded = false }: { initialKind?: TraceConfig["kind"]; embedded?: boolean }) {
  const [config, setConfig] = useState<TraceConfig>(() => initialKind === "loop" ? { kind: "loop", count: 3 } : { kind: "condition", age: 18, strict: false });
  const [round, setRound] = useState(0);
  return <div className="flex min-w-0 flex-col gap-5">
    <section aria-label="Мисалды тандоо" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      {!embedded && <label className="flex flex-col gap-2 font-semibold">Мисал
        <select className={inputClass} value={config.kind} onChange={e => setConfig(e.target.value === "loop" ? { kind: "loop", count: 3 } : { kind: "condition", age: 18, strict: false })}>
          <option value="condition">Шарт: кирүүгө болобу?</option><option value="loop">Цикл: сандардын жыйындысы</option>
        </select>
      </label>}
      {config.kind === "condition" ? <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-2">Жаш (age)
          <select className={inputClass} value={config.age} onChange={e => setConfig({ ...config, age: Number(e.target.value) })}>
            {Array.from({ length: 26 }, (_, age) => <option key={age} value={age}>{age}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2">Шарттын белгиси
          <select className={inputClass} value={config.strict ? ">" : ">="} onChange={e => setConfig({ ...config, strict: e.target.value === ">" })}>
            <option value=">=">≥ — чоң же барабар</option><option value=">">&gt; — гана чоң</option>
          </select>
        </label>
      </div> : <label className="flex flex-col gap-2">Акыркы сан (n)
        <select className={inputClass} value={config.count} onChange={e => setConfig({ kind: "loop", count: Number(e.target.value) })}>
          {Array.from({ length: 9 }, (_, count) => <option key={count} value={count}>{count}</option>)}
        </select>
      </label>}
      <p className="text-sm text-muted">{embedded ? "Маанини өзгөртсөң, кадамдар башынан башталат. Кайсы маанини жана белгини сынаганыңды төмөндөгү байкооңо жаз. Параметрлер жана басылган кадамдар жоопко өзүнчө сакталбайт." : "Мисалды же маанини өзгөртсөң, божомол жана түшүндүрмө тазаланат. Бул беттеги жооптор сакталбайт. Керек болсо дептериңе жаз."}</p>
    </section>
    <TraceExercise key={`${JSON.stringify(config)}:${round}`} config={config} embedded={embedded} onRestart={() => setRound(r => r + 1)} />
  </div>;
}

function TraceExercise({ config, onRestart, embedded }: { config: TraceConfig; onRestart: () => void; embedded: boolean }) {
  const Heading = embedded ? "h3" : "h2";
  const { code, frames } = createTrace(config);
  const [prediction, setPrediction] = useState("");
  const [step, setStep] = useState(embedded ? 0 : -1);
  const [explanation, setExplanation] = useState("");
  const frame = frames[step];
  const finished = step === frames.length - 1;
  return <>
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-surface p-4" aria-label="Кодду изилдөө">
      <Heading className="text-xl font-semibold">{embedded ? "Сынап көрүү үчүн даяр модель" : "1. Кодду окуп, божомолдо"}</Heading>
      <p>{config.kind === "condition" ? "Программа кайсы билдирүүнү чыгарат? Чекке барабар болгон мааниге көңүл бур." : "Программа экранга кайсы санды чыгарат? print циклдин ичиндеби же сыртындабы?"}</p>
      <div className="overflow-x-auto rounded-xl bg-code p-2 text-code-ink" tabIndex={0} role="region" aria-label="Python коду, сап номерлери менен">
        <ol className="min-w-max font-mono text-sm">
          {code.map((line, i) => <li key={i} aria-current={frame?.line === i + 1 ? "step" : undefined} className={cx("flex gap-3 border-l-4 px-2 py-2", frame?.line === i + 1 ? "border-code-kw bg-code-hl" : "border-transparent")}>
            <span className="w-5 shrink-0 text-right" aria-label={`${i + 1}-сап`}>{i + 1}</span><code className="whitespace-pre">{line}</code>
            {frame?.line === i + 1 && <span className="pr-2 font-sans text-xs">← аткарылды</span>}
          </li>)}
        </ol>
      </div>
      {!embedded && <><label className="flex flex-col gap-2 font-semibold">Экранга эмне чыгат деп ойлойсуң?
        <textarea rows={2} maxLength={1000} className={inputClass} value={prediction} readOnly={step >= 0} onChange={e => setPrediction(e.target.value)} />
      </label>
      {step < 0 ? <Button type="button" disabled={!prediction.trim()} onClick={() => setStep(0)}>Божомолду бекитип, биринчи кадамды көрүү</Button> : <p className="text-sm text-muted">Божомолуң бекитилди. Ал туура эмес чыкса да болот — себебин байкап көр.</p>}</>}
    </section>

    {frame && <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4" aria-label="Кадамдар">
      <Heading className="text-xl font-semibold">{embedded ? "Кадамдап сынап көр" : "2. Кадамдап сынап көр"}</Heading>
      <div role="status" aria-live="polite" aria-atomic="true" className="rounded-xl bg-accent-soft p-4 border border-accent/20">
        <p className="mb-2 font-semibold">{step + 1}/{frames.length} кадам · {frame.line}-сап аткарылды</p><p>{frame.note}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><h3 className="mb-2 font-semibold">Өзгөрмөлөрдүн учурдагы мааниси</h3>
          <dl className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-3 font-mono border border-line">{Object.entries(frame.variables).map(([name, value]) => <div key={name} className="contents"><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
        </div>
        <div><h3 className="mb-2 font-semibold">Экрандагы чыгыш</h3><pre className="min-h-16 whitespace-pre-wrap break-words rounded-xl bg-code p-3 font-mono text-code-ink">{frame.output.length ? frame.output.join("\n") : "Азырынча чыгыш жок"}</pre></div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>Мурунку кадам</Button>
        <Button type="button" disabled={finished} onClick={() => setStep(s => Math.min(frames.length - 1, s + 1))}>Кийинки кадам</Button>
      </div>
      <p className="text-sm text-muted">Мурунку кадамга өтүү кодду артка аткарбайт; ошол учурдагы сакталган көрүнүштү көрсөтөт.</p>
    </section>}

    {finished && !embedded && <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4" aria-label="Жыйынтыкты түшүндүрүү">
      <Heading className="text-xl font-semibold">3. Салыштыр жана түшүндүр</Heading>
      <p><b>Сенин божомолуң:</b> <span className="whitespace-pre-wrap break-words">{prediction}</span></p>
      <p><b>Чыныгы чыгыш:</b> {frame.output.join("\n")}</p>
      <label className="flex flex-col gap-2 font-semibold">Кайсы кадам божомолуңду ырастап же өзгөрттү? Эмне үчүн?
        <textarea rows={3} maxLength={3000} className={inputClass} value={explanation} onChange={e => setExplanation(e.target.value)} />
      </label>
      <p className="rounded-xl bg-accent-soft p-4 border border-accent/20">{config.kind === "condition" ? "Жаңы сыноо: жашты 17, 18 жана 19 кылып салыштыр. Анан ≥ белгисин > кылып өзгөрт. Кайсы учурда чыгыш өзгөрөт жана эмне үчүн?" : "Жаңы сыноо: n маанисин 0, 1 жана 4 кылып көр. range акыркы чекти кошобу? Жыйынды өзгөрмөсү менен экрандагы чыгыштын айырмасы эмнеде?"}</p>
      <Button type="button" variant="secondary" onClick={onRestart}>Жаңы божомол (жазгандарым тазаланат)</Button>
    </section>}
    {finished && embedded && <p role="status" className="rounded-xl bg-accent-soft p-4 border border-accent/20">Бул сыноо бүттү. Башка маанини да сынап көрүп, кайсы сап оюңду ырастаганын же өзгөрткөнүн төмөндөгү байкоо жана жыйынтыкка жаз. Анан изилдөөңдү сакта.</p>}

    <details className="rounded-2xl border border-line bg-surface p-4">
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Кагазда же жуп менен аткаруу</summary>
      <div className="mt-3 flex flex-col gap-3 text-sm">
        <p>Кодду дептерге көчүр. Алгач ар кимиң өз божомолуңарды жазгыла. Бирөө сапты окуйт, экинчиси маанилерди жазат. Кийинки мисалда ролдорду алмаштыргыла. Акырында ар кимиң жыйынтыкты өз сөзүңөр менен түшүндүргүлө.</p>
        <p>Ар кадамга төрт тилке толтур: кадамдын номери, аткарылган сап, өзгөрмөлөрдүн мааниси, экранга чыккан текст. Бош чыгышты «жок» деп белгилегиле. Бул таблицаны интернетсиз да толтурсаң болот.</p>
        <p>Мугалим үчүн: божомолду кодду аткаруудан мурда чогултуңуз. Божомолдун тууралыгын гана эмес, шарттын чек маанисин же циклдин ар бир кошуусун түшүндүргөн далилди талкуулаңыз.</p>
      </div>
    </details>
  </>;
}
