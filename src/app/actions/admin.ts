"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Мугалимге админ укугун берүү/алуу. Өзүнөн ала албайт — панелге эч ким кире албай калбасын. */
export async function setAdmin(userId: string, value: boolean) {
  const { profile } = await requireAdmin();
  if (userId === profile.id && !value) return;
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (target?.role !== "teacher") return; // окуучу админ боло албайт
  await admin.from("profiles").update({ is_admin: value }).eq("id", userId);
  revalidatePath("/admin/teachers");
}

/** Окуучунун сырсөзүн жаңылоо (мугалими жеткиликсиз болгон учурда жардам берүү үчүн). */
export async function adminResetStudentPassword(_: (FormState & { ok?: string }) | undefined, fd: FormData): Promise<FormState & { ok?: string }> {
  await requireAdmin();
  const studentId = String(fd.get("student_id") ?? "");
  const password = String(fd.get("password") ?? "");
  if (password.length < 6) return { error: "Жаңы сырсөз кеминде 6 белги болсун." };
  const admin = createAdminClient();
  const { data: student } = await admin.from("profiles").select("id, username").eq("id", studentId).eq("role", "student").maybeSingle();
  if (!student) return { error: "Окуучу табылган жок." };
  const { error } = await admin.auth.admin.updateUserById(student.id, { password });
  if (error) return { error: error.message };
  return { ok: `${student.username} үчүн жаңы сырсөз коюлду.` };
}
