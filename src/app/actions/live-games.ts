"use server";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import type { GameQuestion } from "@/lib/game-questions";
import { shortName } from "@/lib/leaderboard";
import { answerPoints, canAnswer, generatePin, liveQuestions, nextStep, questionTime, rankPlayers, studentLiveQuestion, type LiveStatus } from "@/lib/live-game";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureGameSet } from "./game-sets";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Live = { id: string; set_id: string; class_id: string; teacher_id: string; pin: string; status: LiveStatus; q_index: number; q_started_at: string | null; speed_bonus: boolean };
const LIVE_COLS = "id, set_id, class_id, teacher_id, pin, status, q_index, q_started_at, speed_bonus";

export type StartLiveState = { error?: string } | undefined;

/* ───────────────────────── Мугалим ───────────────────────── */

/** Жандуу оюнду баштайт: даяр оюн (slug) же мугалимдин топтому (setId). PIN түзүлөт, мугалим проектор экранына өтөт. */
export async function startLiveGame(_: StartLiveState, fd: FormData): Promise<StartLiveState> {
  const { supabase, profile } = await requireRole("teacher");
  const classId = String(fd.get("class_id") ?? "");
  if (!UUID.test(classId)) return { error: "Классты тандаңыз." };
  let setId = String(fd.get("set_id") ?? "");
  const slug = String(fd.get("slug") ?? "");
  if (!UUID.test(setId) && slug) {
    const r = await ensureGameSet(slug);
    if (!r.id) return { error: r.error ?? "Оюн табылган жок." };
    setId = r.id;
  }
  if (!UUID.test(setId)) return { error: "Оюн табылган жок." };
  const [{ data: cls }, { data: set }] = await Promise.all([
    supabase.from("classes").select("id").eq("id", classId).eq("teacher_id", profile.id).maybeSingle(),
    supabase.from("game_sets").select("id, questions").eq("id", setId).eq("author_id", profile.id).maybeSingle<{ id: string; questions: GameQuestion[] }>(),
  ]);
  if (!cls) return { error: "Класс табылган жок." };
  if (!set || !liveQuestions(set.questions).length) return { error: "Бул оюнда тест суроолору жок. Жандуу оюн тест суроолору менен гана ойнолот." };

  let liveId: string | null = null;
  for (let i = 0; i < 6 && !liveId; i++) {
    const { data, error } = await supabase
      .from("game_lives")
      .insert({ set_id: setId, class_id: classId, teacher_id: profile.id, pin: generatePin(), speed_bonus: fd.get("speed_bonus") === "true" })
      .select("id")
      .single();
    if (data) liveId = data.id;
    else if (error?.code !== "23505") return { error: "Оюн башталган жок. 0024 база жаңыртуусун текшериңиз." };
  }
  if (!liveId) return { error: "PIN түзүлгөн жок. Кайра аракет кылыңыз." };
  redirect(`/host/${liveId}`);
}

/** Мугалимдин «Кийинки» (суроо → жооп → кийинки суроо) жана «Бүтүрүү». Эски экрандан эки жолу басылса аттап кетпейт. */
export async function controlLive(liveId: string, command: "next" | "end", expected: { status: LiveStatus; q_index: number }): Promise<{ error?: string }> {
  const { supabase } = await requireRole("teacher");
  if (!UUID.test(liveId)) return { error: "Оюн табылган жок." };
  const { data: live } = await supabase.from("game_lives").select(LIVE_COLS).eq("id", liveId).maybeSingle<Live>();
  if (!live) return { error: "Оюн табылган жок." };
  if (live.status !== expected.status || live.q_index !== expected.q_index) return {}; // башка өтмөктөн өзгөргөн — экран жаңырат
  const { data: set } = await supabase.from("game_sets").select("questions").eq("id", live.set_id).maybeSingle<{ questions: GameQuestion[] }>();
  const total = liveQuestions(set?.questions ?? []).length;
  const step = command === "end" ? { status: "ended" as const, q_index: live.q_index } : nextStep(live.status, live.q_index, total);
  if (!step) return {};
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("game_lives")
    .update({ ...step, ...(step.status === "question" ? { q_started_at: now } : {}), ...(step.status === "ended" ? { ended_at: now } : {}) })
    .eq("id", liveId)
    .eq("status", live.status)
    .eq("q_index", live.q_index);
  return error ? { error: "Сакталган жок. Кайра басыңыз." } : {};
}

