import { describe, expect, it } from "vitest";
import { legacyPythonIf as pythonIf } from "@/content/lessons/python-if";
import { computeXp, EXIT_BONUS_XP, exitResult, findBlock, gradeAnswer, stageDone, type Answers, type SavedAnswer } from "@/lib/grading";
import type { Block, BugHuntBlock, CodeTaskBlock, McqBlock, ParsonsBlock } from "@/lib/lesson-types";
import { correctResponse } from "@/test/helpers";

const content = pythonIf.content;
const all = content.stages.flatMap((s) => s.blocks);
const first = <T extends Block["type"]>(type: T) => all.find((b) => b.type === type) as Extract<Block, { type: T }>;

const ok = (g: ReturnType<typeof gradeAnswer>) => {
  if ("error" in g) throw new Error(g.error);
  return g;
};
const saved = (g: ReturnType<typeof gradeAnswer>, tries = 1): SavedAnswer => ({ ...ok(g), tries });

describe("mcq", () => {
  const m = first("mcq") as McqBlock;
  const wrong = (m.correct + 1) % m.options.length;

  it("туура жана ката жоопту баалайт, каталарды топтойт", () => {
    const a1 = saved(gradeAnswer(m, { picked: wrong }, undefined, false));
    expect(a1.is_correct).toBe(false);
    expect(a1.response.wrong).toEqual([wrong]);
    const a2 = ok(gradeAnswer(m, { picked: m.correct }, a1, false));
    expect(a2.is_correct).toBe(true);
    expect(a2.response.wrong).toEqual([wrong]);
  });

  it("туура жооптон кийинки ката жооп натыйжаны бузбайт", () => {
    const right = saved(gradeAnswer(m, { picked: m.correct }, undefined, false));
    expect(ok(gradeAnswer(m, { picked: wrong }, right, false)).is_correct).toBe(true);
  });

  it("браузер жиберген is_correct эске алынбайт", () => {
    expect(ok(gradeAnswer(m, { picked: wrong, is_correct: true }, undefined, false)).is_correct).toBe(false);
  });

  it("бузук форматты кабыл албайт", () => {
    for (const r of [{ picked: 99 }, { picked: -1 }, { picked: "1" }, { picked: 1.5 }, {}]) expect(gradeAnswer(m, r, undefined, false)).toHaveProperty("error");
  });

  it("exit ticket'те бир гана аракет", () => {
    const a = saved(gradeAnswer(m, { picked: wrong }, undefined, true));
    expect(a.is_correct).toBe(false);
    expect(gradeAnswer(m, { picked: m.correct }, a, true)).toHaveProperty("error");
  });
});

describe("parsons", () => {
  const p = first("parsons") as ParsonsBlock;
  const n = p.lines.length;

  it("туура тартипти кабыл алат", () => {
    expect(ok(gradeAnswer(p, { order: p.lines.map((_, i) => i) }, undefined, false)).is_correct).toBe(true);
  });
  it("туура эмес тартип — ката", () => {
    const rev = p.lines.map((_, i) => n - 1 - i);
    expect(ok(gradeAnswer(p, { order: rev }, undefined, false)).is_correct).toBe(false);
  });
  it("кайталанган же толук эмес тартипти кабыл албайт", () => {
    expect(gradeAnswer(p, { order: Array(n).fill(0) }, undefined, false)).toHaveProperty("error");
    expect(gradeAnswer(p, { order: [0] }, undefined, false)).toHaveProperty("error");
  });
});

describe("bug_hunt", () => {
  const b = first("bug_hunt") as BugHuntBlock;
  it("ката болбогон саптар эсептелбейт", () => {
    expect(ok(gradeAnswer(b, { found: [999, -1] }, undefined, false))).toEqual({ response: { found: [] }, is_correct: false });
  });
  it("бардык каталар табылганда туура", () => {
    expect(ok(gradeAnswer(b, { found: b.bugs.map((x) => x.line) }, undefined, false)).is_correct).toBe(true);
  });
});

