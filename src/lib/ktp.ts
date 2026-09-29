import { KTP_TEMPLATES, type Ktp } from "@/content/ktp";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type KtpPlan = Ktp & { id: string };

export async function getTeacherPlans(supabase: Supabase): Promise<KtpPlan[]> {
  const { data } = await supabase.from("ktp_plans").select("id, grade, year, source, sections").order("grade");
  return (data ?? []).map((p) => ({ id: p.id, grade: p.grade, year: p.year ?? "", source: p.source ?? undefined, sections: p.sections ?? [] }));
}

/** Тема тандоо үчүн: мугалимдин өз планы, жок болсо — үлгү. */
export async function getPickerPlans(supabase: Supabase): Promise<Record<number, Ktp>> {
  const out: Record<number, Ktp> = { ...KTP_TEMPLATES };
  for (const p of await getTeacherPlans(supabase)) out[p.grade] = p;
  return out;
}
