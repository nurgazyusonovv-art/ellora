/**
 * Оюндун суроо топтому (0017). Туура жооп серверде калат: окуучуга `studentQuestion` гана жөнөтүлөт,
 * баалоо `gradeQuestion` менен серверде. Аралаштыруу суроо + окуучу боюнча туруктуу (сервер кайра эсептей алат).
 */
import { shufflePerm } from "./student-view";

type Base = { id: string; prompt: string; explain?: string };
export type ChoiceQuestion = Base & { type: "choice"; code?: string; options: string[]; correct: number };
export type MatchQuestion = Base & { type: "match"; pairs: { left: string; right: string }[] };
export type OrderQuestion = Base & { type: "order"; steps: string[] };
export type SortQuestion = Base & { type: "sort"; categories: string[]; items: { text: string; category: number }[] };
export type GameQuestion = ChoiceQuestion | MatchQuestion | OrderQuestion | SortQuestion;

export const QUESTION_TYPES = {
  choice: "Тест",
  match: "Жуп табуу",
  order: "Иреттөө",
  sort: "Топторго бөлүү",
} as const;

/** Окуучуга жөнөтүлүүчү көрүнүш: туура жооп жок, тизмелер аралаштырылган. */
export type StudentQuestion =
  | { id: string; type: "choice"; prompt: string; code?: string; options: string[] }
  | { id: string; type: "match"; prompt: string; lefts: string[]; rights: string[] }
  | { id: string; type: "order"; prompt: string; steps: string[] }
  | { id: string; type: "sort"; prompt: string; categories: string[]; items: string[] };

/** Жооптон кийин көрсөтүлүүчү туура вариант — окуучунун экранындагы индекстер менен. */
export type Reveal =
  | { type: "choice"; correct: number }
  | { type: "match"; picks: number[] }
  | { type: "order"; order: number[] }
  | { type: "sort"; groups: number[] };

export type GradeResult = { correct: boolean; reveal: Reveal; explain?: string };

/** Алдын ала көрүүдө аралаштыруунун туруктуу ачкычы (браузердеги баалоо ушуну колдонот). */
export const PREVIEW_VIEWER = "preview";

const seed = (q: GameQuestion, studentId: string) => `${q.id}:${studentId}`;
const isIndexList = (v: unknown, n: number, max: number): v is number[] =>
  Array.isArray(v) && v.length === n && v.every((x) => Number.isInteger(x) && x >= 0 && x < max);

export function studentQuestion(q: GameQuestion, studentId: string): StudentQuestion {
  const s = seed(q, studentId);
  switch (q.type) {
    case "choice":
      return { id: q.id, type: "choice", prompt: q.prompt, ...(q.code ? { code: q.code } : {}), options: [...q.options] };
    case "match": {
      const perm = shufflePerm(q.pairs.length, s);
      return { id: q.id, type: "match", prompt: q.prompt, lefts: q.pairs.map((p) => p.left), rights: perm.map((i) => q.pairs[i].right) };
    }
    case "order": {
      const perm = shufflePerm(q.steps.length, s);
      return { id: q.id, type: "order", prompt: q.prompt, steps: perm.map((i) => q.steps[i]) };
    }
    case "sort": {
      const perm = shufflePerm(q.items.length, s);
      return { id: q.id, type: "sort", prompt: q.prompt, categories: [...q.categories], items: perm.map((i) => q.items[i].text) };
    }
  }
}

