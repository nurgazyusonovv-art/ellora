import { describe, expect, it } from "vitest";
import { daysUntil, formatDate, studentStatus, todayLabel, type AttemptRow } from "@/lib/stats";

const base: AttemptRow = {
  id: "1",
  assignment_id: "a",
  student_id: "s",
  current_stage: 5,
  xp: 0,
  exit_score: 3,
  exit_total: 3,
  confidence: 4,
  started_at: new Date().toISOString(),
  finished_at: new Date().toISOString(),
};

describe("даталар (Бишкек, UTC+6)", () => {
  it("күндүн аталышы жана датасы", () => {
    expect(todayLabel(new Date("2026-09-29T05:00:00Z"))).toBe("Шейшемби, 29-сентябрь");
    // UTC 19:30 — Бишкекте эртеси
    expect(todayLabel(new Date("2026-09-29T19:30:00Z"))).toBe("Шаршемби, 30-сентябрь");
    expect(formatDate(null)).toBe("Мөөнөтсүз");
  });
  it("мөөнөткө чейинки күндөр", () => {
    const now = new Date("2026-09-29T06:00:00Z"); // Бишкекте 12:00
    expect(daysUntil("2026-09-29T17:59:00Z", now)).toBe(0); // 23:59 ошол эле күнү
    expect(daysUntil("2026-09-30T17:59:00Z", now)).toBe(1);
    expect(daysUntil("2026-09-28T17:59:00Z", now)).toBe(-1);
  });
});

describe("studentStatus", () => {
  it("абалдар", () => {
    expect(studentStatus(undefined)).toBe("not_started");
    expect(studentStatus(base)).toBe("done");
    expect(studentStatus({ ...base, exit_score: 1 })).toBe("help");
    expect(studentStatus({ ...base, exit_score: 2 })).toBe("attention");
    expect(studentStatus({ ...base, confidence: 1 })).toBe("help");
    expect(studentStatus({ ...base, finished_at: null })).toBe("started");
    expect(studentStatus({ ...base, finished_at: null, started_at: new Date(Date.now() - 30 * 36e5).toISOString() })).toBe("stuck");
  });
});
