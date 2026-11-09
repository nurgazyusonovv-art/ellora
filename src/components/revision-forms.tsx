"use client";
import { useActionState, useState } from "react";
import { requestRevision, reviewRevision, submitRevision, type RevisionState } from "@/app/actions/revisions";
import type { Revision } from "@/lib/revisions";
const field="w-full rounded-xl border border-line bg-surface px-3 py-3 text-ink";
const button="min-h-11 rounded-xl bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50";
function Message({state}:{state:RevisionState}){return <>{state.error&&<p role="alert" className="text-sm text-bad">{state.error}</p>}{state.success&&<p role="status" className="text-sm text-good">{state.success}</p>}</>;}
export function RequestRevisionForm({attemptId,blockId,feedback}:{attemptId:string;blockId:string;feedback:string}){
 const [state,action,pending]=useActionState(requestRevision,{});
 return <form action={action} className="flex flex-col gap-3 rounded-xl bg-amber-soft p-4 border border-amber/25"><input type="hidden" name="attemptId" value={attemptId}/><input type="hidden" name="blockId" value={blockId}/><label className="text-sm font-semibold">Эмнени оңдоо керек?<textarea name="feedback" className={`${field} mt-2`} rows={3} maxLength={2000} required defaultValue={feedback}/></label><button className={button} disabled={pending||!!state.success}>{pending?"Жөнөтүлүүдө…":"Кайра иштөөгө жөнөтүү"}</button><Message state={state}/></form>;
}
export function RevisionCard({revision:r,teacher=false}:{revision:Revision;teacher?:boolean}){
 const [criteria,setCriteria]=useState<boolean[]>(r.rubric.map(()=>false));
 const [state,action,pending]=useActionState(teacher?reviewRevision:submitRevision,{});
 return <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
  <h3 className="font-semibold">{r.revision_no}-кайра иштөө · {r.status==="requested"?"Оңдоо күтүлүүдө":r.status==="submitted"?"Мугалимдин текшерүүсүн күтөт":"Кайра текшерилди"}</h3>
  <p className="whitespace-pre-wrap">{r.prompt}</p>
  <details><summary className="flex min-h-11 cursor-pointer items-center font-semibold text-accent">Мурунку жооп</summary><p className="whitespace-pre-wrap break-words text-sm">{r.previous_response}</p></details>
  <p className="rounded-xl bg-accent-soft p-3 whitespace-pre-wrap border border-accent/20"><b>Эмнени оңдоо керек: </b>{r.request_feedback}</p>
  <ul className="list-inside list-disc text-sm text-muted">{r.rubric.map((x,i)=><li key={i}>{x}</li>)}</ul>
  {r.response&&<div className="rounded-xl bg-surface-2 p-3 border border-line"><p className="font-semibold">Оңдолгон жооп</p><p className="mt-2 whitespace-pre-wrap break-words">{r.response}</p></div>}
  {r.status==="reviewed"&&<div className="rounded-xl bg-good-soft p-3 border border-good/25"><p className="font-semibold">Мугалимдин кайра баалоосу</p>{r.rubric.map((x,i)=><p className="mt-1 text-sm" key={i}>{r.criteria_met?.[i]?"Аткарылды":"Дагы иштөө керек"}: {x}</p>)}<p className="mt-3 whitespace-pre-wrap">{r.feedback}</p></div>}
  {((!teacher&&r.status==="requested")||(teacher&&r.status==="submitted"))&&<form action={action} className="flex flex-col gap-3"><input type="hidden" name="revisionId" value={r.id}/>
    {teacher?<><input type="hidden" name="criteria" value={JSON.stringify(criteria)}/><fieldset><legend className="text-sm font-semibold">Оңдолгон жооптун критерийлери</legend>{r.rubric.map((x,i)=><label className="flex min-h-11 items-center gap-2 text-sm" key={i}><input type="checkbox" checked={criteria[i]} onChange={e=>setCriteria(all=>all.map((v,j)=>i===j?e.target.checked:v))}/>{x}</label>)}</fieldset><label className="text-sm font-semibold">Пикир<textarea className={`${field} mt-2`} name="feedback" required maxLength={2000} rows={3}/></label></>:<label className="text-sm font-semibold">Оңдолгон жооп<textarea className={`${field} mt-2`} name="text" required maxLength={5000} rows={5} defaultValue={r.previous_response}/><span className="mt-1 block font-normal text-muted">Пикирге таянып өзгөрт. Тапшыргандан кийин бул аракет бекитилет.</span></label>}
    <button className={button} disabled={pending||!!state.success}>{pending?"Сакталууда…":teacher?"Кайра баалоону сактоо":"Оңдолгон жоопту тапшыруу"}</button><Message state={state}/>
  </form>}
 </article>;
}
