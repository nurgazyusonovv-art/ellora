"use server";
import {revalidatePath} from "next/cache";
import {requireRole} from "@/lib/auth";
import {readStudentSession} from "@/lib/live-session";
import {classGoal,type ClassGoal,type LiveSession} from "@/lib/classroom";
import {createAdminClient} from "@/lib/supabase/admin";
export type ClockState={error?:string;success?:string};
const commands=new Set(["start","next","back","pause","resume","add","auto","stop"]);
export async function controlClock(_:ClockState,fd:FormData):Promise<ClockState>{
 const {supabase}=await requireRole("teacher");const id=String(fd.get("assignmentId")??"");const command=String(fd.get("command")??"");const version=Number(fd.get("version"));const minutes=Number(fd.get("minutes")??2);
 if(!/^[0-9a-f-]{36}$/i.test(id)||!commands.has(command)||!Number.isInteger(version)||version< -1||!Number.isInteger(minutes)||minutes<1||minutes>30)return {error:"Башкаруу маалыматы туура эмес."};
 const {data,error}=await supabase.rpc("control_lesson_clock",{p_assignment:id,p_command:command,p_version:version,p_seconds:minutes*60,p_auto:fd.get("auto")==="true"});
 if(error)return {error:"Жалпы таймер сакталган жок. 0015 база жаңыртуусун текшериңиз."};
 if(data!=="ok")return {error:data==="version"?"Бөлүк же таймер өзгөрдү. Баракты жаңыртып кайра басыңыз.":data==="already"?"Жалпы таймер мурда башталган.":"Сабакты башкарууга уруксат жок же маалымат туура эмес."};
 revalidatePath(`/teacher/assignments/${id}`);revalidatePath(`/student/assignments/${id}`);return {success:"Жалпы сабак жаңыртылды."};
}
export async function pollLessonClock(attemptId:string):Promise<{session?:LiveSession|null;goal?:ClassGoal|null;error?:string}>{
 const {supabase,profile}=await requireRole("student");
 const {data}=await supabase.from("attempts").select("assignment_id").eq("id",attemptId).eq("student_id",profile.id).maybeSingle();
 if(!data)return {error:"Сабак табылган жок."};
 let session:LiveSession|null;
 try{session=await readStudentSession(supabase,data.assignment_id);}catch{return {error:"Жалпы саат жаңырган жок. Байланышты текшериңиз."};}
 // Класстын максаты мугалим башкарган (таймерсиз) жүрүп жаткан сабакта гана.
 const goal=session&&!session.timed&&!session.waiting&&!session.ended?await liveClassGoal(supabase,data.assignment_id,session.max_stage).catch(()=>null):null;
 return {session,goal};
}

/**
 * Класстын жалпы прогресси — аттарсыз сан гана. Окуучу башкалардын аракеттерин RLS менен көрбөйт, ошондуктан
 * дайындама окуучуга көрүнөрүн кадимки клиент менен текшерип, андан кийин admin менен санайбыз.
 */
async function liveClassGoal(supabase:Awaited<ReturnType<typeof requireRole>>["supabase"],assignmentId:string,stage:number){
 const {data:a}=await supabase.from("assignments").select("class_id").eq("id",assignmentId).maybeSingle();
 if(!a)return null;
 const admin=createAdminClient();
 const [{count:total},{data:attempts}]=await Promise.all([
  admin.from("class_members").select("student_id",{count:"exact",head:true}).eq("class_id",a.class_id),
  admin.from("attempts").select("current_stage, finished_at").eq("assignment_id",assignmentId),
 ]);
 const done=(attempts??[]).filter(t=>t.finished_at||(t.current_stage as number)>stage).length;
 return classGoal(done,total??0);
}
