"use server";

import { requireRole } from "@/lib/auth";
import { lessonContent } from "@/lib/student-lessons";
import { findBlock } from "@/lib/grading";
import { tutorContext, tutorQuestion, TUTOR_INSTRUCTIONS } from "@/lib/ai-tutor";

export type TutorState = { error?: string; question?: string };

export async function askTutor(_: TutorState, fd: FormData): Promise<TutorState> {
  const { supabase, profile } = await requireRole("student");
  const thought = String(fd.get("thought") ?? "").trim();
  if (thought.length < 2 || thought.length > 1000) return { error: "Өз оюңду 2–1000 белги менен жаз." };
  const { data: attempt } = await supabase.from("attempts").select("assignment_id, current_stage, finished_at").eq("id", String(fd.get("attemptId"))).eq("student_id", profile.id).maybeSingle();
  if (!attempt || attempt.finished_at) return { error: "Жардамчы жүрүп жаткан сабакта гана жеткиликтүү." };
  const { data: assignment } = await supabase.from("assignments").select("lesson_id").eq("id", attempt.assignment_id).maybeSingle();
  if (!assignment) return { error: "Сабак табылган жок." };
  const lesson = await lessonContent(assignment.lesson_id);
  const found = lesson && findBlock(lesson.content, String(fd.get("blockId")));
  if (!lesson || !found || found.stageIdx > attempt.current_stage || found.block.type === "text" || found.block.type === "code_example") return { error: "Тапшырма жеткиликтүү эмес." };
  if (lesson.content.stages[found.stageIdx].key === "exit") return { error: "Баалоодо өз алдынча жооп бер. AI-жардамчы бул бөлүктө өчүрүлгөн." };
  const { data: live, error: sessionError } = await supabase.from("lesson_sessions").select("max_stage, paused").eq("assignment_id", attempt.assignment_id).maybeSingle();
  if (sessionError) return { error: "Жардамчы азыр жеткиликтүү эмес. Мугалимге кайрыл." };
  if (live && (live.paused || found.stageIdx > live.max_stage)) return { error: "Мугалим бул бөлүктү азырынча ачкан жок." };
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { error: "AI-жардамчы азырынча туташтырылган эмес. Мугалимге кайрыл." };
  const { data: allowed, error } = await supabase.rpc("reserve_ai_request");
  if (error) return { error: "AI-жардамчы азыр жеткиликтүү эмес. Мугалимге кайрыл." };
  if (!allowed) return { error: "Бир аз күтө тур. Күнүнө 30га чейин суроо берүүгө болот." };
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model: process.env.OPENAI_TUTOR_MODEL || "gpt-4.1-mini", store: false, max_output_tokens: 300,
        instructions: TUTOR_INSTRUCTIONS,
        input: JSON.stringify({ ...tutorContext(lesson.content, lesson.content.stages[found.stageIdx].key, found.block), thought }),
        text: { format: { type: "json_schema", name: "guiding_question", strict: true, schema: { type: "object", properties: { question: { type: "string" } }, required: ["question"], additionalProperties: false } } },
      }),
    });
    if (!response.ok) return { error: "Жардамчы жооп бере алган жок. Кийин кайра аракет кыл." };
    const data = await response.json() as { output?: { type: string; content?: { type: string; text?: string }[] }[] };
    const text = data.output?.filter(x => x.type === "message").flatMap(x => x.content ?? []).filter(x => x.type === "output_text").map(x => x.text ?? "").join("");
    const question = text && tutorQuestion(JSON.parse(text));
    return question ? { question } : { error: "Жардамчынын жообу ылайыктуу болгон жок. Оюңду тактап кайра сура." };
  } catch {
    return { error: "Жардамчы менен байланыш үзүлдү. Кийин кайра аракет кыл." };
  }
}
