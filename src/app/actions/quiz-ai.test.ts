import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({ role: "teacher", reserve: "gid" as string | null, insert: vi.fn(), updates: [] as Record<string, unknown>[], redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { db.redirect(u); throw Error("NEXT_REDIRECT"); } }));
vi.mock("@/lib/auth", () => ({ requireRole: async (role: string) => { if (role !== db.role) throw Error("forbidden"); return { profile: { id: "teacher" }, supabase: { rpc: async () => ({ data: db.reserve, error: null }), from: () => { const q = { select: () => q, eq: () => q, insert: (v: unknown) => { db.insert(v); return q; }, single: async () => ({ data: { id: "set1" }, error: null }) }; return q; } } }; } }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => ({ update: (v: Record<string, unknown>) => { db.updates.push(v); const q = { eq: () => q, then: (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r) }; return q; } }) }) }));
import { generateQuiz } from "./game-ai";

const form = () => { const f = new FormData(); for (const [k, v] of Object.entries({ topic: "Python", grade: "7", count: "5", level: "mixed" })) f.set(k, v); return f; };
const result = { title: "Python", skills: ["loops"], questions: [1, 2, 3, 4, 5].map((i) => ({ prompt: `С ${i}`, code: "", options: ["a", "b", "c", "d"], correct: i % 4, explain: "Ушундай.", time: 20 })) };
const ok = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(body) }] }] }) });

beforeEach(() => { vi.clearAllMocks(); db.role = "teacher"; db.reserve = "gid"; db.updates = []; vi.stubEnv("OPENAI_API_KEY", "test-only-key"); vi.stubGlobal("fetch", ok(result)); });

it("окуучу ЖИ оюнун түзө албайт", async () => {
  db.role = "student";
  await expect(generateQuiz({}, form())).rejects.toThrow("forbidden");
  expect(fetch).not.toHaveBeenCalled();
});
it("лимит бүтсө APIге сурам кетпейт", async () => {
  db.reserve = null;
  expect((await generateQuiz({}, form())).error).toMatch(/10/);
  expect(fetch).not.toHaveBeenCalled();
});
it("ийгиликте мугалимдин оюну сакталып, редакторго өтөт", async () => {
  await expect(generateQuiz({}, form())).rejects.toThrow("NEXT_REDIRECT");
  expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ author_id: "teacher", grade: 7, topic: "Python", questions: expect.arrayContaining([expect.objectContaining({ type: "choice" })]) }));
  expect(db.redirect).toHaveBeenCalledWith("/teacher/games/sets/set1?ai=1");
  const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
  expect(body.store).toBe(false);
  expect(body.text.format.strict).toBe(true);
  expect(db.updates.at(-1)).toMatchObject({ status: "ready" });
});
it("бузулган же үзүлгөн жооп сакталбайт", async () => {
  vi.stubGlobal("fetch", ok({ ...result, questions: [] }));
  expect((await generateQuiz({}, form())).error).toBeTruthy();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Error("secret-detail")));
  const s = await generateQuiz({}, form());
  expect(s.error).not.toContain("secret-detail");
  expect(db.insert).not.toHaveBeenCalled();
  expect(db.updates.at(-1)?.status).toBe("failed");
});