export type HostState = {
  status: LiveStatus;
  qIndex: number;
  total: number;
  pin: string;
  speedBonus: boolean;
  serverNow: number;
  startedAt: string | null;
  question?: { prompt: string; code?: string; options: string[]; time: number; correct: number };
  players: { id: string; name: string; score: number; rank: number }[];
  answered: number;
  counts: number[];
};

/** Проектор экраны үчүн (мугалим гана: RLS). Аттар толук — проектордо да мугалим көрсөтөт. */
export async function hostState(liveId: string): Promise<HostState | null> {
  const { supabase } = await requireRole("teacher");
  if (!UUID.test(liveId)) return null;
  const { data: live } = await supabase.from("game_lives").select(LIVE_COLS).eq("id", liveId).maybeSingle<Live>();
  if (!live) return null;
  const [{ data: set }, { data: players }, { data: answers }] = await Promise.all([
    supabase.from("game_sets").select("questions").eq("id", live.set_id).maybeSingle<{ questions: GameQuestion[] }>(),
    supabase.from("game_live_players").select("student_id, score, profiles(full_name)").eq("live_id", liveId).returns<{ student_id: string; score: number; profiles: { full_name: string } | null }[]>(),
    live.q_index >= 0 ? supabase.from("game_live_answers").select("picked").eq("live_id", liveId).eq("q_index", live.q_index) : Promise.resolve({ data: [] as { picked: number }[] }),
  ]);
  const qs = liveQuestions(set?.questions ?? []);
  const q = live.q_index >= 0 ? qs[live.q_index] : undefined;
  return {
    status: live.status,
    qIndex: live.q_index,
    total: qs.length,
    pin: live.pin,
    speedBonus: live.speed_bonus,
    serverNow: Date.now(),
    startedAt: live.q_started_at,
    ...(q ? { question: { ...studentLiveQuestion(q), correct: q.correct } } : {}),
    players: rankPlayers((players ?? []).map((p) => ({ id: p.student_id, name: shortName(p.profiles?.full_name || "Окуучу"), score: p.score }))),
    answered: (answers ?? []).length,
    counts: q ? q.options.map((_, k) => (answers ?? []).filter((a) => a.picked === k).length) : [],
  };
}

/* ───────────────────────── Окуучу ───────────────────────── */

export type JoinState = { error?: string } | undefined;

/** PIN менен кошулуу: RLS окуучуга өз классынын оюндарын гана көрсөтөт — башка класстын PIN'и табылбайт. */
export async function joinLive(_: JoinState, fd: FormData): Promise<JoinState> {
  const { supabase, profile } = await requireRole("student");
  const pin = String(fd.get("pin") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(pin)) return { error: "PIN 6 сандан турат." };
  const { data: live } = await supabase.from("game_lives").select("id").eq("pin", pin).neq("status", "ended").maybeSingle();
  if (!live) return { error: "Мындай оюн табылган жок. PIN'ди текшер же мугалимден сура." };
  await createAdminClient().from("game_live_players").upsert({ live_id: live.id, student_id: profile.id }, { onConflict: "live_id,student_id", ignoreDuplicates: true });
  redirect(`/play/${live.id}`);
}

export type PlayState = {
  status: LiveStatus;
  qIndex: number;
  total: number;
  remainingMs: number;
  question?: { prompt: string; code?: string; options: string[]; time: number };
  /** Ушул суроого жооп: суроо жүрүп жатканда тууралыгы ачылбайт. */
  mine?: { picked: number; correct?: boolean; points?: number };
  /** Суроо жабылгандан кийин гана. */
  correctIndex?: number;
  score: number;
  rank?: number;
  players: number;
  podium?: { name: string; score: number; rank: number }[];
};

