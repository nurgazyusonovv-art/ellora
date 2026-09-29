/** Сабактын мазмунунун түзүлүшү. lessons.content ушул форматта JSON болуп сакталат. */

export const STAGE_KEYS = ["discover", "learning", "practice", "reinforce", "exit"] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

export const STAGE_META: Record<StageKey, { label: string; sub: string }> = {
  discover: { label: "Discover", sub: "Ачылыш" },
  learning: { label: "Learning", sub: "Үйрөнүү" },
  practice: { label: "Practice", sub: "Практика" },
  reinforce: { label: "Бышыктоо", sub: "Кайталоо" },
  exit: { label: "Exit ticket", sub: "Чыгуу билети" },
};

type Base = { id: string };

/** Жөнөкөй текст. `**калың**` жана `код` белгилерин колдойт, абзацтар бош сап менен бөлүнөт. */
export type TextBlock = Base & { type: "text"; title?: string; body: string };

/** Көрсөтүлүүчү код мисалы (Python). */
export type CodeExampleBlock = Base & { type: "code_example"; code: string; caption?: string; runnable?: boolean };

/** Бир жооптуу тест. Exit ticket'те бир гана аракет берилет. */
export type McqBlock = Base & {
  type: "mcq";
  prompt: string;
  code?: string;
  options: string[];
  correct: number;
  mono?: boolean;
  explain?: string;
  hint?: string;
  xp?: number;
};

/** Окуучу Python кодун жазат, программа тесттер менен текшерилет (stdin → stdout). */
export type CodeTaskBlock = Base & {
  type: "code_task";
  prompt: string;
  starter: string;
  tests: { input: string; expected: string }[];
  hint?: string;
  xp?: number;
};

/** Аралашкан саптарды туура иретке коюу. `lines` — туура тартипте. */
export type ParsonsBlock = Base & { type: "parsons"; prompt: string; lines: string[]; xp?: number };

/** Коддогу каталуу саптарды табуу. `bugs[].line` — 1ден башталган сап номери. */
export type BugHuntBlock = Base & {
  type: "bug_hunt";
  prompt: string;
  code: string;
  bugs: { line: number; explain: string }[];
  fixed?: string;
  xp?: number;
};

/** Ачык жооп. Туура/туура эмес деп бааланбайт. `feedback` жооп берилгенден кийин көрсөтүлөт. */
export type OpenBlock = Base & {
  type: "open";
  prompt: string;
  placeholder?: string;
  optional?: boolean;
  feedback?: string;
  feedbackCode?: string;
};

/** Exit ticket'теги түшүнүү деңгээли (1–4). */
export type ConfidenceBlock = Base & { type: "confidence"; prompt: string };

export type Block =
  | TextBlock
  | CodeExampleBlock
  | McqBlock
  | CodeTaskBlock
  | ParsonsBlock
  | BugHuntBlock
  | OpenBlock
  | ConfidenceBlock;

export type Stage = { key: StageKey; title: string; intro?: string; minutes: number; blocks: Block[] };

export type LessonContent = { version: 1; stages: Stage[] };

/** Бул блок стадияны бүтүрүү үчүн жооп талап кылабы. */
export function isInteractive(b: Block) {
  return b.type !== "text" && b.type !== "code_example" && !(b.type === "open" && b.optional);
}

/** Бул блок туура/туура эмес деп бааланабы. */
export function isGraded(b: Block) {
  return b.type === "mcq" || b.type === "code_task" || b.type === "parsons" || b.type === "bug_hunt";
}

export const CONFIDENCE_LABELS = ["Түшүнбөдүм", "Жарым-жартылай", "Түшүндүм", "Башкага түшүндүрө алам"];
