import { describe, expect, it } from "vitest";
import { pythonIf } from "@/content/lessons/python-if";
import { BLOCK_TYPES, checkStructure, distributeMinutes, DURATION_OPTIONS, emptyLesson, newBlock, nextBlockId, validateLesson } from "@/lib/lesson-edit";

describe("validateLesson", () => {
  it("китепкана сабагы ката бербейт", () => {
    expect(validateLesson(pythonIf.title, pythonIf.content)).toEqual([]);
    expect(checkStructure(pythonIf.content)).toBeNull();
  });

  it("бош сабак: аты, бош бөлүктөр жана exit'теги тест талап кылынат", () => {
    const msgs = validateLesson("", emptyLesson()).map((i) => i.message);
    expect(msgs).toContain("Сабактын атын жазыңыз.");
    expect(msgs.filter((m) => m.includes("жок дегенде бир блок"))).toHaveLength(5);
    expect(msgs.some((m) => m.includes("Exit ticket"))).toBe(true);
  });

  it("жаңы блоктордун баары толтурулмайынча ката берет", () => {
    const c = emptyLesson();
    for (const t of BLOCK_TYPES) c.stages[2].blocks.push(newBlock(t, nextBlockId(c, "practice")));
    const byBlock = new Set(validateLesson("x", c).filter((i) => i.blockId).map((i) => i.blockId));
    // confidence'тин демейки суроосу бар — ал гана даяр
    expect(byBlock.size).toBe(BLOCK_TYPES.length - 1);
  });

  it("mcq'да туура жооп белгиленбесе — ката", () => {
    const c = emptyLesson();
    c.stages[2].blocks.push({ id: "p1", type: "mcq", prompt: "?", options: ["a", "b"], correct: -1 });
    expect(validateLesson("x", c).some((i) => i.blockId === "p1" && i.message.includes("Туура жоопту"))).toBe(true);
  });

  it("code_task'та тест жок болсо — ката", () => {
    const c = emptyLesson();
    c.stages[2].blocks.push({ id: "p1", type: "code_task", prompt: "?", starter: "", tests: [] });
    expect(validateLesson("x", c).some((i) => i.blockId === "p1" && i.message.includes("1 тест"))).toBe(true);
  });
});

describe("checkStructure", () => {
  it("кайталанган id'ни кармайт", () => {
    const c = emptyLesson();
    c.stages[0].blocks.push(newBlock("text", "d1"), newBlock("text", "d1"));
    expect(checkStructure(c)).toMatch(/кайталанып/);
  });
  it("бөлүктөрдүн тартиби бузулса — ката", () => {
    const c = emptyLesson();
    c.stages.reverse();
    expect(checkStructure(c)).toMatch(/5 бөлүк/);
  });
  it("туура эмес узактыкты кабыл албайт", () => {
    expect(checkStructure({ ...emptyLesson(), duration: 0 })).toMatch(/узактыгы/);
  });
});

describe("nextBlockId", () => {
  it("бөлүктүн тамгасы + бош номер", () => {
    const c = emptyLesson();
    expect(nextBlockId(c, "reinforce")).toBe("r1");
    c.stages[2].blocks.push(newBlock("text", "p1"), newBlock("text", "p3"));
    expect(nextBlockId(c, "practice")).toBe("p2");
  });
});

describe("distributeMinutes", () => {
  it.each(DURATION_OPTIONS)("%i мүнөт так бөлүштүрүлөт", (d) => {
    const m = distributeMinutes(d);
    expect(m).toHaveLength(5);
    expect(m.reduce((a, b) => a + b, 0)).toBe(d);
    expect(m.every((x) => x >= 1)).toBe(true);
  });
  it("40 мүнөт — демейки үлүштөр", () => {
    expect(distributeMinutes(40)).toEqual([5, 10, 8, 12, 5]);
  });
});
