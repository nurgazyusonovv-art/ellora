"use client";
import {useState} from "react";
import {Classification} from "./player/classification";
import {defaultClassification} from "@/lib/classification";
import type {SavedAnswer} from "@/lib/grading";
import type {ClassificationBlock} from "@/lib/lesson-types";
import {Button} from "./ui";
const exit:ClassificationBlock={...defaultClassification("demo-class-exit"),prompt:"Башка түзмөктөрдү өз алдынча топтоштур.",items:[{text:"Микрофон",category:0},{text:"Принтер",category:1},{text:"Эс тутум картасы",category:2}],xp:0};
export function ClassificationDemo(){const [practice,setPractice]=useState<SavedAnswer>(),[assessment,setAssessment]=useState<SavedAnswer>(),[run,setRun]=useState(0);return <div className="flex min-w-0 flex-col gap-6"><section className="min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-6"><h2 className="mb-4 font-display text-xl font-semibold tracking-tight">Колдонуу: машыгуу жана кайра оңдоо</h2><Classification key={`p${run}`} block={defaultClassification("demo-class-practice")} saved={practice} onAnswer={(response,is_correct)=>setPractice(a=>({response,is_correct,tries:(a?.tries??0)+1}))}/></section><section className="min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-6"><h2 className="mb-4 font-display text-xl font-semibold tracking-tight">Баалоо: жаңы объекттер</h2><Classification key={`e${run}`} block={exit} saved={assessment} exitMode onAnswer={(response,is_correct)=>setAssessment(a=>({response,is_correct,tries:(a?.tries??0)+1}))}/></section><Button type="button" variant="secondary" onClick={()=>{setPractice(undefined);setAssessment(undefined);setRun(n=>n+1);}}>Категориялоо үлгүсүн кайра баштоо</Button></div>}
