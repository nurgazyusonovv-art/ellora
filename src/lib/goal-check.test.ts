import { describe, expect, it } from "vitest";
import { boardSlides } from "./board-slides";
import { goalCheckInput, goalSummary, lessonGoal, readGoalCheck } from "./goal-check";
import { emptyLesson } from "./lesson-edit";

const lesson = () => { const c = emptyLesson(); c.objectives = ["Циклди үйрөнөбүз", " "]; c.successCriteria = ["Мен range() түшүндүрө алам", "Мен цикл жаза алам"]; return c; };

describe("сабактын максаты", () => {
  it("бош саптар алынып салынат; максат жок сабакта эч нерсе көрсөтүлбөйт", () => {
    expect(lessonGoal(lesson())).toEqual({ objectives: ["Циклди үйрөнөбүз"], criteria: ["Мен range() түшүндүрө алам", "Мен цикл жаза алам"] });
    expect(lessonGoal(emptyLesson())).toBeNull();
  });
  it("өзүн баалоо ар бир критерийге так бир белги талап кылат", () => {
    expect(goalCheckInput(lesson(), [true, false])).toEqual([true, false]);
    expect(goalCheckInput(lesson(), [true])).toBeNull();
    expect(goalCheckInput(lesson(), [true, "ооба"])).toBeNull();
    expect(goalCheckInput(emptyLesson(), [])).toBeNull();
  });
  it("мугалимге критерий боюнча жыйынтык жана «азырынча жок» дегендер", () => {
    const r = goalSummary(lesson(), [
      { name: "Айбек", response: { met: [true, true] } },
      { name: "Нурай", response: { met: [true, false] } },
      { name: "Бузук", response: { met: [true] } },
    ]);
    expect(r.answered).toBe(2);
    expect(r.criteria[1]).toEqual({ text: "Мен цикл жаза алам", yes: 1, notYet: ["Нурай"] });
    expect(readGoalCheck(null, 2)).toBeNull();
  });
  it("тактада максат биринчи бөлүктүн эң биринчи слайды", () => {
    const c = lesson();
    const slides = boardSlides(c.stages[0], lessonGoal(c));
    expect(slides[0]).toMatchObject({ kind: "goal", criteria: ["Мен range() түшүндүрө алам", "Мен цикл жаза алам"] });
    expect(slides[1].kind).toBe("intro");
    expect(boardSlides(c.stages[1], null)[0].kind).toBe("intro");
  });
});
