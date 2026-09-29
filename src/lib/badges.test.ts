import { describe, expect, it } from "vitest";
import { BADGE_COUNT, computeBadges } from "@/lib/badges";

const lesson = (o: Partial<{ exitScore: number; exitTotal: number; confidence: number; dueAt: string | null; finishedAt: string | null }> = {}) =>
  ({ finishedAt: "2026-09-10T05:00:00Z", dueAt: null, exitScore: 2, exitTotal: 3, confidence: 3, ...o }) as never;
const byId = (b: ReturnType<typeof computeBadges>) => Object.fromEntries(b.map((x) => [x.id, x]));

describe("computeBadges", () => {
  it("жаңы окуучуда бейдж жок, прогресс 0", () => {
    const b = computeBadges({ lessons: [], graded: [], summary: { totalXp: 0 } });
    expect(b).toHaveLength(BADGE_COUNT);
    expect(b.every((x) => !x.earned && x.progress.value === 0)).toBe(true);
  });

  it("биринчи сабак, мерген, өзүнө ишенген", () => {
    const b = byId(computeBadges({ lessons: [lesson({ exitScore: 3, confidence: 4 })], graded: [], summary: { totalXp: 50 } }));
    expect(b.first_lesson.earned && b.perfect_exit.earned && b.confident.earned).toBe(true);
    expect(b.five_lessons).toMatchObject({ earned: false, progress: { value: 1, target: 5 } });
  });

  it("бүтө элек сабак эсептелбейт", () => {
    const b = byId(computeBadges({ lessons: [lesson({ finishedAt: null, exitScore: 3 })], graded: [], summary: { totalXp: 0 } }));
    expect(b.first_lesson.earned).toBe(false);
    expect(b.perfect_exit.earned).toBe(false);
  });

  it("код, катаны тап, көшөрүү", () => {
    const graded = [
      ...Array(3).fill({ type: "code_task", correct: true, tries: 1 }),
      { type: "bug_hunt", correct: true, tries: 4 },
      { type: "bug_hunt", correct: false, tries: 5 },
    ];
    const b = byId(computeBadges({ lessons: [], graded, summary: { totalXp: 0 } }));
    expect(b.coder.earned).toBe(true);
    expect(b.bug_hunter.progress).toEqual({ value: 1, target: 3 });
    expect(b.persistent.earned).toBe(true);
  });

  it("так атуу: 10 тапшырмадан кийин тактык 80%", () => {
    const ok = Array(8).fill({ type: "mcq", correct: true, tries: 1 });
    const two = Array(2).fill({ type: "mcq", correct: true, tries: 2 });
    expect(byId(computeBadges({ lessons: [], graded: [...ok, ...two], summary: { totalXp: 0 } })).sharpshooter.earned).toBe(true);
    const bad = [...Array(7).fill({ type: "mcq", correct: true, tries: 1 }), ...Array(3).fill({ type: "mcq", correct: true, tries: 2 })];
    expect(byId(computeBadges({ lessons: [], graded: bad, summary: { totalXp: 0 } })).sharpshooter.earned).toBe(false);
    expect(byId(computeBadges({ lessons: [], graded: ok, summary: { totalXp: 0 } })).sharpshooter.progress).toEqual({ value: 8, target: 10 });
  });

  it("өз убагында: мөөнөттөн мурун гана", () => {
    const early = lesson({ dueAt: "2026-09-12T17:59:00Z", finishedAt: "2026-09-10T05:00:00Z" });
    const late = lesson({ dueAt: "2026-09-09T17:59:00Z", finishedAt: "2026-09-10T05:00:00Z" });
    expect(byId(computeBadges({ lessons: [early, early, late], graded: [], summary: { totalXp: 0 } })).on_time.progress.value).toBe(2);
  });

  it("XP бейдждери, прогресс максимумдан ашпайт", () => {
    const b = byId(computeBadges({ lessons: [], graded: [], summary: { totalXp: 730 } }));
    expect(b.xp100.earned && b.xp500.earned).toBe(true);
    expect(b.xp500.progress).toEqual({ value: 500, target: 500 });
  });
});
