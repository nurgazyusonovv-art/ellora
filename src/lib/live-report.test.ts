import { describe, expect, it } from "vitest";
import { emptyLesson } from "./lesson-edit";
import { lessonReport } from "./live-report";

const content = emptyLesson();
content.stages[3].blocks = [{ id: "r1", type: "mcq", prompt: "Кыйын суроо", options: ["A", "B"], correct: 1 }];
content.stages[4].blocks = [{ id: "e1", type: "mcq", prompt: "Жеңил суроо", options: ["A", "B"], correct: 0 }];

const members = ["Айбек", "Бермет", "Чынара", "Данияр", "Эрмек"].map((name, i) => ({ id: `s${i}`, name }));
const at = (id: string, student: string, stage: number, finished: string | null, exit: [number, number] | null = null) => ({
  id, student_id: student, current_stage: stage, finished_at: finished, exit_score: exit?.[0] ?? null, exit_total: exit?.[1] ?? null,
});

describe("сабактын отчету", () => {
  const report = lessonReport({
    content,
    members,
    startedAt: "2026-11-10T03:00:00Z",
    endedAt: "2026-11-10T03:42:00Z",
    attempts: [
      at("a0", "s0", 5, "2026-11-10T03:40:00Z", [1, 1]),
      at("a1", "s1", 5, "2026-11-10T03:41:00Z", [0, 1]),
      at("a2", "s2", 5, "2026-11-10T15:00:00Z", [1, 1]),
      at("a3", "s3", 2, null),
      at("x", "stranger", 5, "2026-11-10T03:10:00Z"),
    ],
    answers: [
      { attempt_id: "a0", block_id: "r1", is_correct: true, tries: 2 },
      { attempt_id: "a1", block_id: "r1", is_correct: false, tries: 1 },
      { attempt_id: "a2", block_id: "r1", is_correct: true, tries: 1 },
      { attempt_id: "a0", block_id: "e1", is_correct: true, tries: 1 },
      { attempt_id: "a1", block_id: "e1", is_correct: true, tries: 1 },
      { attempt_id: "a2", block_id: "e1", is_correct: true, tries: 1 },
      { attempt_id: "x", block_id: "r1", is_correct: false, tries: 1 },
    ],
  });

  it("убакытты, катышууну жана бүтүрүүнү эсептейт (класстан тышкаркы окуучу кирбейт)", () => {
    expect(report).toMatchObject({ minutes: 42, total: 5, joined: 4, finishedInClass: 2, finishedLater: 1 });
    expect(report.notStarted).toEqual(["Эрмек"]);
    expect(report.notFinished).toEqual(["Данияр"]);
    expect(report.lowExit).toEqual(["Бермет"]);
  });

  it("бөлүктөр боюнча прогресс", () => {
    expect(report.stages.map((s) => s.done)).toEqual([4, 4, 3, 3, 3]);
  });

  it("эң кыйын суроолорду биринчи аракет боюнча табат", () => {
    expect(report.hardest).toEqual([{ id: "r1", summary: "Кыйын суроо", pct: 33, n: 3 }]);
  });

  it("баштапкы текшерүү жок болсо өсүш жок", () => {
    expect(report.growth).toBeNull();
  });

  it("баштапкы текшерүү ↔ Баалоо боюнча класстын өсүшүн эсептейт", () => {
    const c = structuredClone(content);
    c.stages[0].blocks = [{ id: "pre1", type: "mcq", prompt: "?", options: ["A", "B"], correct: 0, precheck: true }];
    const r = lessonReport({
      content: c,
      members,
      attempts: [at("a0", "s0", 5, "2026-11-10T03:40:00Z"), at("a1", "s1", 5, "2026-11-10T03:41:00Z"), at("a3", "s3", 2, null)],
      answers: [
        { attempt_id: "a0", block_id: "pre1", is_correct: false, tries: 1 },
        { attempt_id: "a0", block_id: "e1", is_correct: true, tries: 1 },
        { attempt_id: "a1", block_id: "pre1", is_correct: true, tries: 1 },
        { attempt_id: "a1", block_id: "e1", is_correct: true, tries: 1 },
        { attempt_id: "a3", block_id: "pre1", is_correct: false, tries: 1 },
      ],
    });
    expect(r.growth).toEqual({ before: 50, after: 100, n: 2 });
  });

  it("сабак башталбаса убакыт жок", () => {
    expect(lessonReport({ content, members, attempts: [], answers: [] })).toMatchObject({ minutes: null, joined: 0, finishedInClass: 0 });
  });
});
