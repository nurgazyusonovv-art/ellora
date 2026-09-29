/** Сабак конструктору үчүн жардамчылар. Серверде да, браузерде да колдонулат. */
import { STAGE_KEYS, STAGE_META, isGraded, type Block, type LessonContent, type StageKey } from "@/lib/lesson-types";

export type BlockType = Block["type"];

export const BLOCK_LABELS: Record<BlockType, string> = {
  text: "Текст",
  code_example: "Код мисалы",
  mcq: "Тест",
  code_task: "Код тапшырмасы",
  parsons: "Саптарды иреттөө",
  bug_hunt: "Катаны тап",
  open: "Ачык жооп",
  confidence: "Ишеним шкаласы",
};

export const BLOCK_TYPES = Object.keys(BLOCK_LABELS) as BlockType[];

/** Бөлүктөрдүн демейки үлүшү (40 мүнөттүк сабакта: 5 / 10 / 15 / 7 / 3). */
const STAGE_WEIGHTS: Record<StageKey, number> = { discover: 5, learning: 10, practice: 15, reinforce: 7, exit: 3 };

export const DURATION_OPTIONS = [30, 35, 40, 45, 80, 90];
export const DEFAULT_DURATION = 45;

/** Жалпы убакытты бөлүктөргө үлүшү боюнча бөлөт; сумма так `total`'га барабар болот. */
export function distributeMinutes(total: number): number[] {
  const w = STAGE_KEYS.map((k) => STAGE_WEIGHTS[k]);
  const sum = w.reduce((a, b) => a + b, 0);
  const raw = w.map((x) => (x * total) / sum);
  const out = raw.map((x) => Math.max(1, Math.floor(x)));
  let rest = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) out[order[k][1]]++;
  return out;
}

export function emptyLesson(duration = DEFAULT_DURATION): LessonContent {
  const minutes = distributeMinutes(duration);
  return {
    version: 1,
    duration,
    stages: STAGE_KEYS.map((key, i) => ({ key, title: STAGE_META[key].sub, minutes: minutes[i], blocks: [] })),
  };
}

