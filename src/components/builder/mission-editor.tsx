"use client";
import type {LessonContent,Stage} from "@/lib/lesson-types";
import {nextBlockId} from "@/lib/lesson-edit";
import {missionError,missionSteps} from "@/lib/missions";
const input="min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm";
export function MissionEditor({stage,content,onChange}:{stage:Stage;content:LessonContent;onChange:(stage:Stage)=>void}){
 if(stage.key!=="reinforce")return null;
 const enable=()=>{
  const blocks=[...stage.blocks],last=missionSteps(stage).at(-1);
  let challengeId=last?.id??"";
  if(last?.type==="open"&&!last.optional&&(!last.collaboration||last.collaboration==="individual")&&!last.teamwork){blocks[blocks.findIndex(b=>b.id===last.id)]={...last,lockOnSubmit:true,rubric:last.rubric?.length&&last.rubric.length>=2?last.rubric:["Чечимин так түшүндүрдү","Жаңы мисал менен негиздеди"]};}
  else {challengeId=nextBlockId(content,stage.key);blocks.push({id:challengeId,type:"open",prompt:"Ушул темага байланышкан башка кырдаалды танда. Өз чечимиңди жазып, эмне үчүн туура экенин мисал менен негизде.",lockOnSubmit:true,collaboration:"individual",rubric:["Чечимин так түшүндүрдү","Жаңы мисал менен негиздеди"]});}
  onChange({...stage,blocks,mission:{title:"Жаңы кырдаалды чеч",story:"Машыгуулардан өтүп, акырында башка мисалга өз чечимиңди сунушта.",goal:"Билимди жаңы кырдаалда колдонуп, чечимди негиздөө",challengeId}});
 };
 const error=stage.mission?missionError(stage):null;
 return <section className="flex flex-col gap-3 rounded-2xl border border-accent bg-accent-soft p-4 sm:p-5"><label className="flex min-h-11 items-center gap-3 font-semibold"><input type="checkbox" className="size-5 accent-accent" checked={!!stage.mission} onChange={e=>e.target.checked?enable():onChange({...stage,mission:undefined})}/>Колдонууну миссия кылуу</label><p className="text-sm text-muted">2–5 милдеттүү тапшырма ирети менен ачылат. Акыркысы — критерий менен текшерилчү жеке ачык иш. Күйгүзүү акыркы жеке ачык жоопту бекитет же жаңы жеке тапшырма кошот. Миссияны өчүрүү тапшырмаларды өчүрбөйт.</p>{stage.mission&&<>{([['title','Миссиянын аталышы'],['story','Кыска окуя / кырдаал'],['goal','Окуучу эмнени жасай алышы керек?']] as const).map(([key,label])=><label key={key} className="flex flex-col gap-1 text-sm font-semibold">{label}<textarea rows={key==="story"?3:2} className={input} maxLength={2000} value={stage.mission![key]} onChange={e=>onChange({...stage,mission:{...stage.mission!,[key]:e.target.value}})}/></label>)}<p className="text-sm">Тапшырмалар төмөнкү тизмедеги иретте өтөт. Жеке иш эң аягында болсун; анын суроосун жана критерийлерин жаңы мисалга ылайыктап түзөтүңүз. Кеминде бир машыгуу кошуңуз.</p>{error&&<p role="alert" className="text-sm text-bad">{error}</p>}</>}</section>;
}
