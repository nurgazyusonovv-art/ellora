import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { BLOCK_LABELS, blockSummary } from "@/lib/lesson-edit";
import { CONFIDENCE_LABELS, isGraded, isInteractive, STAGE_META, type Block, type LessonContent } from "@/lib/lesson-types";
import { studentStatus, type AttemptRow, type StudentStatus } from "@/lib/stats";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type AnswerRow = { attempt_id: string; block_id: string; stage: number; response: Record<string, unknown> | null; is_correct: boolean | null; tries: number };
type AssignmentRow = {
  id: string;
  class_id: string;
  created_at: string;
  due_at: string | null;
  lessons: { title: string; topic: string | null; content: LessonContent } | null;
};

export type BlockResult = {
  id: string;
  stageLabel: string;
  type: Block["type"];
  typeLabel: string;
  prompt: string;
  answered: boolean;
  graded: boolean;
  isCorrect: boolean | null;
  tries: number;
  /** Окуучунун жообу адам окуй турган түрдө. */
  answer: string;
  /** Туура жооп же кошумча маалымат (мисалы, тесттердин саны). */
  note?: string;
  code?: string;
};

export type LessonResult = {
  assignmentId: string;
  title: string;
  topic: string | null;
  className: string;
  assignedAt: string;
  dueAt: string | null;
  status: StudentStatus;
  stage: number;
  xp: number;
  exitScore: number | null;
  exitTotal: number | null;
  exitPct: number | null;
  confidence: number | null;
  finishedAt: string | null;
  blocks: BlockResult[];
};

export type StudentReport = {
  student: { id: string; name: string; username: string | null };
  classes: string[];
  lessons: LessonResult[];
  summary: {
    assigned: number;
    finished: number;
    avgExitPct: number | null;
    totalXp: number;
    avgConfidence: number | null;
    /** Бааланган тапшырмалардын канчасы биринчи аракетте туура аткарылды. */
    firstTryPct: number | null;
    byType: { type: Block["type"]; label: string; n: number; pct: number }[];
  };
};

