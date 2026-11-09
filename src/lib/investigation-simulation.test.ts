import { describe, expect, it } from "vitest";
import { emptyLesson, checkStructure } from "./lesson-edit";
import { gradeAnswer, stageDone, type SavedAnswer } from "./grading";
import type { InvestigationBlock } from "./lesson-types";
import { studentContent } from "./student-view";

const block: InvestigationBlock = { id: "l1", type: "investigation", prompt: "18 > 18 шарты кандай?", procedure: "17, 18, 19 маанилерин салыштыр.", simulation: "condition" };

describe("сабактагы кадамдык машыктыргыч", () => {
  it.each([undefined, "condition", "loop"] as const)("эски формат жана %s модели окуучуга жетет", simulation => {
    const lesson = emptyLesson();
    lesson.stages[1].blocks = [{ ...block, simulation }];
    expect(checkStructure(lesson)).toBeNull();
    const copy = JSON.parse(JSON.stringify(lesson));
    expect(checkStructure(copy)).toBeNull();
    expect(studentContent(copy, {}, "attempt").stages[1].blocks[0]).toEqual(copy.stages[1].blocks[0]);
  });
  it.each([null, "python", {}, 1, true])("жараксыз %s моделин базага өткөрбөйт", simulation => {
    const lesson = emptyLesson();
    lesson.stages[1].blocks = [{ ...block, simulation } as unknown as InvestigationBlock];
    expect(checkStructure(lesson)).toMatch(/машыктыргыч/);
  });
  it("кадамдарды басуу бөлүктү бүтүрбөйт; үч жазуу керек", () => {
    const stage = emptyLesson().stages[1];
    stage.blocks = [block];
    const prediction = gradeAnswer(block, { phase: "prediction", prediction: "Болот" }, undefined, false);
    if ("error" in prediction) throw Error(prediction.error);
    const prev: SavedAnswer = { ...prediction, tries: 1 };
    expect(stageDone(stage, { l1: prev })).toBe(false);
    expect(gradeAnswer(block, { prediction: "Болот", observations: "", conclusion: "", completed: true, xp: 100 }, prev, false)).toHaveProperty("error");
    const result = gradeAnswer(block, { prediction: "Башка ой", observations: "18 > 18 аткарылган жок", conclusion: "Барабар болуу жетишсиз", completed: true, xp: 100 }, prev, false);
    if ("error" in result) throw Error(result.error);
    expect(result.is_correct).toBeNull();
    expect(result.response).toEqual({ prediction: "Болот", observations: "18 > 18 аткарылган жок", conclusion: "Барабар болуу жетишсиз" });
    expect(stageDone(stage, { l1: { ...result, tries: 2 } })).toBe(true);
  });
});
