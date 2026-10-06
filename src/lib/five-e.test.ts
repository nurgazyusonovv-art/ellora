import { describe, expect, it } from "vitest";
import { pythonIf, legacyPythonIf } from "@/content/lessons/python-if";
import { checkStructure, validateLesson } from "@/lib/lesson-edit";
import { gradeAnswer, stageDone, type SavedAnswer } from "@/lib/grading";
import { stageMeta, type InvestigationBlock, type OpenBlock } from "@/lib/lesson-types";
import { tutorContext, tutorQuestion } from "@/lib/ai-tutor";
import { liveAllows, reviewCriteria } from "@/lib/classroom";
import { studentContent } from "@/lib/student-view";

const investigation = pythonIf.content.stages[1].blocks[0] as InvestigationBlock;
const saved = (response: Record<string, unknown>): SavedAnswer => ({response, is_correct:null, tries:1});
describe("5E окуу далили", () => {
  it("божомол сакталат, жалгыз божомол изилдөөнү бүтүрбөйт", () => {
    const initial = gradeAnswer(investigation, {phase:"prediction",prediction:"10до суук"}, undefined, false);
    expect(initial).toMatchObject({response:{prediction:"10до суук"},is_correct:null});
    if ("error" in initial) throw Error(initial.error);
    expect(stageDone(pythonIf.content.stages[1], {[investigation.id]:saved(initial.response)})).toBe(false);
    const final = gradeAnswer(investigation, {prediction:"өзгөргөн ой",observations:"10 жана 11 ар башка",conclusion:"Чек маанилер маанилүү"}, saved(initial.response), false);
    expect(final).toMatchObject({response:{prediction:"10до суук"},is_correct:null});
    if ("error" in final) throw Error(final.error);
    expect(stageDone(pythonIf.content.stages[1], {[investigation.id]:saved(final.response)})).toBe(true);
  });
  it("баштапкы жоопту кийинки ой менен алмаштырууга болбойт", () => {
    const b = pythonIf.content.stages[0].blocks.find(b=>b.type === "open") as OpenBlock;
    expect(gradeAnswer(b,{text:"жаңы"},saved({text:"баштапкы"}),false)).toMatchObject({response:{text:"баштапкы"}});
  });
  it("изилдөө, түшүндүрүү жана ойду салыштыруу талап кылынат", () => {
    const c = structuredClone(pythonIf.content);
    c.stages[1].blocks=[]; c.stages[2].blocks=[]; c.stages[4].blocks=c.stages[4].blocks.filter(b=>b.type!=="open");
    const errors=validateLesson("Сабак",c);
    expect(errors.some(e=>e.stage===1 && e.message.includes("Изилдөө"))).toBe(true);
    expect(errors.some(e=>e.stage===2 && e.message.includes("өз сөзү"))).toBe(true);
    expect(errors.some(e=>e.stage===4 && e.message.includes("салыштыруу"))).toBe(true);
  });
  it("эски сабактардын мааниси сакталат, мугалимдин нускамасы окуучуга берилбейт", () => {
    expect(stageMeta(legacyPythonIf.content,"learning").label).toBe("Learning");
    expect(stageMeta(pythonIf.content,"learning").label).toBe("Изилдөө");
    expect(studentContent(pythonIf.content,{},"a").teacherNotes).toBeUndefined();
  });
  it("бузук жаңы параметрлер кабыл алынбайт", () => {
    const c=structuredClone(pythonIf.content); Object.assign(c.stages[0].blocks[0],{collaboration:"public"});
    expect(checkStructure(c)).not.toBeNull();
  });
});
describe("AI жана класс чек аралары", () => {
  it("AI контекстине жооптор, код тесттери жана мугалимдин белгилери кошулбайт", () => {
    const c = {...pythonIf.content, teacherNotes:"PRIVATE"};
    const b={id:"m",type:"mcq" as const,prompt:"Шарт?",options:["SECRET"],correct:0,explain:"ANSWER"};
    expect(tutorContext(c,"practice",b)).toEqual({stage:"Түшүндүрүү",task:"Шарт?",procedure:undefined});
    expect(JSON.stringify(tutorContext(c,"practice",b))).not.toMatch(/SECRET|PRIVATE|ANSWER|correct/);
  });
  it("багыттоочу суроо гана кабыл алынат", () => {
    expect(tutorQuestion({question:"Кайсы маанини өзгөртүп сынайсың?"})).toBeTruthy();
    for(const question of ["print(1)?","Даяр жооп.","Туура жооп: 2?","x".repeat(251)+"?"] ) expect(tutorQuestion({question})).toBeNull();
  });
  it("пауза жана жабык бөлүк тосулат; өз алдынча режим уруксат берет", () => {
    expect(liveAllows({max_stage:1,paused:false},2)).toBe(false);
    expect(liveAllows({max_stage:4,paused:true},0)).toBe(false);
    expect(liveAllows(null,4)).toBe(true);
  });
  it("баалоо критерийлеринин саны жана түрү дал келүүгө тийиш", () => {
    expect(reviewCriteria('[true,false]',2)).toEqual([true,false]);
    for(const input of ['[true]','[1,false]','null','bad']) expect(reviewCriteria(input,2)).toBeNull();
  });
});
