"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import type { LessonContent } from "@/lib/lesson-types";

export type LiveCommandState = { error?: string; success?: string } | undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMMANDS = new Set(["start", "next", "back", "pause", "resume", "close", "homework", "spotlight", "reveal", "hide", "unhide"]);
const BOARD = new Set(["spotlight", "reveal", "hide", "unhide"]);
type Session = { max_stage: number; paused: boolean; ended: boolean; timed: boolean | null; spotlight_hidden?: string[] | null; homework?: boolean };

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

  const { data: a } = await supabase.from("assignments").select("id, class_id, lessons(content)").eq("id", id).maybeSingle<{ id: string; class_id: string; lessons: { content: LessonContent } | null }>();
  const { data: own } = a ? await supabase.from("classes").select("id").eq("id", a.class_id).eq("teacher_id", profile.id).maybeSingle() : { data: null };
  if (!a || !own) return { error: "Сабак табылган жок." };

  const { data: s, error: readError } = await supabase.from("lesson_sessions").select("*").eq("assignment_id", id).maybeSingle<Session>();
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
    if (e1 || e2) return { error: "Сабак башталган жок. 0018 база жаңыртуусун текшериңиз." };
    // Такта (0020) жана үй тапшырмасы (0021) жаңы сабакта бош башталат. Миграция иштетиле элек болсо бул жаңыртуулар
    // ката берет — эске алынбайт (ар бири өзүнчө, бири экинчисин бузбасын).
    await supabase.from("lesson_sessions").update({ spotlight_block: null, spotlight_reveal: false, spotlight_hidden: [] }).eq("assignment_id", id);
    await supabase.from("lesson_sessions").update({ homework: false }).eq("assignment_id", id);
    return done("Сабак башталды. Окуучулардын экранында 1-бөлүк ачылды.");
  }

  if (command === "homework") {
    // Бүтүрө албагандар үйдө өз алдынча бүтүрөт. Сессия сакталат (отчет үчүн башталган/бүткөн убакыт), homework=true (0021).
    const due = String(fd.get("due_at") ?? "").trim();
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "Датаны туура жазыңыз." };
    if (s) {
      const { error: eh } = await supabase.from("lesson_sessions").update({ homework: true, ended: true, paused: false, ...(s.ended ? {} : { ended_at: now }), updated_at: now }).eq("assignment_id", id);
      if (!eh) {
        if (due) {
          const { error: ed } = await supabase.from("assignments").update({ due_at: new Date(`${due}T23:59:00+06:00`).toISOString() }).eq("id", id);
          if (ed) return failed;
        }
        return done("Сабак бүттү. Бүтүрө албаган окуучулар үйдө өз алдынча бүтүрө алат.");
      }
      // 0021 жок: мурунку жол — сессия алынат, ыкма «self».
    }
    const { error: e1 } = await supabase.from("assignments").update({ delivery: "self", ...(due ? { due_at: new Date(`${due}T23:59:00+06:00`).toISOString() } : {}) }).eq("id", id);
    if (e1) return failed;
    const { error: e2 } = await supabase.from("lesson_sessions").delete().eq("assignment_id", id);
    return e2 ? failed : done("Сабак бүттү. Бүтүрө албаган окуучулар үйдө өз алдынча бүтүрө алат.");
  }

  // Үй тапшырмасы катары ачык сабакты кайра «Жабуу» мүмкүн.
  if (command === "close" && s?.homework) {
    const { error } = await supabase.from("lesson_sessions").update({ homework: false, ended: true, updated_at: now }).eq("assignment_id", id);
    return error ? failed : done("Сабак жабылды. Мындан ары жооп кабыл алынбайт.");
  }
  if (!s || s.ended) return { error: "Сабак азыр жүрүп жаткан жок." };

  if (BOARD.has(command)) {
    // Такта: кайсы тапшырма көрсөтүлөт, туура жооп ачылабы, кайсы ачык жооп жашырылат. Бөлүк өзгөрбөйт.
    let patch: Record<string, unknown>;
    if (command === "spotlight") {
      const block = String(fd.get("block") ?? "");
      if (block && !a.lessons?.content.stages.some((st) => st.blocks.some((b) => b.id === block))) return { error: "Тапшырма табылган жок." };
      patch = { spotlight_block: block || null, spotlight_reveal: false };
    } else if (command === "reveal") patch = { spotlight_reveal: fd.get("on") === "true" };
    else {
      const attempt = String(fd.get("attempt") ?? "");
      if (!UUID.test(attempt)) return { error: "Жооп табылган жок." };
      const hidden = new Set(s.spotlight_hidden ?? []);
      if (command === "hide") hidden.add(attempt);
      else hidden.delete(attempt);
      if (hidden.size > 200) return { error: "Жашырылган жооптор өтө көп." };
      patch = { spotlight_hidden: [...hidden] };
    }
    const { error } = await supabase.from("lesson_sessions").update({ ...patch, updated_at: now }).eq("assignment_id", id);
    if (error) return { error: "Такта сакталган жок. 0020 база жаңыртуусун текшериңиз." };
    revalidatePath(`/teacher/live/${id}`);
    revalidatePath(`/teacher/live/${id}/board`);
    return { success: command === "spotlight" ? (patch.spotlight_block ? "Тактага чыгарылды." : "Такта тазаланды.") : command === "reveal" ? (patch.spotlight_reveal ? "Туура жооп тактада ачылды." : "Туура жооп жашырылды.") : command === "hide" ? "Жооп тактадан жашырылды." : "Жооп тактага кайтарылды." };
  }
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
