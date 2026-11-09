"use client";
import {useEffect,useMemo,useState} from "react";
import type {ClassificationBlock} from "@/lib/lesson-types";
import type {SavedAnswer} from "@/lib/grading";
import {shufflePerm} from "@/lib/student-view";
import {useLessonDraft} from "./lesson-draft";
import type {AnswerFn} from "./blocks";
import {Button,RichText} from "@/components/ui";
export function Classification({block,saved,onAnswer,exitMode,failed}:{block:ClassificationBlock;saved?:SavedAnswer;onAnswer:AnswerFn;exitMode?:boolean;failed?:number}){
 const items=useMemo(()=>block.shuffled?block.items:shufflePerm(block.items.length,block.id).map(i=>block.items[i]),[block]);
 const [draft,setDraft]=useLessonDraft(block.id,"groups",JSON.stringify(saved?.response.groups??Array(items.length).fill(-1)));
 const immutable=!!saved&&(saved.is_correct===true||!!exitMode);
 const groups=useMemo(()=>{try{const value=immutable?saved?.response.groups:JSON.parse(draft);return Array.isArray(value)&&value.length===items.length&&value.every(v=>Number.isInteger(v)&&v>=-1&&v<block.categories.length)?value as number[]:Array(items.length).fill(-1) as number[];}catch{return Array(items.length).fill(-1) as number[];}},[draft,immutable,saved,items.length,block.categories.length]);
 const [pending,setPending]=useState(false),[edited,setEdited]=useState(false);
 useEffect(()=>setPending(false),[saved,failed]);
 const locked=pending||immutable,positions=!edited?saved?.response.positions as boolean[]|undefined:undefined;
 const submit=()=>{if(locked||groups.some(g=>g<0))return;setPending(true);setEdited(false);if(block.shuffled)return onAnswer({groups},null);const result=groups.map((g,i)=>g===items[i].category);onAnswer({groups,...(!exitMode?{positions:result}:{})},result.every(Boolean));};
 return <div className="flex min-w-0 flex-col gap-4"><RichText text={block.prompt} className="font-semibold"/><p className="text-sm text-muted">Ар объектке бирден топ танда. Бир топко бир нече объект кире алат. {exitMode?"Бир жолу тапшырылат. Тууралык боюнча кеңеш берилбейт.":"Тапшыргандан кийин белгилерди карап, катаны оңдоп кайра аракет кыл."}</p>
  <div className="flex min-w-0 flex-col gap-3">{items.map((item,i)=><label key={i} className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface p-3"><span className="break-words text-sm font-semibold">{i+1}. {item.text}</span><select aria-label={`${i+1}-объекттин категориясы`} className="shadow-xs min-h-11 w-full min-w-0 rounded-xl border border-line-strong bg-bg px-3 text-sm" value={groups[i]} disabled={locked} onChange={e=>{setDraft(JSON.stringify(groups.map((g,j)=>i===j?Number(e.target.value):g)));setEdited(true);}}><option value={-1}>Топ танда</option>{block.categories.map((name,c)=><option key={c} value={c}>{name}</option>)}</select>{!exitMode&&positions&&<span className={`text-sm ${positions[i]?"text-good":"text-amber"}`}>{positions[i]?"✓ Туура топ":"↻ Объекттин негизги белгисин кайра салыштыр."}</span>}</label>)}</div>
  <section aria-label="Сен түзгөн топтор" className="grid min-w-0 gap-3 sm:grid-cols-2">{block.categories.map((name,c)=><div key={c} className="min-w-0 rounded-xl bg-accent-soft p-3 border border-accent/20"><h3 className="break-words text-sm font-semibold">{name}</h3><ul className="mt-2 flex flex-col gap-1 text-sm">{items.filter((_,i)=>groups[i]===c).map(item=><li key={item.text} className="break-words">• {item.text}</li>)}{!groups.includes(c)&&<li className="text-muted">Азырынча объект жок</li>}</ul></div>)}</section>
  <Button type="button" disabled={locked||groups.some(g=>g<0)} onClick={submit}>{pending?"Сакталууда…":exitMode&&saved?"Жооп тапшырылды":saved?.is_correct?"Аткарылды":"Категорияларды тапшыруу"}</Button>
  {saved&&!edited&&<div role="status" className="rounded-xl bg-accent-soft p-3 text-sm border border-accent/20">{exitMode?"Жообуң сакталды. Калган тапшырмаларды өз алдынча улант.":saved.is_correct?<><strong>Объекттер туура бөлүштүрүлдү.</strong>{block.explain&&<RichText text={block.explain}/>}</>:"Белгиленген объекттерди кайра кара. Категориянын кайсы белгиси туура келерин ойлон."}</div>}
 </div>;
}
