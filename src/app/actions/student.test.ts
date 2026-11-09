/**
 * submitAnswer / completeStage — эстутумдагы жасалма база менен.
 * Окуучунун клиенти RLS'тей иштейт: attempts'тен өз аракетин гана көрөт, эч нерсе жаза албайт.
 * Жазуу admin клиент аркылуу гана өтөт.
 */
vi.mock("server-only",()=>({}));
import { beforeEach, describe, expect, it, vi } from "vitest";
import {defaultClassification} from "@/lib/classification";
import {defaultSheet} from "@/lib/sheet";
import {MISSION_EXAMPLE} from "@/lib/mission-example";
import { legacyPythonIf as pythonIf } from "@/content/examples/python-if";
import { generatedLesson } from "@/lib/lesson-generator";
import { lessonPlan } from "@/test/lesson-plan";
import type { Block, McqBlock, ParsonsBlock } from "@/lib/lesson-types";
import { parsonsSeed, shufflePerm, studentBlock } from "@/lib/student-view";
import { correctResponse } from "@/test/helpers";

const content = pythonIf.content;
let activeContent = content;
const ME = "student-1";

type AttemptRec = {
  id: string;
  student_id: string;
  assignment_id: string;
  current_stage: number;
  xp: number;
  exit_score: number | null;
  exit_total: number | null;
  confidence: number | null;
  finished_at: string | null;
};
type AnswerRec = { attempt_id: string; block_id: string; stage: number; response: Record<string, unknown>; is_correct: boolean | null; tries: number };

const db = { attempts: [] as AttemptRec[], answers: [] as AnswerRec[] };
const writes: string[] = [];
let live: { max_stage: number; paused: boolean; timed?:boolean; ended?:boolean } | null = null;
let gameSet: { author_id: string; questions: unknown[] } | null = null;

/** Окуучунун клиенти: окуй гана алат, RLS: өз аракети жана анын жооптору. */
function userClient() {
  return {
    rpc:async()=>({data:live,error:null}),
    from(table: "attempts" | "answers" | "assignments" | "lessons" | "lesson_sessions" | "coin_wallets") {
      if (table === "lessons") throw new Error("окуучу lessons таблицасын түз окубайт (0004)");
      const filters: [string, unknown][] = [];
      const visible = (): object[] =>
        table === "coin_wallets" ? [{student_id:ME,balance:25}] : table === "lesson_sessions" ? (live ? [{assignment_id:"asg", ...live}] : []) : table === "attempts"
          ? db.attempts.filter((a) => a.student_id === ME)
          : table === "assignments"
            ? [{ id: "asg", lesson_id: "L1" }] // окуучунун классынын тапшырмасы
            : db.answers.filter((r) => db.attempts.some((a) => a.id === r.attempt_id && a.student_id === ME));
      const rows = () => visible().filter((r) => filters.every(([k, v]) => (r as Record<string, unknown>)[k] === v)).map((r) => ({ ...r }));
      const q = {
        select: () => q,
        eq: (k: string, v: unknown) => (filters.push([k, v]), q),
        maybeSingle: async () => ({ data: rows()[0] ?? null }),
        then: (res: (v: { data: unknown[] }) => unknown) => Promise.resolve({ data: rows() }).then(res),
        insert: () => {
          throw new Error("окуучу түз жаза албайт");
        },
        update: () => {
          throw new Error("окуучу түз жаза албайт");
        },
        upsert: () => {
          throw new Error("окуучу түз жаза албайт");
        },
      };
      return q;
    },
  };
}