/** Окуучунун экраны үчүн абал. Туура жооп суроо жабылгандан (reveal/ended) кийин гана жөнөтүлөт. */
export async function playState(liveId: string): Promise<PlayState | { error: string }> {
  const { supabase, profile } = await requireRole("student");
  if (!UUID.test(liveId)) return { error: "Оюн табылган жок." };
  const { data: live } = await supabase.from("game_lives").select(LIVE_COLS).eq("id", liveId).maybeSingle<Live>();
  if (!live) return { error: "Оюн табылган жок." };
  const admin = createAdminClient();
  // Шилтеме менен келсе — оюнчу катары кошобуз (класс мүчөлүгү RLS менен жогоруда текшерилди).
  if (live.status !== "ended") await admin.from("game_live_players").upsert({ live_id: liveId, student_id: profile.id }, { onConflict: "live_id,student_id", ignoreDuplicates: true });
  const [{ data: set }, { data: players }, { data: mine }] = await Promise.all([
    admin.from("game_sets").select("questions").eq("id", live.set_id).maybeSingle<{ questions: GameQuestion[] }>(),
    admin.from("game_live_players").select("student_id, score, profiles(full_name)").eq("live_id", liveId).returns<{ student_id: string; score: number; profiles: { full_name: string } | null }[]>(),
    live.q_index >= 0
      ? supabase.from("game_live_answers").select("picked, correct, points").eq("live_id", liveId).eq("student_id", profile.id).eq("q_index", live.q_index).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const qs = liveQuestions(set?.questions ?? []);
  const q = live.q_index >= 0 ? qs[live.q_index] : undefined;
  const ranked = rankPlayers((players ?? []).map((p) => ({ id: p.student_id, name: shortName(p.profiles?.full_name || "Окуучу"), score: p.score })));
  const me = ranked.find((p) => p.id === profile.id);
  const open = live.status === "reveal" || live.status === "ended";
  const remainingMs = live.status === "question" && q && live.q_started_at ? Math.max(0, questionTime(q) * 1000 - (Date.now() - new Date(live.q_started_at).getTime())) : 0;
  return {
    status: live.status,
    qIndex: live.q_index,
    total: qs.length,
    remainingMs,
    ...(q && live.status !== "lobby" ? { question: studentLiveQuestion(q) } : {}),
    ...(mine ? { mine: open ? { picked: mine.picked as number, correct: mine.correct as boolean, points: mine.points as number } : { picked: mine.picked as number } } : {}),
    ...(open && q ? { correctIndex: q.correct } : {}),
    score: me?.score ?? 0,
    ...(open && me ? { rank: me.rank } : {}),
    players: ranked.length,
    ...(live.status === "ended" ? { podium: ranked.slice(0, 3).map(({ name, score, rank }) => ({ name, score, rank })) } : {}),
  };
}

/** Жооп: сервер убакытты жана тууралыкты текшерет, упайды эсептейт. Бир суроого бир жооп (PK). */
export async function answerLive(liveId: string, qIndex: number, picked: number): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, profile } = await requireRole("student");
  if (!UUID.test(liveId) || !Number.isInteger(qIndex) || !Number.isInteger(picked) || picked < 0) return { error: "Жооп туура эмес." };
  const { data: live } = await supabase.from("game_lives").select(LIVE_COLS).eq("id", liveId).maybeSingle<Live>();
  if (!live) return { error: "Оюн табылган жок." };
  const admin = createAdminClient();
  const { data: set } = await admin.from("game_sets").select("questions").eq("id", live.set_id).maybeSingle<{ questions: GameQuestion[] }>();
  const q = liveQuestions(set?.questions ?? [])[qIndex];
  const now = Date.now();
  if (!q || picked >= q.options.length) return { error: "Суроо табылган жок." };
  if (!canAnswer(live, qIndex, questionTime(q), now)) return { error: "Убакыт бүттү." };
  const correct = picked === q.correct;
  const points = answerPoints(correct, now - new Date(live.q_started_at!).getTime(), questionTime(q) * 1000, live.speed_bonus);
  const { error } = await admin.from("game_live_answers").insert({ live_id: liveId, student_id: profile.id, q_index: qIndex, picked, correct, points });
  if (error) return { error: error.code === "23505" ? "Жооп мурунтан берилген." : "Жооп сакталган жок. Кайра бас." };
  const { data: player } = await admin.from("game_live_players").select("score, streak").eq("live_id", liveId).eq("student_id", profile.id).maybeSingle();
  await admin
    .from("game_live_players")
    .upsert({ live_id: liveId, student_id: profile.id, score: ((player?.score as number) ?? 0) + points, streak: correct ? ((player?.streak as number) ?? 0) + 1 : 0 });
  return { ok: true };
}
