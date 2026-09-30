import "server-only";
import type { AdminData } from "@/lib/admin-stats";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Платформанын бардык маалыматы. RLS'ти айланып өтөт — `requireAdmin()` текшерүүсүнөн кийин гана чакырыңыз.
 * Эскертүү: Supabase бир суроодо демейки 1000 сапка чейин кайтарат — платформа чоңойгондо
 * бул жерде барактоо же SQL агрегаттары керек болот.
 */
export async function loadAdminData(): Promise<AdminData> {
  const admin = createAdminClient();
  const [profiles, classes, members, lessons, assignments, attempts, users] = await Promise.all([
    admin.from("profiles").select("*").order("created_at", { ascending: false }),
    admin.from("classes").select("id, name, teacher_id, join_code, created_at"),
    admin.from("class_members").select("class_id, student_id"),
    admin.from("lessons").select("id, author_id, status"),
    admin.from("assignments").select("id, class_id, created_at"),
    admin.from("attempts").select("assignment_id, student_id, xp, exit_score, exit_total, started_at, finished_at"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  return {
    profiles: (profiles.data ?? []) as AdminData["profiles"],
    classes: (classes.data ?? []) as AdminData["classes"],
    members: (members.data ?? []) as AdminData["members"],
    lessons: (lessons.data ?? []) as AdminData["lessons"],
    assignments: (assignments.data ?? []) as AdminData["assignments"],
    attempts: (attempts.data ?? []) as AdminData["attempts"],
    users: (users.data?.users ?? []).map((u) => ({ id: u.id, email: u.email ?? null, last_sign_in_at: u.last_sign_in_at ?? null })),
  };
}
