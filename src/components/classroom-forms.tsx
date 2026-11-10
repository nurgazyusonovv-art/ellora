"use client";
import {suggestReview,type AiReviewState} from "@/app/actions/ai-review";
import { useActionState, useState } from "react";
import { reviewAnswer, type ClassroomState } from "@/app/actions/classroom";
import type { Review } from "@/lib/classroom";
import { Button, FormError } from "@/components/ui";

export function ReviewForm({ attemptId, blockId, rubric, review, initialSourceHash }: { attemptId: string; blockId: string; rubric: string[]; review?: Review; initialSourceHash?:string }) {
  const [met,setMet]=useState(rubric.map((_,i)=>review?.criteria_met[i]??false));
  const [feedback,setFeedback]=useState(review?.feedback??"");const [hash,setHash]=useState(initialSourceHash??"");const [applied,setApplied]=useState(false);
  const [ai,aiAction,aiPending]=useActionState<AiReviewState,FormData>(suggestReview,{});
  const [state, action, pending] = useActionState<ClassroomState, FormData>(reviewAnswer, {});
  return <div className="flex flex-col gap-4"><form action={aiAction} className="flex flex-col gap-3 rounded-xl bg-accent-soft p-3 border border-accent/20"><input type="hidden" name="attemptId" value={attemptId}/><input type="hidden" name="blockId" value={blockId}/><p className="text-xs text-muted">Жооптун тексти, тапшырма жана критерийлер OpenAI кызматына жөнөтүлөт. Профилдеги аты/логини кошулбайт. ЖИ сунуш берет; бааны сиз бекитесиз.</p><Button variant="secondary" disabled={aiPending||pending}>{aiPending?"ЖИ текшерүүдө…":"ЖИ менен текшерүү"}</Button><FormError message={ai.error}/>{ai.suggestion&&<><details><summary className="min-h-11 cursor-pointer text-sm font-semibold">ЖИ текшерген жооп</summary><p className="whitespace-pre-wrap break-words text-sm">{ai.answerText}</p></details>{ai.suggestion.criteria.map((c,i)=><div key={i} className="rounded-xl bg-surface p-3 text-sm"><b>{rubric[i]} · {c.met===null?"Анык эмес":c.met?"Далил бар":"Далил жетишсиз"}</b>{c.evidence&&<blockquote className="mt-2 border-l-2 border-accent pl-3">{c.evidence}</blockquote>}<p className="mt-2">{c.reason}</p></div>)}<p className="whitespace-pre-wrap text-sm">{ai.suggestion.feedback}</p><Button type="button" onClick={()=>{setMet(ai.suggestion!.criteria.map(c=>c.met===true));setFeedback(ai.suggestion!.feedback);setHash(ai.sourceHash!);setApplied(true);}}>Сунушту баалоо формасына алуу</Button><p className="text-xs text-muted">Анык эмес критерийлерди өзүңүз текшериңиз. Азырынча баа сакталган жок.</p></>}</form>
  <form action={action} className="flex flex-col gap-3">
    <input type="hidden" name="attemptId" value={attemptId} /><input type="hidden" name="blockId" value={blockId} /><input type="hidden" name="criteria" value={JSON.stringify(met)} /><input type="hidden" name="sourceHash" value={hash}/><input type="hidden" name="aiApplied" value={String(applied)}/>
    {rubric.map((r,i)=><label key={i} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={met[i]} className="size-5 shrink-0 accent-accent" onChange={e=>setMet(met.map((v,j)=>j===i?e.target.checked:v))}/>{r}</label>)}
    <label className="flex flex-col gap-2 text-sm font-semibold">Окуучуга пикир<textarea name="feedback" value={feedback} onChange={e=>setFeedback(e.target.value)} required maxLength={2000} rows={3} className="rounded-xl border border-line bg-bg p-3" /></label>
    {applied&&<label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="aiConfirmed" value="true" required className="size-5"/>Жоопту, критерийлерди жана ЖИ сунушун карап чыктым.</label>}
    <Button disabled={pending||aiPending}>{pending?"Сакталууда…":"Баалоону сактоо"}</Button><FormError message={state.error}/>{state.success&&<p role="status" className="text-sm text-accent">{state.success}</p>}
  </form></div>;
}

/** Python тапшырмасын мугалим ырастайт: браузер билдирген тесттердин саны чейректик баага өзү кирбейт. */
export function CodeConfirmForm({ attemptId, blockId, sourceHash, review }: { attemptId: string; blockId: string; sourceHash: string; review?: Review }) {
  const [state, action, pending] = useActionState<ClassroomState, FormData>(reviewAnswer, {});
  const verdict = review?.criteria_met.length === 1 ? review.criteria_met[0] : undefined;
  return (
    <form action={action} className="flex flex-col gap-3 rounded-md border border-line bg-surface-2 p-3">
      <input type="hidden" name="attemptId" value={attemptId} />
      <input type="hidden" name="blockId" value={blockId} />
      <input type="hidden" name="sourceHash" value={sourceHash} />
      <p className="text-sm">
        {verdict === undefined ? <span className="font-medium text-amber">Текшериле элек — чейректик баага кире элек.</span> : verdict ? <span className="font-medium text-good">Сиз ырастадыңыз: туура.</span> : <span className="font-medium text-bad">Сиз белгиледиңиз: туура эмес.</span>}
      </p>
      <label className="flex flex-col gap-1.5 text-sm">
        Окуучуга пикир (милдеттүү эмес)
        <textarea name="feedback" defaultValue={review?.feedback ?? ""} maxLength={2000} rows={2} className="rounded-md border border-line-strong bg-surface p-2.5" />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button name="criteria" value="[true]" disabled={pending}>Туура</Button>
        <Button name="criteria" value="[false]" variant="secondary" disabled={pending}>Туура эмес</Button>
      </div>
      <FormError message={state.error} />
      {state.success && <p role="status" className="text-sm text-good">{state.success}</p>}
    </form>
  );
}
