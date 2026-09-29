import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

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
