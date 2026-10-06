/**
 * Окуучунун браузерине жөнөтүлүүчү сабак: туура жооптор блок чечилгенге чейин жашырылат.
 * Жоопту сервер баалайт (src/app/actions/student.ts), жана блоктун жаңы көрүнүшүн кайтарат.
 */
import type { SavedAnswer } from "@/lib/grading";
import type { Block, LessonContent } from "@/lib/lesson-types";

/** Туруктуу аралаштыруу: `perm[k]` — окуучу көргөн k-саптын баштапкы индекси. Эч качан туура тартипте болбойт. */
export function shufflePerm(n: number, seed: string) {
  const idx = Array.from({ length: n }, (_, i) => i);
  let h = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  for (let i = idx.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const j = h % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  if (n > 1 && idx.every((v, i) => v === i)) idx.reverse();
  return idx;
}

export const parsonsSeed = (blockId: string, attemptId: string) => `${blockId}:${attemptId}`;

export function studentBlock(b: Block, answer: SavedAnswer | undefined, exit: boolean, attemptId: string): Block {
  const solved = answer?.is_correct === true;
  switch (b.type) {
    case "mcq":
      return solved && !exit ? b : { ...b, correct: -1, explain: undefined };
    case "parsons": {
      if (solved) return b;
      const perm = shufflePerm(b.lines.length, parsonsSeed(b.id, attemptId));
      return { ...b, lines: perm.map((i) => b.lines[i]), shuffled: true };
    }
    case "bug_hunt": {
      if (solved) return b;
      const found = new Set((answer?.response.found as number[] | undefined) ?? []);
      return { ...b, bugs: b.bugs.filter((x) => found.has(x.line)), bugCount: b.bugs.length, fixed: undefined };
    }
    default:
      return b;
  }
}

export function studentContent(content: LessonContent, answers: Record<string, SavedAnswer>, attemptId: string): LessonContent {
  return {
    ...content,
    teacherNotes: undefined,
    stages: content.stages.map((st) => ({
      ...st,
      blocks: st.blocks.map((b) => studentBlock(b, answers[b.id], st.key === "exit", attemptId)),
    })),
  };
}
