/**
 * submitAnswer / completeStage — эстутумдагы жасалма база менен.
 * Окуучунун клиенти RLS'тей иштейт: attempts'тен өз аракетин гана көрөт, эч нерсе жаза албайт.
 * Жазуу admin клиент аркылуу гана өтөт.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pythonIf } from "@/content/lessons/python-if";
import type { Block, McqBlock, ParsonsBlock } from "@/lib/lesson-types";
import { studentBlock } from "@/lib/student-view";
import { correctResponse } from "@/test/helpers";

const content = pythonIf.content;
const ME = "student-1";

type AttemptRec = {
  id: string;
  student_id: string;
  assignment_id: string;
  current_stage: number;
  xp: number;
  exit_score: number | null;
  exit_total: number | null;
  confidence: number | null;
  finished_at: string | null;
};
type AnswerRec = { attempt_id: string; block_id: string; stage: number; response: Record<string, unknown>; is_correct: boolean | null; tries: number };

const db = { attempts: [] as AttemptRec[], answers: [] as AnswerRec[] };
const writes: string[] = [];

/** Окуучунун клиенти: окуй гана алат, RLS: өз аракети жана анын жооптору. */
function userClient() {
  return {
    from(table: "attempts" | "answers" | "assignments" | "lessons") {
      if (table === "lessons") throw new Error("окуучу lessons таблицасын түз окубайт (0004)");
      const filters: [string, unknown][] = [];
      const visible = (): object[] =>
        table === "attempts"
          ? db.attempts.filter((a) => a.student_id === ME)
          : table === "assignments"
            ? [{ id: "asg", lesson_id: "L1" }] // окуучунун классынын тапшырмасы
            : db.answers.filter((r) => db.attempts.some((a) => a.id === r.attempt_id && a.student_id === ME));
      const rows = () => visible().filter((r) => filters.every(([k, v]) => (r as Record<string, unknown>)[k] === v)).map((r) => ({ ...r }));
      const q = {
        select: () => q,
        eq: (k: string, v: unknown) => (filters.push([k, v]), q),
        maybeSingle: async () => ({ data: rows()[0] ?? null }),
        then: (res: (v: { data: unknown[] }) => unknown) => Promise.resolve({ data: rows() }).then(res),
        insert: () => {
          throw new Error("окуучу түз жаза албайт");
        },
        update: () => {
          throw new Error("окуучу түз жаза албайт");
        },
        upsert: () => {
          throw new Error("окуучу түз жаза албайт");
        },
      };
      return q;
    },
  };
}

function adminClient() {
  return {
    from(table: "attempts" | "answers") {
      return {
        upsert: async (row: AnswerRec) => {
          writes.push(`${table}.upsert:${row.block_id}`);
          db.answers = db.answers.filter((r) => !(r.attempt_id === row.attempt_id && r.block_id === row.block_id));
          db.answers.push(row);
          return { error: null };
        },
        update: (patch: Partial<AttemptRec>) => ({
          eq: async (_k: "id", id: string) => {
            writes.push(`${table}.update`);
            const a = db.attempts.find((x) => x.id === id)!;
            Object.assign(a, patch);
            return { error: null };
          },
        }),
      };
    },
  };
}

