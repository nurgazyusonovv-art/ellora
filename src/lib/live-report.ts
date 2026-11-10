/**
 * Жандуу сабактын отчету (4-этап): сабак бүткөндөн кийин мугалимге — ким кошулду, ким класста бүттү, ким үйдө,
 * ким бүтө элек, бөлүктөр боюнча прогресс, эң кыйын суроолор жана кимге көңүл буруу керек.
 */
import { blockSummary } from "./lesson-edit";
import { isGraded, stageMeta, type LessonContent } from "./lesson-types";

export type ReportMember = { id: string; name: string };
export type ReportAttempt = { student_id: string; current_stage: number; finished_at: string | null; exit_score: number | null; exit_total: number | null };
export type ReportAnswer = { attempt_id: string; block_id: string; is_correct: boolean | null; tries: number };
export type ReportAttemptRef = ReportAttempt & { id: string };

export type LessonReport = {
  minutes: number | null;
  total: number;
  joined: number;
  finishedInClass: number;
  finishedLater: number;
  notStarted: string[];
  notFinished: string[];
  lowExit: string[];
  stages: { label: string; done: number }[];
  hardest: { id: string; summary: string; pct: number; n: number }[];
};

export function lessonReport(input: {
  content: LessonContent;
  members: ReportMember[];
  attempts: ReportAttemptRef[];
  answers: ReportAnswer[];
  startedAt?: string | null;
  endedAt?: string | null;
}): LessonReport {
  const { content, members, attempts, answers, startedAt, endedAt } = input;
  const roster = new Set(members.map((m) => m.id));
  const mine = attempts.filter((t) => roster.has(t.student_id));
  const byStudent = new Map(mine.map((t) => [t.student_id, t]));
  const end = endedAt ? new Date(endedAt).getTime() : null;
  const minutes = startedAt && end ? Math.max(1, Math.round((end - new Date(startedAt).getTime()) / 60000)) : null;
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? "Окуучу";

  const finished = mine.filter((t) => t.finished_at);
  const inClass = finished.filter((t) => end === null || new Date(t.finished_at!).getTime() <= end);

  // Ар бааланган суроо: биринчи аракетте туура жооп бергендердин үлүшү (кеминде 3 жооп болсо).
  const attemptIds = new Set(mine.map((t) => t.id));
  const hardest = content.stages
    .flatMap((st) => (st.key === "exit" ? st.blocks.filter((b) => b.type === "mcq") : st.blocks.filter(isGraded)))
    .map((b) => {
      const rows = answers.filter((a) => a.block_id === b.id && attemptIds.has(a.attempt_id));
      const ok = rows.filter((a) => a.is_correct === true && a.tries === 1).length;
      return { id: b.id, summary: blockSummary(b), n: rows.length, pct: rows.length ? Math.round((ok / rows.length) * 100) : 0 };
    })
    .filter((x) => x.n >= 3 && x.pct < 70)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  return {
    minutes,
    total: members.length,
    joined: mine.length,
    finishedInClass: inClass.length,
    finishedLater: finished.length - inClass.length,
    notStarted: members.filter((m) => !byStudent.has(m.id)).map((m) => m.name),
    notFinished: mine.filter((t) => !t.finished_at).map((t) => name(t.student_id)),
    lowExit: finished.filter((t) => t.exit_total && (t.exit_score ?? 0) / t.exit_total < 0.5).map((t) => name(t.student_id)),
    stages: content.stages.map((st, i) => ({ label: stageMeta(content, st.key).label, done: mine.filter((t) => t.finished_at || t.current_stage > i).length })),
    hardest,
  };
}
