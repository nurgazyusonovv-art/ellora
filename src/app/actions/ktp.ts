"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkKtpSections, KTP_TEMPLATES, type KtpSection } from "@/content/ktp";
import { requireRole } from "@/lib/auth";

export type KtpSaveResult = { error?: string; savedAt?: string };

const validGrade = (g: number) => Number.isInteger(g) && g >= 1 && g <= 11;

/** Мугалимдин КТП'син сактайт. Биринчи сактоодо көчүрмө түзүлөт (класс боюнча бирөө). */
export async function saveKtp(grade: number, draft: { year: string; sections: KtpSection[] }): Promise<KtpSaveResult> {
  const { supabase, profile } = await requireRole("teacher");
  if (!validGrade(grade)) return { error: "Класс туура эмес." };
  const bad = checkKtpSections(draft.sections);
  if (bad) return { error: bad };
  const updated_at = new Date().toISOString();
  const { error } = await supabase.from("ktp_plans").upsert(
    {
      teacher_id: profile.id,
      grade,
      year: draft.year.trim() || null,
      source: KTP_TEMPLATES[grade]?.source ?? null,
      sections: draft.sections,
      updated_at,
    },
    { onConflict: "teacher_id,grade" },
  );
  if (error)
    return {
      error:
        error.code === "PGRST205" || error.code === "42P01"
          ? "КТП таблицасы жок — Supabase'те 0002_ktp_plans.sql миграциясын иштетиңиз."
          : "Сакталган жок: " + error.message,
    };
  // revalidatePath жок: автосактоо учурунда барак кайра жүктөлүп, редактор фокусун жоготпосун (беттер динамикалык).
  return { savedAt: updated_at };
}

/** Мугалимдин көчүрмөсүн өчүрөт — класс үчүн кайра үлгү (же бош план) көрсөтүлөт. */
export async function deleteKtp(grade: number) {
  const { supabase, profile } = await requireRole("teacher");
  await supabase.from("ktp_plans").delete().eq("teacher_id", profile.id).eq("grade", grade);
  revalidatePath("/teacher/ktp");
  redirect(`/teacher/ktp?grade=${grade}`);
}
