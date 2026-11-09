import { describe, expect, it } from "vitest";
import { engagementSequence } from "./engagement";
import { checkStructure, emptyLesson, validateLesson } from "./lesson-edit";
import { generatedLesson, type GenerationInput } from "./lesson-generator";
import { stageDone } from "./grading";
import { lessonPlan } from "@/test/lesson-plan";
const input: GenerationInput = {topic:"Шарттар",grade:7,duration:45,context:"",pairs:false,groups:false,groupSize:4};
describe("Кызыктыруунун кадамдары", () => {
  it("блокторду өчүрбөй уникалдуу id менен кошот", () => {
    const c=emptyLesson(); c.stages[0].blocks=[{id:"d1",type:"open",prompt:"Эски суроо"},{id:"d3",type:"text",body:"Эски текст"}];
    const before=structuredClone(c); const blocks=engagementSequence(c);
    expect(c).toEqual(before);expect(blocks.map(b=>b.id)).toEqual(["d2","d4","d5"]);
    expect(blocks.map(b=>b.engagement?.level)).toEqual([1,2,3]);
    expect(blocks.every(b=>b.lockOnSubmit && !b.optional)).toBe(true);
  });
  it("баа талап кылбай бардык кадамга жооп күтөт", () => {
    const c=emptyLesson();c.stages[0].blocks=engagementSequence(c);
    const a={response:{text:"Менин божомолум"},is_correct:null,tries:1};
    expect(stageDone(c.stages[0],{d1:a})).toBe(false);
    expect(stageDone(c.stages[0],{d1:a,d2:a,d3:a})).toBe(true);
  });
  it("генератор жетишсиз, тескери иреттелген жана бир түрдүү кадамдарды четке кагат", () => {
    const p=lessonPlan();p.engage.activities.reverse();expect(generatedLesson(p,input)).toBeNull();
    p.engage.activities.reverse();p.engage.activities.pop();expect(generatedLesson(p,input)).toBeNull();
    const q=lessonPlan();q.engage.activities.forEach(a=>a.kind="question");expect(generatedLesson(q,input)).toBeNull();
  });
  it("жаңы талаалардын форматын жана татаалдык иретин текшерет", () => {
    const l=generatedLesson(lessonPlan(),input)!;
    expect(l.content.stages[0].blocks).toHaveLength(3);
    l.content.stages[0].blocks.reverse();expect(validateLesson(l.title,l.content).some(i=>i.message.includes("жөнөкөйдөн татаалга"))).toBe(true);
    const raw=JSON.parse(JSON.stringify(l.content));raw.stages[0].blocks[0].engagement.level=99;expect(checkStructure(raw)).toContain("деңгээли");
  });
  it("эски бир суроолуу сабак жарактуу бойдон калат", () => {
    const l=generatedLesson(lessonPlan(),input)!;l.content.stages[0].blocks=[{id:"d1",type:"open",prompt:"Баштапкы ой",lockOnSubmit:true}];
    expect(checkStructure(l.content)).toBeNull();expect(validateLesson(l.title,l.content)).toEqual([]);
  });
});