vi.mock("@/lib/auth", () => ({
  requireRole: async () => ({ supabase: userClient(), profile: { id: ME, role: "student" } }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => adminClient() }));
vi.mock("@/lib/student-lessons", () => ({
  lessonContent: async (id: string) => (id === "L1" ? { title: pythonIf.title, content } : null),
}));

const { submitAnswer, completeStage } = await import("@/app/actions/student");

const attempt = (id: string, student_id = ME): AttemptRec => ({
  id,
  student_id,
  assignment_id: "asg",
  current_stage: 0,
  xp: 0,
  exit_score: null,
  exit_total: null,
  confidence: null,
  finished_at: null,
});

beforeEach(() => {
  db.attempts = [attempt("a1"), attempt("other", "student-2")];
  db.answers = [];
  writes.length = 0;
});

/** Окуучу ойноткучтагыдай жооп берет: интерактивдүү блоктор, анан керек болсо баскыч. */
/** Окуучу көргөн (аралаштырылган) саптардын ичинен туура тартипти курат. */
function studentResponse(b: Block) {
  if (b.type !== "parsons") return correctResponse(b);
  const view = studentBlock(b, undefined, false, "a1");
  if (view.type !== "parsons") throw new Error();
  const used = new Set<number>();
  const order = b.lines.map((line) => {
    const k = view.lines.findIndex((l, i) => l === line && !used.has(i));
    used.add(k);
    return k;
  });
  return { order };
}

async function playStage(si: number) {
  const st = content.stages[si];
  for (const b of st.blocks) {
    const r = studentResponse(b);
    if (r) expect((await submitAnswer("a1", b.id, r)).error).toBeUndefined();
  }
  const a = db.attempts[0];
  if (a.current_stage === si) return completeStage("a1", si);
}

describe("submitAnswer / completeStage", () => {
  it("сабакты толук өтөт: бөлүктөр ачылат, XP жана натыйжа серверде эсептелет", async () => {
    for (let si = 0; si < 5; si++) await playStage(si);
    const a = db.attempts[0];
    expect(a.current_stage).toBe(5);
    expect(a.finished_at).not.toBeNull();
    expect(a.xp).toBe(80);
    expect(a.exit_score).toBe(a.exit_total);
    expect(a.confidence).toBe(3);
    expect(writes.every((w) => w.startsWith("answers.") || w.startsWith("attempts."))).toBe(true);
  });

  it("ачыла элек бөлүккө жооп кабыл алынбайт", async () => {
    const locked = content.stages[2].blocks.find((b) => correctResponse(b))!;
    const r = await submitAnswer("a1", locked.id, correctResponse(locked)!);
    expect(r.error).toMatch(/ачыла элек/);
    expect(writes).toEqual([]);
  });

  it("башка окуучунун аракетине жооп берүүгө болбойт", async () => {
    const b = content.stages[0].blocks.find((x) => correctResponse(x))!;
    const r = await submitAnswer("other", b.id, correctResponse(b)!);
    expect(r.error).toMatch(/табылган жок/);
    expect(writes).toEqual([]);
  });

  it("жасалма is_correct жана xp эске алынбайт", async () => {
    await playStage(0);
    const m = content.stages[1].blocks.find((b) => b.type === "mcq") as McqBlock;
    const wrong = (m.correct + 1) % m.options.length;
    const r = await submitAnswer("a1", m.id, { picked: wrong, is_correct: true, xp: 9999 });
    expect(r.answer?.is_correct).toBe(false);
    expect(r.xp).toBe(0);
    expect(db.answers.find((x) => x.block_id === m.id)?.response).toEqual({ picked: wrong, wrong: [wrong] });
  });

  it("бир блокко эки жолу туура жооп XP'ни эки эселебейт", async () => {
    await playStage(0);
    const m = content.stages[1].blocks.find((b) => b.type === "mcq") as McqBlock;
    const r1 = await submitAnswer("a1", m.id, { picked: m.correct });
    const r2 = await submitAnswer("a1", m.id, { picked: m.correct });
    expect(r2.xp).toBe(r1.xp);
    expect(r2.answer?.tries).toBe(2);
  });

  it("бөлүк бүтө электе completeStage иштебейт", async () => {
    const r = await completeStage("a1", 0);
    expect(r.error).toBeDefined();
    expect(db.attempts[0].current_stage).toBe(0);
  });

  it("азыркы эмес бөлүктү бүтүрүүгө болбойт", async () => {
    expect((await completeStage("a1", 3)).error).toBeDefined();
  });

  it("exit ticket'ке экинчи жооп жана бүткөн сабакка жооп кабыл алынбайт", async () => {
    for (let si = 0; si < 4; si++) await playStage(si);
    const m = content.stages[4].blocks.find((b) => b.type === "mcq") as McqBlock;
    expect((await submitAnswer("a1", m.id, { picked: m.correct })).answer?.is_correct).toBe(true);
    expect((await submitAnswer("a1", m.id, { picked: 0 })).error).toMatch(/бир гана/);

    for (const b of content.stages[4].blocks) {
      const r = correctResponse(b);
      if (r && b.id !== m.id) await submitAnswer("a1", b.id, r);
    }
    const fin = await completeStage("a1", 4);
    expect(fin.finished).toEqual({ score: db.attempts[0].exit_score, total: db.attempts[0].exit_total });
    expect((await submitAnswer("a1", m.id, { picked: m.correct })).error).toMatch(/бүткөн/);
  });

  it("окуучунун клиенти аркылуу эч нерсе жазылбайт", async () => {
    const b = content.stages[0].blocks.find((x) => correctResponse(x))!;
    await submitAnswer("a1", b.id, correctResponse(b)!);
    expect(writes).toEqual([`answers.upsert:${b.id}`, "attempts.update"]);
  });
});

describe("туура жооптор браузерге жетпейт", () => {
  it("чечилмейинче mcq'нын туура жообу жана түшүндүрмөсү жашырылат, чечилгенде ачылат", async () => {
    await playStage(0);
    const m = content.stages[1].blocks.find((b) => b.type === "mcq") as McqBlock;
    expect(studentBlock(m, undefined, false, "a1")).toMatchObject({ correct: -1, explain: undefined });
    const wrong = await submitAnswer("a1", m.id, { picked: (m.correct + 1) % m.options.length });
    expect(wrong.block).toMatchObject({ correct: -1 });
    const right = await submitAnswer("a1", m.id, { picked: m.correct });
    expect(right.block).toMatchObject({ correct: m.correct, explain: m.explain });
  });

  it("exit ticket'те туура жооп эч качан ачылбайт", async () => {
    for (let si = 0; si < 4; si++) await playStage(si);
    const m = content.stages[4].blocks.find((b) => b.type === "mcq") as McqBlock;
    const r = await submitAnswer("a1", m.id, { picked: m.correct });
    expect(r.answer?.is_correct).toBe(true);
    expect(r.block).toMatchObject({ correct: -1 });
  });

  it("саптар аралаштырылат; баштапкы тартипти жиберсе — ката, көргөнүнөн туура курса — туура", async () => {
    for (let si = 0; si < 2; si++) await playStage(si);
    const p = content.stages.flatMap((s) => s.blocks).find((b) => b.type === "parsons") as ParsonsBlock;
    const view = studentBlock(p, undefined, false, "a1") as ParsonsBlock;
    expect(view.shuffled).toBe(true);
    expect(view.lines).not.toEqual(p.lines);
    expect([...view.lines].sort()).toEqual([...p.lines].sort());
    const naive = await submitAnswer("a1", p.id, { order: p.lines.map((_, i) => i) });
    expect(naive.answer?.is_correct).toBe(false);
    const good = await submitAnswer("a1", p.id, studentResponse(p)!);
    expect(good.answer?.is_correct).toBe(true);
    expect(good.block).toEqual(p); // чечилгенде туура тартип ачылат
  });

  it("bug_hunt: табыла элек каталар жана оңдолгон код жашырылат", () => {
    const b = content.stages.flatMap((s) => s.blocks).find((x) => x.type === "bug_hunt");
    if (!b || b.type !== "bug_hunt") return;
    const view = studentBlock(b, undefined, false, "a1");
    expect(view).toMatchObject({ bugs: [], bugCount: b.bugs.length, fixed: undefined });
  });
});
