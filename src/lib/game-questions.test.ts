import { describe, expect, it } from "vitest";
import { GAME_SETS } from "@/content/game-sets";
import { gradeQuestion, roundScore, studentQuestion, validateQuestions, type GameQuestion, type Reveal } from "./game-questions";

const SID = "student-1";

/** Reveal'ди кайра жооп катары жөнөтсө — туура болушу керек. */
const responseFrom = (r: Reveal) =>
  r.type === "choice" ? { pick: r.correct } : r.type === "match" ? { picks: r.picks } : r.type === "order" ? { order: r.order } : { groups: r.groups };

/** Форматы туура, бирок мааниси кокус жооп. */
const anyResponse = (q: GameQuestion) => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => i);
  return q.type === "choice" ? { pick: 0 } : q.type === "match" ? { picks: ids(q.pairs.length) } : q.type === "order" ? { order: ids(q.steps.length) } : { groups: q.items.map(() => 0) };
};

describe("даяр оюн топтомдору", () => {
  it.each(GAME_SETS)("$slug: суроолор текшерүүдөн өтөт", (set) => {
    expect(validateQuestions(set.questions)).toEqual([]);
    expect(set.questions.length).toBeGreaterThanOrEqual(6);
  });

  it("slug'дар кайталанбайт", () => {
    expect(new Set(GAME_SETS.map((s) => s.slug)).size).toBe(GAME_SETS.length);
  });

  it.each(GAME_SETS.flatMap((s) => s.questions.map((q) => [`${s.slug}/${q.id}`, q] as const)))("%s: көрсөтүлгөн туура жооп туура бааланат", (_, q) => {
    const probe = gradeQuestion(q, SID, anyResponse(q));
    expect(probe).not.toBeNull();
    expect(gradeQuestion(q, SID, responseFrom(probe!.reveal))?.correct).toBe(true);
  });
});

describe("окуучунун көрүнүшү", () => {
  const sort: GameQuestion = { id: "q", type: "sort", prompt: "P", categories: ["A", "B"], items: [{ text: "a1", category: 0 }, { text: "b1", category: 1 }, { text: "a2", category: 0 }], explain: "SECRET" };
  const match: GameQuestion = { id: "m", type: "match", prompt: "P", pairs: [{ left: "L1", right: "R1" }, { left: "L2", right: "R2" }, { left: "L3", right: "R3" }] };

  it("туура жоопту жана түшүндүрмөнү камтыбайт", () => {
    const view = JSON.stringify([studentQuestion(sort, SID), studentQuestion({ id: "c", type: "choice", prompt: "P", options: ["A", "B"], correct: 1, explain: "SECRET" }, SID)]);
    expect(view).not.toContain("SECRET");
    expect(view).not.toContain("correct");
    expect(view).not.toContain("category");
  });

  it("аралаштыруу окуучу боюнча туруктуу", () => {
    expect(studentQuestion(match, SID)).toEqual(studentQuestion(match, SID));
  });

  it("экрандагы индекстер боюнча бааланат", () => {
    const view = studentQuestion(match, SID) as Extract<ReturnType<typeof studentQuestion>, { type: "match" }>;
    const picks = view.lefts.map((_, i) => view.rights.indexOf(`R${i + 1}`));
    expect(gradeQuestion(match, SID, { picks })?.correct).toBe(true);
    expect(gradeQuestion(match, SID, { picks: [...picks].reverse() })?.correct).toBe(false);
  });

  it("туура эмес форматты четке кагат", () => {
    expect(gradeQuestion(match, SID, { picks: [0, 1] })).toBeNull();
    expect(gradeQuestion(match, SID, { picks: [0, 1, 9] })).toBeNull();
    expect(gradeQuestion({ id: "o", type: "order", prompt: "P", steps: ["a", "b"] }, SID, { order: [0, 0] })).toBeNull();
    expect(gradeQuestion(sort, SID, { groups: [0, 1, 2] })).toBeNull();
    expect(gradeQuestion({ id: "c", type: "choice", prompt: "P", options: ["A", "B"], correct: 1 }, SID, { pick: "1" })).toBeNull();
  });
});

describe("суроолорду текшерүү", () => {
  it("каталарды табат", () => {
    expect(validateQuestions([])).toHaveLength(1);
    expect(validateQuestions([{ id: "a", type: "choice", prompt: "P", options: ["A", "A"], correct: 0 }])).toHaveLength(1);
    expect(validateQuestions([{ id: "a", type: "choice", prompt: "P", options: ["A", "B"], correct: 5 }])).toHaveLength(1);
    expect(validateQuestions([{ id: "a", type: "sort", prompt: "P", categories: ["A", "B"], items: [{ text: "x", category: 0 }, { text: "y", category: 0 }] }])).toHaveLength(1);
    expect(validateQuestions([{ id: "a", type: "x", prompt: "P" }])).toHaveLength(1);
    expect(validateQuestions([{ id: "a", type: "order", prompt: "P", steps: ["1", "2"] }, { id: "a", type: "order", prompt: "P", steps: ["1", "2"] }])).toHaveLength(1);
  });
});

