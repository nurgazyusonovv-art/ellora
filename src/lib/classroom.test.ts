import { describe, expect, it } from "vitest";
import { classGoal, liveAllows, liveBlockedMessage, liveState, studentSession } from "./classroom";

describe("сабактын жашоо цикли (0018)", () => {
  it("«Класста өтөм» сабагы мугалим баштаганча жабык", () => {
    const s = studentSession("class", null);
    expect(s).toMatchObject({ waiting: true });
    expect(liveAllows(s, 0)).toBe(false);
    expect(liveBlockedMessage(s)).toContain("баштай элек");
    expect(liveState("class", null)).toBe("waiting");
  });
  it("өз алдынча сабак мурункудай ачык", () => {
    expect(studentSession("self", null)).toBeNull();
    expect(liveAllows(studentSession("self", null), 4)).toBe(true);
    expect(liveState("self", null)).toBe("self");
  });
  it("башталган сабак мугалим ачкан бөлүккө чейин гана ачык", () => {
    const s = studentSession("class", { max_stage: 1, paused: false });
    expect(liveState("class", s)).toBe("live");
    expect(liveAllows(s, 1)).toBe(true);
    expect(liveAllows(s, 2)).toBe(false);
  });
  it("тыныгуу жана бүтүү абалдары", () => {
    expect(liveState("class", { max_stage: 2, paused: true })).toBe("paused");
    expect(liveState("class", { max_stage: 2, paused: false, ended: true })).toBe("ended");
    expect(liveBlockedMessage({ max_stage: 2, paused: false, ended: true })).toBe("Сабак аяктады.");
  });
  it("үйдө бүтүрүүгө ачылган сабак окуучуга өз алдынча (0021)", () => {
    const session = { max_stage: 2, paused: false, ended: true, homework: true };
    expect(liveState("class", session)).toBe("homework");
    expect(studentSession("class", session)).toBeNull();
    expect(liveAllows(studentSession("class", session), 4)).toBe(true);
  });
});

describe("класстын жалпы максаты (4-этап)", () => {
  it("класстын 80%ы бөлүктү бүтүрсө жетет", () => {
    expect(classGoal(20, 25)).toEqual({ done: 20, total: 25, target: 20, reached: true });
    expect(classGoal(19, 25)?.reached).toBe(false);
    expect(classGoal(1, 1)).toMatchObject({ target: 1, reached: true });
    expect(classGoal(0, 0)).toBeNull();
  });
});