/** Бөлүктүн тамгасы + кийинки бош номер: p1, p2… (жарыяланган блоктордун id'си өзгөрбөйт). */
export function nextBlockId(content: LessonContent, stage: StageKey) {
  const used = new Set(content.stages.flatMap((s) => s.blocks.map((b) => b.id)));
  const prefix = stage === "reinforce" ? "r" : stage[0];
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

export function newBlock(type: BlockType, id: string): Block {
  switch (type) {
    case "text":
      return { id, type, body: "" };
    case "code_example":
      return { id, type, code: "", runnable: true };
    case "mcq":
      return { id, type, prompt: "", options: ["", ""], correct: -1, xp: 10 };
    case "code_task":
      return { id, type, prompt: "", starter: "", tests: [{ input: "", expected: "" }], xp: 10 };
    case "parsons":
      return { id, type, prompt: "Саптарды туура иретке кой.", lines: ["", ""], xp: 10 };
    case "bug_hunt":
      return { id, type, prompt: "Коддогу катаны тап.", code: "", bugs: [{ line: 1, explain: "" }], xp: 10 };
    case "open":
      return { id, type, prompt: "" };
    case "confidence":
      return { id, type, prompt: "Бүгүнкү теманы канчалык түшүндүң?" };
  }
}

/** Блоктун кыска аталышы (тизмеде көрсөтүү үчүн). */
export function blockSummary(b: Block) {
  const s = b.type === "text" ? b.title || b.body : b.type === "code_example" ? b.caption || b.code.split("\n")[0] : b.prompt;
  const one = (s ?? "").replace(/\s+/g, " ").trim();
  return one.length > 80 ? one.slice(0, 80) + "…" : one;
}

export type Issue = { stage: number; blockId?: string; message: string };

const blank = (s: string | undefined) => !s || !s.trim();

/** Жарыялоого чейинки текшерүү. Бош массив — сабак даяр. */
export function validateLesson(title: string, content: LessonContent): Issue[] {
  const out: Issue[] = [];
  if (blank(title)) out.push({ stage: -1, message: "Сабактын атын жазыңыз." });

  content.stages.forEach((st, si) => {
    const add = (message: string, blockId?: string) => out.push({ stage: si, blockId, message });
    if (blank(st.title)) add("Бөлүктүн аталышын жазыңыз.");
    if (!(st.minutes > 0)) add("Бөлүктүн убактысын жазыңыз (мүнөт).");
    if (st.blocks.length === 0) add("Бөлүктө жок дегенде бир блок болушу керек.");
    if (st.key === "exit" && !st.blocks.some((b) => b.type === "mcq")) add("Exit ticket'те жок дегенде бир тест (mcq) болсун.");

    for (const b of st.blocks) {
      const bad = (m: string) => add(m, b.id);
      if ("xp" in b && isGraded(b) && b.xp !== undefined && !(b.xp >= 0)) bad("XP терс сан болбосун.");
      switch (b.type) {
        case "text":
          if (blank(b.body)) bad("Тексттин мазмунун жазыңыз.");
          break;
        case "code_example":
          if (blank(b.code)) bad("Код мисалын жазыңыз.");
          break;
        case "mcq":
          if (blank(b.prompt)) bad("Суроону жазыңыз.");
          if (b.options.length < 2) bad("Жок дегенде 2 вариант керек.");
          if (b.options.some((o) => blank(o))) bad("Бош вариант бар.");
          if (!(b.correct >= 0 && b.correct < b.options.length)) bad("Туура жоопту белгилеңиз.");
          break;
        case "code_task":
          if (blank(b.prompt)) bad("Тапшырманын шартын жазыңыз.");
          if (b.tests.length === 0) bad("Жок дегенде 1 тест кошуңуз.");
          if (b.tests.some((t) => blank(t.expected))) bad("Ар бир тесттин күтүлгөн натыйжасын жазыңыз.");
          break;
        case "parsons":
          if (blank(b.prompt)) bad("Тапшырманын шартын жазыңыз.");
          if (b.lines.filter((l) => !blank(l)).length < 2) bad("Жок дегенде 2 сап керек.");
          else if (b.lines.some((l) => blank(l))) bad("Бош сап бар — аны өчүрүңүз.");
          break;
        case "bug_hunt": {
          const n = b.code.split("\n").length;
          if (blank(b.prompt)) bad("Тапшырманын шартын жазыңыз.");
          if (blank(b.code)) bad("Каталуу кодду жазыңыз.");
          if (b.bugs.length === 0) bad("Жок дегенде 1 катаны белгилеңиз.");
          if (b.bugs.some((x) => !(x.line >= 1 && x.line <= n))) bad(`Катанын сап номери 1–${n} аралыгында болсун.`);
          if (b.bugs.some((x) => blank(x.explain))) bad("Ар бир ката үчүн түшүндүрмө жазыңыз.");
          break;
        }
        case "open":
        case "confidence":
          if (blank(b.prompt)) bad("Суроону жазыңыз.");
          break;
      }
    }
  });
  return out;
}

/** Сактоодон мурун түзүлүштү текшерүү (бузук JSON базага түшпөсүн). Ката болсо — текст. */
export function checkStructure(content: unknown): string | null {
  const c = content as LessonContent;
  if (!c || c.version !== 1 || !Array.isArray(c.stages)) return "Сабактын форматы туура эмес.";
  if (c.duration !== undefined && !(Number.isInteger(c.duration) && c.duration > 0 && c.duration <= 180))
    return "Сабактын узактыгы 1–180 мүнөт болсун.";
  if (c.stages.length !== 5 || c.stages.some((s, i) => s.key !== STAGE_KEYS[i])) return "Сабакта 5 бөлүк ушул тартипте болушу керек.";
  const ids = new Set<string>();
  for (const s of c.stages) {
    if (!Array.isArray(s.blocks)) return "Сабактын форматы туура эмес.";
    for (const b of s.blocks) {
      if (!b || typeof b.id !== "string" || !b.id || !(b.type in BLOCK_LABELS)) return "Белгисиз блок бар.";
      if (ids.has(b.id)) return `Блоктун id'си кайталанып калды: ${b.id}`;
      ids.add(b.id);
    }
  }
  return null;
}
