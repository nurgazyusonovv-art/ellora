import { describe, expect, it } from "vitest";
import { generatedQuiz, quizInput, quizSchema } from "./quiz-generator";

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };
const input = quizInput(fd({ topic: "Циклдер", grade: "7", count: "5", level: "mixed", with_code: "true" }))!;
const q = (i: number, extra: Record<string, unknown> = {}) => ({ prompt: `Суроо ${i}`, code: i === 1 ? "print(2+3)" : "", options: ["5", "23", "Ката", "2+3"], correct: i % 4, explain: "Себеби ушундай.", time: 20, ...extra });
const raw = (over: Record<string, unknown> = {}) => ({ title: "Циклдер", skills: ["loops"], questions: [1, 2, 3, 4, 5].map((i) => q(i)), ...over });

describe("quizInput", () => {
  it("туура киришти кабыл алат", () => {
    expect(input).toMatchObject({ topic: "Циклдер", grade: 7, count: 5, level: "mixed", withCode: true, activityKind: "quiz" });
  });
  it("туура эмес киришти четке кагат", () => {
    expect(quizInput(fd({ topic: "", grade: "7", count: "5", level: "mixed" }))).toBeNull();
    expect(quizInput(fd({ topic: "А", grade: "3", count: "5", level: "mixed" }))).toBeNull();
    expect(quizInput(fd({ topic: "А", grade: "7", count: "30", level: "mixed" }))).toBeNull();
    expect(quizInput(fd({ topic: "А", grade: "7", count: "5", level: "super" }))).toBeNull();
  });
});

describe("generatedQuiz", () => {
  it("схема так count суроону талап кылат", () => {
    const s = quizSchema(input) as { properties: { questions: { minItems: number; maxItems: number } } };
    expect(s.properties.questions.minItems).toBe(5);
    expect(s.properties.questions.maxItems).toBe(5);
  });
  it("тест суроолоруна айлантат, бош кодду алып салат", () => {
    const r = generatedQuiz(raw(), input)!;
    expect(r.questions).toHaveLength(5);
    expect(r.questions[0]).toMatchObject({ id: "q1", type: "choice", code: "print(2+3)", correct: 1, time: 20 });
    expect(r.questions[1].code).toBeUndefined();
  });
  it("бузулган жоопту четке кагат", () => {
    expect(generatedQuiz(raw({ questions: [1, 2, 3, 4].map((i) => q(i)) }), input)).toBeNull();
    expect(generatedQuiz(raw({ questions: [1, 2, 3, 4, 5].map((i) => q(i, i === 2 ? { correct: 7 } : {})) }), input)).toBeNull();
    expect(generatedQuiz(raw({ questions: [1, 2, 3, 4, 5].map((i) => q(i, i === 3 ? { options: ["a", "a", "b", "c"] } : {})) }), input)).toBeNull();
    expect(generatedQuiz(raw({ questions: [1, 2, 3, 4, 5].map(() => q(1)) }), input)).toBeNull();
    expect(generatedQuiz(raw({ skills: ["nope"] }), input)).toBeNull();
  });
});