describe("раунддун упайы", () => {
  it("биринчи жооп боюнча эсептелет, кайра чечилгени бүтүрүүгө кирет", () => {
    const r = roundScore(["a", "b"], [
      { question_id: "a", is_correct: true },
      { question_id: "b", is_correct: false },
      { question_id: "b", is_correct: true },
    ]);
    expect(r).toEqual({ score: 50, firstTry: 1, complete: true });
  });
  it("чечилбеген суроо болсо — бүткөн жок", () => {
    expect(roundScore(["a", "b"], [{ question_id: "a", is_correct: true }]).complete).toBe(false);
  });
});

import { applyLessonGameAnswer, readLessonGame } from "./game-questions";
import { stageDone } from "./grading";
import { checkStructure, emptyLesson, validateLesson } from "./lesson-edit";

describe("сабактын ичиндеги оюндун абалы", () => {
  const ids = ["a", "b"];
  it("ката кетирилген суроону кайра чечкенде раунд бүтөт, упай биринчи жооп боюнча", () => {
    let s = applyLessonGameAnswer(undefined, ids, "r1", "a", false);
    s = applyLessonGameAnswer(s, ids, "r1", "b", true);
    expect(s.complete).toBe(false);
    s = applyLessonGameAnswer(s, ids, "r1", "a", true);
    expect(s).toMatchObject({ complete: true, score: 50, best: 50, rounds: 1 });
  });
  it("жаңы раунд башынан башталат, рекорд сакталат", () => {
    let s = applyLessonGameAnswer(undefined, ids, "r1", "a", true);
    s = applyLessonGameAnswer(s, ids, "r1", "b", true);
    s = applyLessonGameAnswer(s, ids, "r2", "a", false);
    expect(s).toMatchObject({ round: "r2", complete: false, best: 100, rounds: 1, solved: [] });
  });
  it("бүткөн раундга кийинки жооптор упайды өзгөртпөйт", () => {
    let s = applyLessonGameAnswer(undefined, ["a"], "r1", "a", true);
    s = applyLessonGameAnswer(s, ["a"], "r1", "a", false);
    expect(s).toMatchObject({ complete: true, score: 100, rounds: 1 });
  });
  it("бузук абалды коопсуз окуйт", () => {
    expect(readLessonGame({ first: { a: "yes" }, solved: [1, "b"], best: 900, rounds: -2 })).toMatchObject({ first: {}, solved: ["b"], best: null, rounds: 0 });
  });
});

describe("оюн блогу сабакта", () => {
  const SET = "50000000-0000-0000-0000-000000007001";
  it("бөлүк оюн толук бүткөндө гана аткарылат", () => {
    const stage = { key: "reinforce" as const, title: "К", minutes: 5, blocks: [{ id: "r1", type: "game" as const, setId: SET, title: "Оюн" }] };
    expect(stageDone(stage, { r1: { response: {}, is_correct: null, tries: 0 } })).toBe(false);
    expect(stageDone(stage, { r1: { response: {}, is_correct: true, tries: 1 } })).toBe(true);
  });
  it("тандалбаган оюнду жана Баалоодогу оюнду белгилейт", () => {
    const c = emptyLesson();
    c.stages[3].blocks.push({ id: "r1", type: "game", setId: "", title: "" });
    c.stages[4].blocks.push({ id: "e9", type: "game", setId: SET, title: "Оюн" });
    const msgs = validateLesson("Т", c).filter((i) => i.blockId === "r1" || i.blockId === "e9").map((i) => i.message);
    expect(msgs).toContain("Оюнду тандаңыз.");
    expect(msgs.some((m) => m.includes("Баалоо"))).toBe(true);
  });
  it("суроолор же жооптор сабактын ичинде сакталбайт", () => {
    const c = emptyLesson();
    c.stages[3].blocks.push({ id: "r1", type: "game", setId: SET, title: "Оюн", answerKey: [] });
    expect(checkStructure(c)).toBe("Оюн блогунун форматы туура эмес.");
    c.stages[3].blocks[0] = { id: "r1", type: "game", setId: SET, title: "Оюн" };
    expect(checkStructure(c)).toBeNull();
  });
});
