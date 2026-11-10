/**
 * Жандуу оюн (квиз-шоу, 0024): мугалим проектордо ойнотот, окуучулар телефондон жооп берет.
 * Абалдар: lobby → question → reveal → question … → ended. Тест (choice) суроолору гана ойнолот.
 */
import type { ChoiceQuestion, GameQuestion } from "./game-questions";

export type LiveStatus = "lobby" | "question" | "reveal" | "ended";
export const DEFAULT_TIME = 20;
export const TIME_OPTIONS = [10, 20, 30, 60] as const;
/** Тармак кечигүүсү үчүн: убакыт бүткөндөн кийин дагы ушунча мс жооп кабыл алынат. */
export const ANSWER_GRACE_MS = 1500;
export const BASE_POINTS = 500;
export const SPEED_POINTS = 500;

export const liveQuestions = (questions: GameQuestion[]) => questions.filter((q): q is ChoiceQuestion => q.type === "choice");
export const questionTime = (q: ChoiceQuestion) => (q.time && q.time >= 5 && q.time <= 120 ? q.time : DEFAULT_TIME);

/**
 * Упай: туура жооп — 500 + ылдамдык үчүн 500гө чейин (калган убакытка жараша). Ылдамдык бонусу өчүк болсо —
 * туура жооп 1000. Туура эмес же кеч — 0. Тактык ылдамдыктан маанилүү (500 ар дайым туура жооп үчүн).
 */
export function answerPoints(correct: boolean, elapsedMs: number, limitMs: number, speedBonus: boolean) {
  if (!correct) return 0;
  if (!speedBonus) return BASE_POINTS + SPEED_POINTS;
  const left = Math.max(0, Math.min(1, 1 - elapsedMs / limitMs));
  return BASE_POINTS + Math.round(SPEED_POINTS * left);
}

/** Жооп кабыл алынабы: учурдагы суроо, убакыт бүтө элек (+ кечигүү үчүн аз убакыт). */
export function canAnswer(live: { status: LiveStatus; q_index: number; q_started_at: string | null }, qIndex: number, limitSec: number, now: number) {
  if (live.status !== "question" || live.q_index !== qIndex || !live.q_started_at) return false;
  const elapsed = now - new Date(live.q_started_at).getTime();
  return elapsed >= 0 && elapsed <= limitSec * 1000 + ANSWER_GRACE_MS;
}

/** Мугалимдин «Кийинки» баскычы: абалдын кийинки кадамы. */
export function nextStep(status: LiveStatus, qIndex: number, total: number): { status: LiveStatus; q_index: number } | null {
  if (status === "lobby") return total > 0 ? { status: "question", q_index: 0 } : null;
  if (status === "question") return { status: "reveal", q_index: qIndex };
  if (status === "reveal") return qIndex + 1 < total ? { status: "question", q_index: qIndex + 1 } : { status: "ended", q_index: qIndex };
  return null;
}

export function generatePin(random = Math.random) {
  return String(Math.floor(random() * 900000) + 100000);
}

export type LivePlayer = { id: string; name: string; score: number };
/** Упай боюнча орун; бирдей болсо бирдей орун (1, 2, 2, 4). */
export function rankPlayers<T extends LivePlayer>(players: T[]): (T & { rank: number })[] {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ky"));
  const out: (T & { rank: number })[] = [];
  sorted.forEach((p, i) => out.push({ ...p, rank: i > 0 && sorted[i - 1].score === p.score ? out[i - 1].rank : i + 1 }));
  return out;
}

/** Мугалимдин суроосу окуучуга: туура жоопсуз. */
export const studentLiveQuestion = (q: ChoiceQuestion) => ({ prompt: q.prompt, ...(q.code ? { code: q.code } : {}), options: q.options, time: questionTime(q) });
