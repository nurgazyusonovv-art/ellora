"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { findBlock } from "@/lib/grading";
import type { LessonContent } from "@/lib/lesson-types";
import { reviewCriteria } from "@/lib/classroom";
export type ClassroomState = { error?: string; success?: string };

export async function controlSession(_: ClassroomState, fd: FormData): Promise<ClassroomState> {
  const { supabase, profile } = await requireRole("teacher");
  const id = String(fd.get("assignmentId"));
  const { data: assignment } = await supabase.from("assignments").select("class_id").eq("id", id).maybeSingle();
  const { data: classroom } = assignment ? await supabase.from("classes").select("id").eq("id", assignment.class_id).eq("teacher_id", profile.id).maybeSingle() : { data: null };
  if (!classroom) return { error: "Тапшырма табылган жок." };
  const mode = fd.get("mode");
  if (mode === "independent") {
    const { error } = await supabase.from("lesson_sessions").delete().eq("assignment_id", id);
    if (error) return { error: "Сессия сакталган жок. База жаңыртылганын текшериңиз." };
  } else {
    const max = Number(fd.get("maxStage"));
    if (!Number.isInteger(max) || max < 0 || max > 4 || mode !== "live") return { error: "Бөлүк туура эмес тандалды." };
    const { error } = await supabase.from("lesson_sessions").upsert({ assignment_id: id, max_stage: max, paused: fd.get("paused") === "true", updated_at: new Date().toISOString() });
    if (error) return { error: "Сессия сакталган жок. База жаңыртылганын текшериңиз." };
  }
  revalidatePath(`/teacher/assignments/${id}`);
  revalidatePath(`/student/assignments/${id}`);
  return { success: "Сабак режими жаңыртылды." };
}

export async function reviewAnswer(_: ClassroomState, fd: FormData): Promise<ClassroomState> {
  const { supabase, profile } = await requireRole("teacher");
  const attemptId = String(fd.get("attemptId"));
  const blockId = String(fd.get("blockId"));
  const { data: attempt } = await supabase.from("attempts").select("assignment_id").eq("id", attemptId).maybeSingle();
  const { data: assignment } = attempt ? await supabase.from("assignments").select("class_id, lessons(content)").eq("id", attempt.assignment_id).maybeSingle<{ class_id: string; lessons: { content: LessonContent } | null }>() : { data: null };
  const { data: classroom } = assignment ? await supabase.from("classes").select("id").eq("id", assignment.class_id).eq("teacher_id", profile.id).maybeSingle() : { data: null };
  if (!classroom || !assignment?.lessons) return { error: "Жооп табылган жок." };
  const block = findBlock(assignment.lessons.content, blockId)?.block;
  if (block?.type !== "open" || !block.rubric?.length) return { error: "Бул тапшырмада баалоо критерийи жок." };
  const { data: answer } = await supabase.from("answers").select("block_id").eq("attempt_id", attemptId).eq("block_id", blockId).maybeSingle();
  if (!answer) return { error: "Окуучу бул суроого жооп бере элек." };
  const criteria = reviewCriteria(fd.get("criteria"), block.rubric.length);
  const feedback = String(fd.get("feedback") ?? "").trim();
  if (!criteria || !feedback || feedback.length > 2000) return { error: "Критерийлерди текшерип, 2000 белгиге чейин пикир жазыңыз." };
  const { error } = await supabase.from("answer_reviews").upsert({ attempt_id: attemptId, block_id: blockId, teacher_id: profile.id, criteria_met: criteria, feedback, updated_at: new Date().toISOString() });
  if (error) return { error: "Баа сакталган жок. База жаңыртылганын текшериңиз." };
  revalidatePath(`/teacher/assignments/${attempt!.assignment_id}`);
  revalidatePath(`/student/assignments/${attempt!.assignment_id}`);
  return { success: "Баалоо жана пикир сакталды." };
}
