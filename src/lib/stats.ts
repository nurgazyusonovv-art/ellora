export type AttemptRow = {
  id: string;
  assignment_id: string;
  student_id: string;
  current_stage: number;
  xp: number;
  exit_score: number | null;
  exit_total: number | null;
  confidence: number | null;
  started_at: string;
  finished_at: string | null;
};

export type StudentStatus = "done" | "attention" | "help" | "stuck" | "started" | "not_started";

/** Окуучунун абалы: мугалимге эмнеге көңүл буруу керектигин түс менен көрсөтүү үчүн. */
export function studentStatus(a: AttemptRow | undefined): StudentStatus {
  if (!a) return "not_started";
  if (a.finished_at) {
    const ratio = a.exit_total ? (a.exit_score ?? 0) / a.exit_total : 1;
    if (ratio < 0.5 || (a.confidence ?? 4) <= 1) return "help";
    if (ratio < 1 || (a.confidence ?? 4) <= 2) return "attention";
    return "done";
  }
  const hours = (Date.now() - new Date(a.started_at).getTime()) / 36e5;
  return hours > 24 ? "stuck" : "started";
}

export const STATUS_META: Record<StudentStatus, { label: string; tone: "good" | "warn" | "bad" | "neutral" | "accent"; order: number }> = {
  help: { label: "Жардам керек", tone: "bad", order: 0 },
  stuck: { label: "Токтоп калды", tone: "bad", order: 1 },
  attention: { label: "Көңүл буруу", tone: "warn", order: 2 },
  started: { label: "Өтүп жатат", tone: "accent", order: 3 },
  not_started: { label: "Баштай элек", tone: "neutral", order: 4 },
  done: { label: "Түшүндү", tone: "good", order: 5 },
};

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "Мөөнөтсүз";
  const months = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
  const d = new Date(iso);
  const local = new Date(d.getTime() + 6 * 36e5); // Бишкек, UTC+6
  return `${local.getUTCDate()}-${months[local.getUTCMonth()]}`;
}
