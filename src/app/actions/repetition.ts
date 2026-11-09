"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { isUuid, validRepeatRounds, REPEAT_ERRORS } from "@/lib/repetition";
export type RepeatState={error?:string;success?:string};
const text=(f:FormData,k:string)=>String(f.get(k)??"").trim();
function result(data:unknown,error:unknown):RepeatState{
 if(error)return {error:"Сакталган жок. Байланышты жана база жаңыртылганын текшериңиз."};
 if(data!=="ok")return {error:REPEAT_ERRORS[String(data)]??"Аракет аткарылган жок."};
 revalidatePath("/teacher","layout");revalidatePath("/student","layout");return {success:"Сакталды."};
}
export async function createRepeatPlan(_:RepeatState,f:FormData):Promise<RepeatState>{
 const {supabase}=await requireRole("teacher");const assignment=text(f,"assignmentId");let rounds:unknown;
 if(!isUuid(assignment)||text(f,"rounds").length>40000)return {error:REPEAT_ERRORS.invalid};
 try{rounds=JSON.parse(text(f,"rounds"));}catch{return {error:REPEAT_ERRORS.invalid};}
 if(!validRepeatRounds(rounds))return {error:REPEAT_ERRORS.invalid};
 const {data,error}=await supabase.rpc("create_spaced_review",{p_assignment:assignment,p_rounds:rounds});return result(data,error);
}
export async function toggleRepeatPlan(_:RepeatState,f:FormData):Promise<RepeatState>{
 const {supabase}=await requireRole("teacher");const plan=text(f,"planId"),active=text(f,"active");
 if(!isUuid(plan)||!["true","false"].includes(active))return {error:REPEAT_ERRORS.invalid};
 const {data,error}=await supabase.rpc("set_spaced_review_active",{p_plan:plan,p_active:active==="true"});return result(data,error);
}
export async function submitRepeat(_:RepeatState,f:FormData):Promise<RepeatState>{
 const {supabase}=await requireRole("student");const plan=text(f,"planId"),attempt=text(f,"attemptId"),round=Number(text(f,"round"));let picked:unknown;
 try{picked=JSON.parse(text(f,"picked"));}catch{return {error:REPEAT_ERRORS.invalid};}
 if(!isUuid(plan)||!isUuid(attempt)||!Number.isInteger(round)||round<0||round>2||!Array.isArray(picked)||picked.length!==3||picked.some(x=>!Number.isInteger(x)||x<0||x>3))return {error:REPEAT_ERRORS.invalid};
 const {data,error}=await supabase.rpc("submit_spaced_review",{p_plan:plan,p_attempt:attempt,p_round:round,p_picked:picked});return result(data,error);
}
