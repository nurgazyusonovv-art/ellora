import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyLesson } from "@/lib/lesson-edit";
import type { LessonDraft } from "./teacher";

const state = vi.hoisted(() => ({ role: "teacher", from: vi.fn(), admin: vi.fn(), status: "draft", missing: false, writeResult: { data: { id: "lesson" } as { id: string } | null, error: null as { message: string } | null }, queries: [] as { filters: [string, unknown][]; payload?: Record<string, unknown> }[] }));
vi.mock("@/lib/auth", () => ({ makeJoinCode: vi.fn(), requireRole: async (role: string) => {
  if (state.role !== role) throw Error("forbidden");
  return { supabase: { from: state.from }, profile: { id: "teacher-owner" } };
} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: state.admin }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { saveLesson } from "./teacher";

const draft = (): LessonDraft => {
  const content = emptyLesson();
  content.stages[1].blocks = [{ id: "l1", type: "investigation", prompt: "Чекти салыштыр", procedure: "17, 18, 19ду сына", simulation: "condition" }];
  return { title: " Изилдөө ", topic: " Шарт ", grade: 7, content };
};

beforeEach(() => {
  state.role = "teacher"; state.status = "draft"; state.missing = false; state.queries = [];
  state.admin.mockReset(); state.from.mockReset(); state.writeResult = { data: { id: "lesson" }, error: null };
  state.from.mockImplementation(() => {
    const query: { filters: [string, unknown][]; payload?: Record<string, unknown> } = { filters: [] };
    state.queries.push(query);
    const chain = {
      select: vi.fn(() => chain),
      update: vi.fn((payload: Record<string, unknown>) => { query.payload = payload; return chain; }),
      eq: vi.fn((key: string, value: unknown) => { query.filters.push([key, value]); return chain; }),
      maybeSingle: vi.fn(async () => query.payload ? state.writeResult : { data: state.missing ? null : { status: state.status }, error: null }),
    };
    return chain;
  });
});

describe("сабактын автосактоосу", () => {
  it.each(["condition", "loop"] as const)("%s модели мазмундун ичинде өзгөрбөй сакталат", async simulation => {
    const input = draft();
    const block = input.content.stages[1].blocks[0];
    if (block.type === "investigation") block.simulation = simulation;
    const result = await saveLesson("lesson", input);
    expect(result.savedAt).toBeTruthy();
    const payload = state.queries[1].payload!;
    expect(JSON.parse(JSON.stringify(payload.content))).toEqual(input.content);
    expect(payload).toMatchObject({ title: "Изилдөө", topic: "Шарт", grade: 7 });
    expect(state.queries.every(q => q.filters.some(([k, v]) => k === "author_id" && v === "teacher-owner"))).toBe(true);
    expect(state.queries[1].filters).toContainEqual(["status", "draft"]);
    expect(state.admin).not.toHaveBeenCalled();
  });
  it("окуучу сактай албайт", async () => {
    state.role = "student";
    await expect(saveLesson("lesson", draft())).rejects.toThrow("forbidden");
    expect(state.from).not.toHaveBeenCalled();
  });
  it("авторго көрүнбөгөн сабакты өзгөртпөйт", async () => {
    state.missing = true;
    expect((await saveLesson("other", draft())).error).toContain("табылган жок");
    expect(state.queries).toHaveLength(1);
    expect(state.queries[0].filters).toContainEqual(["author_id", "teacher-owner"]);
  });
  it("жараксыз моделди базага жеткирбейт", async () => {
    const input = draft();
    const raw = JSON.parse(JSON.stringify(input));
    raw.content.stages[1].blocks[0].simulation = "arbitrary-code";
    expect((await saveLesson("lesson", raw)).error).toContain("машыктыргыч");
    expect(state.from).not.toHaveBeenCalled();
  });
  it.each([null, { ...draft(), title: {} }, { ...draft(), topic: null }])("бузук формага түшүнүктүү ката берет", async raw => {
    expect((await saveLesson("lesson", raw as unknown as LessonDraft)).error).toContain("форматы");
    expect(state.from).not.toHaveBeenCalled();
  });
  it("жарыяланган сабакка толук эмес долбоор жазылбайт", async () => {
    state.status = "published";
    expect((await saveLesson("lesson", draft())).error).toContain("жарыяланган");
    expect(state.queries).toHaveLength(1);
  });
  it("статусу өзгөргөндө жалган ийгилик кайтарбайт", async () => {
    state.writeResult.data = null;
    const result = await saveLesson("lesson", draft());
    expect(result.savedAt).toBeUndefined();
    expect(result.error).toContain("абалы өзгөрсө");
    expect(state.queries[1].filters).toContainEqual(["status", "draft"]);
  });
  it("база катасынын ички деталын чыгарбайт", async () => {
    state.writeResult = { data: null, error: { message: "private-database-detail" } };
    const result = await saveLesson("lesson", draft());
    expect(result.error).toBeTruthy();
    expect(JSON.stringify(result)).not.toContain("private-database-detail");
  });
});
