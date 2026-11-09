"use server";
import {revalidatePath} from "next/cache";
import {requireRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {gameInput,gameSchema,generatedGame,GAME_INSTRUCTIONS} from "@/lib/game-generator";
import type {LessonAiState} from "./lesson-ai";
export async function generateGame(_:LessonAiState,fd:FormData):Promise<LessonAiState>{
 const {supabase,profile}=await requireRole("teacher"),input=gameInput(fd);
 if(!input)return {error:"Теманы, 5–9-классты, оюн түрүн жана 4–8 тапшырма санын туура тандаңыз."};
 const key=process.env.OPENAI_API_KEY;if(!key)return {error:"ЖИ кызматы азырынча туташтырылган эмес."};
 const model=process.env.OPENAI_LESSON_MODEL||"gpt-4.1";
 const {data:gid,error}=await supabase.rpc("reserve_lesson_generation",{p_input:input,p_model:model});
 if(error)return {error:"ЖИ түзүү кызматы жеткиликтүү эмес."};
 if(typeof gid!=="string")return {error:"30 секунд күтө туруңуз. Оюн жана сабак үчүн жалпы күнүнө 10 долбоор түзүүгө болот."};
 const {data:owned}=await supabase.from("ai_lesson_generations").select("id").eq("id",gid).eq("teacher_id",profile.id).maybeSingle();
 if(!owned)return {error:"ЖИ долбоору табылган жок."};
 const admin=createAdminClient(),update=async(patch:Record<string,unknown>)=>admin.from("ai_lesson_generations").update(patch).eq("id",gid).eq("teacher_id",profile.id);
 const fail=async(message:string):Promise<LessonAiState>=>{await update({status:"failed",error:message});return {error:message,generationId:gid};};
 try{
 const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},signal:AbortSignal.timeout(60000),body:JSON.stringify({model,store:false,max_output_tokens:3500,instructions:GAME_INSTRUCTIONS,input:JSON.stringify(input),text:{format:{type:"json_schema",name:"learning_game",strict:true,schema:gameSchema(input)}}})});
 if(!response.ok)return fail("ЖИ оюн түзө алган жок. Кийин кайра аракет кылыңыз.");
 const data=await response.json() as {status?:string;usage?:{input_tokens:number;output_tokens:number};output?:{type:string;content?:{type:string;text?:string}[]}[]};
 const raw=data.output?.filter(x=>x.type==="message").flatMap(x=>x.content??[]).filter(x=>x.type==="output_text").map(x=>x.text??"").join("")??"";
 const {error:saved}=await update({result:raw,input_tokens:data.usage?.input_tokens??null,output_tokens:data.usage?.output_tokens??null});
 if(saved)return {error:"ЖИ жообу сакталган жок. Жаңы сурамдан мурда тарыхты караңыз.",generationId:gid};
 if(data.status!=="completed")return fail("ЖИ оюну толук түзүлгөн жок. Текст тарыхта сакталды.");
 let parsed:unknown;try{parsed=JSON.parse(raw);}catch{return fail("ЖИ жообунун форматы туура эмес. Текст тарыхта сакталды.");}
 const game=generatedGame(parsed,input);if(!game)return fail("Оюндун жооптору же түзүлүшү текшерүүдөн өткөн жок. Текст тарыхта сакталды.");
 const {data:lesson,error:saveError}=await supabase.from("lessons").insert({author_id:profile.id,title:game.title,grade:input.grade,topic:input.topic,content:game.content,status:"draft"}).select("id").single();
 if(saveError||!lesson)return fail("Оюн сакталган жок. ЖИ жообу тарыхта сакталды.");
 const {error:linked}=await update({status:"ready",lesson_id:lesson.id});revalidatePath("/teacher/games");revalidatePath("/teacher/lessons");
 return {lessonId:lesson.id,generationId:gid,...(linked?{warning:"Оюн сакталды, бирок тарыхтагы шилтемеси жаңырган жок."}:{})};
 }catch{return fail("ЖИ менен байланыш үзүлдү. Кийин кайра аракет кылыңыз.");}
}
