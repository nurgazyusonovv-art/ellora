"use server";
import {revalidatePath} from "next/cache";
import {requireRole} from "@/lib/auth";
import {termInput,validRules} from "@/lib/quarter-scoring";
import {quarterData} from "@/lib/quarter-data";
import {generateLesson,type LessonAiState} from "./lesson-ai";
export type QuarterState={error?:string;success?:string};
export async function saveQuarterRules(_:QuarterState,fd:FormData):Promise<QuarterState>{
 const {supabase,profile}=await requireRole("teacher"),classId=String(fd.get("classId")??""),term=termInput(fd.get("year"),fd.get("quarter"));
 const rules={daily_weight:Number(fd.get("daily_weight")),grade3_min:Number(fd.get("grade3_min")),grade4_min:Number(fd.get("grade4_min")),grade5_min:Number(fd.get("grade5_min"))};
 if(!term||!validRules(rules))return {error:"Жылды, чейректи, салмакты жана өсүү тартибиндеги баа чектерин текшериңиз."};
 const {data:cls}=await supabase.from("classes").select("id").eq("id",classId).eq("teacher_id",profile.id).maybeSingle();if(!cls)return {error:"Класс табылган жок."};
 const {error}=await supabase.from("quarter_settings").upsert({class_id:classId,...term,...rules,updated_at:new Date().toISOString()});if(error)return {error:"Чейрек эрежеси сакталган жок."};
 revalidatePath(`/teacher/classes/${classId}/quarter`);return {success:"Эреже сакталды. Мурунку бекитилген баалар өзгөргөн жок."};
}
export async function approveQuarterGrade(_:QuarterState,fd:FormData):Promise<QuarterState>{
 const {supabase,profile}=await requireRole("teacher"),classId=String(fd.get("classId")??""),studentId=String(fd.get("studentId")??""),term=termInput(fd.get("year"),fd.get("quarter")),grade=Number(fd.get("grade")),note=String(fd.get("note")??"").trim();
 if(!term||!Number.isInteger(grade)||grade<2||grade>5||note.length>2000)return {error:"Баа 2ден 5ке чейин, пикир 2000 белгиге чейин болсун."};
 try{const data=await quarterData(supabase,profile.id,classId,term.academic_year,term.quarter),row=data.rows.find(r=>r.studentId===studentId);if(!row)return {error:"Окуучу бул класста жок."};
 if(fd.get("basisHash")!==row.hash)return {error:"Жооп же эсеп эрежеси өзгөрдү. Баракты жаңыртып кайра бекитиңиз."};
 if((row.grade===null||row.grade!==grade)&&!note)return {error:"Сунуштан айырмаланган же далили толук эмес баага негиздеме жазыңыз."};
 if(fd.get("confirmed")!=="true")return {error:"Жыйынтыкты текшергениңизди белгилеңиз."};
 const {error}=await supabase.from("quarter_grades").insert({class_id:classId,student_id:studentId,teacher_id:profile.id,...term,grade,percentage:row.percentage,note,basis_hash:row.hash,snapshot:{rules:data.rules,works:row.works,dailyMean:row.dailyMean,quarterlyMean:row.quarterlyMean}});if(error)return {error:"Баа бекитилген жок. Кайра аракет кылыңыз."};
 revalidatePath(`/teacher/classes/${classId}/quarter`);revalidatePath("/student/quarters");return {success:"Чейректик баа бекитилип, тарыхка сакталды."};
 }catch(e){return {error:e instanceof Error?e.message:"Чейрек эсептелген жок."};}
}
export async function generateQuarterWork(_:LessonAiState,fd:FormData):Promise<LessonAiState>{
 const {supabase,profile}=await requireRole("teacher"),classId=String(fd.get("classId")??""),term=termInput(fd.get("year"),fd.get("quarter")),ids=fd.getAll("assignmentIds").map(String);
 if(!term||ids.length<1||ids.length>12||new Set(ids).size!==ids.length)return {error:"Өтүлгөн иштерден 1–12 кайталанбаган теманы тандаңыз."};
 const {data:cls}=await supabase.from("classes").select("id").eq("id",classId).eq("teacher_id",profile.id).maybeSingle();if(!cls)return {error:"Класс табылган жок."};
 const {data:rows,error}=await supabase.from("assignments").select("id,lessons(title,grade,content)").eq("class_id",classId).eq("academic_year",term.academic_year).eq("quarter",term.quarter).eq("work_kind","daily").in("id",ids).returns<{id:string;lessons:{title:string;grade:number|null;content:import("@/lib/lesson-types").LessonContent}|null}[]>();
 if(error||!rows||rows.length!==ids.length||rows.some(r=>!r.lessons||r.lessons.content.activityKind==="game"))return {error:"Темалар тандалган класстын ушул чейрегине таандык болсун."};
 const briefs=rows.map(r=>({topic:r.lessons!.title,objectives:r.lessons!.content.objectives??[],skills:[...new Set(r.lessons!.content.stages.flatMap(s=>s.blocks.flatMap(b=>b.skills??[])))]}));
 const input=new FormData();input.set("topic",`${term.academic_year}–${term.academic_year+1}: ${term.quarter}-чейректик текшерүү иш`);input.set("grade",String(Number(fd.get("grade"))));input.set("duration","45");input.set("groupSize","4");input.set("quarterAssessment","true");input.set("context",`Мугалим өтүлгөн деп тандаган темалар: ${JSON.stringify(briefs)}. Жаңы кырдаалда жеке практикалык иш, так рубрика жана кыска тест түз. Аты-жөн же реалдуу жооп берилген жок.`);
 if(String(input.get("context")).length>2000)return {error:"Тандалган темалардын максаттары өтө узун. Аз тема тандаңыз."};
 return generateLesson({},input);
}
