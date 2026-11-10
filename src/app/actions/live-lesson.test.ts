import { beforeEach, describe, expect, it, vi } from "vitest";

const ID = "30000000-0000-0000-0000-000000008001";
type Session = { max_stage: number; paused: boolean; ended: boolean; timed: boolean | null; [k: string]: unknown };
const db = vi.hoisted(() => ({
  ownClass: true,
  delivery: "class" as string,
  dueAt: null as string | null,
  session: null as Session | null,
  role: "teacher",
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/auth", () => ({
  requireRole: async (role: string) => {
    if (role !== db.role) throw Error("forbidden");
    return { profile: { id: "T1" }, supabase: client() };
  },
}));

/** RLS'ке окшош жасалма клиент: мугалим өз классынын дайындамасын жана сессиясын гана көрөт. */
function client() {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let op: "select" | "update" | "delete" = "select";
      let patch: Record<string, unknown> = {};
      const q = {
        select: () => q,
        eq: (k: string, v: unknown) => ((filters[k] = v), q),
        update: (p: Record<string, unknown>) => ((op = "update"), (patch = p), q),
        delete: () => ((op = "delete"), q),
        upsert: async (row: Session) => {
          if (table === "lesson_sessions") db.session = { ...row };
          return { error: null };
        },
        maybeSingle: async () => {
          if (table === "assignments") return { data: { id: ID, class_id: "C1", lessons: { content: { stages: [{ blocks: [{ id: "p1" }, { id: "p2" }] }] } } } };
          if (table === "classes") return { data: db.ownClass ? { id: "C1" } : null };
          return { data: db.session, error: null };
        },
        then: (res: (v: { data: unknown; error: null }) => unknown) => {
          let data: unknown = null;
          if (table === "assignments" && op === "update") {
            if (typeof patch.delivery === "string") db.delivery = patch.delivery;
            if (typeof patch.due_at === "string") db.dueAt = patch.due_at;
          }
          if (table === "lesson_sessions" && op === "delete") db.session = null;
          if (table === "lesson_sessions" && op === "update") {
            const ok = db.session && (filters.max_stage === undefined || filters.max_stage === db.session.max_stage);
            if (ok) Object.assign(db.session!, patch);
            data = ok ? [{ assignment_id: ID }] : [];
          }
          return Promise.resolve({ data, error: null }).then(res);
        },
      };
      return q;
    },
  };
}

import { liveCommand } from "./live-lesson";

const fd = (v: Record<string, string | number>) => {
  const f = new FormData();
  f.set("assignmentId", ID);
  for (const [k, x] of Object.entries(v)) f.set(k, String(x));
  return f;
};

beforeEach(() => {
  db.ownClass = true;
  db.delivery = "class";
  db.dueAt = null;
  db.session = null;
  db.role = "teacher";
});

