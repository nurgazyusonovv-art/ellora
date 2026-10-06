/**
 * Жоопторду баалоо, бөлүктү бүтүрүү жана XP эрежелери. Серверде (src/app/actions/student.ts) — чечүүчү,
 * ойноткучта — дароо көрсөтүү үчүн. Эрежелер: docs/LESSON_FORMAT.md.
 */
import { isGraded, isInteractive, type Block, type LessonContent, type Stage } from "@/lib/lesson-types";

export type SavedAnswer = { response: Record<string, unknown>; is_correct: boolean | null; tries: number };
export type Answers = Record<string, SavedAnswer>;

export const EXIT_BONUS_XP = 20;

const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : null);
const ints = (v: unknown) => (Array.isArray(v) && v.every((x) => Number.isInteger(x)) ? (v as number[]) : null);

type Graded = { response: Record<string, unknown>; is_correct: boolean | null } | { error: string };

/** Жоопту баалайт. `prev` — мурунку жооп (бир блокко бир нече аракет болот). */
export function gradeAnswer(block: Block, raw: Record<string, unknown>, prev: SavedAnswer | undefined, exit: boolean): Graded {
  const wasCorrect = prev?.is_correct === true;
  switch (block.type) {
    case "mcq": {
      const picked = int(raw.picked);
      if (picked === null || picked < 0 || picked >= block.options.length) return { error: "Жооп туура эмес форматта." };
      if (exit) {
        if (prev) return { error: "Exit ticket'те ар бир суроого бир гана жолу жооп берилет." };
        return { response: { picked }, is_correct: picked === block.correct };
      }
      const wrong = new Set(ints(prev?.response.wrong) ?? []);
      if (picked !== block.correct) wrong.add(picked);
      return { response: { picked, wrong: [...wrong] }, is_correct: wasCorrect || picked === block.correct };
    }
    case "parsons": {
      const order = ints(raw.order);
      const n = block.lines.length;
      if (!order || order.length !== n || new Set(order).size !== n || order.some((i) => i < 0 || i >= n))
        return { error: "Жооп туура эмес форматта." };
      // Бирдей саптар болсо да текст боюнча салыштырабыз. positions — ар бир орун туурабы (окуучуга көрсөтүү үчүн).
      const positions = order.map((i, pos) => block.lines[i] === block.lines[pos]);
      return { response: { order, positions }, is_correct: wasCorrect || positions.every(Boolean) };
    }
    case "bug_hunt": {
      const clicked = ints(raw.found);
      if (!clicked) return { error: "Жооп туура эмес форматта." };
      const bugLines = new Set(block.bugs.map((b) => b.line));
      const found = new Set((ints(prev?.response.found) ?? []).filter((l) => bugLines.has(l)));
      for (const l of clicked) if (bugLines.has(l)) found.add(l);
      return { response: { found: [...found] }, is_correct: found.size === bugLines.size };
    }
    case "code_task": {
      // Python окуучунун браузеринде (Pyodide) иштейт — тесттердин натыйжасын браузер билдирет.
      // Код сакталат: мугалим аны натыйжалар барагында текшере алат.
      const passed = int(raw.passed);
      if (typeof raw.code !== "string" || raw.code.length > 20000 || passed === null || passed < 0 || passed > block.tests.length)
        return { error: "Жооп туура эмес форматта." };
      return { response: { code: raw.code, passed }, is_correct: wasCorrect || passed === block.tests.length };
    }
    case "investigation": {
      if (typeof raw.prediction !== "string" || !raw.prediction.trim() || raw.prediction.length > 5000) return { error: "Божомолуңду жаз." };
      const prediction = prev?.response.prediction ?? raw.prediction.trim();
      if (raw.phase === "prediction") return { response: { prediction, observations: prev?.response.observations ?? "", conclusion: prev?.response.conclusion ?? "" }, is_correct: null };
      if (["observations", "conclusion"].some(k => typeof raw[k] !== "string" || !(raw[k] as string).trim() || (raw[k] as string).length > 5000)) return { error: "Байкоо жана жыйынтыкты толтур." };
      return { response: { prediction, observations: (raw.observations as string).trim(), conclusion: (raw.conclusion as string).trim() }, is_correct: null };
    }
    case "open": {
      if (block.lockOnSubmit && prev) return { response: prev.response, is_correct: null };
      const text = typeof raw.text === "string" ? raw.text.trim().slice(0, 5000) : "";
      if (!text) return { error: "Жоопту жаз." };
      return { response: { text }, is_correct: null };
    }
    case "confidence": {
      const value = int(raw.value);
      if (value === null || value < 1 || value > 4) return { error: "Жооп туура эмес форматта." };
      return { response: { value }, is_correct: null };
    }
    default:
      return { error: "Бул блокко жооп берилбейт." };
  }
}

/** Бөлүк бүттүбү: бааланган блоктор туура, калгандарына жооп берилген. Exit ticket'те туура болушу шарт эмес. */
export function stageDone(stage: Stage, answers: Answers) {
  const exit = stage.key === "exit";
  return stage.blocks.filter(isInteractive).every((b) => {
    const a = answers[b.id];
    if (!a) return false;
    if (b.type === "investigation") return ["prediction", "observations", "conclusion"].every(k => typeof a.response[k] === "string" && (a.response[k] as string).trim());
    return exit || !isGraded(b) ? true : a.is_correct === true;
  });
}

const blockXp = (b: Block) => ("xp" in b && typeof b.xp === "number" && b.xp > 0 ? b.xp : 0);

/** XP жооптордон кайра эсептелет (браузер жиберген санга ишенбейбиз). */
export function computeXp(content: LessonContent, answers: Answers, finished: boolean) {
  let xp = finished ? EXIT_BONUS_XP : 0;
  for (const st of content.stages) {
    if (st.key === "exit") continue;
    for (const b of st.blocks) if (isGraded(b) && answers[b.id]?.is_correct) xp += blockXp(b);
  }
  return xp;
}

export function exitResult(content: LessonContent, answers: Answers) {
  const exit = content.stages[content.stages.length - 1];
  const mcqs = exit.blocks.filter((b) => b.type === "mcq");
  const conf = exit.blocks.find((b) => b.type === "confidence");
  const value = conf ? int(answers[conf.id]?.response.value) : null;
  return { score: mcqs.filter((b) => answers[b.id]?.is_correct).length, total: mcqs.length, confidence: value };
}

export function findBlock(content: LessonContent, blockId: string) {
  for (let i = 0; i < content.stages.length; i++) {
    const block = content.stages[i].blocks.find((b) => b.id === blockId);
    if (block) return { block, stageIdx: i };
  }
  return undefined;
}
