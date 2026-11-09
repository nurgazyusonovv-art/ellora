"use client";
import {useState} from "react";
import {MISSION_EXAMPLE} from "@/lib/mission-example";
import {missionAllows,missionChallenge} from "@/lib/missions";
import type {Answers} from "@/lib/grading";
import {MissionProgress} from "@/components/player/mission-progress";
import {InteractiveTask,Open} from "@/components/player/blocks";
import {Button} from "@/components/ui";
export function MissionDemo(){const [answers,setAnswers]=useState<Answers>({}),[run,setRun]=useState(0);const stage=MISSION_EXAMPLE;
 return <div className="flex min-w-0 flex-col gap-5"><MissionProgress stage={stage} answers={answers}/>{stage.blocks.map(b=><section key={`${run}-${b.id}`} className="min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-5"><p className="mb-3 text-sm font-semibold text-accent">{missionChallenge(stage,b.id)?"Жеке иш — даяр кеңешсиз":"Миссиянын машыгуусу"}</p>{!missionAllows(stage,b.id,answers)&&<p className="mb-3 text-sm text-muted">Адегенде мурунку кадамды бүтүр.</p>}<fieldset disabled={!missionAllows(stage,b.id,answers)} className="min-w-0">{b.type==="matching"||b.type==="ordering"?<InteractiveTask block={b} saved={answers[b.id]} onAnswer={(response,is_correct)=>setAnswers(a=>({...a,[b.id]:{response,is_correct,tries:(a[b.id]?.tries??0)+1}}))}/>:b.type==="open"?<Open block={b} saved={answers[b.id]} onAnswer={(response,is_correct)=>setAnswers(a=>({...a,[b.id]:{response,is_correct,tries:(a[b.id]?.tries??0)+1}}))}/>:null}</fieldset></section>)}<Button type="button" variant="secondary" onClick={()=>{setAnswers({});setRun(n=>n+1);}}>Миссия үлгүсүн кайра баштоо</Button></div>;
}