describe("мугалим башкарган сабак", () => {
  it("баштайт жана бөлүктөрдү которот", async () => {
    expect((await liveCommand(undefined, fd({ command: "start" })))?.success).toBeTruthy();
    expect(db.session).toMatchObject({ max_stage: 0, paused: false, ended: false, timed: false });
    expect((await liveCommand(undefined, fd({ command: "next", stage: 0 })))?.success).toBeTruthy();
    expect(db.session?.max_stage).toBe(1);
    await liveCommand(undefined, fd({ command: "pause", stage: 1 }));
    expect(db.session?.paused).toBe(true);
    await liveCommand(undefined, fd({ command: "next", stage: 1 }));
    expect(db.session).toMatchObject({ max_stage: 2, paused: false });
    await liveCommand(undefined, fd({ command: "back", stage: 2 }));
    expect(db.session?.max_stage).toBe(1);
  });

  it("эски экрандан кайра басылса бөлүктү аттап кетпейт", async () => {
    await liveCommand(undefined, fd({ command: "start" }));
    await liveCommand(undefined, fd({ command: "next", stage: 0 }));
    expect((await liveCommand(undefined, fd({ command: "next", stage: 0 })))?.error).toContain("өзгөрдү");
    expect(db.session?.max_stage).toBe(1);
  });

  it("эки жолу баштоого, акыркыдан ары өтүүгө жана жабылгандан кийин которууга болбойт", async () => {
    await liveCommand(undefined, fd({ command: "start" }));
    expect((await liveCommand(undefined, fd({ command: "start" })))?.error).toBeTruthy();
    db.session!.max_stage = 4;
    expect((await liveCommand(undefined, fd({ command: "next", stage: 4 })))?.error).toContain("акыркы");
    await liveCommand(undefined, fd({ command: "close", stage: 4 }));
    expect(db.session?.ended).toBe(true);
    expect((await liveCommand(undefined, fd({ command: "back", stage: 4 })))?.error).toBeTruthy();
  });

  it("«үйдө бүтүрсүн» сессияны сактап, үй тапшырмасы деп белгилейт (0021)", async () => {
    await liveCommand(undefined, fd({ command: "start" }));
    expect((await liveCommand(undefined, fd({ command: "homework", stage: 0, due_at: "2026-11-20" })))?.success).toBeTruthy();
    expect(db.session).toMatchObject({ homework: true, ended: true, paused: false });
    expect(db.session?.ended_at).toBeTruthy();
    expect(db.delivery).toBe("class");
    expect(db.dueAt).toBe(new Date("2026-11-20T23:59:00+06:00").toISOString());
  });

  it("жабылган сабакты үйдө бүтүрүүгө ачып, кайра жабат; бүткөн убакыт өзгөрбөйт", async () => {
    await liveCommand(undefined, fd({ command: "start" }));
    await liveCommand(undefined, fd({ command: "close", stage: 0 }));
    const endedAt = db.session?.ended_at;
    await liveCommand(undefined, fd({ command: "homework", stage: 0 }));
    expect(db.session).toMatchObject({ homework: true, ended: true, ended_at: endedAt });
    expect((await liveCommand(undefined, fd({ command: "close", stage: 0 })))?.success).toBeTruthy();
    expect(db.session).toMatchObject({ homework: false, ended: true });
  });

  it("тактага чыгарат, туура жоопту ачат жана ачык жоопту жашырат", async () => {
    await liveCommand(undefined, fd({ command: "start" }));
    db.session!.spotlight_reveal = true;
    expect((await liveCommand(undefined, fd({ command: "spotlight", block: "p2" })))?.success).toBeTruthy();
    expect(db.session).toMatchObject({ spotlight_block: "p2", spotlight_reveal: false, max_stage: 0 });
    await liveCommand(undefined, fd({ command: "reveal", on: "true" }));
    expect(db.session?.spotlight_reveal).toBe(true);
    const att = "40000000-0000-0000-0000-000000000001";
    await liveCommand(undefined, fd({ command: "hide", attempt: att }));
    await liveCommand(undefined, fd({ command: "hide", attempt: att }));
    expect(db.session?.spotlight_hidden).toEqual([att]);
    await liveCommand(undefined, fd({ command: "unhide", attempt: att }));
    expect(db.session?.spotlight_hidden).toEqual([]);
    await liveCommand(undefined, fd({ command: "spotlight", block: "" }));
    expect(db.session?.spotlight_block).toBeNull();
  });

  it("тактага сабакта жок тапшырманы же жараксыз жоопту кабыл албайт", async () => {
    await liveCommand(undefined, fd({ command: "start" }));
    expect((await liveCommand(undefined, fd({ command: "spotlight", block: "zzz" })))?.error).toBeTruthy();
    expect((await liveCommand(undefined, fd({ command: "hide", attempt: "bad" })))?.error).toBeTruthy();
    db.session = null;
    expect((await liveCommand(undefined, fd({ command: "spotlight", block: "p1" })))?.error).toBeTruthy();
  });

  it("башка мугалимдин сабагын, жалпы таймерди жана жараксыз буйрукту четке кагат", async () => {
    db.ownClass = false;
    expect((await liveCommand(undefined, fd({ command: "start" })))?.error).toBeTruthy();
    expect(db.session).toBeNull();
    db.ownClass = true;
    db.session = { max_stage: 1, paused: false, ended: false, timed: true };
    expect((await liveCommand(undefined, fd({ command: "next", stage: 1 })))?.error).toContain("таймер");
    expect((await liveCommand(undefined, fd({ command: "jump" })))?.error).toBeTruthy();
    db.role = "student";
    await expect(liveCommand(undefined, fd({ command: "start" }))).rejects.toThrow();
  });
});
