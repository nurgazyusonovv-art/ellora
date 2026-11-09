"use client";
import {useEffect,useState,useActionState} from "react";
import {clockRemaining,type LiveSession} from "@/lib/classroom";
import {controlClock} from "@/app/actions/lesson-clock";
import {Button,FormError} from "./ui";
export function ClockDisplay({session}:{session:LiveSession}){
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{const start=performance.now();setElapsed(0);const timer=setInterval(()=>setElapsed(performance.now()-start),500);return()=>clearInterval(timer);},[session.server_now,session.deadline,session.paused]);
 const seconds=clockRemaining(session,elapsed);
 return <p role="timer" aria-label="Бөлүктүн калган убактысы" className="font-mono text-xl font-medium tracking-tight">{session.ended?"Жалпы убакыт бүттү":session.paused?`Тыныгуу · ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`:`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`}</p>;
}
export function ClockControls({assignmentId,session}:{assignmentId:string;session:LiveSession|null}){
 const [state,action,pending]=useActionState(controlClock,{});
 return <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5"><h2 className="font-semibold">Жалпы таймер менен өткөрүү</h2><p className="text-sm text-muted">Беш бөлүктүн убактысы сабактан алынат. Бардык окуучу бир учурдагы бөлүктө иштейт. Убакыттын бүтүшү тапшырманы аткарды же баа алды дегенди билдирбейт.</p><input type="hidden" name="assignmentId" value={assignmentId}/><input type="hidden" name="version" value={session?.clock_version??-1}/>
 {session?.timed&&<><p>{session.max_stage+1}/5-бөлүк</p><ClockDisplay session={session}/></>}
 <fieldset disabled={pending} className="flex flex-wrap items-center gap-3"><label className="flex min-h-11 items-center gap-2"><input name="auto" type="checkbox" value="true" defaultChecked={session?.auto_advance??true}/>Убакыт бүткөндө автоматтык өткөрүү</label>
 {!session?.timed?<Button name="command" value="start">Жалпы сабакты баштоо</Button>:<><Button name="command" value="auto" variant="secondary">Автоматтык өтүүнү сактоо</Button>{!session.ended&&<><Button name="command" value={session.paused?"resume":"pause"} variant="secondary">{session.paused?"Улантуу":"Тыныгуу"}</Button><label className="flex items-center gap-2 text-sm"><input name="minutes" type="number" min={1} max={30} defaultValue={2} className="shadow-xs min-h-11 w-20 rounded-xl border border-line-strong bg-surface px-2"/>мүнөт</label><Button name="command" value="add" variant="secondary">Убакыт кошуу</Button></>}<Button name="command" value="back" variant="secondary" disabled={session.max_stage===0}>Артка</Button><Button name="command" value="next" disabled={session.ended}>{session.max_stage===4?"Убакытты аяктоо":"Кийинки бөлүк →"}</Button><Button name="command" value="stop" variant="ghost">Өз алдынча режимге өткөрүү</Button></>}
 </fieldset><FormError message={state.error}/>{state.success&&<p role="status" className="text-sm text-accent">{state.success}</p>}</form>;
}
