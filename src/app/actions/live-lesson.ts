"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";

export type LiveCommandState = { error?: string; success?: string } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMMANDS = new Set(["start", "next", "back", "pause", "resume", "close", "homework"]);
type Session = { max_stage: number; paused: boolean; ended: boolean; timed: boolean | null };

/**
 * Мугалим башкарган сабак (0018). Укук RLS менен текшерилет: дайындама мугалимдин өз классыныкы болушу керек.
 * `stage` — мугалимдин экранындагы учурдагы бөлүк: эки жолу басылса же башка өтмөктөн өзгөрсө, эки бөлүк аттап кетпейт.
 */
export async function liveCommand(_: LiveCommandState, fd: FormData): Promise<LiveCommandState> {
  const { supabase, profile } = await requireRole("teacher");
  const id = String(fd.get("assignmentId") ?? "");
  const command = String(fd.get("command") ?? "");
  const stage = Number(fd.get("stage"));
  if (!UUID.test(id) || !COMMANDS.has(command)) return { error: "Башкаруу маалыматы туура эмес." };

  const { data: a } = await supabase.from("assignments").select("id, class_id").eq("id", id).maybeSingle();
  const { data: own } = a ? await supabase.from("classes").select("id").eq("id", a.class_id).eq("teacher_id", profile.id).maybeSingle() : { data: null };
  if (!a || !own) return { error: "Сабак табылган жок." };

  const { data: s, error: readError } = await supabase.from("lesson_sessions").select("max_stage, paused, ended, timed").eq("assignment_id", id).maybeSingle<Session>();
  if (readError) return { error: "Сабактын абалы жүктөлгөн жок. 0018 база жаңыртуусун текшериңиз." };
  if (s?.timed && !s.ended) return { error: "Бул сабак жалпы таймер менен жүрүп жатат. Аны натыйжалар барагынан башкарыңыз." };
  const now = new Date().toISOString();
  const done = (success: string): LiveCommandState => {
    revalidatePath(`/teacher/live/${id}`);
    revalidatePath(`/teacher/assignments/${id}`);
    revalidatePath(`/student/assignments/${id}`);
    revalidatePath("/student");
    revalidatePath("/teacher", "layout");
    return { success };
  };
  const failed = { error: "Сакталган жок. Баракты жаңыртып, кайра басыңыз." };

  if (command === "start") {
    if (s && !s.ended) return { error: "Сабак мурунтан эле башталган." };
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("assignments").update({ delivery: "class" }).eq("id", id),
      supabase.from("lesson_sessions").upsert({ assignment_id: id, max_stage: 0, paused: false, ended: false, timed: false, deadline: null, started_at: now, ended_at: null, updated_at: now }),
    ]);
    return e1 || e2 ? { error: "Сабак башталган жок. 0018 база жаңыртуусун текшериңиз." } : done("Сабак башталды. Окуучулардын экранында 1-бөлүк ачылды.");
  }

  if (command === "homework") {
    // Бүтүрө албагандар үйдө өз алдынча бүтүрөт: сессия алынат, ыкма «self» болот.
    const due = String(fd.get("due_at") ?? "").trim();
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "Датаны туура жазыңыз." };
    const { error: e1 } = await supabase.from("assignments").update({ delivery: "self", ...(due ? { due_at: new Date(`${due}T23:59:00+06:00`).toISOString() } : {}) }).eq("id", id);
    if (e1) return failed;
    const { error: e2 } = await supabase.from("lesson_sessions").delete().eq("assignment_id", id);
    return e2 ? failed : done("Сабак бүттү. Бүтүрө албаган окуучулар үйдө өз алдынча бүтүрө алат.");
  }

  if (!s || s.ended) return { error: "Сабак азыр жүрүп жаткан жок." };
  if (!Number.isInteger(stage) || stage !== s.max_stage) return { error: "Сабактын абалы өзгөрдү. Баракты жаңыртыңыз." };

  const patch =
    command === "next" ? (stage < 4 ? { max_stage: stage + 1, paused: false } : null)
    : command === "back" ? (stage > 0 ? { max_stage: stage - 1, paused: false } : null)
    : command === "pause" ? { paused: true }
    : command === "resume" ? { paused: false }
    : { ended: true, paused: false, ended_at: now };
  if (!patch) return { error: command === "next" ? "Бул акыркы бөлүк. Сабакты бүтүрүңүз." : "Бул биринчи бөлүк." };
  // max_stage шарты: башка өтмөктөн өзгөрсө жаңыртуу өтпөйт.
  const { data: updated, error } = await supabase.from("lesson_sessions").update({ ...patch, updated_at: now }).eq("assignment_id", id).eq("max_stage", stage).select("assignment_id");
  if (error) return failed;
  if (!updated?.length) return { error: "Сабактын абалы өзгөрдү. Баракты жаңыртыңыз." };
  const msg = { next: `${stage + 2}-бөлүк ачылды.`, back: `${stage}-бөлүккө кайттык.`, pause: "Сабак токтотулду.", resume: "Сабак уланды.", close: "Сабак жабылды." } as const;
  return done(msg[command as keyof typeof msg]);
}
