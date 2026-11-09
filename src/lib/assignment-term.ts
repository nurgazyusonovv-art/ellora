import {termInput} from "./quarter-scoring";
export function schoolYear(now=new Date()){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bishkek",year:"numeric",month:"2-digit"}).formatToParts(now),year=Number(parts.find(p=>p.type==="year")?.value),month=Number(parts.find(p=>p.type==="month")?.value);return month>=8?year:year-1;}
export function assignmentTerm(fd:FormData,activityKind?:string){
 const kind=activityKind==="game"?"game":activityKind==="quarterly"?"quarterly":String(fd.get("work_kind")??"daily");
 if(!["daily","quarterly","game"].includes(kind))return {error:"Иштин түрүн тандаңыз."} as const;
 const q=String(fd.get("quarter")??"");if(!q){if(kind==="quarterly")return {error:"Чейректик ишке окуу жылын жана чейректи тандаңыз."} as const;return {academic_year:null,quarter:null,work_kind:kind};}
 const term=termInput(fd.get("academic_year"),q);return term?{...term,work_kind:kind}:{error:"Окуу жылын жана чейректи туура тандаңыз."} as const;
}
