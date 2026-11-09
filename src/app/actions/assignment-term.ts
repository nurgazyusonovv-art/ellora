"use server";
import {revalidatePath} from "next/cache";
import {requireRole} from "@/lib/auth";
import {assignmentTerm} from "@/lib/assignment-term";
import type {QuarterState} from "./quarters";
export async function updateAssignmentTerm(_:QuarterState,fd:FormData):Promise<QuarterState>{
 const {supabase,profile}=await requireRole("teacher"),id=String(fd.get("assignmentId")??"");
 const {data:a}=await supabase.from("assignments").select("class_id,lessons(content)").eq("id",id).maybeSingle<{class_id:string;lessons:{content:{activityKind?:string}}|null}>();
 const {data:cls}=a?await supabase.from("classes").select("id").eq("id",a.class_id).eq("teacher_id",profile.id).maybeSingle():{data:null};if(!cls||!a?.lessons)return {error:"Тапшырма табылган жок."};
 const patch=assignmentTerm(fd,a.lessons.content.activityKind);if("error" in patch)return {error:patch.error};
 const {data:saved,error}=await supabase.from("assignments").update(patch).eq("id",id).select("id").maybeSingle();if(error||!saved)return {error:"Чейрек белгиси сакталган жок."};
 revalidatePath(`/teacher/assignments/${id}`);revalidatePath(`/teacher/classes/${a.class_id}/quarter`);return {success:"Чейрек жана иштин түрү сакталды."};
}
