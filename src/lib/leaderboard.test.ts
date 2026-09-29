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
