export type RepeatQuestion={prompt:string;options:string[];correct:number;explain:string};
export type RepeatRound={days:number;questions:RepeatQuestion[]};
export type RepeatTask={planId:string;attemptId:string;assignmentId:string;title:string;round:number;days:number;dueAt:string|null;status:"waiting"|"scheduled"|"due"|"done";questions:(Omit<RepeatQuestion,"correct"|"explain"> & Partial<Pick<RepeatQuestion,"correct"|"explain">>)[];picked:number[]|null;results:boolean[]|null};
export const isUuid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function validRepeatRounds(value:unknown):value is RepeatRound[]{
 if(!Array.isArray(value)||value.length!==3)return false;
 const prompts=new Set<string>();
 return value.every((r,i)=>{
  if(!r||!Number.isInteger(r.days)||r.days<1||r.days>90||(i>0&&r.days<=value[i-1].days)||!Array.isArray(r.questions)||r.questions.length!==3)return false;
  return r.questions.every((q:RepeatQuestion)=>{
   if(!q||typeof q.prompt!=="string"||!q.prompt.trim()||q.prompt.length>1000||!Array.isArray(q.options)||q.options.length<2||q.options.length>4||q.options.some(o=>typeof o!=="string"||!o.trim()||o.length>500)||new Set(q.options.map(o=>o.trim().toLowerCase())).size!==q.options.length||!Number.isInteger(q.correct)||q.correct<0||q.correct>=q.options.length||typeof q.explain!=="string"||!q.explain.trim()||q.explain.length>2000)return false;
   const key=q.prompt.trim().toLowerCase();if(prompts.has(key))return false;prompts.add(key);return true;
  });
 });
}
export const REPEAT_ERRORS:Record<string,string>={forbidden:"Бул кайталоого укугуңуз жок.",invalid:"Күндөрдү жана суроолорду текшериңиз. Ар бир кайталоого үч башка суроо, туура вариант жана түшүндүрмө керек.",exists:"Бул тапшырманын кайталоо планы мурунтан бекитилген.",not_due:"Кайталоонун убактысы келе элек же мурунку кайталоо тапшырылган жок.",already_submitted:"Бул кайталоо мурда тапшырылган. Сакталган жыйынтыгын көрүңүз.",inactive:"Мугалим бул кайталоону токтотту."};
