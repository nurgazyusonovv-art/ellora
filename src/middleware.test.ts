import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { create, getUser } = vi.hoisted(() => ({ create: vi.fn(), getUser: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: create }));
import { middleware } from "./middleware";

describe("жалпы машыгуу жана корголгон маршруттар", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: null } });
    create.mockReturnValue({ auth: { getUser } });
  });
  it("так /lab гана Auth'суз иштейт", async () => {
    const response = await middleware(new NextRequest("https://ellora.example/lab?sample=1"));
    expect(create).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });
  it.each(["/student", "/student/pathways", "/teacher/lessons", "/admin"])('корголгон %s барагы кирүүнү талап кылат', async path => {
    const response = await middleware(new NextRequest(`https://ellora.example${path}`));
    expect(getUser).toHaveBeenCalledOnce();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`https://ellora.example${path.startsWith("/student") ? "/student-login" : "/login"}`);
  });
  it.each(["/lab/private", "/laboratory"])('окшош %s жол Auth текшерүүсүн айланып өтпөйт', async path => {
    await middleware(new NextRequest(`https://ellora.example${path}`));
    expect(getUser).toHaveBeenCalledOnce();
  });
});
