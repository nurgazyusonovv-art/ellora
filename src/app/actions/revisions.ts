"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { REVISION_ERRORS } from "@/lib/revisions";
export type RevisionState={error?:string;success?:string};
const uuid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const value=(f:FormData,k:string)=>String(f.get(k)??"").trim();
function result(data:unknown,error:unknown):RevisionState {
 if(error) return {error:"Сакталган жок. Байланышты жана база жаңыртылганын текшериңиз."};
 if(data!=="ok") return {error:REVISION_ERRORS[String(data)]??"Аракет аткарылган жок."};
 revalidatePath("/student","layout");revalidatePath("/teacher","layout");
 return {success:"Сакталды."};
}
export async function requestRevision(_:RevisionState,f:FormData):Promise<RevisionState>{
 const {supabase}=await requireRole("teacher");const attempt=value(f,"attemptId"),block=value(f,"blockId"),feedback=value(f,"feedback");
 if(!uuid(attempt)||!block||block.length>200||!feedback||feedback.length>2000)return {error:"Тапшырманы текшерип, 2000 белгиге чейин пикир жазыңыз."};
 const {data,error}=await supabase.rpc("request_answer_revision",{p_attempt:attempt,p_block:block,p_feedback:feedback});return result(data,error);
}
export async function submitRevision(_:RevisionState,f:FormData):Promise<RevisionState>{
 const {supabase}=await requireRole("student");const id=value(f,"revisionId"),text=value(f,"text");
 if(!uuid(id)||!text||text.length>5000)return {error:"5000 белгиге чейин оңдолгон жооп жазыңыз."};
 const {data,error}=await supabase.rpc("submit_answer_revision",{p_id:id,p_text:text});return result(data,error);
}
export async function reviewRevision(_:RevisionState,f:FormData):Promise<RevisionState>{
 const {supabase}=await requireRole("teacher");const id=value(f,"revisionId"),feedback=value(f,"feedback");let criteria:unknown;
 try{criteria=JSON.parse(value(f,"criteria"));}catch{return {error:"Критерийлер туура эмес."};}
 if(!uuid(id)||!feedback||feedback.length>2000||!Array.isArray(criteria)||!criteria.length||criteria.length>20||criteria.some(x=>typeof x!=="boolean"))return {error:"Критерийлерди текшерип, пикир жазыңыз."};
 const {data,error}=await supabase.rpc("review_answer_revision",{p_id:id,p_criteria:criteria,p_feedback:feedback});return result(data,error);
}
