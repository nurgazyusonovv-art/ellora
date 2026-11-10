import { describe, expect, it } from "vitest";
import { boardResult, type BoardRow } from "./live-results";
import type { Block } from "./lesson-types";

const row = (id: string, response: Record<string, unknown> | null, is_correct: boolean | null = null): BoardRow => ({ attempt_id: id, response, is_correct });

describe("тактанын жыйынтыгы", () => {
  it("тестте ар вариантты канча окуучу тандаганын жана туурасын көрсөтөт", () => {
    const b: Block = { id: "m", type: "mcq", prompt: "P", options: ["A", "B", "C"], correct: 1 };
    const r = boardResult(b, [row("1", { picked: 1 }, true), row("2", { picked: 0 }, false), row("3", { picked: 1 }, true), row("4", null)]);
    expect(r).toEqual({ kind: "choice", answered: 3, options: [{ text: "A", n: 1, correct: false }, { text: "B", n: 2, correct: true }, { text: "C", n: 0, correct: false }] });
  });

  it("ачык жоопторду атсыз, жашырылгандарсыз жана бош жооптору жок берет", () => {
    const b: Block = { id: "o", type: "open", prompt: "P" };
    const r = boardResult(b, [row("a1", { text: "Биринчи ой" }), row("a2", { text: "   " }), row("a3", { text: "Жашырылган" }), row("a4", { text: "Экинчи ой" })], ["a3"]);
    expect(r?.kind).toBe("texts");
    if (r?.kind !== "texts") return;
    expect(r.answered).toBe(4);
    expect(r.items.map((x) => x.text).sort()).toEqual(["Биринчи ой", "Экинчи ой"]);
    expect(JSON.stringify(r)).not.toContain("Жашырылган");
  });

  it("изилдөөдө жыйынтыкты, ал жок болсо божомолду көрсөтөт", () => {
    const b: Block = { id: "i", type: "investigation", prompt: "P", procedure: "Q" };
    const r = boardResult(b, [row("1", { prediction: "Божомол", conclusion: "" }), row("2", { prediction: "x", conclusion: "Жыйынтык" })]);
    expect(r?.kind === "texts" && r.items.map((x) => x.text).sort()).toEqual(["Божомол", "Жыйынтык"]);
  });

  it("ишеним шкаласын 1–4 боюнча санайт", () => {
    const b: Block = { id: "c", type: "confidence", prompt: "P" };
    expect(boardResult(b, [row("1", { value: 4 }), row("2", { value: 4 }), row("3", { value: 2 })])).toEqual({ kind: "scale", answered: 3, counts: [0, 1, 0, 2] });
  });

  it("калган бааланган блоктордо жана оюнда тууралыкты гана берет", () => {
    const b: Block = { id: "p", type: "parsons", prompt: "P", lines: ["a", "b"] };
    expect(boardResult(b, [row("1", { order: [0, 1] }, true), row("2", { order: [1, 0] }, false)])).toEqual({ kind: "score", answered: 2, correct: 1 });
    const g: Block = { id: "g", type: "game", setId: "s", title: "Оюн" };
    expect(boardResult(g, [row("1", { complete: true }, true), row("2", { complete: false }, null)])).toEqual({ kind: "score", answered: 2, correct: 1 });
  });

  it("интерактивдүү эмес блокко жыйынтык жок", () => {
    expect(boardResult({ id: "t", type: "text", body: "x" }, [])).toBeNull();
  });
});
