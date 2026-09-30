import { describe, expect, it } from "vitest";
import { classRows, overview, studentRows, teacherRows, type AdminData } from "@/lib/admin-stats";

const d: AdminData = {
  profiles: [
    { id: "t1", role: "teacher", full_name: "Нургазы", username: null, school: "№1 мектеп", created_at: "2026-09-01T05:00:00Z", is_admin: true },
    { id: "t2", role: "teacher", full_name: "Айнура", username: null, school: null, created_at: "2026-09-02T05:00:00Z" },
    { id: "s1", role: "student", full_name: "Айбек Маратов", username: "aibek1", school: null, created_at: "2026-09-03T05:00:00Z" },
    { id: "s2", role: "student", full_name: "Бегимай Токтоева", username: "begimai2", school: null, created_at: "2026-09-03T05:00:00Z" },
  ],
  users: [{ id: "t1", email: "t1@example.com", last_sign_in_at: "2026-09-29T05:00:00Z" }],
  classes: [
    { id: "c1", name: "7-А", teacher_id: "t1", join_code: "AAAAAA", created_at: "2026-09-01T05:00:00Z" },
    { id: "c2", name: "7-Б", teacher_id: "t1", join_code: "BBBBBB", created_at: "2026-09-01T05:00:00Z" },
  ],
  members: [
    { class_id: "c1", student_id: "s1" },
    { class_id: "c1", student_id: "s2" },
    { class_id: "c2", student_id: "s1" }, // бир окуучу эки класста
  ],
  lessons: [
    { id: "l1", author_id: "t1", status: "published" },
    { id: "l2", author_id: "t1", status: "draft" },
  ],
  assignments: [{ id: "a1", class_id: "c1", created_at: "2026-09-20T05:00:00Z" }],
  attempts: [
    { assignment_id: "a1", student_id: "s1", xp: 80, exit_score: 3, exit_total: 3, started_at: "2026-09-29T04:00:00Z", finished_at: "2026-09-29T05:00:00Z" },
    { assignment_id: "a1", student_id: "s2", xp: 20, exit_score: null, exit_total: null, started_at: "2026-09-10T04:00:00Z", finished_at: null },
  ],
};
const now = new Date("2026-09-29T12:00:00Z");

describe("overview", () => {
  const o = overview(d, now);
  it("сандар", () => {
    expect(o).toMatchObject({ teachers: 2, students: 2, classes: 2, lessons: 2, published: 1, assignments: 1, finished: 1, avgExitPct: 100 });
  });
  it("акыркы 7 күндө активдүү окуучулар", () => expect(o.activeStudents).toBe(1));
  it("14 күндүк график: бүгүнкү күн акыркы", () => {
    expect(o.days).toHaveLength(14);
    expect(o.days.at(-1)).toEqual({ label: "29.09", count: 1 });
    expect(o.days.reduce((s, x) => s + x.count, 0)).toBe(1);
  });
  it("мектептер: эки класстагы окуучу бир жолу эсептелет", () => {
    expect(o.schools).toEqual([
      { name: "№1 мектеп", teachers: 1, students: 2 },
      { name: "Мектеп көрсөтүлгөн эмес", teachers: 1, students: 0 },
    ]);
  });
});

describe("тизмелер", () => {
  it("мугалимдер: уникалдуу окуучулар, email, админ", () => {
    const [a, b] = teacherRows(d);
    expect(a).toMatchObject({ name: "Нургазы", classes: 2, students: 2, lessons: 2, assignments: 1, email: "t1@example.com", isAdmin: true });
    expect(b).toMatchObject({ name: "Айнура", classes: 0, students: 0, email: null, isAdmin: false });
  });
  it("класстар", () => {
    expect(classRows(d)[0]).toMatchObject({ name: "7-А", teacher: "Нургазы", students: 2, assignments: 1, finished: 1, avgExitPct: 100 });
    expect(classRows(d)[1]).toMatchObject({ name: "7-Б", students: 1, avgExitPct: null });
  });
  it("окуучулар: издөө аты жана логини боюнча", () => {
    expect(studentRows(d)).toHaveLength(2);
    expect(studentRows(d, "бегим").map((s) => s.username)).toEqual(["begimai2"]);
    expect(studentRows(d, "AIBEK")[0]).toMatchObject({ name: "Айбек Маратов", classes: ["7-А", "7-Б"], xp: 80, finished: 1 });
    expect(studentRows(d, "жок")).toEqual([]);
  });
});
