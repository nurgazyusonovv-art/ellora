"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LIBRARY } from "@/content";
import { makeJoinCode, requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkStructure, DURATION_OPTIONS, DEFAULT_DURATION, emptyLesson, validateLesson } from "@/lib/lesson-edit";
import { isGrade } from "@/lib/grades";
import type { LessonContent } from "@/lib/lesson-types";
import type { FormState } from "./auth";

export async function createClass(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, profile } = await requireRole("teacher");
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Класстын атын жазыңыз, мисалы 8-Б." };
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from("classes")
      .insert({ teacher_id: profile.id, name, join_code: makeJoinCode() })
      .select("id")
      .single();
    if (data) {
      revalidatePath("/teacher");
      redirect(`/teacher/classes/${data.id}`);
    }
    if (error && error.code !== "23505") return { error: error.message };
  }
  return { error: "Класс түзүлгөн жок, кайра аракет кылыңыз." };
}

export async function addLibraryLesson(slug: string) {
  const { supabase, profile } = await requireRole("teacher");
  const item = LIBRARY.find((l) => l.slug === slug);
  if (!item) return;
  const { data } = await supabase
    .from("lessons")
    .insert({
      author_id: profile.id,
      title: item.title,
      grade: item.grade,
      topic: item.topic,
      content: item.content,
      status: "published",
    })
    .select("id")
    .single();
  revalidatePath("/teacher/lessons");
  if (data) redirect(`/teacher/lessons/${data.id}`);
}

export async function assignLesson(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireRole("teacher");
  const lesson_id = String(fd.get("lesson_id") ?? "");
  const class_id = String(fd.get("class_id") ?? "");
  const due = String(fd.get("due_at") ?? "");
  if (!class_id) return { error: "Классты тандаңыз." };
  const { data: lesson } = await supabase.from("lessons").select("status").eq("id", lesson_id).maybeSingle();
  if (lesson?.status !== "published") return { error: "Адегенде сабакты жарыялаңыз (конструктордо «Жарыялоо»)." };
  const { data, error } = await supabase
    .from("assignments")
    .insert({ lesson_id, class_id, due_at: due ? new Date(`${due}T23:59:00+06:00`).toISOString() : null })
    .select("id")
    .single();
  if (error || !data) return { error: "Сабак жөнөтүлгөн жок: " + (error?.message ?? "") };
  revalidatePath("/teacher");
  redirect(`/teacher/assignments/${data.id}`);
}

/** Окуучу сырсөзүн унутса, мугалим жаңысын коёт. Окуучу мугалимдин классында болушу керек. */
export async function resetStudentPassword(_: FormState, fd: FormData): Promise<FormState & { ok?: string }> {
  const { supabase } = await requireRole("teacher");
  const student_id = String(fd.get("student_id") ?? "");
  const password = String(fd.get("password") ?? "");
  if (password.length < 6) return { error: "Жаңы сырсөз кеминде 6 белги болсун." };
  // RLS: мугалим өз класстарындагы окуучулардын профилин гана көрө алат.
  const { data: student } = await supabase.from("profiles").select("id, username").eq("id", student_id).eq("role", "student").maybeSingle();
  if (!student) return { error: "Окуучу табылган жок." };
  const { error } = await createAdminClient().auth.admin.updateUserById(student.id, { password });
  if (error) return { error: error.message };
  return { ok: `${student.username} үчүн жаңы сырсөз коюлду.` };
}

export async function removeStudent(classId: string, studentId: string) {
  const { supabase } = await requireRole("teacher");
  await supabase.from("class_members").delete().eq("class_id", classId).eq("student_id", studentId);
  revalidatePath(`/teacher/classes/${classId}`);
}

/* ─────────────────────────── Сабак конструктору ─────────────────────────── */

function parseGrade(v: FormDataEntryValue | null) {
  const n = Number(String(v ?? "").trim());
  return isGrade(n) ? n : null;
}

export async function createLesson(_: FormState, fd: FormData): Promise<FormState> {
  const { supabase, profile } = await requireRole("teacher");
  const title = String(fd.get("title") ?? "").trim();
  if (!title) return { error: "Сабактын атын жазыңыз." };
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      author_id: profile.id,
      title,
      grade: parseGrade(fd.get("grade")),
      topic: String(fd.get("topic") ?? "").trim() || null,
      content: emptyLesson(DURATION_OPTIONS.includes(Number(fd.get("duration"))) ? Number(fd.get("duration")) : DEFAULT_DURATION),
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Сабак түзүлгөн жок: " + (error?.message ?? "") };
  revalidatePath("/teacher/lessons");
  redirect(`/teacher/lessons/${data.id}/edit`);
}

