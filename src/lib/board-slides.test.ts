import { describe, expect, it } from "vitest";
import { boardSlides } from "./board-slides";
import type { Stage } from "./lesson-types";

const stage: Stage = {
  key: "learning",
  title: "Циклдер",
  intro: "Бүгүн for циклин үйрөнөбүз.",
  minutes: 10,
  blocks: [
    { id: "p", type: "presentation", title: "Түшүнүк", slides: [
      { title: "Цикл деген эмне", body: "Кайталоо", icon: "idea", diagram: [], question: "" },
      { title: "range()", body: "Сандар", icon: "computer", diagram: ["0", "1"], question: "Канча жолу?" },
    ] },
    { id: "t", type: "text", body: "Текст" },
    { id: "c", type: "code_example", code: "for i in range(3):\n    print(i)" },
    { id: "m", type: "mcq", prompt: "Канча жолу?", options: ["2", "3"], correct: 1, explain: "СЫРДУУ-ТҮШҮНДҮРМӨ", hint: "СЫРДУУ-КЕҢЕШ" },
    { id: "b", type: "bug_hunt", prompt: "Катаны тап", code: "print(x", bugs: [{ line: 1, explain: "СЫРДУУ-КАТА" }], fixed: "СЫРДУУ-ОҢДОЛГОН" },
    { id: "k", type: "code_task", prompt: "Жаз", starter: "", tests: [{ input: "", expected: "СЫРДУУ-ЧЫГУУ" }], hint: "СЫРДУУ-КЕҢЕШ2" },
    { id: "o", type: "ordering", prompt: "Иретте", steps: ["СЫРДУУ-1", "СЫРДУУ-2"] },
    { id: "f", type: "confidence", prompt: "Канчалык түшүндүң?" },
  ],
};

describe("boardSlides", () => {
  const slides = boardSlides(stage);
  it("киришүү, ар бир презентация слайды жана тапшырмалар чыгат; ишеним шкаласы чыкпайт", () => {
    expect(slides.map((s) => s.kind)).toEqual(["intro", "slide", "slide", "text", "code", "task", "task", "task", "task"]);
    expect(slides[0]).toMatchObject({ kind: "intro", title: "Циклдер", intro: "Бүгүн for циклин үйрөнөбүз." });
    expect(slides[2]).toMatchObject({ kind: "slide", n: 2, of: 2 });
  });
  it("тактага туура жооп, кеңеш, тест же каталар эч качан кирбейт", () => {
    const json = JSON.stringify(slides);
    expect(json).not.toContain("СЫРДУУ");
    expect(json).not.toContain('"correct"');
    const mcq = slides.find((s) => s.kind === "task" && s.label === "Суроо");
    expect(mcq).toMatchObject({ options: ["2", "3"] });
  });
  it("бош стартер коду көрсөтүлбөйт", () => {
    const task = slides.find((s) => s.kind === "task" && s.label === "Код жаз");
    expect(task && "code" in task ? task.code : undefined).toBeUndefined();
  });
});
