import { describe, expect, it, vi } from "vitest";
import { legacyPythonIf as pythonIf } from "@/content/examples/python-if";
import type { McqBlock } from "@/lib/lesson-types";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/student-lessons", () => ({ lessonsByIds: async () => new Map() }));
const { buildReport } = await import("@/lib/student-report");

const content = pythonIf.content;
const mcq = content.stages[1].blocks.find((b) => b.type === "mcq") as McqBlock;
const wrong = (mcq.correct + 1) % mcq.options.length;

const input = (details: boolean) => ({
  student: { id: "s", full_name: "Айбек Маратов", username: "aibek1" },
  classNames: new Map([["c", "7-А"]]),
  classIds: ["c"],
  assignments: [{ id: "a", class_id: "c", created_at: "2026-09-01T05:00:00Z", due_at: null, lessons: { title: pythonIf.title, topic: pythonIf.topic, content } }],
  attempts: [
    { id: "t", assignment_id: "a", student_id: "s", current_stage: 5, xp: 80, exit_score: 2, exit_total: 3, confidence: 3, started_at: "2026-09-01T06:00:00Z", finished_at: "2026-09-01T07:00:00Z" },
  ],
  answers: [{ attempt_id: "t", block_id: mcq.id, stage: 1, response: { picked: wrong, wrong: [wrong] }, is_correct: false, tries: 1 }],
  details,
});

describe("buildReport", () => {
  it("мугалим үчүн: суроолор боюнча деталдар, туура жооп менен", () => {
    const r = buildReport(input(true));
    const b = r.lessons[0].blocks.find((x) => x.id === mcq.id)!;
    expect(b.answer).toBe(mcq.options[wrong]);
    expect(b.note).toBe(`Туура жооп: ${mcq.options[mcq.correct]}`);
  });

  it("окуучунун өзү үчүн: деталдар жана туура жооптор жок", () => {
    const r = buildReport(input(false));
    expect(r.lessons[0].blocks).toEqual([]);
    expect(JSON.stringify(r)).not.toContain(`Туура жооп`);
  });

  it("жыйынтык сандары", () => {
    const r = buildReport(input(false));
    expect(r.summary).toMatchObject({ assigned: 1, finished: 1, avgExitPct: 67, totalXp: 80, avgConfidence: 3, firstTryPct: 0 });
    expect(r.lessons[0].status).toBe("attention");
  });
});

it("көндүмдөрдүн картасы окуучуга жооптун мазмунун же туура вариантты чыгарбайт", () => {
  const data=input(false);
  const tagged=structuredClone(data.assignments[0].lessons.content);
  for(const stage of tagged.stages) for(const block of stage.blocks) if(block.id===mcq.id) block.skills=["conditions"];
  data.assignments[0].lessons.content=tagged;
  const r=buildReport(data);
  const skill=r.skills!.find(s=>s.id==="conditions")!;
  expect(skill.status).toBe("practice");expect(skill.evidence).toHaveLength(1);
  expect(skill.evidence[0]).toEqual({skill:"conditions",lessonId:"a",assignmentId:"a",blockId:mcq.id,title:pythonIf.title,date:data.assignments[0].created_at,result:"incorrect"});
  expect(r.lessons[0].blocks).toEqual([]);
});

it("практикалык деталдар мугалимге гана берилет",async()=>{const {defaultClassification}=await import("./classification"),{practicalSnapshot}=await import("./practical-evidence"),{emptyLesson}=await import("./lesson-edit");const b=defaultClassification("c"),x:Parameters<typeof buildReport>[0]=input(true),c=emptyLesson();c.stages[3].blocks=[b];x.assignments[0].lessons!.content=c;x.answers=[{attempt_id:"t",block_id:b.id,stage:3,response:{groups:Array(6).fill(0),task:practicalSnapshot(b,"t")},is_correct:false,tries:1}];expect(buildReport(x).lessons[0].blocks[0].practical?.rows).toHaveLength(6);x.details=false;const result=buildReport(x);expect(result.lessons[0].blocks).toEqual([]);expect(JSON.stringify(result)).not.toContain("Учурдагы эталон");expect(JSON.stringify(result)).not.toContain("Клавиатура");});
