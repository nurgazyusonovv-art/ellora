export const PATHWAYS={support:"Колдоо менен",core:"Негизги",challenge:"Тереңдетилген"} as const;
export type Pathway=keyof typeof PATHWAYS;
export const isPathway=(v:unknown):v is Pathway=>typeof v==="string"&&Object.hasOwn(PATHWAYS,v);
export type PathwayPlan={id:string;assignment_id:string;title:string;goal:string;variants:Record<Pathway,string>;check_prompt:string;rubric:string[];active:boolean};
export type PathwayWork={id:string;plan_id:string;attempt_id:string;pathway:Pathway;support_requested:boolean;response:string|null;check_response:string|null;submitted_at:string|null;criteria_met:boolean[]|null;feedback:string|null;reviewed_at:string|null};
export type PathwayTask={planId:string;attemptId:string;title:string;goal:string;pathway:Pathway;prompt:string;checkPrompt:string;rubric:string[];work:PathwayWork|null};
export const PATHWAY_COLUMNS="id,plan_id,attempt_id,pathway,support_requested,response,check_response,submitted_at,criteria_met,feedback,reviewed_at";
export function validPathwayPlan(v:unknown):v is Pick<PathwayPlan,"goal"|"variants"|"check_prompt"|"rubric">{
 if(!v||typeof v!=="object")return false;const p=v as PathwayPlan;
 const text=(x:unknown,max:number):x is string=>typeof x==="string"&&!!x.trim()&&x.length<=max;
 return text(p.goal,2000)&&!!p.variants&&Object.values(PATHWAYS).length===Object.keys(p.variants).length&&Object.keys(PATHWAYS).every(k=>text(p.variants[k as Pathway],5000))&&new Set(Object.values(p.variants).map(x=>x.trim().toLowerCase())).size===3&&text(p.check_prompt,2000)&&Array.isArray(p.rubric)&&p.rubric.length>=2&&p.rubric.length<=5&&p.rubric.every(x=>text(x,1000));
}
export const PATHWAY_ERRORS:Record<string,string>={forbidden:"Бул практика менен иштөөгө укугуңуз жок.",invalid:"Максатты, үч башка вариантты, өз алдынча суроону жана критерийлерди текшериңиз.",exists:"Бул сабактын практика планы мурунтан бар.",inactive:"Мугалим бул практиканы токтотту.",locked:"Жооп тапшырылган. Вариантты же жоопту алмаштырууга болбойт.",changed:"Мугалим вариантты өзгөрттү. Баракты жаңыртып, жаңы тапшырманы оку.",not_ready:"Колдонуу бөлүгү ачылганда бул практика жеткиликтүү болот.",not_submitted:"Адегенде окуучу жооп тапшырсын."};
