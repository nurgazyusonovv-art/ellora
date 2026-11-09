import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameQuestion } from "@/lib/game-questions";

const ID = "00000000-0000-0000-0000-000000007001";
const ROUND = "00000000-0000-0000-0000-000000007002";
const questions: GameQuestion[] = [
  { id: "q1", type: "choice", prompt: "P1", options: ["A", "B"], correct: 1, explain: "E1" },
  { id: "q2", type: "choice", prompt: "P2", options: ["A", "B"], correct: 0 },
];

const state = vi.hoisted(() => ({
  role: "student",
  game: null as null | { assignment: { id: string }; set: { questions: unknown[] } },
  inserts: [] as { table: string; row: Record<string, unknown> }[],
  upserts: [] as Record<string, unknown>[],
  roundRows: [] as { question_id: string; is_correct: boolean }[],
  progress: null as null | Record<string, unknown>,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/game-data", () => ({ studentGame: async () => state.game }));
vi.mock("@/lib/auth", () => ({
  requireRole: async (role: string) => {
    if (role !== state.role) throw Error("forbidden");
    // Окуучунун клиенти: өз раундундагы жооптор (RLS).
    const q = { select: () => q, eq: () => q, order: async () => ({ data: state.roundRows }) };
    return { profile: { id: "student-1" }, supabase: { from: () => q } };
  },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const q = {
        insert: async (row: Record<string, unknown>) => (state.inserts.push({ table, row }), { error: null }),
        upsert: async (row: Record<string, unknown>) => (state.upserts.push(row), { error: null }),
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: state.progress }),
      };
      return q;
    },
  }),
}));

import { answerGameQuestion, finishGameRound } from "./game-sets";

beforeEach(() => {
  state.role = "student";
  state.game = { assignment: { id: ID }, set: { questions } };
  state.inserts = [];
  state.upserts = [];
  state.roundRows = [];
  state.progress = null;
});

describe("оюндун жоопторун сервер баалайт", () => {
  it("туура жоопту серверде аныктап, жазат жана түшүндүрмөнү кайтарат", async () => {
    const r = await answerGameQuestion(ID, ROUND, "q1", { pick: 1, is_correct: false });
    expect(r).toMatchObject({ correct: true, explain: "E1", reveal: { type: "choice", correct: 1 } });
    expect(state.inserts).toEqual([{ table: "game_answers", row: expect.objectContaining({ assignment_id: ID, round_id: ROUND, question_id: "q1", is_correct: true, student_id: "student-1" }) }]);
  });

  it("кардардын «туура» деген белгисине ишенбейт", async () => {
    const r = await answerGameQuestion(ID, ROUND, "q1", { pick: 0, correct: true });
    expect(r.correct).toBe(false);
    expect(state.inserts[0].row.is_correct).toBe(false);
    expect(state.inserts[0].row.response).toEqual({ pick: 0 });
  });

  it("жеткиликсиз оюнду, белгисиз суроону жана жараксыз id'ни четке кагат", async () => {
    expect((await answerGameQuestion("bad", ROUND, "q1", { pick: 1 })).error).toBeTruthy();
    expect((await answerGameQuestion(ID, ROUND, "zzz", { pick: 1 })).error).toBeTruthy();
    expect((await answerGameQuestion(ID, ROUND, "q1", { pick: 7 })).error).toBeTruthy();
    state.game = null;
    expect((await answerGameQuestion(ID, ROUND, "q1", { pick: 1 })).error).toBeTruthy();
    expect(state.inserts).toEqual([]);
  });

  it("мугалим окуучунун аракетин чакыра албайт", async () => {
    state.role = "teacher";
    await expect(answerGameQuestion(ID, ROUND, "q1", { pick: 1 })).rejects.toThrow();
  });
});

describe("раундду жабуу", () => {
  it("упайды сакталган биринчи жооптордон эсептейт", async () => {
    state.roundRows = [
      { question_id: "q1", is_correct: false },
      { question_id: "q2", is_correct: true },
      { question_id: "q1", is_correct: true },
    ];
    const r = await finishGameRound(ID, ROUND);
    expect(r).toEqual({ score: 50, firstTry: 1, total: 2, best: 50 });
    expect(state.upserts[0]).toMatchObject({ rounds: 1, last_score: 50, best_score: 50, last_round: ROUND });
  });

  it("бүтпөгөн раундду сактабайт", async () => {
    state.roundRows = [{ question_id: "q1", is_correct: true }];
    expect((await finishGameRound(ID, ROUND)).error).toBeTruthy();
    expect(state.upserts).toEqual([]);
  });

  it("бир раундду эки жолу эсептебейт жана рекордду түшүрбөйт", async () => {
    state.roundRows = [{ question_id: "q1", is_correct: true }, { question_id: "q2", is_correct: true }];
    state.progress = { rounds: 3, best_score: 100, last_round: ROUND, completed_at: "x" };
    expect(await finishGameRound(ID, ROUND)).toMatchObject({ score: 100, best: 100 });
    expect(state.upserts).toEqual([]);
    state.roundRows = [{ question_id: "q1", is_correct: false }, { question_id: "q2", is_correct: true }, { question_id: "q1", is_correct: true }];
    state.progress = { rounds: 3, best_score: 100, last_round: "other", completed_at: "x" };
    await finishGameRound(ID, ROUND);
    expect(state.upserts[0]).toMatchObject({ rounds: 4, last_score: 50, best_score: 100, completed_at: "x" });
  });
});
