import { describe, expect, it } from "vitest";
import { createTrace } from "./code-trace";

describe("кадамдык код мисалдары", () => {
  it("18 чек арасында > жана >= эки башка бутак тандайт", () => {
    const inclusive = createTrace({ kind: "condition", age: 18, strict: false });
    const strict = createTrace({ kind: "condition", age: 18, strict: true });
    expect(inclusive.frames.map(f => f.line)).toEqual([1, 2, 3]);
    expect(strict.frames.map(f => f.line)).toEqual([1, 2, 5]);
    expect(inclusive.frames.at(-1)?.output).toEqual(["Кирүүгө болот"]);
    expect(strict.frames.at(-1)?.output).toEqual(["Азырынча болбойт"]);
  });
  it.each([0, 17, 19, 25])("шарттын калган чек маанилери: %i", age => {
    const result = createTrace({ kind: "condition", age, strict: false });
    expect(result.frames.at(-1)?.line).toBe(age >= 18 ? 3 : 5);
    expect(result.frames.slice(0, 2).every(f => f.output.length === 0)).toBe(true);
  });
  it("цикл ар бир кошууну жана акыркы жалгыз чыгышты көрсөтөт", () => {
    const { frames } = createTrace({ kind: "loop", count: 3 });
    expect(frames.filter(f => f.line === 4).map(f => f.variables.total)).toEqual([1, 3, 6]);
    expect(frames.at(-1)?.output).toEqual(["6"]);
    expect(frames.slice(0, -1).every(f => f.output.length === 0)).toBe(true);
    expect(frames[2].variables).toEqual({ n: 3, total: 0, i: 1 });
    expect(frames.at(-2)?.line).toBe(3);
  });
  it("бош циклде i жаралбайт, total нөл бойдон калат", () => {
    const { frames } = createTrace({ kind: "loop", count: 0 });
    expect(frames.map(f => f.line)).toEqual([1, 2, 3, 5]);
    expect(frames.at(-1)?.variables).toEqual({ n: 0, total: 0 });
    expect(frames.at(-1)?.output).toEqual(["0"]);
  });
  it("жогорку чекте жыйынтык туура, кадамдар чектелген", () => {
    const { frames } = createTrace({ kind: "loop", count: 8 });
    expect(frames.at(-1)?.output).toEqual(["36"]);
    expect(frames).toHaveLength(20);
  });
  it.each([-1, 9, 1.5, NaN, Infinity])("циклдин жараксыз маанисин кабыл албайт: %s", count => {
    expect(() => createTrace({ kind: "loop", count })).toThrow();
  });
  it.each([-1, 26, 0.5, NaN])("жаштын жараксыз маанисин кабыл албайт: %s", age => {
    expect(() => createTrace({ kind: "condition", age, strict: false })).toThrow();
  });
});
