"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LIBRARY } from "@/content/python-if";
import { makeJoinCode, requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
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
