/**
 * Сабак — бир миссия (геймификация, 2-этап). 5 бөлүк сакталат; окуя бар болсо ар бөлүк «бекет» болуп көрүнөт.
 * Бардыгы сабактын мазмунунда (JSON) — маалымат базасы өзгөрбөйт. Окуясы жок мурунку сабактар мурункудай көрүнөт.
 */
import type { StageKey } from "./lesson-types";

export type Quest = { title: string; story: string; goal: string };
/** Түшүндүрүү бөлүгү бүткөндө ачылуучу билим картасы (эреже + мисал). «Билим китебинде» чогулат. */
export type KnowledgeCard = { id: string; title: string; rule: string; example: string };
export type Level = 1 | 2 | 3;

export const STATIONS: Record<StageKey, string> = {
  discover: "Чакырык",
  learning: "Лаборатория",
  practice: "Ачылыш",
  reinforce: "Миссия",
  exit: "Акыркы сынак",
};

export const LEVELS: Record<Level, string> = { 1: "1-деңгээл · жеңил", 2: "2-деңгээл · орто", 3: "3-деңгээл · жаңы кырдаал" };

const str = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
const filled = (v: unknown, max: number) => str(v, max) && !!(v as string).trim();

/** Сактоодон мурунку түзүлүш текшерүүсү (checkStructure). Ката болсо — текст. */
export function questStructureError(c: { quest?: unknown; cards?: unknown }): string | null {
  if (c.quest !== undefined) {
    const q = c.quest as Record<string, unknown>;
    if (!q || typeof q !== "object" || !str(q.title, 150) || !str(q.story, 1500) || !str(q.goal, 500)) return "Сабактын окуясы туура эмес.";
  }
  if (c.cards !== undefined) {
    if (!Array.isArray(c.cards) || c.cards.length > 3) return "Билим карталары 3төн ашпасын.";
    const ids = new Set<string>();
    for (const raw of c.cards) {
      const k = raw as Record<string, unknown>;
      if (!k || typeof k !== "object" || !filled(k.id, 40) || ids.has(k.id as string) || !str(k.title, 120) || !str(k.rule, 600) || !str(k.example, 600)) return "Билим картасы туура эмес.";
      ids.add(k.id as string);
    }
  }
  return null;
}

/** Жарыялоого чейинки текшерүү: окуя же карта кошулса, бош талаа калбасын. */
export function questIssues(c: { quest?: Quest; cards?: KnowledgeCard[] }): string[] {
  const out: string[] = [];
  if (c.quest && (!c.quest.title.trim() || !c.quest.story.trim() || !c.quest.goal.trim())) out.push("Сабактын окуясынын аталышын, окуясын жана максатын жазыңыз.");
  if (c.cards?.some((k) => !k.title.trim() || !k.rule.trim() || !k.example.trim())) out.push("Билим картасынын аталышын, эрежесин жана мисалын жазыңыз.");
  return out;
}

export const isLevel = (v: unknown): v is Level => v === 1 || v === 2 || v === 3;

/** Түшүндүрүү (3-бөлүк) бүткөндө карталар ачылат: current_stage > 2 же сабак бүткөн. */
export function cardsUnlocked(currentStage: number, finished: boolean) {
  return finished || currentStage > 2;
}

/** «Билим китеби»: ачылган карталар, акыркы сабактар биринчи; бир сабак эки класска берилсе да бир жолу. */
export function bookEntries(rows: { lessonId: string; title: string; cards?: KnowledgeCard[]; currentStage: number; finished: boolean; at: string }[]) {
  const seen = new Set<string>();
  return [...rows]
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter((r) => cardsUnlocked(r.currentStage, r.finished) && r.cards?.length && !seen.has(r.lessonId) && seen.add(r.lessonId))
    .map((r) => ({ lessonId: r.lessonId, title: r.title, cards: r.cards! }));
}
