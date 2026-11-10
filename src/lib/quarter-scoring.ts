import {isGraded,type LessonContent} from "./lesson-types";
export type QuarterRules={daily_weight:number;grade3_min:number;grade4_min:number;grade5_min:number};
export const DEFAULT_QUARTER_RULES:QuarterRules={daily_weight:60,grade3_min:50,grade4_min:70,grade5_min:85};
export function validRules(v:QuarterRules){return Object.values(v).every(Number.isInteger)&&v.daily_weight>=0&&v.daily_weight<=100&&v.grade3_min>=0&&v.grade3_min<v.grade4_min&&v.grade4_min<v.grade5_min&&v.grade5_min<=100;}
export function termInput(year:unknown,quarter:unknown){const y=Number(year),q=Number(quarter);return Number.isInteger(y)&&y>=2000&&y<=2100&&Number.isInteger(q)&&q>=1&&q<=4?{academic_year:y,quarter:q}:null;}
export type WorkAnswer={block_id:string;is_correct:boolean|null;response:unknown;tries:number};
export type WorkReview={block_id:string;criteria_met:boolean[];source_snapshot?:unknown};
const same=(a:unknown,b:unknown):boolean=>{if(a===b)return true;if(!a||!b||typeof a!=="object"||typeof b!=="object")return false;if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>same(v,b[i]));const x=a as Record<string,unknown>,y=b as Record<string,unknown>;const keys=Object.keys(x);return keys.length===Object.keys(y).length&&keys.every(k=>Object.hasOwn(y,k)&&same(x[k],y[k]));};
/** Ар иштин Exit бөлүгү гана: тестке 1, ачык иштин ар критерийине 1 упай. Python тапшырмасы — мугалим ырастаганда гана (браузер билдирген натыйжа далил эмес). */
export function workScore(content:LessonContent,finished:boolean,answers:WorkAnswer[],reviews:WorkReview[]){
 if(content.activityKind==="game")return {state:"excluded" as const,percentage:null,points:0,total:0};
 let points=0,total=0,pending=false;
 const blocks=content.stages.find(s=>s.key==="exit")?.blocks??[];
 for(const b of blocks){if("optional" in b&&b.optional)continue;const a=answers.find(a=>a.block_id===b.id);if(b.type==="code_task"){total++;const r=reviews.find(r=>r.block_id===b.id);if(!a||!r||r.criteria_met.length!==1||typeof r.criteria_met[0]!=="boolean"||!same(r.source_snapshot,{prompt:b.prompt,rubric:null,response:a.response}))pending=true;else if(r.criteria_met[0])points++;}else if(isGraded(b)){total++;if(!a||typeof a.is_correct!=="boolean")pending=true;else if(a.is_correct)points++;}else if(b.type==="open"&&b.rubric?.length){total+=b.rubric.length;const r=reviews.find(r=>r.block_id===b.id);if(!a||!r||r.criteria_met.length!==b.rubric.length||!r.criteria_met.every(v=>typeof v==="boolean")||!same(r.source_snapshot,{prompt:b.prompt,rubric:b.rubric,response:a.response}))pending=true;else points+=r.criteria_met.filter(Boolean).length;}}
 return {state:!total?"unavailable" as const:!finished||pending?"pending" as const:"ready" as const,percentage:total&&finished&&!pending?points/total*100:null,points,total};
}
export type QuarterWork={id:string;kind:string;title:string;state:string;percentage:number|null;points:number;total:number};
export function quarterScore(works:QuarterWork[],rules:QuarterRules=DEFAULT_QUARTER_RULES){
 const active=works.filter(w=>w.kind!=="game"&&w.state!=="excluded"),daily=active.filter(w=>w.kind==="daily"),quarterly=active.filter(w=>w.kind==="quarterly");
 const mean=(rows:QuarterWork[])=>rows.length&&rows.every(w=>w.state==="ready"&&w.percentage!==null)?rows.reduce((s,w)=>s+w.percentage!,0)/rows.length:null;
 const dailyMean=mean(daily),quarterlyMean=mean(quarterly);
 const ready=validRules(rules)&&(rules.daily_weight===0||dailyMean!==null)&&(rules.daily_weight===100||quarterlyMean!==null);
 const percentage=ready?((dailyMean??0)*rules.daily_weight+(quarterlyMean??0)*(100-rules.daily_weight))/100:null;
 const grade=percentage===null?null:percentage>=rules.grade5_min?5:percentage>=rules.grade4_min?4:percentage>=rules.grade3_min?3:2;
 return {dailyMean,quarterlyMean,percentage,grade,pending:active.filter(w=>w.state!=="ready").length};
}
