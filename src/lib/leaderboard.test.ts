import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
const { rankRows, shortName } = await import("@/lib/leaderboard");

const r = (name: string, xp: number, finished = 1) => ({ id: name, name, xp, finished, rank: 0 });

describe("rankRows", () => {
  it("XP боюнча, бирдейлер бирдей орунда", () => {
    const out = rankRows([r("Бегимай", 80), r("Айбек", 120), r("Чыңгыз", 80), r("Дастан", 10)]);
    expect(out.map((x) => [x.name, x.rank])).toEqual([
      ["Айбек", 1],
      ["Бегимай", 2],
      ["Чыңгыз", 2],
      ["Дастан", 4],
    ]);
  });
  it("XP бирдей болсо — көп сабак бүтүргөн жогору", () => {
    const out = rankRows([r("А", 50, 1), r("Б", 50, 3)]);
    expect(out.map((x) => [x.name, x.rank])).toEqual([
      ["Б", 1],
      ["А", 2],
    ]);
  });
});

describe("shortName", () => {
  it("фамилия кыскарат", () => {
    expect(shortName("Айбек Маратов")).toBe("Айбек М.");
    expect(shortName("  Айбек  ")).toBe("Айбек");
  });
});

const { boardMode, weeklyPoints } = await import("@/lib/leaderboard");
describe("апталык рейтинг (4-этап)", () => {
  const at = (student_id: string, finished_at: string | null, score: number, total: number) => ({ student_id, finished_at, exit_score: score, exit_total: total });
  it("акыркы 7 күндүн жылдыздары + кайталоолор; эскилери жана бүтпөгөндөрү кирбейт", () => {
    const attempts = [at("s1", "2026-11-09T05:00:00Z", 3, 3), at("s1", "2026-11-08T05:00:00Z", 1, 3), at("s1", "2026-10-01T05:00:00Z", 3, 3), at("s1", null, 0, 0), at("s2", "2026-11-09T05:00:00Z", 3, 3)];
    const reviews = [{ student_id: "s1", day: "2026-11-09", completed_at: "x" }, { student_id: "s1", day: "2026-11-10", completed_at: null }, { student_id: "s1", day: "2026-10-30", completed_at: "x" }];
    expect(weeklyPoints(attempts, reviews, "s1", "2026-11-04")).toEqual({ points: 3 + 1 + 1, finished: 2 });
  });
  it("Бишкек күнү боюнча: түн ортосунан кийин бүткөн сабак ошол күнгө кирет", () => {
    expect(weeklyPoints([at("s1", "2026-11-03T19:30:00Z", 3, 3)], [], "s1", "2026-11-04").points).toBe(3);
  });
  it("режим: 0023 жок болсо мурунку белгиден", () => {
    expect([boardMode({ leaderboard_mode: "weekly" }), boardMode({ show_leaderboard: false }), boardMode({ show_leaderboard: true }), boardMode({})]).toEqual(["weekly", "off", "xp", "xp"]);
  });
});