function adminClient() {
  return {
    rpc:async(name:string)=>{writes.push(name);return {data:"ok",error:null};},
    from(table: "attempts" | "answers" | "game_sets") {
      if (table === "game_sets") {
        const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: gameSet }) };
        return q as never;
      }
      return {
        insert:async(row:AnswerRec)=>{
          writes.push(`${table}.insert:${row.block_id}`);
          if(db.answers.some(r=>r.attempt_id===row.attempt_id&&r.block_id===row.block_id))return {error:{code:"23505"}};
          db.answers.push(row);return {error:null};
        },
        upsert: async (row: AnswerRec) => {
          writes.push(`${table}.upsert:${row.block_id}`);
          db.answers = db.answers.filter((r) => !(r.attempt_id === row.attempt_id && r.block_id === row.block_id));
          db.answers.push(row);
          return { error: null };
        },
        update: (patch: Partial<AttemptRec>) => ({
          eq: async (_k: "id", id: string) => {
            writes.push(`${table}.update`);
            const a = db.attempts.find((x) => x.id === id)!;
            Object.assign(a, patch);
            return { error: null };
          },
        }),
      };
    },
  };
}

vi.mock("@/lib/auth", () => ({
  requireRole: async () => ({ supabase: userClient(), profile: { id: ME, role: "student" } }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => adminClient() }));
vi.mock("@/lib/student-lessons", () => ({
  lessonContent: async (id: string) => (id === "L1" ? { title: pythonIf.title, content: activeContent, authorId: "T1" } : null),
}));

const { submitAnswer, completeStage, answerLessonGame } = await import("@/app/actions/student");

const attempt = (id: string, student_id = ME): AttemptRec => ({
  id,
  student_id,
  assignment_id: "asg",
  current_stage: 0,
  xp: 0,
  exit_score: null,
  exit_total: null,
  confidence: null,
  finished_at: null,
});

beforeEach(() => {
  db.attempts = [attempt("a1"), attempt("other", "student-2")];
  db.answers = [];
  writes.length = 0;
  live = null;
  activeContent = content;
});

/** Окуучу ойноткучтагыдай жооп берет: интерактивдүү блоктор, анан керек болсо баскыч. */
/** Окуучу көргөн (аралаштырылган) саптардын ичинен туура тартипти курат. */
function studentResponse(b: Block) {
  if (b.type !== "parsons") return correctResponse(b);
  const view = studentBlock(b, undefined, false, "a1");
  if (view.type !== "parsons") throw new Error();
  const used = new Set<number>();
  const order = b.lines.map((line) => {
    const k = view.lines.findIndex((l, i) => l === line && !used.has(i));
    used.add(k);
    return k;
  });
  return { order };
}

async function playStage(si: number) {
  const st = content.stages[si];
  for (const b of st.blocks) {
    const r = studentResponse(b);
    if (r) expect((await submitAnswer("a1", b.id, r)).error).toBeUndefined();
  }
  const a = db.attempts[0];
  if (a.current_stage === si) return completeStage("a1", si);
}

describe("submitAnswer / completeStage", () => {
  it("капчыктын балансы серверден гана келет", async () => {
    const b=content.stages[0].blocks.find(x=>correctResponse(x))!;
    const r=await submitAnswer("a1",b.id,{...correctResponse(b),coinBalance:999999});
    expect(r.coinBalance).toBe(25);
    expect((await submitAnswer("other",b.id,correctResponse(b)!)).coinBalance).toBeUndefined();
  });
  it("5E түшүндүрүүдө өз оюн жазгандан кийин окууга убакыт калат", async () => {
    activeContent = generatedLesson(lessonPlan(), {topic:"Шарт",grade:7,duration:45,context:"",pairs:false,groups:false,groupSize:4})!.content;
    db.attempts[0].current_stage = 2;
    const r = await submitAnswer("a1","p1",{text:"Байкоомдо чек мааниси маанилүү"});
    expect(r.current_stage).toBe(2);
    expect((await completeStage("a1",2)).current_stage).toBe(3);
  });
  it("жандуу сабактын паузасы жана жабык бөлүгү серверде тосулат", async () => {
    const b = content.stages[0].blocks.find(x => correctResponse(x))!;
    live = {max_stage:4, paused:true};
    expect((await submitAnswer("a1", b.id, correctResponse(b)!)).error).toMatch(/Мугалим/);
    expect((await completeStage("a1",0)).error).toMatch(/Мугалим/);
    expect(writes).toEqual([]);
    live = null;
  activeContent = content; await playStage(0); writes.length = 0;
    live = {max_stage:0, paused:false};
    const next = content.stages[1].blocks.find(x => correctResponse(x))!;
    expect((await submitAnswer("a1",next.id,correctResponse(next)!)).error).toMatch(/Мугалим/);
    expect(writes).toEqual([]);
  });
  it("сабакты толук өтөт: бөлүктөр ачылат, XP жана натыйжа серверде эсептелет", async () => {
    for (let si = 0; si < 5; si++) await playStage(si);
    const a = db.attempts[0];
    expect(a.current_stage).toBe(5);
    expect(a.finished_at).not.toBeNull();
    expect(a.xp).toBe(80);
    expect(a.exit_score).toBe(a.exit_total);
    expect(a.confidence).toBe(3);
    expect(writes.every((w) => w.startsWith("answers.") || w.startsWith("attempts."))).toBe(true);
  });

  it("ачыла элек бөлүккө жооп кабыл алынбайт", async () => {
    const locked = content.stages[2].blocks.find((b) => correctResponse(b))!;
    const r = await submitAnswer("a1", locked.id, correctResponse(locked)!);
    expect(r.error).toMatch(/ачыла элек/);
    expect(writes).toEqual([]);
  });

  it("башка окуучунун аракетине жооп берүүгө болбойт", async () => {
    const b = content.stages[0].blocks.find((x) => correctResponse(x))!;
    const r = await submitAnswer("other", b.id, correctResponse(b)!);
    expect(r.error).toMatch(/табылган жок/);
    expect(writes).toEqual([]);
  });

  it("жасалма is_correct жана xp эске алынбайт", async () => {
    await playStage(0);
    const m = content.stages[1].blocks.find((b) => b.type === "mcq") as McqBlock;
    const wrong = (m.correct + 1) % m.options.length;
    const r = await submitAnswer("a1", m.id, { picked: wrong, is_correct: true, xp: 9999 });
    expect(r.answer?.is_correct).toBe(false);
    expect(r.xp).toBe(0);
    expect(db.answers.find((x) => x.block_id === m.id)?.response).toEqual({ picked: wrong, wrong: [wrong] });
  });

  it("бир блокко эки жолу туура жооп XP'ни эки эселебейт", async () => {
    await playStage(0);
    const m = content.stages[1].blocks.find((b) => b.type === "mcq") as McqBlock;
    const r1 = await submitAnswer("a1", m.id, { picked: m.correct });
    const r2 = await submitAnswer("a1", m.id, { picked: m.correct });
    expect(r2.xp).toBe(r1.xp);
    expect(r2.answer?.tries).toBe(2);
  });

  it("бөлүк бүтө электе completeStage иштебейт", async () => {
    const r = await completeStage("a1", 0);
    expect(r.error).toBeDefined();
    expect(db.attempts[0].current_stage).toBe(0);
  });

  it("азыркы эмес бөлүктү бүтүрүүгө болбойт", async () => {
    expect((await completeStage("a1", 3)).error).toBeDefined();
  });

  it("exit ticket'ке экинчи жооп жана бүткөн сабакка жооп кабыл алынбайт", async () => {
    for (let si = 0; si < 4; si++) await playStage(si);
    const m = content.stages[4].blocks.find((b) => b.type === "mcq") as McqBlock;
    expect((await submitAnswer("a1", m.id, { picked: m.correct })).answer?.is_correct).toBe(true);
    expect((await submitAnswer("a1", m.id, { picked: 0 })).error).toMatch(/бир гана/);

    for (const b of content.stages[4].blocks) {
      const r = correctResponse(b);
      if (r && b.id !== m.id) await submitAnswer("a1", b.id, r);
    }
    const fin = await completeStage("a1", 4);
    expect(fin.finished).toEqual({ score: db.attempts[0].exit_score, total: db.attempts[0].exit_total });
    expect((await submitAnswer("a1", m.id, { picked: m.correct })).error).toMatch(/бүткөн/);
  });

  it("окуучунун клиенти аркылуу эч нерсе жазылбайт", async () => {
    const b = content.stages[0].blocks.find((x) => correctResponse(x))!;
    await submitAnswer("a1", b.id, correctResponse(b)!);
    expect(writes).toEqual([`answers.upsert:${b.id}`, "attempts.update"]);
  });
});

describe("туура жооптор браузерге жетпейт", () => {
  it("чечилмейинче mcq'нын туура жообу жана түшүндүрмөсү жашырылат, чечилгенде ачылат", async () => {
    await playStage(0);
    const m = content.stages[1].blocks.find((b) => b.type === "mcq") as McqBlock;
    expect(studentBlock(m, undefined, false, "a1")).toMatchObject({ correct: -1, explain: undefined });
    const wrong = await submitAnswer("a1", m.id, { picked: (m.correct + 1) % m.options.length });
    expect(wrong.block).toMatchObject({ correct: -1 });
    const right = await submitAnswer("a1", m.id, { picked: m.correct });
    expect(right.block).toMatchObject({ correct: m.correct, explain: m.explain });
  });

  it("exit ticket'те туура жооп эч качан ачылбайт", async () => {
    for (let si = 0; si < 4; si++) await playStage(si);
    const m = content.stages[4].blocks.find((b) => b.type === "mcq") as McqBlock;
    const r = await submitAnswer("a1", m.id, { picked: m.correct });
    expect(r.answer?.is_correct).toBe(true);
    expect(r.block).toMatchObject({ correct: -1 });
  });

  it("саптар аралаштырылат; баштапкы тартипти жиберсе — ката, көргөнүнөн туура курса — туура", async () => {
    for (let si = 0; si < 2; si++) await playStage(si);
    const p = content.stages.flatMap((s) => s.blocks).find((b) => b.type === "parsons") as ParsonsBlock;
    const view = studentBlock(p, undefined, false, "a1") as ParsonsBlock;
    expect(view.shuffled).toBe(true);
    expect(view.lines).not.toEqual(p.lines);
    expect([...view.lines].sort()).toEqual([...p.lines].sort());
    const naive = await submitAnswer("a1", p.id, { order: p.lines.map((_, i) => i) });
    expect(naive.answer?.is_correct).toBe(false);
    const good = await submitAnswer("a1", p.id, studentResponse(p)!);
    expect(good.answer?.is_correct).toBe(true);
    expect(good.block).toEqual(p); // чечилгенде туура тартип ачылат
  });

  it("bug_hunt: табыла элек каталар жана оңдолгон код жашырылат", () => {
    const b = content.stages.flatMap((s) => s.blocks).find((x) => x.type === "bug_hunt");
    if (!b || b.type !== "bug_hunt") return;
    const view = studentBlock(b, undefined, false, "a1");
    expect(view).toMatchObject({ bugs: [], bugCount: b.bugs.length, fixed: undefined });
  });
});

describe("жалпы таймердеги окуучу",()=>{
 it("мурунку/кийинки бөлүк жана пауза серверде жабык",async()=>{db.attempts.push(attempt("clock"));live={timed:true,max_stage:1,paused:false};const block=content.stages[0].blocks.find(b=>b.type==="open")!;expect((await submitAnswer("clock",block.id,{text:"Жооп"})).error).toBeTruthy();live.paused=true;expect((await submitAnswer("clock",content.stages[1].blocks[0].id,{})).error).toBeTruthy();expect(writes).toHaveLength(0);});
 it("мурунку бөлүк бүтпөсө да жалпы учурдагы бөлүккө жооп бере алат, атомдук RPC гана жазат",async()=>{db.attempts.push(attempt("clock"));activeContent=generatedLesson(lessonPlan(),{topic:"Шарт",grade:7,duration:45,context:"",pairs:false,groups:false,groupSize:4})!.content;live={timed:true,max_stage:2,paused:false};const block=activeContent.stages[2].blocks.find(b=>b.type==="open")!;expect((await submitAnswer("clock",block.id,{text:"Өз түшүндүрмөм"})).error).toBeUndefined();expect(writes).toEqual(["save_clock_answer"]);expect(db.attempts[0].current_stage).toBe(0);});
 it("окуучу өз алдынча кийинки бөлүккө өткөрө албайт",async()=>{db.attempts.push(attempt("clock"));live={timed:true,max_stage:0,paused:false};expect((await completeStage("clock",0)).error).toMatch(/таймер/);expect(writes).toHaveLength(0);});
});

describe("жаңы интерактив серверден сакталат",()=>{
 it("экрандагы индекс сакталат, сервер чыныгы жуптарды баалайт жана XP бир блокко гана эсептелет",async()=>{
  activeContent=structuredClone(content);const b={id:"new-m",type:"matching" as const,prompt:"Дал келтир",pairs:[{left:"А",right:"Бир"},{left:"Б",right:"Эки"},{left:"В",right:"Үч"}],xp:10};activeContent.stages[3].blocks=[b];db.attempts[0].current_stage=3;
  const perm=shufflePerm(3,parsonsSeed(b.id,"a1")),picks=[0,1,2].map(i=>perm.indexOf(i));
  const r=await submitAnswer("a1",b.id,{picks});expect(r.error).toBeUndefined();expect(r.answer?.is_correct).toBe(true);expect(r.answer?.response.picks).toEqual(picks);expect(r.xp).toBe(10);expect(r.block).toHaveProperty("shuffled",true);
  expect((await submitAnswer("a1",b.id,{picks})).xp).toBe(10);
 });
 it("Баалоодо параллелдүү эки сурам биринчи жоопту баспайт",async()=>{
  activeContent=structuredClone(content);const b={id:"new-o",type:"ordering" as const,prompt:"Иретте",steps:["Бир","Эки","Үч"]};activeContent.stages[4].blocks=[b];db.attempts[0].current_stage=4;
  const results=await Promise.all([submitAnswer("a1",b.id,{order:[0,1,2]}),submitAnswer("a1",b.id,{order:[2,1,0]})]);
  expect(results.filter(r=>!r.error)).toHaveLength(1);expect(db.answers.filter(a=>a.block_id===b.id)).toHaveLength(1);expect(results.find(r=>!r.error)?.answer?.response.positions).toBeUndefined();
 });
});

describe("миссияны серверде аткаруу",()=>{
 it("түз чакырса да кадамды аттап жеке жооп тапшыра албайт",async()=>{activeContent=structuredClone(content);activeContent.stages[3]=structuredClone(MISSION_EXAMPLE);db.attempts[0].current_stage=3;expect((await submitAnswer("a1","mission-independent",{text:"Жооп"})).error).toMatch(/мурунку/);expect(writes).toHaveLength(0);live={timed:true,max_stage:3,paused:false};expect((await submitAnswer("a1","mission-independent",{text:"Жооп"})).error).toMatch(/мурунку/);expect(writes).toHaveLength(0);});
 it("машыгуудан кийин жеке жооп бир жолу сакталат, баасы күтүлөт жана баштапкы жооп өзгөрбөйт",async()=>{activeContent=structuredClone(content);activeContent.stages[3]=structuredClone(MISSION_EXAMPLE);db.attempts[0].current_stage=3;for(const b of MISSION_EXAMPLE.blocks.slice(0,2))db.answers.push({attempt_id:"a1",block_id:b.id,stage:3,response:{},is_correct:true,tries:1});const r=await submitAnswer("a1","mission-independent",{text:"Менин далилим"});expect(r.error).toBeUndefined();expect(r.answer).toMatchObject({response:{text:"Менин далилим"},is_correct:null});expect(r.block).toHaveProperty("support",undefined);expect((await submitAnswer("a1","mission-independent",{text:"Башка текст"})).error).toBeTruthy();expect(db.answers.find(a=>a.block_id==="mission-independent")?.response.text).toBe("Менин далилим");expect(writes).toContain("answers.insert:mission-independent");});
});

describe("таблица жооптору",()=>{
 it("сервер өзү эсептейт: жасалма passed/тууралык кабыл алынбайт; форма/locked жана формула сакталат",async()=>{activeContent=structuredClone(content);const b=defaultSheet("sheet");activeContent.stages[3].blocks=[b];db.attempts[0].current_stage=3;expect((await submitAnswer("a1",b.id,{cells:{B2:"99"},passed:3})).error).toBeTruthy();expect(writes).toHaveLength(0);const wrong=await submitAnswer("a1",b.id,{cells:{D2:"=320",D3:"=50",D4:"=370"},is_correct:true});expect(wrong.answer?.is_correct).toBe(false);const r=await submitAnswer("a1",b.id,{cells:{D2:"=B2*C2",D3:"=B3*C3",D4:"=SUM(D2:D3)"}});expect(r.answer?.is_correct).toBe(true);expect((r.answer?.response.cells as Record<string,string>).D4).toBe("=SUM(D2:D3)");expect(r.xp).toBe(10);expect(r.block).toHaveProperty("checksHidden",true);expect(r.block?.type==="spreadsheet"&&r.block.checks.every(c=>c.expected==="")).toBe(true);});
 it("Баалоодо таблица кайра жазылбайт",async()=>{activeContent=structuredClone(content);const b=defaultSheet("exit-sheet");activeContent.stages[4].blocks=[b];db.attempts[0].current_stage=4;const r=await submitAnswer("a1",b.id,{cells:{D2:"=B2*C2",D3:"=B3*C3",D4:"=SUM(D2:D3)"}});expect(r.error).toBeUndefined();expect(r.answer?.response.positions).toBeUndefined();expect((await submitAnswer("a1",b.id,{cells:{}})).error).toBeTruthy();expect(writes).toContain("answers.insert:exit-sheet");});
});

describe("категориялоо сервер агымы",()=>{
 it("тууралык жана позициялар экрандагы объекттерге дал келип сакталат",async()=>{activeContent=structuredClone(content);const b=defaultClassification("classify");activeContent.stages[3].blocks=[b];db.attempts[0].current_stage=3;const perm=shufflePerm(b.items.length,parsonsSeed(b.id,"a1")),groups=perm.map(i=>b.items[i].category);const wrong=[...groups];wrong[0]=(wrong[0]+1)%b.categories.length;const r=await submitAnswer("a1",b.id,{groups:wrong,is_correct:true});expect(r.answer?.is_correct).toBe(false);expect(r.answer?.response.groups).toEqual(wrong);expect(r.answer?.response.positions).toEqual([false,...Array(b.items.length-1).fill(true)]);const good=await submitAnswer("a1",b.id,{groups});expect(good.answer?.is_correct).toBe(true);expect(good.xp).toBe(10);expect(good.block?.type==="classification"&&good.block.items.every(i=>i.category===-1)).toBe(true);});
 it("Баалоодо параллелдүү жооп биринчи тандоону баспайт",async()=>{activeContent=structuredClone(content);const b=defaultClassification("exit-classify");activeContent.stages[4].blocks=[b];db.attempts[0].current_stage=4;const rs=await Promise.all([submitAnswer("a1",b.id,{groups:Array(6).fill(0)}),submitAnswer("a1",b.id,{groups:Array(6).fill(1)})]);expect(rs.filter(r=>!r.error)).toHaveLength(1);expect(db.answers.filter(a=>a.block_id===b.id)).toHaveLength(1);expect(rs.find(r=>!r.error)?.answer?.response.positions).toBeUndefined();expect(writes).toContain(`answers.insert:${b.id}`);});
 it("туура эмес индекс жазылбайт; жалпы таймерде атомдук RPC сакталат",async()=>{activeContent=structuredClone(content);const b=defaultClassification("clock-classify");activeContent.stages[3].blocks=[b];live={timed:true,max_stage:3,paused:false};expect((await submitAnswer("a1",b.id,{groups:Array(6).fill(99)})).error).toBeTruthy();expect(writes).toHaveLength(0);const perm=shufflePerm(6,parsonsSeed(b.id,"a1"));const r=await submitAnswer("a1",b.id,{groups:perm.map(i=>b.items[i].category)});expect(r.answer?.is_correct).toBe(true);expect(writes).toEqual(["save_clock_answer"]);});
});

it("жаңы практикалык жоопто көрүнгөн объекттер сакталат, туура жооптор ачылбайт жана бекитилген көчүрмө өзгөрбөйт",async()=>{activeContent=structuredClone(content);const b=defaultClassification("captured");activeContent.stages[3].blocks=[b];db.attempts[0].current_stage=3;const perm=shufflePerm(b.items.length,parsonsSeed(b.id,"a1")),groups=perm.map(i=>b.items[i].category);const r=await submitAnswer("a1",b.id,{groups});const task=structuredClone(r.answer?.response.task);expect(task).toMatchObject({version:1,type:"classification",items:perm.map(i=>b.items[i].text),choices:b.categories});expect(JSON.stringify(task)).not.toContain('"category":');b.items[0].text="Башка аталыш";const again=await submitAnswer("a1",b.id,{groups});expect(again.answer?.response.task).toEqual(task);});


describe("сабактын ичиндеги оюн", () => {
  const ROUND = "00000000-0000-0000-0000-00000000aa01";
  const questions = [
    { id: "q1", type: "choice", prompt: "P1", options: ["A", "B"], correct: 1, explain: "E1" },
    { id: "q2", type: "choice", prompt: "P2", options: ["A", "B"], correct: 0 },
  ];
  beforeEach(() => {
    activeContent = structuredClone(content);
    activeContent.stages[0].blocks = [{ id: "g1", type: "game", setId: "50000000-0000-0000-0000-000000007001", title: "Оюн" }];
    gameSet = { author_id: "T1", questions };
  });

  it("суроону серверде баалап, бардыгы чечилгенде бөлүктү ачат", async () => {
    const r1 = await answerLessonGame("a1", "g1", ROUND, "q1", { pick: 0, correct: true });
    expect(r1).toMatchObject({ correct: false, reveal: { type: "choice", correct: 1 }, explain: "E1", current_stage: 0 });
    expect(r1.answer?.is_correct).toBeNull();
    await answerLessonGame("a1", "g1", ROUND, "q2", { pick: 0 });
    const r3 = await answerLessonGame("a1", "g1", ROUND, "q1", { pick: 1 });
    expect(r3).toMatchObject({ correct: true, current_stage: 1 });
    expect(r3.answer).toMatchObject({ is_correct: true, tries: 1, response: { complete: true, score: 50, best: 50 } });
    expect(db.attempts[0].current_stage).toBe(1);
  });

  it("башка мугалимдин топтомун ачпайт", async () => {
    gameSet = { author_id: "T2", questions };
    expect((await answerLessonGame("a1", "g1", ROUND, "q1", { pick: 1 })).error).toBeTruthy();
    expect(writes).toEqual([]);
  });

  it("жалпы таймерде, ачыла элек бөлүктө жана жараксыз раундда жооп кабыл алынбайт", async () => {
    expect((await answerLessonGame("a1", "g1", "bad", "q1", { pick: 1 })).error).toBeTruthy();
    live = { max_stage: 4, paused: false, timed: true };
    expect((await answerLessonGame("a1", "g1", ROUND, "q1", { pick: 1 })).error).toContain("таймер");
    live = null;
    activeContent.stages[2].blocks.push({ id: "g2", type: "game", setId: "50000000-0000-0000-0000-000000007001", title: "Оюн" });
    expect((await answerLessonGame("a1", "g2", ROUND, "q1", { pick: 1 })).error).toContain("ачыла элек");
    expect(writes).toEqual([]);
  });

  it("кадимки submitAnswer аркылуу оюнду «бүтүрүүгө» болбойт", async () => {
    expect((await submitAnswer("a1", "g1", { complete: true })).error).toBeTruthy();
    expect(db.attempts[0].current_stage).toBe(0);
  });
});
