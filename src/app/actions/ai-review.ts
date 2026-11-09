"use server";
import {requireRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {loadReviewContext} from "@/lib/review-context";
import {parseReviewSuggestion,REVIEW_INSTRUCTIONS,reviewSchema,type ReviewSuggestion} from "@/lib/ai-review";
export type AiReviewState={error?:string;suggestion?:ReviewSuggestion;sourceHash?:string;answerText?:string};
export async function suggestReview(_:AiReviewState,fd:FormData):Promise<AiReviewState>{
 const {supabase,profile}=await requireRole("teacher"),attemptId=String(fd.get("attemptId")??""),blockId=String(fd.get("blockId")??"");
 const ctx=await loadReviewContext(supabase,profile.id,attemptId,blockId);if(!ctx)return {error:"Критерийи бар ачык жооп табылган жок."};
 const {data:cached}=await supabase.from("ai_review_suggestions").select("result").eq("teacher_id",profile.id).eq("attempt_id",attemptId).eq("block_id",blockId).eq("source_hash",ctx.hash).maybeSingle();
 const previous=cached&&parseReviewSuggestion(cached.result,ctx.block.rubric!.length,ctx.text);if(previous)return {suggestion:previous,sourceHash:ctx.hash,answerText:ctx.text};
 const key=process.env.OPENAI_API_KEY;if(!key)return {error:"ЖИ текшерүүсү азырынча туташтырылган эмес."};
 const {data:allowed,error}=await supabase.rpc("reserve_review_request",{p_attempt:attemptId});if(error)return {error:"ЖИ текшерүүсүнүн база жаңыртуусун текшериңиз."};if(!allowed)return {error:"Бир аз күтө туруңуз. Күнүнө 200 жаңы жоопту ЖИ менен текшерүүгө болот."};
 try{
 const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},signal:AbortSignal.timeout(45000),body:JSON.stringify({model:process.env.OPENAI_REVIEW_MODEL||"gpt-4.1-mini",store:false,max_output_tokens:2400,instructions:REVIEW_INSTRUCTIONS,input:JSON.stringify({prompt:ctx.block.prompt,rubric:ctx.block.rubric,answer:ctx.text}),text:{format:{type:"json_schema",name:"teacher_review",strict:true,schema:reviewSchema(ctx.block.rubric!.length)}}})});
 if(!response.ok)return {error:"ЖИ жооп бере алган жок. Кийин кайра аракет кылыңыз."};
 const data=await response.json() as {status?:string;output?:{type:string;content?:{type:string;text?:string}[]}[]};
 if(data.status!=="completed")return {error:"ЖИ текшерүүсү толук бүтпөдү. Сунуш колдонулган жок."};
 const text=data.output?.filter(x=>x.type==="message").flatMap(x=>x.content??[]).filter(x=>x.type==="output_text").map(x=>x.text??"").join("")??"";
 if(!text)return {error:"ЖИ сунуш берген жок. Кол менен текшере аласыз."};
 const suggestion=parseReviewSuggestion(JSON.parse(text),ctx.block.rubric!.length,ctx.text);if(!suggestion)return {error:"ЖИнин далили же сунушунун форматы туура эмес. Кол менен текшере аласыз."};
 const fresh=await loadReviewContext(supabase,profile.id,attemptId,blockId);if(fresh?.hash!==ctx.hash)return {error:"Жооп же критерий өзгөрдү. Баракты жаңыртып кайра текшериңиз."};
 const {error:saveError}=await createAdminClient().from("ai_review_suggestions").upsert({teacher_id:profile.id,attempt_id:attemptId,block_id:blockId,source_hash:ctx.hash,result:suggestion});
 if(saveError)return {error:"ЖИ сунушу сакталбай калды. Баа өзгөргөн жок."};
 return {suggestion,sourceHash:ctx.hash,answerText:ctx.text};
 }catch{return {error:"ЖИ менен байланыш үзүлдү. Кол менен баалоо жеткиликтүү."};}
}
