"use server";
import { illustrateSlides } from "@/lib/slide-illustrations";
import { checkStructure } from "@/lib/lesson-edit";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generationInput, generatedLesson, LESSON_GENERATION_INSTRUCTIONS, lessonGenerationSchema } from "@/lib/lesson-generator";
import type { LessonContent } from "@/lib/lesson-types";
import {KTP_TEMPLATES,checkKtpSections} from "@/content/ktp";
import { ktpTopicContext,lessonSeries, previousLessonBrief, repeatsSeriesTask } from "@/lib/lesson-series";
export type LessonAiState = { error?: string; lessonId?: string; generationId?: string; warning?: string };

export async function generateLesson(_: LessonAiState, fd: FormData): Promise<LessonAiState> {
 const {supabase,profile} = await requireRole("teacher");
 const input = generationInput(fd);
 if (!input) return {error:"Теманы, классты, убакытты жана топтун өлчөмүн туура толтуруңуз."};
 const sessionId=String(fd.get("sessionId") ?? "");
 const {data:plan,error:planError}=await supabase.from("ktp_plans").select("sections").eq("teacher_id",profile.id).eq("grade",input.grade).maybeSingle();
 if(planError||(plan&&checkKtpSections(plan.sections)))return {error:"КТПни жүктөө мүмкүн болгон жок. Планды текшерип кайра аракет кылыңыз."};
 const curriculum=ktpTopicContext(plan?.sections??KTP_TEMPLATES[input.grade]?.sections,input.topic,sessionId||undefined);
 if(curriculum)input.curriculum=curriculum;
 let series: ReturnType<typeof lessonSeries> = null;
 if(sessionId) {
  if(sessionId.length>100) return {error:"КТПдеги сабакты кайра тандаңыз."};
  if(!plan || !(series=lessonSeries(plan.sections,input.topic,sessionId))) return {error:"Серия табылган жок же планы толук эмес. КТПде ар сабактын аталышын, максатын жана жыйынтыгын толтуруп сактаңыз."};
 }
 const previousContents: LessonContent[]=[];
 const actualPrevious: ReturnType<typeof previousLessonBrief>[]=[];
 if(series) {
  const {data:history,error}=await supabase.from("ai_lesson_generations").select("id,input,status,lesson_id").eq("teacher_id",profile.id).contains("input",{grade:input.grade,series:{topicId:series.topicId}}).order("created_at",{ascending:false}).limit(101);
  if(error || !history || history.length>100) return {error:"Сериянын тарыхын текшерүү мүмкүн болгон жок. Кийин кайра аракет кылыңыз."};
  const existing=history.find(h=>(h.input as {series?:{sessionId?:string}})?.series?.sessionId===sessionId && (h.lesson_id || h.status==="pending"));
  if(existing) return {error:existing.lesson_id?"Бул орунга долбоор мурда түзүлгөн. Аны ачып түзөтүңүз.":"Бул сабактын сурамы мурда башталган. Натыйжасын тарыхтан текшериңиз.",generationId:existing.id,lessonId:existing.lesson_id ?? undefined};
  const previousIds=new Set(series.previous.map(s=>s.sessionId));
  const ids=[...new Set(history.filter(h=>previousIds.has((h.input as {series?:{sessionId?:string}})?.series?.sessionId ?? "")).map(h=>h.lesson_id).filter((id):id is string=>typeof id==="string"))];
  if(ids.length) {
   const {data:lessons,error:readError}=await supabase.from("lessons").select("id,title,content").eq("author_id",profile.id).in("id",ids);
   if(readError || !lessons || lessons.length!==ids.length) return {error:"Мурунку сабактардын мазмуну толук жүктөлгөн жок."};
   for(const lesson of lessons) {previousContents.push(lesson.content as LessonContent);actualPrevious.push(previousLessonBrief(lesson.title,lesson.content as LessonContent));}
  }
 }
 const requestInput=series ? {...input,series,actualPrevious} : input;
 // RPCнин 12000 байт чегине jsonb форматтоосунун боштуктары үчүн да орун калтырабыз.
 if(new TextEncoder().encode(JSON.stringify(requestInput)).length>10000) return {error:"Сериянын контексти өтө чоң. Максаттарды жана тапшырмаларды кыскартыңыз."};
 const key=process.env.OPENAI_API_KEY;
 if (!key) return {error:"ЖИ кызматы азырынча туташтырылган эмес."};
 const model=process.env.OPENAI_LESSON_MODEL || "gpt-4.1";
 const {data:gid,error:reserveError}=await supabase.rpc("reserve_lesson_generation",{p_input:requestInput,p_model:model});
 if (reserveError) return {error:"ЖИ менен сабак түзүү жеткиликтүү эмес. 0009 база жаңыртуусун текшериңиз."};
 if (typeof gid!=="string") return {error:"30 секунд күтө туруңуз. Бир күндө 10 сабак долбоорун түзүүгө болот."};
 // RPC учурдагы мугалимге жазууну түзөт; кадимки клиент аркылуу ээликти кайра текшеребиз.
 const {data:owned}=await supabase.from("ai_lesson_generations").select("id").eq("id",gid).eq("teacher_id",profile.id).maybeSingle();
 if (!owned) return {error:"ЖИ долбоору табылган жок."};
 const admin=createAdminClient();
 const update=async(patch:Record<string,unknown>)=>admin.from("ai_lesson_generations").update(patch).eq("id",gid).eq("teacher_id",profile.id);
 const fail=async(message:string):Promise<LessonAiState>=>{await update({status:"failed",error:message});return {error:message,generationId:gid};};
 try {
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},signal:AbortSignal.timeout(90000),body:JSON.stringify({model,store:false,max_output_tokens:8500,instructions:LESSON_GENERATION_INSTRUCTIONS,input:JSON.stringify(requestInput),text:{format:{type:"json_schema",name:"five_e_lesson",strict:true,schema:lessonGenerationSchema(input.groupSize, input.interactive, input.mission, input.spreadsheet, input.classification)}}})});
  if (!response.ok) return fail("ЖИ сабак түзө алган жок. Кийин кайра аракет кылыңыз.");
  const data=await response.json() as {status?:string;usage?:{input_tokens:number;output_tokens:number};output?:{type:string;content?:{type:string;text?:string}[]}[]};
  const raw=data.output?.filter(x=>x.type==="message").flatMap(x=>x.content??[]).filter(x=>x.type==="output_text").map(x=>x.text??"").join("")??"";
  // Жоопту текшерүүгө чейин сактайбыз: ката болсо да түзүлгөн текст жоголбойт.
  const {error:saved}=await update({result:raw,input_tokens:data.usage?.input_tokens??null,output_tokens:data.usage?.output_tokens??null});
  if(saved) return {error:"ЖИ жообу сакталган жок. Кайра түзүүдөн мурда тарыхты текшериңиз.",generationId:gid};
  if(data.status!=="completed") return fail("ЖИ толук сабак бере алган жок. Түзүлгөн текст тарыхта сакталды.");
  let parsed:unknown;try{parsed=JSON.parse(raw);}catch{return fail("ЖИ жообунун форматы туура эмес. Текст тарыхта сакталды.");}
  const lesson=generatedLesson(parsed,input);
  if(!lesson) return fail("ЖИ сабагы 5E текшерүүсүнөн өткөн жок. Текст тарыхта сакталды; кайра түзүп көрүңүз.");
  if(repeatsSeriesTask(lesson.content,previousContents)) return fail("ЖИ мурдагы сабактын тапшырмасын кайталады. Долбоор сакталган жок; текст тарыхта калды.");
  let warning: string | undefined;
  {
   const deck=lesson.content.stages[2].blocks.find(b=>b.type==="presentation");
   if(deck?.type==="presentation") {
    const illustrated=await illustrateSlides(deck.slides,input.topic,input.grade,key);
    deck.slides=illustrated.slides;
    if(illustrated.missing) warning=`Презентация сакталды. ${illustrated.created}/${deck.slides.length} иллюстрация түзүлдү; калган слайддарда схема бар. Сүрөт кызматынын уруксатын жана балансын текшериңиз.`;
    lesson.content.teacherNotes=[lesson.content.teacherNotes,`Иллюстрациялар: ${illustrated.created}/${deck.slides.length}. ЖИ сүрөттөрүнүн темага тууралыгын жарыялоодон мурда текшериңиз.`].filter(Boolean).join("\n");
   }
  }
  if(checkStructure(lesson.content)) return fail("Сүрөттөр кошулган сабактын көлөмү туура эмес. Текст тарыхта сакталды.");
  const {data:record,error}=await supabase.from("lessons").insert({author_id:profile.id,title:lesson.title,grade:input.grade,topic:input.topic,content:lesson.content,status:"draft"}).select("id").single();
  if(error||!record) return fail("Сабак сакталган жок. ЖИ жообу тарыхта сакталды.");
  const {error:linked}=await update({status:"ready",lesson_id:record.id,...(warning?{error:warning}:{})});
  revalidatePath("/teacher/lessons");
  return linked?{lessonId:record.id,generationId:gid,error:"Сабак сакталды, бирок тарыхтагы шилтемеси жаңыртылган жок."}:{lessonId:record.id,generationId:gid,...(warning?{warning}:{})};
 }catch{return fail("ЖИ менен байланыш үзүлдү. Кийин кайра аракет кылыңыз.");}
}