/** `response` — окуучунун экранындагы индекстер. Туура эмес формат болсо `null`. */
export function gradeQuestion(q: GameQuestion, studentId: string, response: unknown): GradeResult | null {
  const r = (response && typeof response === "object" ? response : {}) as Record<string, unknown>;
  const s = seed(q, studentId);
  const explain = q.explain ? { explain: q.explain } : {};
  switch (q.type) {
    case "choice": {
      const pick = r.pick;
      if (!Number.isInteger(pick) || (pick as number) < 0 || (pick as number) >= q.options.length) return null;
      return { correct: pick === q.correct, reveal: { type: "choice", correct: q.correct }, ...explain };
    }
    case "match": {
      // picks[i] — i-сол сапка тандалган экрандагы оң вариант. perm[k] — экрандагы k-оң варианттын баштапкы жубу.
      const n = q.pairs.length, perm = shufflePerm(n, s);
      if (!isIndexList(r.picks, n, n)) return null;
      const picks = r.picks;
      const correctPicks = Array.from({ length: n }, (_, i) => perm.indexOf(i));
      return { correct: picks.every((k, i) => perm[k] === i), reveal: { type: "match", picks: correctPicks }, ...explain };
    }
    case "order": {
      const n = q.steps.length, perm = shufflePerm(n, s);
      if (!isIndexList(r.order, n, n) || new Set(r.order).size !== n) return null;
      const order = r.order;
      const correctOrder = Array.from({ length: n }, (_, step) => perm.indexOf(step));
      return { correct: order.every((k, i) => perm[k] === i), reveal: { type: "order", order: correctOrder }, ...explain };
    }
    case "sort": {
      const n = q.items.length, perm = shufflePerm(n, s);
      if (!isIndexList(r.groups, n, q.categories.length)) return null;
      const groups = r.groups;
      const correctGroups = perm.map((i) => q.items[i].category);
      return { correct: groups.every((g, k) => g === correctGroups[k]), reveal: { type: "sort", groups: correctGroups }, ...explain };
    }
  }
}

const text = (v: unknown, max: number): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const uniqueTexts = (v: string[]) => new Set(v.map((x) => x.trim().toLowerCase())).size === v.length;

/** Топтомдогу суроолорду текшерет; ката болсо кыргызча билдирүүлөрдү кайтарат. */
export function validateQuestions(questions: unknown): string[] {
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 40) return ["Топтомдо 1–40 суроо болушу керек."];
  const errors: string[] = [];
  const ids = new Set<string>();
  questions.forEach((raw, i) => {
    const n = i + 1;
    const q = raw as Partial<GameQuestion> & Record<string, unknown>;
    if (!q || typeof q !== "object" || !text(q.id, 40) || ids.has(q.id)) return void errors.push(`${n}-суроонун id'си туура эмес же кайталанат.`);
    ids.add(q.id);
    if (!text(q.prompt, 1000)) errors.push(`${n}-суроонун тексти жок.`);
    if (q.explain !== undefined && !text(q.explain, 1000)) errors.push(`${n}-суроонун түшүндүрмөсү туура эмес.`);
    if (q.type === "choice") {
      const o = q.options;
      if (!Array.isArray(o) || o.length < 2 || o.length > 5 || !o.every((x) => text(x, 300)) || !uniqueTexts(o as string[])) errors.push(`${n}-суроодо 2–5 ар башка вариант болушу керек.`);
      else if (!Number.isInteger(q.correct) || (q.correct as number) < 0 || (q.correct as number) >= o.length) errors.push(`${n}-суроонун туура жообу белгиленген эмес.`);
      if (q.code !== undefined && !text(q.code, 1500)) errors.push(`${n}-суроонун коду туура эмес.`);
    } else if (q.type === "match") {
      const p = q.pairs;
      if (!Array.isArray(p) || p.length < 2 || p.length > 8 || !p.every((x) => x && text(x.left, 200) && text(x.right, 200)) || !uniqueTexts(p.map((x) => x.left)) || !uniqueTexts(p.map((x) => x.right)))
        errors.push(`${n}-суроодо 2–8 ар башка жуп болушу керек.`);
    } else if (q.type === "order") {
      const st = q.steps;
      if (!Array.isArray(st) || st.length < 2 || st.length > 8 || !st.every((x) => text(x, 300)) || !uniqueTexts(st as string[])) errors.push(`${n}-суроодо 2–8 ар башка кадам болушу керек.`);
    } else if (q.type === "sort") {
      const c = q.categories, it = q.items;
      if (!Array.isArray(c) || c.length < 2 || c.length > 4 || !c.every((x) => text(x, 120)) || !uniqueTexts(c as string[])) errors.push(`${n}-суроодо 2–4 ар башка топ болушу керек.`);
      else if (!Array.isArray(it) || it.length < 2 || it.length > 10 || !it.every((x) => x && text(x.text, 200) && Number.isInteger(x.category) && x.category >= 0 && x.category < c.length) || !uniqueTexts(it.map((x) => x.text)))
        errors.push(`${n}-суроодо 2–10 объект болуп, ар бири бир топко таандык болушу керек.`);
      else if (!c.every((_, k) => it.some((x) => x.category === k))) errors.push(`${n}-суроодо ар бир топко кеминде бир объект керек.`);
    } else errors.push(`${n}-суроонун түрү белгисиз.`);
  });
  return errors;
}

