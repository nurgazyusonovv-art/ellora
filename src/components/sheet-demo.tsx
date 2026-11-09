"use client";
import {useState} from "react";
import {Spreadsheet} from "@/components/player/spreadsheet";
import {DraftScope} from "@/components/player/lesson-draft";
import {defaultSheet} from "@/lib/sheet";
import type {SavedAnswer} from "@/lib/grading";
import {Button} from "@/components/ui";
export function SheetDemo(){const [answer,setAnswer]=useState<SavedAnswer>(),[run,setRun]=useState(0);return <div className="flex min-w-0 flex-col gap-4"><div className="min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-6"><DraftScope.Provider value="public-sheet-demo"><Spreadsheet key={run} block={defaultSheet("demo-sheet")} saved={answer} onAnswer={(response,is_correct)=>setAnswer(prev=>({response,is_correct,tries:(prev?.tries??0)+1}))}/></DraftScope.Provider></div><Button type="button" variant="secondary" onClick={()=>{try{localStorage.removeItem("ellora:draft:public-sheet-demo:demo-sheet:cells");}catch{}setAnswer(undefined);setRun(n=>n+1);}}>Таблица үлгүсүн кайра баштоо</Button></div>}