const plain = (s: string) => s.replace(/\*\*|`/g, "");

function describe(b: Block, a: AnswerRow | undefined): Pick<BlockResult, "answer" | "note" | "code"> {
  const r = a?.response ?? {};
  if (!a) return { answer: "—" };
  switch (b.type) {
    case "mcq": {
      const picked = r.picked as number | undefined;
      const wrong = ((r.wrong as number[] | undefined) ?? []).map((i) => b.options[i]).filter(Boolean);
      return {
        answer: picked !== undefined ? (b.options[picked] ?? "—") : "—",
        note: a.is_correct ? (wrong.length ? `Адегенде: ${wrong.join(", ")}` : undefined) : `Туура жооп: ${b.options[b.correct]}`,
      };
    }
    case "parsons":
      return { answer: a.is_correct ? "Программаны туура курду" : "Саптардын тартиби туура эмес" };
    case "bug_hunt": {
      const found = (r.found as number[] | undefined) ?? [];
      return { answer: `${found.length} / ${b.bugs.length} ката табылды`, note: found.length ? `Саптар: ${found.join(", ")}` : undefined };
    }
    case "code_task":
      return { answer: `${(r.passed as number | undefined) ?? 0} / ${b.tests.length} тест өттү`, code: (r.code as string | undefined) ?? undefined };
    case "open":
      return { answer: (r.text as string | undefined) ?? "—" };
    case "confidence": {
      const v = r.value as number | undefined;
      return { answer: v ? `${v} · ${CONFIDENCE_LABELS[v - 1]}` : "—" };
    }
    default:
      return { answer: "—" };
  }
}

/** Мугалимдин өз укугу менен (RLS): өз класстарындагы окуучу гана. Табылбаса — null. */
export async function getStudentReport(supabase: Supabase, teacherId: string, studentId: string): Promise<StudentReport | null> {
  const { data: student } = await supabase.from("profiles").select("id, full_name, username").eq("id", studentId).eq("role", "student").maybeSingle();
  if (!student) return null;

  const [{ data: classes }, { data: memberships }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("teacher_id", teacherId),
    supabase.from("class_members").select("class_id").eq("student_id", studentId),
  ]);
  const myClasses = new Map((classes ?? []).map((c) => [c.id as string, c.name as string]));
  const classIds = (memberships ?? []).map((m) => m.class_id as string).filter((id) => myClasses.has(id));
  if (!classIds.length) return null;

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, class_id, created_at, due_at, lessons(title, topic, content)")
    .in("class_id", classIds)
    .order("created_at", { ascending: true })
    .returns<AssignmentRow[]>();
  const aIds = (assignments ?? []).map((a) => a.id);
  const { data: attempts } = aIds.length
    ? await supabase.from("attempts").select("*").eq("student_id", studentId).in("assignment_id", aIds).returns<AttemptRow[]>()
    : { data: [] as AttemptRow[] };
  const tIds = (attempts ?? []).map((t) => t.id);
  const { data: answers } = tIds.length
    ? await supabase.from("answers").select("attempt_id, block_id, stage, response, is_correct, tries").in("attempt_id", tIds).returns<AnswerRow[]>()
    : { data: [] as AnswerRow[] };

  const lessons: LessonResult[] = [];
  const typeStats = new Map<Block["type"], { n: number; ok: number }>();
  let gradedN = 0;
  let firstTryOk = 0;

  for (const a of assignments ?? []) {
    if (!a.lessons) continue;
    const t = (attempts ?? []).find((x) => x.assignment_id === a.id);
    const mine = (answers ?? []).filter((x) => x.attempt_id === t?.id);
    const blocks: BlockResult[] = [];
    for (const st of a.lessons.content.stages) {
      for (const b of st.blocks) {
        if (!isInteractive(b) && !(b.type === "open")) continue;
        const ans = mine.find((x) => x.block_id === b.id);
        const graded = isGraded(b);
        if (graded && ans) {
          gradedN++;
          const first = ans.is_correct === true && ans.tries === 1;
          if (first) firstTryOk++;
          const s = typeStats.get(b.type) ?? { n: 0, ok: 0 };
          s.n++;
          if (first) s.ok++;
          typeStats.set(b.type, s);
        }
        blocks.push({
          id: b.id,
          stageLabel: STAGE_META[st.key].label,
          type: b.type,
          typeLabel: BLOCK_LABELS[b.type],
          prompt: plain(blockSummary(b)),
          answered: !!ans,
          graded,
          isCorrect: ans?.is_correct ?? null,
          tries: ans?.tries ?? 0,
          ...describe(b, ans),
        });
      }
    }
    const exitPct = t?.finished_at && t.exit_total ? Math.round(((t.exit_score ?? 0) / t.exit_total) * 100) : null;
    lessons.push({
      assignmentId: a.id,
      title: a.lessons.title,
      topic: a.lessons.topic,
      className: myClasses.get(a.class_id) ?? "",
      assignedAt: a.created_at,
      dueAt: a.due_at,
      status: studentStatus(t),
      stage: t ? Math.min(t.current_stage, 5) : 0,
      xp: t?.xp ?? 0,
      exitScore: t?.exit_score ?? null,
      exitTotal: t?.exit_total ?? null,
      exitPct,
      confidence: t?.confidence ?? null,
      finishedAt: t?.finished_at ?? null,
      blocks,
    });
  }

  const finished = lessons.filter((l) => l.finishedAt);
  const withExit = finished.filter((l) => l.exitPct !== null);
  const withConf = finished.filter((l) => l.confidence);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

  return {
    student: { id: student.id, name: student.full_name, username: student.username },
    classes: classIds.map((id) => myClasses.get(id)!),
    lessons,
    summary: {
      assigned: lessons.length,
      finished: finished.length,
      avgExitPct: withExit.length ? Math.round(avg(withExit.map((l) => l.exitPct!))!) : null,
      totalXp: lessons.reduce((s, l) => s + l.xp, 0),
      avgConfidence: withConf.length ? Math.round(avg(withConf.map((l) => l.confidence!))! * 10) / 10 : null,
      firstTryPct: gradedN ? Math.round((firstTryOk / gradedN) * 100) : null,
      byType: [...typeStats.entries()].map(([type, s]) => ({ type, label: BLOCK_LABELS[type], n: s.n, pct: Math.round((s.ok / s.n) * 100) })),
    },
  };
}
