"use server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkStructure, validateLesson } from "@/lib/lesson-edit";
import type { LessonDraft } from "./teacher";
import { additionTemplates, blockSlots, applyEdit, editContext, EDIT_INSTRUCTIONS, matchesSchema, parseEditRequest, selectedText, templateSchema, type EditProposal } from "@/lib/lesson-ai-edit";
export type LessonEditAiState={error?:string;proposal?:EditProposal;generationId?:string};
export async function suggestLessonEdit(_:LessonEditAiState,fd:FormData):Promise<LessonEditAiState> {
 const {supabase,profile}=await requireRole("teacher");
 const id=String(fd.get("lessonId")??"");const r=parseEditRequest(fd);
 const rawDraft=fd.get("draft");
 if(!r||typeof rawDraft!=="string"||rawDraft.length>850000)return {error:"Өзгөртүлө турган жерди жана көрсөтмөнү туура тандаңыз."};
 let draft:LessonDraft;try{draft=JSON.parse(rawDraft);}catch{return {error:"Сабактын форматы туура эмес."};}
 if(!draft||typeof draft.title!=="string"||typeof draft.topic!=="string"||checkStructure(draft.content))return {error:"Сабактын түзүлүшүн текшериңиз."};
 try { validateLesson(draft.title,draft.content); } catch { return {error:"Сабактын талааларынын форматы туура эмес."}; }
 const {data:owned,error}=await supabase.from("lessons").select("id").eq("id",id).eq("author_id",profile.id).maybeSingle();
 if(error||!owned)return {error:"Сабак табылган жок же өзгөртүүгө укугуңуз жок."};
 if(r.mode==="text") {const target=selectedText(draft,r);if(!target||r.end>target.value.length||r.start===r.end&&target.value.length>0)return {error:"Текст талаасын же анын үзүндүсүн кайра тандаңыз."};}
 if(r.mode==="add"&&(draft.content.stages[r.stage].blocks.length+r.count>40 || r.type==="presentation"&&r.stage!==2 || ["classification","spreadsheet","matching","ordering"].includes(r.type)&&![3,4].includes(r.stage) || r.stage===1&&["mcq","code_task","parsons","bug_hunt"].includes(r.type)))return {error:"Бул тапшырма түрү тандалган бөлүккө туура келбейт же бөлүктө тапшырма өтө көп."};
 const context=editContext(draft,r);if(!context)return {error:"Сабактын тексти өтө чоң. Мазмунду кыскартып көрүңүз."};
 const key=process.env.OPENAI_API_KEY;if(!key)return {error:"ЖИ кызматы азырынча туташтырылган эмес."};
 const model=process.env.OPENAI_LESSON_MODEL||"gpt-4.1";
 // Жалпы сабак генерациясы менен бирдей атомдук 30 секунд / 10 сурам лимити.
 const {data:gid,error:reserveError}=await supabase.rpc("reserve_lesson_generation",{p_input:{operation:"edit",lessonId:id,stage:r.stage,mode:r.mode,instruction:r.instruction},p_model:model});
 if(reserveError||typeof gid!=="string")return {error:"30 секунд күтө туруңуз. Сабак түзүү жана оңдоо үчүн жалпы лимит — күнүнө 10 сурам."};
 const {data:reservation}=await supabase.from("ai_lesson_generations").select("id").eq("id",gid).eq("teacher_id",profile.id).maybeSingle();
 if(!reservation)return {error:"ЖИ сурамын текшерүү мүмкүн болгон жок."};
 const admin=createAdminClient();
 const record=async(patch:Record<string,unknown>)=>admin.from("ai_lesson_generations").update(patch).eq("id",gid).eq("teacher_id",profile.id);
 const fail=async(error:string)=>{await record({status:"failed",error});return {error,generationId:gid};};
 const schema=r.mode==="text"?templateSchema({value:""}):templateSchema({blocks:blockSlots(additionTemplates(draft.content,r))});
 try {
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},signal:AbortSignal.timeout(90000),body:JSON.stringify({model,store:false,max_output_tokens:6500,instructions:EDIT_INSTRUCTIONS,input:JSON.stringify(context),text:{format:{type:"json_schema",name:"lesson_edit",strict:true,schema}}})});
  if(!response.ok)return fail("ЖИ сунуш даярдай алган жок. Кийин кайра аракет кылыңыз.");
  const data=await response.json() as {status?:string;usage?:{input_tokens:number;output_tokens:number};output?:{type:string;content?:{type:string;text?:string}[]}[]};
  const raw=data.output?.filter(x=>x.type==="message").flatMap(x=>x.content??[]).filter(x=>x.type==="output_text").map(x=>x.text??"").join("")??"";
  const {error:saved}=await record({result:raw,input_tokens:data.usage?.input_tokens??null,output_tokens:data.usage?.output_tokens??null});
  if(saved)return {error:"ЖИ жообу тарыхка сакталган жок. Кайра сурам берүүдөн мурда тарыхты текшериңиз."};
  if(data.status!=="completed")return fail("ЖИ толук жооп берген жок. Кайра аракет кылыңыз.");
  const parsed:unknown=JSON.parse(raw);if(!matchesSchema(parsed,schema))return fail("ЖИ сунушунун форматы туура эмес. Сабак өзгөргөн жок.");
  const payload=parsed as {value?:string;blocks?:Record<string,import("@/lib/lesson-types").Block>};
  const proposal:EditProposal={request:r,...(r.mode==="text"?{value:payload.value}:{blocks:Object.values(payload.blocks!)})};
  if(!applyEdit(draft,proposal))return fail("ЖИ сунушу сабактын текшерүүсүнөн өткөн жок. Көрсөтмөнү тактап кайра аракет кылыңыз.");
  const {error:finished}=await record({status:"ready",lesson_id:id});if(finished)return {error:"Сунуштун тарыхы жаңырган жок. Кийин кайра текшериңиз."};
  // Бул аракет сабакты жазбайт: мугалим сунушту көрүп, конструктордо өзүнчө кабыл алат.
  return {proposal,generationId:gid};
 }catch{return fail("ЖИ менен байланыш үзүлдү же жооптун форматы туура эмес. Сабак өзгөргөн жок.");}
}
