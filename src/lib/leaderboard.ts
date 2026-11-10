import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { lessonStars } from "@/lib/grading";
import { addDays, bishkekDay } from "@/lib/review";

export type LeaderboardMode = "weekly" | "xp" | "off";
/** 0023 жок болсо: мурунку show_leaderboard боюнча (false → жашыруу, болбосо XP). */
export function boardMode(c: { leaderboard_mode?: string | null; show_leaderboard?: boolean | null }): LeaderboardMode {
  if (c.leaderboard_mode === "weekly" || c.leaderboard_mode === "xp" || c.leaderboard_mode === "off") return c.leaderboard_mode;
  return c.show_leaderboard === false ? "off" : "xp";
}

/**
 * Апталык упай (4-этап): акыркы 7 күндө бүткөн сабактардын жылдыздары + аткарылган күнүмдүк кайталоолор.
 * Ар жума баары кайра башташат; упай сапат (жылдыз) жана туруктуулук (кайталоо) үчүн, көлөм үчүн эмес.
 */
export function weeklyPoints(
  attempts: { student_id: string; finished_at: string | null; exit_score: number | null; exit_total: number | null }[],
  reviews: { student_id: string; day: string; completed_at: string | null }[],
  studentId: string,
  since: string,
) {
  const mine = attempts.filter((t) => t.student_id === studentId && t.finished_at && bishkekDay(new Date(t.finished_at)) >= since);
  const stars = mine.reduce((n, t) => n + lessonStars(t.exit_score ?? 0, t.exit_total ?? 0), 0);
  const days = reviews.filter((r) => r.student_id === studentId && r.completed_at && r.day >= since).length;
  return { points: stars + days, finished: mine.length };
}

/** Апталык рейтинг. Чакыруудан мурун колдонуучунун бул класска тиешеси бар экенин кадимки клиент менен текшериңиз. */
export async function weeklyLeaderboard(classId: string): Promise<LeaderRow[]> {
  const admin = createAdminClient();
  const since = addDays(bishkekDay(), -6);
  const [{ data: members }, { data: assignments }] = await Promise.all([
    admin.from("class_members").select("student_id, profiles(full_name)").eq("class_id", classId).returns<{ student_id: string; profiles: { full_name: string } | null }[]>(),
    admin.from("assignments").select("id").eq("class_id", classId),
  ]);
  const ids = (assignments ?? []).map((a) => a.id as string);
  const studentIds = (members ?? []).map((m) => m.student_id);
  const [{ data: attempts }, reviewsRes] = await Promise.all([
    ids.length
      ? admin.from("attempts").select("student_id, finished_at, exit_score, exit_total").in("assignment_id", ids).gte("finished_at", `${since}T00:00:00+06:00`)
      : Promise.resolve({ data: [] as { student_id: string; finished_at: string | null; exit_score: number | null; exit_total: number | null }[] }),
    studentIds.length
      ? admin.from("review_days").select("student_id, day, completed_at").in("student_id", studentIds).gte("day", since)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const reviews = "error" in reviewsRes && reviewsRes.error ? [] : (reviewsRes.data ?? []); // 0022 жок болсо — кайталоосуз
  const rows = (members ?? []).map((m) => {
    const w = weeklyPoints(attempts ?? [], reviews as { student_id: string; day: string; completed_at: string | null }[], m.student_id, since);
    return { id: m.student_id, name: m.profiles?.full_name ?? "Окуучу", xp: w.points, finished: w.finished, rank: 0 };
  });
  return rankRows(rows);
}

export type LeaderRow = { id: string; name: string; xp: number; finished: number; rank: number };

/**
 * Класстын рейтинги: XP (бааланган тапшырмалар + exit ticket бонусу), андан кийин бүткөн сабактар.
 * Окуучу башкалардын аракеттерин RLS аркылуу көрбөйт — ошондуктан admin. Чакыруудан мурун
 * колдонуучунун бул класска тиешеси бар экенин кадимки клиент менен текшериңиз.
 */
export async function classLeaderboard(classId: string): Promise<LeaderRow[]> {
  const admin = createAdminClient();
  const [{ data: members }, { data: assignments }] = await Promise.all([
    admin.from("class_members").select("student_id, profiles(full_name)").eq("class_id", classId).returns<{ student_id: string; profiles: { full_name: string } | null }[]>(),
    admin.from("assignments").select("id").eq("class_id", classId),
  ]);
  const ids = (assignments ?? []).map((a) => a.id as string);
  const { data: attempts } = ids.length
    ? await admin.from("attempts").select("student_id, xp, finished_at").in("assignment_id", ids)
    : { data: [] as { student_id: string; xp: number; finished_at: string | null }[] };

  const rows = (members ?? []).map((m) => {
    const mine = (attempts ?? []).filter((t) => t.student_id === m.student_id);
    return {
      id: m.student_id,
      name: m.profiles?.full_name ?? "Окуучу",
      xp: mine.reduce((s, t) => s + (t.xp ?? 0), 0),
      finished: mine.filter((t) => t.finished_at).length,
      rank: 0,
    };
  });
  return rankRows(rows);
}

/** XP, андан кийин бүткөн сабактар боюнча; бирдей болсо — бирдей орун (1, 2, 2, 4). */
export function rankRows(rows: LeaderRow[]): LeaderRow[] {
  const out = [...rows].sort((a, b) => b.xp - a.xp || b.finished - a.finished || a.name.localeCompare(b.name, "ky"));
  out.forEach((r, i) => {
    const prev = out[i - 1];
    r.rank = prev && prev.xp === r.xp && prev.finished === r.finished ? prev.rank : i + 1;
  });
  return out;
}

/** Окуучуларга: «Айбек Маратов» → «Айбек М.» */
export const shortName = (full: string) => {
  const [first, last] = full.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : first;
};
