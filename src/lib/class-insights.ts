import {readLessonGame} from "./game-questions";
import {practicalEvidence,type PracticalEvidence} from "./practical-evidence";
import { isGraded, isInteractive, stageMeta, type Block, type LessonContent } from "@/lib/lesson-types";
import { SKILLS, isSkillId, type SkillId } from "@/lib/skills";
import type { Revision } from "@/lib/revisions";
export type InsightAnswer={attempt_id:string;block_id:string;response:unknown;is_correct:boolean|null;tries:number};
export type InsightReview={attempt_id:string;block_id:string;criteria_met:boolean[]};
export type EvidenceState="correct"|"retry"|"incorrect"|"review"|"revision"|"submitted";
export type InsightStudent={practical?:PracticalEvidence;id:string;name:string;state:EvidenceState;tries:number;response:string;detailTarget?:string};
export type BlockInsight={id:string;prompt:string;stage:string;skills:SkillId[];answered:number;notReached:number;noAnswer:number;help:number;pending:number;correct:number;students:InsightStudent[];options?:{text:string;n:number;correct:boolean}[];groupSignal:boolean};
export type SkillInsight={id:SkillId;label:string;help:number;pending:number;met:number;students:number};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
function responseText(b:Block,a:InsightAnswer){
 const r=object(a.response);
 if(b.type==="open")return typeof r.text==="string"?r.text:"Жооптун форматын текшериңиз.";
 if(b.type==="game"){const g=readLessonGame(r);return g.best!==null?`Оюн: рекорд ${g.best}%, ${g.rounds} раунд.`:`Оюн ойнолууда: ${g.solved?.length??0} суроо чечилди.`;}
 if(b.type==="investigation")return ["prediction","observations","conclusion"].map(k=>({prediction:"Божомол",observations:"Байкоо",conclusion:"Жыйынтык"}[k])+": "+(typeof r[k]==="string"?r[k]:"—")).join("\n");
 if(b.type==="mcq")return Number.isInteger(r.picked)?b.options[r.picked as number]??"Вариант белгисиз":"Вариант белгисиз";
 if(b.type==="code_task")return typeof r.code==="string"?r.code:"Коддун жообун ачыңыз.";
 if(b.type==="classification")return "Категорияларга бөлүштүрүү жообу тапшырылган.";
 if(b.type==="spreadsheet")return "Таблицанын уячалары жана формулалары толук далилде көрсөтүлөт.";
 if(b.type==="matching")return "Дал келтирүү жообу тапшырылган.";
 if(b.type==="ordering")return "Кадамдардын ирети тапшырылган.";
 return b.type==="parsons"?"Саптардын ирети тапшырылган.":"Каталарды табуу жообу тапшырылган.";
}
export function classInsights(input:{content:LessonContent;members:{student_id:string;profiles:{full_name:string}|null}[];attempts:{id:string;student_id:string;current_stage:number}[];answers:InsightAnswer[];reviews:InsightReview[];revisions:Revision[]}){
 const {content}=input;
 const members=[...new Map(input.members.map(m=>[m.student_id,m])).values()];
 const roster=new Set(members.map(m=>m.student_id));
 const attempts=new Map(input.attempts.filter(t=>roster.has(t.student_id)).map(t=>[t.student_id,t]));
 const answers=new Map(input.answers.map(a=>[`${a.attempt_id}:${a.block_id}`,a]));
 const reviews=new Map(input.reviews.map(r=>[`${r.attempt_id}:${r.block_id}`,r]));
 const revisions=new Map<string,Revision>();
 for(const r of input.revisions){const key=`${r.attempt_id}:${r.block_id}`;if((revisions.get(key)?.revision_no??0)<r.revision_no)revisions.set(key,r);}
 const blocks:BlockInsight[]=[];
 content.stages.forEach((stage,si)=>stage.blocks.forEach(b=>{
  // Баштапкы текшерүү өсүш үчүн гана — далил же «текшерүүнү күтөт» эмес.
  if(!isInteractive(b)||b.type==="confidence"||(b.type==="mcq"&&b.precheck))return;
  const row:BlockInsight={id:b.id,prompt:"prompt" in b?b.prompt:"",stage:stageMeta(content,stage.key).label,skills:[...new Set((b.skills??[]).filter(isSkillId))],answered:0,notReached:0,noAnswer:0,help:0,pending:0,correct:0,students:[],groupSignal:false,...(b.type==="mcq"?{options:b.options.map((text,i)=>({text,n:0,correct:i===b.correct}))}:{})};
  for(const m of members){
   const t=attempts.get(m.student_id),key=`${t?.id}:${b.id}`,a=t?answers.get(key):undefined;
   if(!a){if(!t||t.current_stage<si)row.notReached++;else row.noAnswer++;continue;}
   let state:EvidenceState;
   const revision=revisions.get(key),review=reviews.get(key);
   // Оюн: бардык суроо чечилсе — аткарылды; али ойнолуп жатса — кайра аракетте (жардам керек болушу мүмкүн).
   if(b.type==="game")state=a.is_correct===true?"correct":"retry";
   else if(isGraded(b))state=a.is_correct===true?(a.tries>1?"retry":"correct"):a.is_correct===false?"incorrect":"review";
   else if(revision)state=revision.status==="requested"?"revision":revision.status==="submitted"?"submitted":revision.criteria_met?.length===revision.rubric.length&&revision.criteria_met.every(Boolean)?"correct":"incorrect";
   else if(b.type==="open"&&b.rubric?.length&&review&&review.criteria_met.length===b.rubric.length)state=review.criteria_met.every(Boolean)?"correct":"incorrect";
   else state="review";
   if(["retry","incorrect","revision"].includes(state))row.help++;else if(["review","submitted"].includes(state))row.pending++;else row.correct++;
   row.answered++;
   row.students.push({id:m.student_id,name:m.profiles?.full_name??"Окуучу",state,tries:a.tries,response:revision?(revision.response??revision.previous_response):responseText(b,a),practical:revision?undefined:practicalEvidence(b,a),detailTarget:revision&&b.type==="open"&&b.rubric?.length?`#class-answer-${m.student_id}-${b.id}`:undefined});
   if(row.options){const picked=object(a.response).picked;if(typeof picked==="number"&&Number.isInteger(picked)&&row.options[picked])row.options[picked].n++;}
  }
  // Класс үчүн сунуштун продукт эрежеси: аз жоопту жалпылабайбыз.
  row.groupSignal=row.answered>=3&&row.help/row.answered>=0.4;
  blocks.push(row);
 }));
 const skills:SkillInsight[]=(Object.keys(SKILLS) as SkillId[]).filter(id=>blocks.some(b=>b.skills.includes(id))).map(id=>{
  const states=new Map<string,"help"|"pending"|"met">();
  for(const b of blocks.filter(b=>b.skills.includes(id)))for(const s of b.students){const value=["retry","incorrect","revision"].includes(s.state)?"help":["review","submitted"].includes(s.state)?"pending":"met";const old=states.get(s.id);if(old!=="help"&&(old!=="pending"||value==="help"))states.set(s.id,value);}
  return {id,label:SKILLS[id],help:[...states.values()].filter(x=>x==="help").length,pending:[...states.values()].filter(x=>x==="pending").length,met:[...states.values()].filter(x=>x==="met").length,students:states.size};
 });
 return {total:members.length,blocks,skills,priorities:blocks.filter(b=>b.groupSignal).sort((a,b)=>b.help/b.answered-a.help/a.answered||b.help-a.help).slice(0,3)};
}
export type ClassInsights=ReturnType<typeof classInsights>;
