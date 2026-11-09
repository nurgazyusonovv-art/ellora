"use client";
import { useActionState, useMemo, useRef, useState } from "react";
import { suggestLessonEdit, type LessonEditAiState } from "@/app/actions/lesson-ai-edit";
import type { LessonDraft } from "@/app/actions/teacher";
import { BLOCK_LABELS, BLOCK_TYPES, blockSummary } from "@/lib/lesson-edit";
import { applyEdit, stageTextTargets, textTargets, type EditProposal } from "@/lib/lesson-ai-edit";
import { stageMeta } from "@/lib/lesson-types";
import { Button, RichText } from "@/components/ui";
const input="min-h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink";
export function LessonAiEditor({lessonId,draft,stageIndex,selected,published,onApply,onUndo}:{lessonId:string;draft:LessonDraft;stageIndex:number;selected:string|null;published:boolean;onApply:(p:EditProposal,basis:string)=>string|null;onUndo:(before:string,after:string)=>string|null}) {
 const stage=draft.content.stages[stageIndex];
 const block=stage.blocks.find(b=>b.id===selected);
 const targets=useMemo(()=>block?textTargets(block):stageTextTargets(draft,stageIndex),[block,draft,stageIndex]);
 const [mode,setMode]=useState<"text"|"add">(block?"text":"add");
 const [path,setPath]=useState(targets[0]?.path??"");
 const target=targets.find(t=>t.path===path)??targets[0];
 const [selection,setSelection]=useState<{path:string;value:string;start:number;end:number}|null>(null);
 const range=selection?.path===target?.path&&selection?.value===target?.value?selection:null;
 const [type,setType]=useState("open");
 const [basis,setBasis]=useState("");const snapshot=useRef("");
 const [applied,setApplied]=useState<string|null>(null);const [message,setMessage]=useState("");
 const [state,action,pending]=useActionState<LessonEditAiState,FormData>(async(prev,fd)=>{
  const base=JSON.stringify(draft);snapshot.current=base;setBasis(base);setApplied(null);setMessage("");
  fd.set("draft",base);fd.set("lessonId",lessonId);fd.set("stage",String(stageIndex));fd.set("mode",mode);
  if(mode==="text") {fd.set("blockId",block?.id??"");fd.set("path",target?.path??"");fd.set("start",String(range?.start??0));fd.set("end",String(range?.end??target?.value.length??0));}
  try{return await suggestLessonEdit(prev,fd);}catch{return {error:"Байланыш үзүлдү. Кайра аракет кылыңыз."};}
 },{});
 const current=useMemo(()=>JSON.stringify(draft),[draft]);const stale=!!basis&&basis!==current;
 return <section id="lesson-ai-editor" className="scroll-mt-4 flex min-w-0 flex-col gap-4 rounded-2xl border border-accent bg-accent-soft p-4 sm:p-5" aria-label="ЖИ менен сабакты оңдоо">
  <div><h3 className="font-display text-lg font-semibold tracking-tight text-accent">ЖИ менен оңдоо жана толуктоо</h3><p className="mt-1 text-sm text-muted">{stageMeta(draft.content,stage.key).label}{block?` · ${BLOCK_LABELS[block.type]}`:""}. Сунушту көрүп, андан кийин гана колдонуңуз.</p></div>
  {published&&<p className="text-sm text-amber">Жарыяланган сабак: кабыл алынган өзгөртүү автоматтык сакталат жана окуучуларга көрүнөт.</p>}
  <form action={action} className="flex min-w-0 flex-col gap-3">
   <fieldset disabled={pending} className="flex min-w-0 flex-col gap-3">
    <label className="flex flex-col gap-1 text-sm font-semibold">Эмне жасайбыз?<select className={input} value={mode} onChange={e=>setMode(e.target.value as "text"|"add")}><option value="add">Кошумча тапшырма / материал түзүү</option><option value="text">Тандалган жердин текстин оңдоо</option></select></label>
    {mode==="text"&&target&&<>
     <label className="flex flex-col gap-1 text-sm font-semibold">Оңдолуучу жер<select className={input} value={target.path} onChange={e=>{setPath(e.target.value);setSelection(null);}}>{targets.map(t=><option key={t.path} value={t.path}>{t.label}</option>)}</select></label>
     <label className="flex flex-col gap-1 text-sm font-semibold">Азыркы текст — үзүндүсүн белгилесеңиз, ошол жер гана өзгөрөт<textarea readOnly className={`${input} font-normal`} rows={4} value={target.value} onSelect={e=>{const el=e.currentTarget;setSelection(el.selectionEnd>el.selectionStart?{path:target.path,value:target.value,start:el.selectionStart,end:el.selectionEnd}:null);}} /></label>
     <p className="text-xs text-muted">{range?`${range.end-range.start} белги тандалды.`:"Бул талаанын толук тексти оңдолот."} Калган талаалар сакталат. Тесттин суроосу же варианты өзгөрсө, туура жоопту да текшериңиз.</p>
    </>}
    {mode==="text"&&!target&&<p className="text-sm text-muted">Алгач керектүү тапшырманы ачыңыз.</p>}
    {mode==="add"&&<div className="grid min-w-0 gap-3 sm:grid-cols-2">
     <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold">Материалдын түрү<select className={input} name="type" value={type} onChange={e=>setType(e.target.value)}>{BLOCK_TYPES.filter(t=>(t!=="presentation"||stageIndex===2)&&(!["classification","spreadsheet","matching","ordering"].includes(t)||[3,4].includes(stageIndex))&&!(stageIndex===1&&["mcq","code_task","parsons","bug_hunt"].includes(t))).map(t=><option key={t} value={t}>{BLOCK_LABELS[t]}</option>)}</select></label>
     <label className="flex flex-col gap-1 text-sm font-semibold">Саны<select className={input} name="count" defaultValue="1">{[1,2,3].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
     <label className="flex flex-col gap-1 text-sm font-semibold">Кайсы жерге кошулат?<select className={input} name="blockId" defaultValue={selected??""}><option value="">{stage.mission?"Жеке иштен мурда":"Бөлүктүн аягына"}</option>{stage.blocks.map((b,i)=><option key={b.id} value={b.id}>{i+1}. {blockSummary(b)||BLOCK_LABELS[b.type]} — андан кийин</option>)}</select></label>
     <label className="flex flex-col gap-1 text-sm font-semibold">Иштөө формасы<select className={input} name="collaboration" disabled={type!=="open"} defaultValue="individual"><option value="individual">Жеке</option><option value="pair">Жуп менен</option><option value="group">Топ менен (4 окуучу)</option></select></label>
    </div>}
    <label className="flex flex-col gap-1 text-sm font-semibold">ЖИге көрсөтмө<textarea className={input} name="instruction" rows={3} minLength={3} maxLength={2000} required placeholder="Мисалы: 7-класска ылайык жөнөкөйлөт, күнүмдүк турмуштан мисал кош. Же: жеңилден татаалга үч жаңы тапшырма түз." /></label>
    <p className="text-xs text-muted">Сабак түзүү жана оңдоо үчүн жалпы лимит: күнүнө 10 сурам, аралыгы 30 секунд. Жаңы презентация 5 слайддан, иконка жана схема менен түзүлөт. Убакытты тапшырмаларга жараша текшериңиз.</p>
    <Button type="submit" disabled={pending||mode==="text"&&!target}>{pending?"ЖИ сунуш даярдап жатат…":"ЖИ сунушун түзүү"}</Button>
   </fieldset>
  </form>
  {state.error&&<p role="alert" className="text-sm text-bad">{state.error}</p>}
  {state.proposal&&!applied&&<div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4">
   <h4 className="font-semibold">ЖИ сунушу — али сабакка кошулган жок</h4>
   <p className="text-sm text-muted">{state.proposal.request.mode==="text"?`Өзгөрүүчү талаа: ${selectedTextLabel(draft,state.proposal)}`:`Кошулат: ${state.proposal.blocks?.length??0} материал`}</p>
   {state.proposal.value!==undefined&&<div className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-sm"><RichText text={state.proposal.value}/></div>}
   {state.proposal.blocks?.map((b,i)=><details key={b.id} open className="min-w-0 border-t border-line pt-3"><summary className="min-h-11 cursor-pointer font-semibold">{i+1}. {BLOCK_LABELS[b.type]}</summary><dl className="flex max-h-96 flex-col gap-2 overflow-auto text-sm">{textTargets(b).map(t=><div key={t.path}><dt className="font-semibold text-muted">{t.label}</dt><dd className="whitespace-pre-wrap break-words">{t.value}</dd></div>)}</dl>{b.type==="mcq"&&<p className="mt-2 text-sm">Туура жооп: {b.correct+1}. {b.options[b.correct]}</p>}</details>)}
   {stale&&<p role="status" className="text-sm text-amber">Сабак же тандоо өзгөрдү. Жаңы көрсөтмө менен сунушту кайра түзүңүз.</p>}
   <Button type="button" disabled={pending||stale} onClick={()=>{const error=onApply(state.proposal!,snapshot.current);if(error)setMessage(error);else{setApplied(JSON.stringify(applyEdit(JSON.parse(snapshot.current),state.proposal!)));setMessage("Сунуш кабыл алынды. Сакталуу абалын сабактын башынан текшериңиз.");}}}>Сунушту сабакка колдонуу</Button>
  </div>}
  {message&&<p role="status" className="text-sm">{message}</p>}
  {applied&&<Button type="button" variant="secondary" onClick={()=>{const error=onUndo(basis,applied);setMessage(error??"ЖИ өзгөртүүсү артка кайтарылды.");if(!error)setApplied(null);}}>ЖИ өзгөртүүсүн артка кайтаруу</Button>}
 </section>;
}

function selectedTextLabel(draft:LessonDraft,p:EditProposal) {
 const block=draft.content.stages[p.request.stage].blocks.find(b=>b.id===p.request.blockId);
 return (block?textTargets(block):stageTextTargets(draft,p.request.stage)).find(t=>t.path===p.request.path)?.label??"Тандалган текст";
}