export type LessonDraft = { title: string; grade: number | null; topic: string; content: LessonContent };
export type SaveResult = { error?: string; savedAt?: string };

/** Конструктордун автосактоосу. Жарыяланган сабак толук текшерүүдөн өтпөсө сакталбайт. */
export async function saveLesson(id: string, draft: LessonDraft): Promise<SaveResult> {
  const { supabase } = await requireRole("teacher");
  const bad = checkStructure(draft.content);
  if (bad) return { error: bad };
  const { data: cur } = await supabase.from("lessons").select("status").eq("id", id).maybeSingle();
  if (!cur) return { error: "Сабак табылган жок." };
  if (cur.status === "published") {
    const issues = validateLesson(draft.title, draft.content);
    if (issues.length) return { error: `Сабак жарыяланган, ошондуктан ${issues.length} ката оңдолмоюнча сакталбайт.` };
  }
  const updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from("lessons")
    .update({
      title: draft.title.trim() || "Аталышы жок сабак",
      grade: isGrade(draft.grade) ? draft.grade : null,
      topic: draft.topic.trim() || null,
      content: draft.content,
      updated_at,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Сакталган жок: " + (error?.message ?? "укук жок") };
  return { savedAt: updated_at };
}

export async function publishLesson(id: string): Promise<SaveResult> {
  const { supabase } = await requireRole("teacher");
  const { data: lesson } = await supabase.from("lessons").select("title, content").eq("id", id).maybeSingle();
  if (!lesson) return { error: "Сабак табылган жок." };
  const issues = validateLesson(lesson.title, lesson.content as LessonContent);
  if (issues.length) return { error: `Жарыялоого чейин ${issues.length} катаны оңдоңуз.` };
  const { error } = await supabase.from("lessons").update({ status: "published" }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/teacher/lessons");
  revalidatePath(`/teacher/lessons/${id}`);
  return {};
}

export async function duplicateLesson(id: string) {
  const { supabase, profile } = await requireRole("teacher");
  const { data: src } = await supabase.from("lessons").select("title, grade, topic, content").eq("id", id).maybeSingle();
  if (!src) return;
  const { data } = await supabase
    .from("lessons")
    .insert({ author_id: profile.id, title: `${src.title} (көчүрмө)`, grade: src.grade, topic: src.topic, content: src.content, status: "draft" })
    .select("id")
    .single();
  revalidatePath("/teacher/lessons");
  if (data) redirect(`/teacher/lessons/${data.id}/edit`);
}

/** Сабакты өчүрөт. Ага байланган тапшырмалар жана окуучулардын жооптору да өчөт (on delete cascade). */
export async function deleteLesson(id: string) {
  const { supabase, profile } = await requireRole("teacher");
  await supabase.from("lessons").delete().eq("id", id).eq("author_id", profile.id);
  revalidatePath("/teacher/lessons");
  revalidatePath("/teacher");
}

/* ─────────────────────────── Тапшырманы башкаруу ─────────────────────────── */

/** Мөөнөттү өзгөртөт (бош — мөөнөтсүз). RLS: мугалим өз классынын тапшырмасын гана өзгөртөт. */
export async function updateAssignmentDue(
  id: string,
  _: (FormState & { ok?: string }) | undefined,
  fd: FormData,
): Promise<FormState & { ok?: string }> {
  const { supabase } = await requireRole("teacher");
  const due = String(fd.get("due_at") ?? "").trim();
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "Датаны туура жазыңыз." };
  const { data, error } = await supabase
    .from("assignments")
    .update({ due_at: due ? new Date(`${due}T23:59:00+06:00`).toISOString() : null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Мөөнөт өзгөргөн жок." };
  revalidatePath(`/teacher/assignments/${id}`);
  revalidatePath("/teacher");
  return { ok: due ? "Мөөнөт сакталды." : "Мөөнөт алынды." };
}

/** Тапшырманы өчүрөт. Окуучулардын бул тапшырма боюнча аракеттери жана жооптору да өчөт (on delete cascade). */
export async function deleteAssignment(id: string, classId: string) {
  const { supabase } = await requireRole("teacher");
  await supabase.from("assignments").delete().eq("id", id);
  revalidatePath("/teacher");
  revalidatePath(`/teacher/classes/${classId}`);
  redirect(`/teacher/classes/${classId}`);
}

/** Класстык рейтингди окуучуларга көрсөтүү/жашыруу (0006). */
export async function setLeaderboardVisible(classId: string, visible: boolean) {
  const { supabase } = await requireRole("teacher");
  await supabase.from("classes").update({ show_leaderboard: visible }).eq("id", classId);
  revalidatePath(`/teacher/classes/${classId}`);
}
