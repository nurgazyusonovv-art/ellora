import { describe, expect, it } from "vitest";
import { answerPoints, canAnswer, generatePin, liveQuestions, nextStep, questionTime, rankPlayers, studentLiveQuestion } from "./live-game";
import { validateQuestions, type GameQuestion } from "./game-questions";

describe("жандуу оюн", () => {
  it("упай: тактык 500 ар дайым, ылдамдык 500гө чейин; бонус өчүк болсо 1000", () => {
    expect(answerPoints(false, 1000, 20000, true)).toBe(0);
    expect(answerPoints(true, 0, 20000, true)).toBe(1000);
    expect(answerPoints(true, 10000, 20000, true)).toBe(750);
    expect(answerPoints(true, 25000, 20000, true)).toBe(500);
    expect(answerPoints(true, 19000, 20000, false)).toBe(1000);
  });

  it("жооп учурдагы суроого жана убакыт ичинде гана", () => {
    const live = { status: "question" as const, q_index: 2, q_started_at: "2026-11-10T10:00:00.000Z" };
    const t0 = Date.parse("2026-11-10T10:00:00.000Z");
    expect(canAnswer(live, 2, 20, t0 + 5000)).toBe(true);
    expect(canAnswer(live, 2, 20, t0 + 21000)).toBe(true); // кечигүү үчүн 1,5 сек
    expect(canAnswer(live, 2, 20, t0 + 22000)).toBe(false);
    expect(canAnswer(live, 1, 20, t0 + 5000)).toBe(false);
    expect(canAnswer({ ...live, status: "reveal" }, 2, 20, t0 + 5000)).toBe(false);
  });

  it("абалдардын ирети", () => {
    expect(nextStep("lobby", -1, 3)).toEqual({ status: "question", q_index: 0 });
    expect(nextStep("question", 0, 3)).toEqual({ status: "reveal", q_index: 0 });
    expect(nextStep("reveal", 0, 3)).toEqual({ status: "question", q_index: 1 });
    expect(nextStep("reveal", 2, 3)).toEqual({ status: "ended", q_index: 2 });
    expect(nextStep("ended", 2, 3)).toBeNull();
    expect(nextStep("lobby", -1, 0)).toBeNull();
  });

  it("орундар, PIN, тест суроолору гана, туура жоопсуз көрүнүш", () => {
    expect(rankPlayers([{ id: "a", name: "А", score: 900 }, { id: "b", name: "Б", score: 1500 }, { id: "c", name: "В", score: 900 }]).map((p) => p.rank)).toEqual([1, 2, 2]);
    expect(generatePin(() => 0)).toBe("100000");
    expect(generatePin(() => 0.999999)).toMatch(/^\d{6}$/);
    const qs: GameQuestion[] = [
      { id: "1", type: "choice", prompt: "P", options: ["A", "B"], correct: 1, time: 10 },
      { id: "2", type: "order", prompt: "P", steps: ["a", "b"] },
    ];
    const live = liveQuestions(qs);
    expect(live).toHaveLength(1);
    expect(questionTime(live[0])).toBe(10);
    expect(JSON.stringify(studentLiveQuestion(live[0]))).not.toContain("correct");
    expect(validateQuestions([{ id: "1", type: "choice", prompt: "P", options: ["A", "B"], correct: 0, time: 3 }])).toHaveLength(1);
  });
});
