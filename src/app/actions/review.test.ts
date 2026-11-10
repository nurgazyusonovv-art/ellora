import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  row: null as null | { day: string; items: { a: string; b: string }[]; answers: Record<string, { picked: number; correct: boolean }>; score: number; completed_at: string | null },
  updates: [] as Record<string, unknown>[],
  updateHits: 1,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/auth", () => ({
  requireRole: async (role: string) => {
    if (role !== "student") throw Error("forbidden");
    const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: state.row }) };
    return { profile: { id: "s1" }, supabase: { from: () => q } };
  },
}));
vi.mock("@/lib/review-data", () => ({
  reviewBlocks: async () => new Map([["A:m1", { title: "Сабак", block: { id: "m1", type: "mcq", prompt: "?", options: ["A", "B", "C"], correct: 2, explain: "Себеби…" } }]]),
  reviewStatus: async () => ({ streak: 4, doneToday: true }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const q = {
        update: (p: Record<string, unknown>) => (state.updates.push(p), q),
        eq: () => q,
        is: () => q,
        select: async () => ({ data: Array(state.updateHits).fill({ day: "d" }), error: null }),
      };
      return q;
    },
  }),
}));

import { answerReview } from "./review";

beforeEach(() => {
  state.row = { day: "d", items: [{ a: "A", b: "m1" }, { a: "A", b: "m1" }], answers: {}, score: 0, completed_at: null };
  state.updates = [];
  state.updateHits = 1;
});

describe("күнүмдүк кайталоо", () => {
  it("серверде баалап, туура жоопту жана түшүндүрмөнү кайтарат", async () => {
    const r = await answerReview(0, 1);
    expect(r).toMatchObject({ correct: false, correctIndex: 2, explain: "Себеби…", done: false, score: 0, total: 2 });
    expect(state.updates[0]).toMatchObject({ answers: { "0": { picked: 1, correct: false } }, score: 0 });
    expect(state.updates[0]).not.toHaveProperty("completed_at");
  });

  it("акыркы жооп кайталоону бүтүрөт жана серияны кайтарат", async () => {
    state.row!.answers = { "0": { picked: 2, correct: true } };
    const r = await answerReview(1, 2);
    expect(r).toMatchObject({ correct: true, done: true, score: 2, streak: 4 });
    expect(state.updates[0]).toHaveProperty("completed_at");
  });

  it("бир суроого эки жолу, жараксыз индекс же вариант кабыл алынбайт", async () => {
    state.row!.answers = { "0": { picked: 2, correct: true } };
    expect((await answerReview(0, 1)).error).toBeTruthy();
    expect((await answerReview(9, 1)).error).toBeTruthy();
    expect((await answerReview(1, 7)).error).toBeTruthy();
    expect((await answerReview(1, -1)).error).toBeTruthy();
    state.row = null;
    expect((await answerReview(0, 0)).error).toBeTruthy();
    expect(state.updates).toEqual([]);
  });

  it("бүткөн кайталоо өзгөрбөйт", async () => {
    state.updateHits = 0;
    expect((await answerReview(0, 2)).error).toBeTruthy();
  });
});
