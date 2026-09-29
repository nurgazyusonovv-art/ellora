import { describe, expect, it, vi } from "vitest";
import { pythonIf } from "@/content/python-if";
import type { McqBlock } from "@/lib/lesson-types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/student-lessons", () => ({ lessonsByIds: async () => new Map() }));
const { buildReport } = await import("@/lib/student-report");

const content = pythonIf.content;
const mcq = content.stages[1].blocks.find((b) => b.type === "mcq") as McqBlock;
const wrong = (mcq.correct + 1) % mcq.options.length;

const input = (details: boolean) => ({
  student: { id: "s", full_name: "Айбек Маратов", username: "aibek1" },
  classNames: new Map([["c", "7-А"]]),
  classIds: ["c"],
  assignments: [{ id: "a", class_id: "c", created_at: "2026-09-01T05:00:00Z", due_at: null, lessons: { title: pythonIf.title, topic: pythonIf.topic, content } }],
  attempts: [
    { id: "t", assignment_id: "a", student_id: "s", current_stage: 5, xp: 80, exit_score: 2, exit_total: 3, confidence: 3, started_at: "2026-09-01T06:00:00Z", finished_at: "2026-09-01T07:00:00Z" },
  ],
  answers: [{ attempt_id: "t", block_id: mcq.id, stage: 1, response: { picked: wrong, wrong: [wrong] }, is_correct: false, tries: 1 }],
  details,
});

describe("buildReport", () => {
  it("мугалим үчүн: суроолор боюнча деталдар, туура жооп менен", () => {
    const r = buildReport(input(true));
    const b = r.lessons[0].blocks.find((x) => x.id === mcq.id)!;
    expect(b.answer).toBe(mcq.options[wrong]);
    expect(b.note).toBe(`Туура жооп: ${mcq.options[mcq.correct]}`);
  });

  it("окуучунун өзү үчүн: деталдар жана туура жооптор жок", () => {
    const r = buildReport(input(false));
    expect(r.lessons[0].blocks).toEqual([]);
    expect(JSON.stringify(r)).not.toContain(`Туура жооп`);
  });

  it("жыйынтык сандары", () => {
    const r = buildReport(input(false));
    expect(r.summary).toMatchObject({ assigned: 1, finished: 1, avgExitPct: 67, totalXp: 80, avgConfidence: 3, firstTryPct: 0 });
    expect(r.lessons[0].status).toBe("attention");
  });
});
