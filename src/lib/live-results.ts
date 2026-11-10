/**
 * Жандуу сабактын «Тактасы» (0020): бир тапшырманын класс боюнча жыйынтыгы — **атсыз**.
 * Окуучунун аты, id'си жана жооп берген тартиби тактага чыкпайт; мугалим жашырган ачык жооптор кошулбайт.
 */
import { isGraded, isInteractive, type Block } from "./lesson-types";

export type BoardRow = { attempt_id: string; response: Record<string, unknown> | null; is_correct: boolean | null };

export type BoardResult =
  | { kind: "choice"; answered: number; options: { text: string; n: number; correct: boolean }[] }
  | { kind: "texts"; answered: number; items: { key: string; text: string }[] }
  | { kind: "scale"; answered: number; counts: number[] }
  | { kind: "score"; answered: number; correct: number };

/** Туруктуу, бирок окуучулардын тизмесинен көз карандысыз тартип (атын тартип боюнча табууга болбойт). */
const mix = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 17);

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function boardResult(block: Block, rows: BoardRow[], hidden: string[] = []): BoardResult | null {
  if (!isInteractive(block) && block.type !== "open") return null;
  const mine = rows.filter((r) => r.response);
  const answered = mine.length;
  switch (block.type) {
    case "mcq":
      return {
        kind: "choice",
        answered,
        options: block.options.map((o, k) => ({ text: o, n: mine.filter((r) => r.response!.picked === k).length, correct: k === block.correct })),
      };
    case "confidence":
      return { kind: "scale", answered, counts: [1, 2, 3, 4].map((v) => mine.filter((r) => r.response!.value === v).length) };
    case "open":
    case "investigation": {
      const skip = new Set(hidden);
      const items = mine
        .filter((r) => !skip.has(r.attempt_id))
        .map((r) => ({ key: r.attempt_id, text: block.type === "open" ? text(r.response!.text) : text(r.response!.conclusion) || text(r.response!.prediction) }))
        .filter((x) => x.text)
        .sort((a, b) => mix(a.key) - mix(b.key));
      return { kind: "texts", answered, items };
    }
    default:
      // Код, Parsons, дал келтирүү, иреттөө, топко бөлүү, таблица, оюн: тууралык гана (жооптун ичи ар кимде башка).
      return { kind: "score", answered, correct: isGraded(block) || block.type === "game" ? mine.filter((r) => r.is_correct === true).length : 0 };
  }
}