describe("code_task", () => {
  const c = first("code_task") as CodeTaskBlock;
  it("бардык тесттер өтсө туура, код сакталат", () => {
    const g = ok(gradeAnswer(c, { code: "x", passed: c.tests.length }, undefined, false));
    expect(g).toEqual({ response: { code: "x", passed: c.tests.length }, is_correct: true });
  });
  it("тесттердин санынан көп passed кабыл алынбайт", () => {
    expect(gradeAnswer(c, { code: "x", passed: c.tests.length + 1 }, undefined, false)).toHaveProperty("error");
  });
});

describe("open / confidence / text", () => {
  it("бош ачык жоопту кабыл албайт", () => {
    expect(gradeAnswer(first("open"), { text: "   " }, undefined, false)).toHaveProperty("error");
  });
  it("ишеним 1–4", () => {
    expect(gradeAnswer(first("confidence"), { value: 5 }, undefined, true)).toHaveProperty("error");
    expect(ok(gradeAnswer(first("confidence"), { value: 4 }, undefined, true)).is_correct).toBeNull();
  });
  it("текст блогуна жооп берилбейт", () => {
    expect(gradeAnswer(first("text"), {}, undefined, false)).toHaveProperty("error");
  });
});

describe("сабакты толук өтүү", () => {
  it("ар бир блокко туура жооп — 5 бөлүк, XP жана exit ticket туура", () => {
    const answers: Answers = {};
    let stage = 0;
    content.stages.forEach((st, si) => {
      for (const b of st.blocks) {
        const r = correctResponse(b);
        if (r) answers[b.id] = saved(gradeAnswer(b, r, answers[b.id], st.key === "exit"));
      }
      expect(stageDone(st, answers)).toBe(true);
      stage = si + 1;
    });
    expect(stage).toBe(5);
    const r = exitResult(content, answers);
    expect(r.score).toBe(r.total);
    expect(r.confidence).toBe(3);
    const xpBlocks = content.stages
      .filter((s) => s.key !== "exit")
      .flatMap((s) => s.blocks)
      .reduce((a, b) => a + ("xp" in b && b.xp ? b.xp : 0), 0);
    expect(computeXp(content, answers, true)).toBe(xpBlocks + EXIT_BONUS_XP);
    expect(computeXp(content, answers, true)).toBe(80); // китепкана сабагынын күтүлгөн жыйынтыгы
  });

  it("exit ticket'теги туура жооптор XP бербейт (xp жазылса да), бонус гана", () => {
    const withXp = structuredClone(content);
    const exit = withXp.stages[4];
    exit.blocks = exit.blocks.map((b) => (b.type === "mcq" ? { ...b, xp: 10 } : b));
    const answers: Answers = {};
    for (const b of exit.blocks) {
      const r = correctResponse(b);
      if (r) answers[b.id] = saved(gradeAnswer(b, r, undefined, true));
    }
    expect(computeXp(withXp, answers, false)).toBe(0);
    expect(computeXp(withXp, answers, true)).toBe(EXIT_BONUS_XP);
  });

  it("бааланган блок ката болсо бөлүк бүтпөйт", () => {
    const st = content.stages.find((s) => s.blocks.some((b) => b.type === "mcq" && s.key !== "exit"))!;
    const answers: Answers = {};
    for (const b of st.blocks) {
      const r = correctResponse(b);
      if (r) answers[b.id] = saved(gradeAnswer(b, r, undefined, false));
    }
    const m = st.blocks.find((b) => b.type === "mcq") as McqBlock;
    answers[m.id] = saved(gradeAnswer(m, { picked: (m.correct + 1) % m.options.length }, undefined, false));
    expect(stageDone(st, answers)).toBe(false);
  });

  it("findBlock бөлүктү табат", () => {
    const b = content.stages[2].blocks[0];
    expect(findBlock(content, b.id)).toEqual({ block: b, stageIdx: 2 });
    expect(findBlock(content, "жок")).toBeUndefined();
  });
});
