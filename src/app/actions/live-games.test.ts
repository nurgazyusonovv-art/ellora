import { beforeEach, describe, expect, it, vi } from "vitest";

const LIVE = "60000000-0000-0000-0000-00000000d001";
const db = vi.hoisted(() => ({
  role: "student",
  live: null as null | Record<string, unknown>,
  questions: [] as unknown[],
  answers: [] as Record<string, unknown>[],
  players: [] as Record<string, unknown>[],
  liveUpdates: [] as Record<string, unknown>[],
  redirected: "" as string,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { db.redirected = u; throw Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT" }); } }));
vi.mock("./game-sets", () => ({ ensureGameSet: async () => ({ id: "50000000-0000-0000-0000-00000000d001" }) }));

/** Жасалма таблица: фильтрлерди чогултуп, терминалдык ыкмада жооп берет. */
function table(name: string) {
  const f: Record<string, unknown> = {};
  let op: "select" | "update" | "insert" | "upsert" = "select";
  let payload: Record<string, unknown> = {};
  const result = () => {
    if (name === "game_lives") {
      if (op === "update") {
        const ok = db.live && f.status === db.live.status && f.q_index === db.live.q_index;
        if (ok) { db.liveUpdates.push(payload); Object.assign(db.live!, payload); }
        return { data: null, error: null };
      }
      return { data: db.live && (!("pin" in f) || f.pin === db.live.pin) ? db.live : null, error: null };
    }
    if (name === "game_sets") return { data: { id: "set", questions: db.questions }, error: null };
    if (name === "game_live_answers") {
      if (op === "insert") {
        if (db.answers.some((a) => a.student_id === payload.student_id && a.q_index === payload.q_index)) return { data: null, error: { code: "23505" } };
        db.answers.push(payload);
        return { data: null, error: null };
      }
      const rows = db.answers.filter((a) => Object.entries(f).every(([k, v]) => k === "live_id" || a[k] === v));
      return { data: "student_id" in f ? rows[0] ?? null : rows, error: null };
    }
    if (name === "game_live_players") {
      if (op === "upsert") {
        const i = db.players.findIndex((p) => p.student_id === payload.student_id);
        if (i >= 0) { if (!("ignore" in f)) Object.assign(db.players[i], payload); } else db.players.push({ score: 0, streak: 0, ...payload });
        return { data: null, error: null };
      }
      const rows = db.players.filter((p) => !("student_id" in f) || p.student_id === f.student_id);
      return { data: "student_id" in f ? rows[0] ?? null : rows.map((p) => ({ ...p, profiles: { full_name: `Окуучу ${p.student_id}` } })), error: null };
    }
    return { data: null, error: null };
  };
  const q: Record<string, unknown> = {
    select: () => q,
    eq: (k: string, v: unknown) => ((f[k] = v), q),
    neq: () => q,
    update: (p: Record<string, unknown>) => ((op = "update"), (payload = p), q),
    insert: (p: Record<string, unknown>) => ((op = "insert"), (payload = p), Promise.resolve(result())),
    upsert: (p: Record<string, unknown>, o?: { ignoreDuplicates?: boolean }) => ((op = "upsert"), (payload = p), o?.ignoreDuplicates && (f.ignore = true), Promise.resolve(result())),
    maybeSingle: async () => result(),
    single: async () => result(),
    returns: () => q,
    then: (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res),
  };
  return q;
}

vi.mock("@/lib/auth", () => ({
  requireRole: async (role: string) => {
    if (role !== db.role) throw Error("forbidden");
    return { profile: { id: db.role === "student" ? "s1" : "t1" }, supabase: { from: table } };
  },
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: table }) }));

import { answerLive, controlLive, joinLive, playState } from "./live-games";

const q1 = { id: "q1", type: "choice", prompt: "2+2?", options: ["3", "4", "5"], correct: 1, time: 20 };
beforeEach(() => {
  db.role = "student";
  db.questions = [q1, { id: "q2", type: "choice", prompt: "?", options: ["A", "B"], correct: 0 }, { id: "o", type: "order", prompt: "P", steps: ["a", "b"] }];
  db.live = { id: LIVE, set_id: "set", class_id: "c", teacher_id: "t1", pin: "123456", status: "question", q_index: 0, q_started_at: new Date(Date.now() - 5000).toISOString(), speed_bonus: true };
  db.answers = [];
  db.players = [];
  db.liveUpdates = [];
  db.redirected = "";
});

describe("жандуу оюн: окуучу", () => {
  it("жоопту кабыл алат, упайды серверде эсептейт, тууралыкты суроо жүрүп жатканда ачпайт", async () => {
    expect(await answerLive(LIVE, 0, 1)).toEqual({ ok: true });
    expect(db.answers[0]).toMatchObject({ correct: true, picked: 1 });
    expect(db.answers[0].points as number).toBeGreaterThan(800);
    expect(db.players[0]).toMatchObject({ student_id: "s1", streak: 1 });
    const s = await playState(LIVE);
    expect(s).toMatchObject({ status: "question", mine: { picked: 1 } });
    expect(JSON.stringify(s)).not.toContain("correctIndex");
    expect("correct" in ((s as { mine: object }).mine)).toBe(false);
  });

  it("бир суроого эки жолу, кеч, башка суроого жана жараксыз вариант кабыл алынбайт", async () => {
    await answerLive(LIVE, 0, 0);
    expect((await answerLive(LIVE, 0, 1)).error).toContain("мурунтан");
    expect((await answerLive(LIVE, 1, 0)).error).toBeTruthy();
    expect((await answerLive(LIVE, 0, 9)).error).toBeTruthy();
    db.live!.q_started_at = new Date(Date.now() - 30000).toISOString();
    db.answers = [];
    expect((await answerLive(LIVE, 0, 1)).error).toBe("Убакыт бүттү.");
    expect(db.players[0]?.score ?? 0).toBe(0);
  });

  it("суроо жабылгандан кийин туура жоопту, упайды жана орунду көрсөтөт; аягында подиум", async () => {
    await answerLive(LIVE, 0, 0);
    db.live!.status = "reveal";
    expect(await playState(LIVE)).toMatchObject({ correctIndex: 1, mine: { picked: 0, correct: false, points: 0 }, rank: 1 });
    db.live!.status = "ended";
    expect(await playState(LIVE)).toMatchObject({ podium: [expect.objectContaining({ rank: 1 })] });
  });

  it("тест эмес суроолор оюнга кирбейт; PIN текшерилет", async () => {
    expect((await playState(LIVE)) as { total: number }).toMatchObject({ total: 2 });
    const fd = new FormData();
    fd.set("pin", "12");
    expect((await joinLive(undefined, fd))?.error).toBeTruthy();
    fd.set("pin", "999999");
    expect((await joinLive(undefined, fd))?.error).toBeTruthy();
    fd.set("pin", "123456");
    await expect(joinLive(undefined, fd)).rejects.toThrow("NEXT_REDIRECT");
    expect(db.redirected).toBe(`/play/${LIVE}`);
  });
});

describe("жандуу оюн: мугалим", () => {
  beforeEach(() => {
    db.role = "teacher";
    db.live!.status = "lobby";
    db.live!.q_index = -1;
  });
  it("абалдарды ирети менен которот; суроо башталганда убакыт коюлат", async () => {
    await controlLive(LIVE, "next", { status: "lobby", q_index: -1 });
    expect(db.live).toMatchObject({ status: "question", q_index: 0 });
    expect(db.liveUpdates[0]).toHaveProperty("q_started_at");
    await controlLive(LIVE, "next", { status: "question", q_index: 0 });
    expect(db.live).toMatchObject({ status: "reveal" });
    await controlLive(LIVE, "next", { status: "reveal", q_index: 0 });
    await controlLive(LIVE, "next", { status: "question", q_index: 1 });
    await controlLive(LIVE, "next", { status: "reveal", q_index: 1 });
    expect(db.live).toMatchObject({ status: "ended" });
  });
  it("эски экрандан басылса эч нерсе өзгөрбөйт; окуучу башкара албайт", async () => {
    await controlLive(LIVE, "next", { status: "question", q_index: 3 });
    expect(db.liveUpdates).toEqual([]);
    db.role = "student";
    await expect(controlLive(LIVE, "end", { status: "lobby", q_index: -1 })).rejects.toThrow();
  });
});
