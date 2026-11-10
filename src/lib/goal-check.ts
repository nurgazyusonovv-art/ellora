/**
 * Сабактын максаты: башында көрсөтүлөт, аягында (Exit) окуучу ийгилик критерийлери боюнча өзүн баалайт.
 * Өзүн баалоо баага кирбейт; мугалимге «ким эмнени азырынча кыла албайт» деп көрсөтөт.
 * Жооп `answers` таблицасында өзүнчө id менен сакталат (сабактын мазмунунда блок жок — сабак бекитилсе да иштейт).
 */
import type { LessonContent } from "./lesson-types";

export const GOAL_CHECK_ID = "goal-check";

const clean = (xs?: string[]) => (xs ?? []).map((x) => x.trim()).filter(Boolean);

export function lessonGoal(content: LessonContent): { objectives: string[]; criteria: string[] } | null {
  const objectives = clean(content.objectives);
  const criteria = clean(content.successCriteria);
  return objectives.length || criteria.length ? { objectives, criteria } : null;
}

export const exitIndex = (content: LessonContent) => content.stages.findIndex((s) => s.key === "exit");

/** Окуучунун жообу: ар бир критерийге true (кыла алам) же false (азырынча жок). */
export function goalCheckInput(content: LessonContent, raw: unknown): boolean[] | null {
  const n = clean(content.successCriteria).length;
  if (!n || !Array.isArray(raw) || raw.length !== n || !raw.every((v) => typeof v === "boolean")) return null;
  return raw;
}

export function readGoalCheck(response: unknown, n: number): boolean[] | null {
  const met = (response as { met?: unknown } | null)?.met;
  return Array.isArray(met) && met.length === n && met.every((v) => typeof v === "boolean") ? met : null;
}

/** Мугалим үчүн: ар бир критерийди канча окуучу «кыла алам» деди жана ким «азырынча жок» деди. */
export function goalSummary(content: LessonContent, rows: { response: unknown; name: string }[]) {
  const criteria = clean(content.successCriteria);
  const checks = rows.map((r) => ({ name: r.name, met: readGoalCheck(r.response, criteria.length) })).filter((r): r is { name: string; met: boolean[] } => !!r.met);
  return {
    answered: checks.length,
    criteria: criteria.map((text, i) => ({ text, yes: checks.filter((c) => c.met[i]).length, notYet: checks.filter((c) => !c.met[i]).map((c) => c.name) })),
  };
}
