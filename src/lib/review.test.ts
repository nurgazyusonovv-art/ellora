import { describe, expect, it } from "vitest";
import { addDays, bishkekDay, pathGroups, pickReview, reviewStreak, type ReviewCandidate } from "./review";

const c = (a: string, b: string, weak = false, at = "2026-11-01"): ReviewCandidate => ({ assignmentId: a, blockId: b, weak, at });

describe("күнүмдүк кайталоонун суроолору", () => {
  it("адегенде жаңылган суроолор, ар сабактан кезек менен", () => {
    const picked = pickReview([c("A", "a1"), c("A", "a2", true), c("A", "a3", true), c("B", "b1"), c("B", "b2", true)], [], "s1:2026-11-10");
    expect(picked).toHaveLength(3);
    expect(picked.slice(0, 2).map((x) => x.a).sort()).toEqual(["A", "B"]);
    expect(picked.slice(0, 2).every((x) => ["a2", "a3", "b2"].includes(x.b))).toBe(true);
  });

  it("акыркы күндөрдө берилгендер мүмкүн болсо кайталанбайт", () => {
    const picked = pickReview([c("A", "a1"), c("A", "a2"), c("A", "a3"), c("A", "a4")], [{ a: "A", b: "a1" }, { a: "A", b: "a2" }], "seed");
    expect(picked.map((x) => x.b).slice(0, 2).sort()).toEqual(["a3", "a4"]);
    expect(picked).toHaveLength(3);
  });

  it("суроо аз болсо барын берет; кайталанган дайындама бир эсептелет; туруктуу", () => {
    expect(pickReview([c("A", "a1"), c("A", "a1")], [], "x")).toEqual([{ a: "A", b: "a1" }]);
    expect(pickReview([], [], "x")).toEqual([]);
    const list = [c("A", "a1"), c("B", "b1"), c("C", "c1"), c("D", "d1")];
    expect(pickReview(list, [], "same")).toEqual(pickReview(list, [], "same"));
  });
});

describe("серия жана күн", () => {
  it("катары менен күндөрдү санайт; бүгүн али аткарылбаса кечээден", () => {
    expect(reviewStreak(["2026-11-08", "2026-11-09", "2026-11-10"], "2026-11-10")).toBe(3);
    expect(reviewStreak(["2026-11-08", "2026-11-09"], "2026-11-10")).toBe(2);
    expect(reviewStreak(["2026-11-07", "2026-11-09"], "2026-11-10")).toBe(1);
    expect(reviewStreak(["2026-11-05"], "2026-11-10")).toBe(0);
  });
  it("Бишкек убактысы жана күн кошуу", () => {
    expect(bishkekDay(new Date("2026-11-09T19:30:00Z"))).toBe("2026-11-10");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("Менин жолум", () => {
  it("чейрек боюнча топтойт, чейрексиздер аягында, ичинде эскиси биринчи", () => {
    const s = (id: string, quarter: number | null, createdAt: string) => ({ id, title: id, quarter, createdAt, stage: null, finished: false, stars: null });
    const g = pathGroups([s("c", 2, "2026-11-03"), s("a", null, "2026-09-01"), s("b", 2, "2026-11-01"), s("d", 1, "2026-10-01")]);
    expect(g.map((x) => [x.quarter, x.stops.map((y) => y.id)])).toEqual([[1, ["d"]], [2, ["b", "c"]], [null, ["a"]]]);
  });
});
