"use client";
import {useState} from "react";
import {InteractiveTask} from "@/components/player/blocks";
import type {SavedAnswer} from "@/lib/grading";
import {Button} from "@/components/ui";
export function InteractiveTaskDemo(){
 const [matching,setMatching]=useState<SavedAnswer>();const [ordering,setOrdering]=useState<SavedAnswer>();const [run,setRun]=useState(0);
 return <div className="flex min-w-0 flex-col gap-6">
  <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6"><h2 className="mb-4 font-display text-xl font-semibold tracking-tight">Колдонуу: түзмөк эмне кылат?</h2><InteractiveTask key={`m${run}`} block={{id:"demo-m",type:"matching",prompt:"Түзмөктү анын негизги кызматына дал келтир.",pairs:[{left:"Клавиатура",right:"Маалыматты киргизүү"},{left:"Экран",right:"Маалыматты көрсөтүү"},{left:"Диск",right:"Маалыматты сактоо"}],explain:"Клавиатура менен маалымат киргизебиз, экрандан көрөбүз, дискте сактайбыз."}} saved={matching} onAnswer={(response,is_correct)=>setMatching(prev=>({response,is_correct,tries:(prev?.tries??0)+1}))}/></section>
  <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6"><h2 className="mb-4 font-display text-xl font-semibold tracking-tight">Баалоо: жаңы кырдаалда иретте</h2><InteractiveTask key={`o${run}`} exitMode block={{id:"demo-o",type:"ordering",prompt:"Иш-чаранын чыгымын эсептөөнүн кадамдарын иретте. Кийинки кадам мурункусунун жыйынтыгын колдонот.",steps:["Товарлардын санын жана баасын таблицага киргиз","Ар бир товардын санын баасына көбөйтүп, чыгымын эсепте","Товарлардын эсептелген чыгымдарын кош","Жалпы чыгымды берилген бюджет менен салыштыр"]}} saved={ordering} onAnswer={(response,is_correct)=>setOrdering(prev=>({response,is_correct,tries:(prev?.tries??0)+1}))}/>{ordering&&<p className="mt-3 text-sm text-muted">Бул үлгүдөгү жыйынтык: {ordering.is_correct?"ирет туура":"иретти кайра үйрөнүү керек"}. Чыныгы сабакта жыйынтык сабактын баалоосуна кошулат.</p>}</section>
  <Button type="button" variant="secondary" onClick={()=>{setMatching(undefined);setOrdering(undefined);setRun(n=>n+1);}}>Үлгүлөрдү кайра баштоо</Button>
 </div>;
}