/**
 * Раунддун жыйынтыгы: ар суроонун биринчи жообу боюнча упай (0–100) жана бардык суроо
 * акыры туура чечилгенби. `answers` — раунддагы жооптор убакыт тартибинде.
 */
export function roundScore(questionIds: string[], answers: { question_id: string; is_correct: boolean }[]) {
  const first = new Map<string, boolean>();
  const solved = new Set<string>();
  for (const a of answers) {
    if (!first.has(a.question_id)) first.set(a.question_id, a.is_correct);
    if (a.is_correct) solved.add(a.question_id);
  }
  const firstTry = questionIds.filter((id) => first.get(id) === true).length;
  return {
    score: questionIds.length ? Math.round((firstTry / questionIds.length) * 100) : 0,
    firstTry,
    complete: questionIds.length > 0 && questionIds.every((id) => solved.has(id)),
  };
}

/** Сабактын ичиндеги оюндун абалы — `answers.response` ичинде сакталат (0017 таблицалары колдонулбайт). */
export type LessonGameState = {
  round: string;
  /** Ушул раунддагы ар суроонун биринчи жообу. */
  first: Record<string, boolean>;
  /** Ушул раундда туура чечилген суроолор. */
  solved: string[];
  complete: boolean;
  /** Акыркы бүткөн раунддун упайы, рекорд жана бүткөн раунддардын саны. */
  score: number | null;
  best: number | null;
  rounds: number;
};

const emptyGame = (round: string, prev?: Partial<LessonGameState>): LessonGameState => ({
  round,
  first: {},
  solved: [],
  complete: false,
  score: prev?.score ?? null,
  best: prev?.best ?? null,
  rounds: prev?.rounds ?? 0,
});

/** Окуучунун мурунку абалын текшерип окуйт; бузук болсо — бош абал. */
export function readLessonGame(raw: unknown): Partial<LessonGameState> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 100 ? (v as number) : null);
  return {
    round: typeof r.round === "string" ? r.round : undefined,
    first: r.first && typeof r.first === "object" ? Object.fromEntries(Object.entries(r.first as Record<string, unknown>).filter(([, v]) => typeof v === "boolean")) as Record<string, boolean> : {},
    solved: Array.isArray(r.solved) ? r.solved.filter((x): x is string => typeof x === "string") : [],
    complete: r.complete === true,
    score: num(r.score),
    best: num(r.best),
    rounds: Number.isInteger(r.rounds) && (r.rounds as number) >= 0 ? (r.rounds as number) : 0,
  };
}

/**
 * Бир жоопту абалга кошот. Жаңы раунд id'си келсе — раунд башынан башталат (рекорд жана раунд саны сакталат).
 * Бүткөн раундга кайра жооп кабыл алынбайт.
 */
export function applyLessonGameAnswer(prevRaw: unknown, questionIds: string[], round: string, questionId: string, correct: boolean): LessonGameState {
  const prev = readLessonGame(prevRaw);
  const s: LessonGameState = prev.round === round ? { ...emptyGame(round, prev), first: { ...prev.first }, solved: [...(prev.solved ?? [])], complete: !!prev.complete } : emptyGame(round, prev);
  if (s.complete) return s;
  if (!(questionId in s.first)) s.first[questionId] = correct;
  if (correct && !s.solved.includes(questionId)) s.solved.push(questionId);
  if (questionIds.length > 0 && questionIds.every((id) => s.solved.includes(id))) {
    s.complete = true;
    s.score = Math.round((questionIds.filter((id) => s.first[id] === true).length / questionIds.length) * 100);
    s.best = Math.max(s.best ?? 0, s.score);
    s.rounds += 1;
  }
  return s;
}
