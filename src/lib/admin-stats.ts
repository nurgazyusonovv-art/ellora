/** Админ панелинин эсептөөлөрү (таза функциялар — тест: admin-stats.test.ts). Жүктөө: admin-data.ts. */

export type AdminData = {
  profiles: { id: string; role: "teacher" | "student"; full_name: string; username: string | null; school: string | null; created_at: string; is_admin?: boolean }[];
  users: { id: string; email: string | null; last_sign_in_at: string | null }[];
  classes: { id: string; name: string; teacher_id: string; join_code: string; created_at: string }[];
  members: { class_id: string; student_id: string }[];
  lessons: { id: string; author_id: string; status: string }[];
  assignments: { id: string; class_id: string; created_at: string }[];
  attempts: { assignment_id: string; student_id: string; xp: number; exit_score: number | null; exit_total: number | null; started_at: string; finished_at: string | null }[];
};

const DAY = 864e5;
/** Бишкек (UTC+6) боюнча күндүн номери. */
const dayOf = (iso: string | number | Date) => Math.floor((new Date(iso).getTime() + 6 * 36e5) / DAY);
const pct = (xs: { exit_score: number | null; exit_total: number | null }[]) => {
  const ok = xs.filter((t) => t.exit_total);
  return ok.length ? Math.round((ok.reduce((s, t) => s + (t.exit_score ?? 0) / t.exit_total!, 0) / ok.length) * 100) : null;
};

export function overview(d: AdminData, now = new Date()) {
  const teachers = d.profiles.filter((p) => p.role === "teacher");
  const students = d.profiles.filter((p) => p.role === "student");
  const finished = d.attempts.filter((t) => t.finished_at);
  const today = dayOf(now);
  const weekAgo = today - 6;
  const activeStudents = new Set(d.attempts.filter((t) => dayOf(t.finished_at ?? t.started_at) >= weekAgo).map((t) => t.student_id));

  // Акыркы 14 күн: күнүнө бүткөн сабактар.
  const days = Array.from({ length: 14 }, (_, i) => {
    const day = today - 13 + i;
    const date = new Date(day * DAY);
    return { label: `${date.getUTCDate()}.${String(date.getUTCMonth() + 1).padStart(2, "0")}`, count: finished.filter((t) => dayOf(t.finished_at!) === day).length };
  });

  const bySchool = new Map<string, { teachers: number; students: number }>();
  const schoolOfTeacher = new Map(teachers.map((t) => [t.id, t.school?.trim() || "Мектеп көрсөтүлгөн эмес"]));
  for (const t of teachers) {
    const k = schoolOfTeacher.get(t.id)!;
    bySchool.set(k, { teachers: (bySchool.get(k)?.teachers ?? 0) + 1, students: bySchool.get(k)?.students ?? 0 });
  }
  const classTeacher = new Map(d.classes.map((c) => [c.id, c.teacher_id]));
  const counted = new Set<string>();
  for (const m of d.members) {
    const school = schoolOfTeacher.get(classTeacher.get(m.class_id) ?? "");
    if (!school || counted.has(`${school}:${m.student_id}`)) continue;
    counted.add(`${school}:${m.student_id}`);
    bySchool.get(school)!.students++;
  }

  return {
    teachers: teachers.length,
    students: students.length,
    classes: d.classes.length,
    lessons: d.lessons.length,
    published: d.lessons.filter((l) => l.status === "published").length,
    assignments: d.assignments.length,
    finished: finished.length,
    activeStudents: activeStudents.size,
    avgExitPct: pct(finished),
    days,
    schools: [...bySchool.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.students - a.students || b.teachers - a.teachers),
  };
}

export function teacherRows(d: AdminData) {
  const user = new Map(d.users.map((u) => [u.id, u]));
  return d.profiles
    .filter((p) => p.role === "teacher")
    .map((p) => {
      const classes = d.classes.filter((c) => c.teacher_id === p.id);
      const ids = new Set(classes.map((c) => c.id));
      return {
        id: p.id,
        name: p.full_name,
        school: p.school,
        email: user.get(p.id)?.email ?? null,
        isAdmin: p.is_admin === true,
        createdAt: p.created_at,
        lastSignIn: user.get(p.id)?.last_sign_in_at ?? null,
        classes: classes.length,
        students: new Set(d.members.filter((m) => ids.has(m.class_id)).map((m) => m.student_id)).size,
        lessons: d.lessons.filter((l) => l.author_id === p.id).length,
        assignments: d.assignments.filter((a) => ids.has(a.class_id)).length,
      };
    })
    .sort((a, b) => b.students - a.students || a.name.localeCompare(b.name, "ky"));
}

export function classRows(d: AdminData) {
  const name = new Map(d.profiles.map((p) => [p.id, p]));
  return d.classes
    .map((c) => {
      const aIds = new Set(d.assignments.filter((a) => a.class_id === c.id).map((a) => a.id));
      const fin = d.attempts.filter((t) => aIds.has(t.assignment_id) && t.finished_at);
      return {
        id: c.id,
        name: c.name,
        joinCode: c.join_code,
        teacher: name.get(c.teacher_id)?.full_name ?? "—",
        school: name.get(c.teacher_id)?.school ?? null,
        students: d.members.filter((m) => m.class_id === c.id).length,
        assignments: aIds.size,
        finished: fin.length,
        avgExitPct: pct(fin),
        createdAt: c.created_at,
      };
    })
    .sort((a, b) => b.students - a.students || a.name.localeCompare(b.name, "ky"));
}

export function studentRows(d: AdminData, query = "") {
  const q = query.trim().toLowerCase();
  const className = new Map(d.classes.map((c) => [c.id, c.name]));
  return d.profiles
    .filter((p) => p.role === "student")
    .filter((p) => !q || p.full_name.toLowerCase().includes(q) || (p.username ?? "").toLowerCase().includes(q))
    .map((p) => {
      const mine = d.attempts.filter((t) => t.student_id === p.id);
      return {
        id: p.id,
        name: p.full_name,
        username: p.username,
        classes: d.members.filter((m) => m.student_id === p.id).map((m) => className.get(m.class_id) ?? "—"),
        xp: mine.reduce((s, t) => s + (t.xp ?? 0), 0),
        finished: mine.filter((t) => t.finished_at).length,
        createdAt: p.created_at,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ky"));
}
