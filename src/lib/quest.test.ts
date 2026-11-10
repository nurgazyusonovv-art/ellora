import { describe, expect, it } from "vitest";
import { checkStructure, emptyLesson, validateLesson } from "./lesson-edit";
import { bookEntries, cardsUnlocked, questIssues, questStructureError } from "./quest";

const card = { id: "k1", title: "if", rule: "Шарт чын болсо аткарылат.", example: "`if x > 0:`" };

describe("сабак — бир миссия", () => {
  it("түзүлүштү текшерет", () => {
    expect(questStructureError({})).toBeNull();
    expect(questStructureError({ quest: { title: "М", story: "О", goal: "Г" }, cards: [card] })).toBeNull();
    expect(questStructureError({ quest: { title: 5 } })).toBeTruthy();
    expect(questStructureError({ cards: [card, card] })).toBeTruthy();
    expect(questStructureError({ cards: [card, { ...card, id: "k2" }, { ...card, id: "k3" }, { ...card, id: "k4" }] })).toBeTruthy();
  });

  it("жарыялоодо бош талааларды белгилейт", () => {
    expect(questIssues({ quest: { title: "", story: "x", goal: "y" } })).toHaveLength(1);
    expect(questIssues({ cards: [{ ...card, rule: " " }] })).toHaveLength(1);
    expect(questIssues({})).toEqual([]);
  });

  it("деңгээл Колдонууда гана жана 1–3", () => {
    const c = emptyLesson();
    c.stages[2].blocks.push({ id: "p9", type: "mcq", prompt: "?", options: ["A", "B"], correct: 0, level: 1 });
    expect(validateLesson("Т", c).some((i) => i.message.includes("Колдонуу бөлүгүндө гана"))).toBe(true);
    const bad = emptyLesson();
    bad.stages[3].blocks.push({ id: "r9", type: "mcq", prompt: "?", options: ["A", "B"], correct: 0, level: 7 as 1 });
    expect(checkStructure(bad)).toBe("Татаалдык деңгээли 1–3 болсун.");
  });

  it("карталар Түшүндүрүү бүткөндө ачылат; китепте акыркы сабак биринчи, кайталанбайт", () => {
    expect([cardsUnlocked(2, false), cardsUnlocked(3, false), cardsUnlocked(0, true)]).toEqual([false, true, true]);
    const rows = [
      { lessonId: "L1", title: "Эски", cards: [card], currentStage: 5, finished: true, at: "2026-11-01" },
      { lessonId: "L2", title: "Жаңы", cards: [card], currentStage: 3, finished: false, at: "2026-11-09" },
      { lessonId: "L3", title: "Ачыла элек", cards: [card], currentStage: 2, finished: false, at: "2026-11-10" },
      { lessonId: "L1", title: "Эски (2-класс)", cards: [card], currentStage: 5, finished: true, at: "2026-10-01" },
      { lessonId: "L4", title: "Картасыз", currentStage: 5, finished: true, at: "2026-11-05" },
    ];
    expect(bookEntries(rows).map((e) => e.title)).toEqual(["Жаңы", "Эски"]);
  });
});
