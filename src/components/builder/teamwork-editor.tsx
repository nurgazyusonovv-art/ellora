"use client";
import type { Block, OpenBlock } from "@/lib/lesson-types";
const inputCls="min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-normal";
export function teamworkBlock(id:string,mode:"pair"|"group"):OpenBlock {
 return {id,type:"open",prompt:"",collaboration:mode,teamwork:{size:mode==="pair"?2:4,instructions:mode==="pair"?"Адегенде ар бириң өз оюңарды айткыла. Бирге чечим чыгаргыла. Ролдорду алмаштырып, чечимди текшергиле.":"Ролдорду бөлүштүргүлө. Ар бир мүчө өз сунушун айтсын. Сунуштарды салыштырып, жалпы чечимди даярдагыла.",roles:mode==="pair"?["Сунуштоочу — чечим сунуштайт","Текшерүүчү — далилдерди жана мисалдарды текшерет"]:["Уюштуруучу — талкууну алып барат","Изилдөөчү — мисалдарды сынайт","Жазуучу — жалпы жыйынтыкты жазат","Баяндамачы — чечимди түшүндүрөт"],outcome:"Негизделген жалпы чечим жана ар бир мүчөнүн салымы"},rubric:["Чечимди далил менен негиздеди","Өз салымын жана топтун чечимин түшүндүрдү"]};
}
export function TeamworkEditor({block,onChange}:{block:Block;onChange:(b:Block)=>void}) {
 const mode=block.collaboration??"individual";
 const team=block.teamwork;
 return <div className="flex flex-col gap-3">
  <label className="flex flex-col gap-1.5 text-sm font-semibold">Иштөө формасы<select className={inputCls} value={mode} onChange={e=>{const value=e.target.value as "individual"|"pair"|"group";const preset=value==="individual"?undefined:teamworkBlock(block.id,value).teamwork;onChange({...block,collaboration:value,teamwork:preset});}}><option value="individual">Жеке</option><option value="pair">Жуп менен</option><option value="group">Топ менен</option></select></label>
  {mode!=="individual" && !team && <button type="button" className="min-h-11 rounded-xl bg-accent-soft p-3 text-left text-sm font-semibold text-accent border border-accent/20" onClick={()=>onChange({...block,teamwork:teamworkBlock(block.id,mode).teamwork})}>Ролдорду жана бирге иштөө кадамдарын кошуу</button>}
  {team && mode!=="individual" && <div className="flex flex-col gap-3 rounded-xl bg-accent-soft p-3 border border-accent/20">
   {mode==="group" && <label className="flex flex-col gap-1.5 text-sm font-semibold">Топтогу окуучулардын саны<select className={inputCls} value={team.size} onChange={e=>{const size=Number(e.target.value);onChange({...block,teamwork:{...team,size,roles:Array.from({length:size},(_,i)=>team.roles[i]??"")}});}}>{[3,4,5,6].map(n=><option key={n} value={n}>{n} окуучу</option>)}</select></label>}
   <label className="flex flex-col gap-1.5 text-sm font-semibold">Бирге иштөө кадамдары<textarea className={inputCls} value={team.instructions} rows={3} maxLength={10000} onChange={e=>onChange({...block,teamwork:{...team,instructions:e.target.value}})} /></label>
   {Array.from({length:team.size},(_,i)=><label key={i} className="flex flex-col gap-1.5 text-sm font-semibold">{i+1}-окуучунун ролу<input className={inputCls} maxLength={1000} value={team.roles[i]??""} onChange={e=>onChange({...block,teamwork:{...team,roles:Array.from({length:team.size},(_,j)=>j===i?e.target.value:team.roles[j]??"")}})} /></label>)}
   <label className="flex flex-col gap-1.5 text-sm font-semibold">Бирге даярдалчу жыйынтык<textarea className={inputCls} rows={2} maxLength={1000} value={team.outcome} onChange={e=>onChange({...block,teamwork:{...team,outcome:e.target.value}})} /></label>
   <p className="text-sm text-muted">Жуп/топ жалпы чечимди даярдайт. Ар бир окуучу өз жообунда чечимди жана өз салымын жазат.</p>
  </div>}
 </div>;
}
