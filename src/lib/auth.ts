import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  role: "teacher" | "student";
  full_name: string;
  username: string | null;
  school: string | null;
  /** Платформанын админи (0007). Миграция иштетилгенге чейин — жок. */
  is_admin?: boolean;
};

/** Кирген колдонуучу жана анын профили (бир сурамда бир жолу гана окулат). */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  return { supabase, user, profile };
});

export async function requireRole(role: Profile["role"]) {
  const s = await getSession();
  if (!s.user || !s.profile) redirect(role === "teacher" ? "/login" : "/student-login");
  if (s.profile.role !== role) redirect(s.profile.role === "teacher" ? "/teacher" : "/student");
  return s as typeof s & { profile: Profile };
}

/**
 * Админ панели үчүн. Белги колдонуучунун өз сессиясы менен окулат (RLS: өз профили);
 * ушул текшерүүдөн кийин гана admin клиент менен бардык маалыматты окууга болот.
 */
export async function requireAdmin() {
  const s = await getSession();
  if (!s.user || !s.profile) redirect("/login");
  if (s.profile.is_admin !== true) redirect(s.profile.role === "teacher" ? "/teacher" : "/student");
  return s as typeof s & { profile: Profile };
}

/** Окуучунун логини → Supabase Auth үчүн ички email. Окуучуларга email талап кылынбайт. */
export const STUDENT_EMAIL_DOMAIN = "students.ellora.local";
export const studentEmail = (username: string) => `${username.toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y", к: "k",
  л: "l", м: "m", н: "n", ң: "ng", о: "o", ө: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ү: "u",
  ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** «Айбек Маратов» → «aibek» + 3 сан. */
export function makeUsername(fullName: string) {
  const first = fullName.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const latin = [...first].map((ch) => TRANSLIT[ch] ?? ch).join("").replace(/[^a-z0-9]/g, "");
  const base = (latin || "okuuchu").slice(0, 12);
  const n = Math.floor(100 + Math.random() * 900);
  return `${base}${n}`;
}

/** Класс коду: окшош тамгаларсыз (0/O, 1/I) 6 белги. */
export function makeJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return s;
}
