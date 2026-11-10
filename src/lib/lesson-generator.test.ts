import { describe, expect, it } from "vitest";
import { generatedLesson, generationInput, lessonGenerationSchema, type GenerationInput } from "./lesson-generator";
import { lessonPlan } from "@/test/lesson-plan";
import { validateLesson, checkStructure } from "./lesson-edit";
import { teamworkBlock } from "@/components/builder/teamwork-editor";
const input:GenerationInput={topic:"Шарттуу оператор",grade:7,duration:45,context:"",pairs:true,groups:true,groupSize:4};
describe("ЖИ сабагынын каркасы",()=>{
 it("5E толук сабак, ролдор, жеке баалоо жана туруктуу id түзөт",()=>{
  const l=generatedLesson(lessonPlan(),input)!;expect(l).toBeTruthy();expect(checkStructure(l.content)).toBeNull();expect(validateLesson(l.title,l.content)).toEqual([]);
  expect(l.content.stages.reduce((n,s)=>n+s.minutes,0)).toBe(45);
  expect(l.content.stages[1].blocks.find(b=>b.collaboration==="pair")?.teamwork?.roles).toHaveLength(2);
  expect(l.content.stages[3].blocks.find(b=>b.collaboration==="group")?.teamwork?.roles).toHaveLength(4);
  expect(l.content.stages[4].blocks.every(b=>!b.collaboration || b.collaboration==="individual")).toBe(true);
  expect(l.content.stages[4].blocks.find(b=>b.type==="open")).toMatchObject({compareTo:"d1"});
 });
 it("тандалбаган жуп/топ тапшырмасын кошпойт",()=>{
  const l=generatedLesson(lessonPlan(),{...input,pairs:false,groups:false})!;expect(l.content.stages.flatMap(s=>s.blocks).some(b=>b.collaboration==="group"||b.collaboration==="pair")).toBe(false);
 });
 it("бузук жооп, тест индекси жана жетишпеген ролдор четке кагылат",()=>{
  expect(generatedLesson(null,input)).toBeNull();const p=lessonPlan();p.exitQuestions[0].correct=99;expect(generatedLesson(p,input)).toBeNull();p.exitQuestions[0].correct=1;p.groupTask.roles.pop();expect(generatedLesson(p,input)).toBeNull();
 });
 it("формадагы классты жана узун текстти текшерет",()=>{
  const f=new FormData();for(const[k,v]of Object.entries(input))f.set(k,String(v));expect(generationInput(f)).toEqual({...input,presentation:true});f.set("grade","11");expect(generationInput(f)).toBeNull();f.set("grade","7");f.set("topic","x".repeat(201));expect(generationInput(f)).toBeNull();
 });
 it("кол менен кошулган топ тапшырмасынын ролдору текшерилет",()=>{
  const l=generatedLesson(lessonPlan(),input)!;const b=teamworkBlock("new","group");l.content.stages[3].blocks.push({...b,prompt:"Маселе чечкиле"});expect(validateLesson(l.title,l.content)).toEqual([]);b.teamwork!.roles.pop();l.content.stages[3].blocks[l.content.stages[3].blocks.length-1]=b;expect(validateLesson(l.title,l.content).some(x=>x.message.includes("роль"))).toBe(true);
 });
});

it("ЖИ көндүмдөрү туура тапшырмаларга гана жайгашат",()=>{
 const tags={explore:["testing"],explain:["explanation"],application:["conditions","testing"],pairTask:["logic"],groupTask:["algorithm"],exit1:["conditions"],exit2:["logic"],exit3:["testing"],reflection:["explanation"]};
 const l=generatedLesson({...lessonPlan(),skillTags:tags},input)!;
 expect(l).toBeTruthy();expect(l.content.stages[3].blocks.find(b=>b.id==="r1")?.skills).toEqual(["conditions","testing"]);expect(l.content.stages[3].blocks.find(b=>b.id==="r-q1")?.skills).toEqual(["conditions","testing"]);
 expect(l.content.stages[4].blocks[0].skills).toEqual(["conditions"]);
 expect(l.content.stages[0].blocks.every(b=>!b.skills)).toBe(true);
 expect(l.content.stages[2].blocks.filter(b=>b.type==="text").every(b=>!b.skills)).toBe(true);
 expect(l.content.stages[4].blocks.find(b=>b.type==="confidence")?.skills).toBeUndefined();
 tags.application.push("logic");expect(l.content.stages[3].blocks[0].skills).toHaveLength(2);
});
it("ЖИ көндүмдөрүнүн бузук тизмесин кабыл албайт",()=>{
 const tags={explore:["testing"],explain:["explanation"],application:["conditions"],pairTask:["logic"],groupTask:["algorithm"],exit1:["conditions"],exit2:["logic"],exit3:["testing"],reflection:["explanation"]};
 for(const value of [null,[],{...tags,application:[]},{...tags,application:["unknown"]},{...tags,application:["logic","logic"]},{...tags,application:["logic","testing","conditions","loops"]},{...tags,extra:["logic"]},{...tags,reflection:undefined}])expect(generatedLesson({...lessonPlan(),skillTags:value},input)).toBeNull();
});

it("чейректик долбоорго жардамсыз жеке практикалык иш жана 25 мүнөт Баалоо берилет",()=>{const l=generatedLesson(lessonPlan(),{...input,pairs:false,groups:false,quarterAssessment:true})!;expect(l).toBeTruthy();expect(l.content.activityKind).toBe("quarterly");expect(l.content.stages[4].minutes).toBe(25);expect(l.content.stages[4].blocks[0]).toMatchObject({id:"e-practical",type:"open",lockOnSubmit:true,collaboration:"individual"});expect(l.content.stages[4].blocks[0].support).toBeUndefined();expect(l.content.stages.reduce((n,s)=>n+s.minutes,0)).toBe(45);expect(checkStructure(l.content)).toBeNull();});

it.each([undefined,0,4,6])("слайд саны %s болсо жаңы ЖИ сабагы сакталбайт",count=>{const p=lessonPlan();const slides=count===undefined?undefined:Array.from({length:count},()=>p.slides[0]);expect(generatedLesson({...p,slides},{...input,presentation:false})).toBeNull();});
it("презентация белгиленбесе да так беш слайд талап кылынат",()=>{const fd=new FormData();for(const[k,v]of Object.entries(input))fd.set(k,String(v));fd.set("presentation","false");expect(generationInput(fd)?.presentation).toBe(true);const schema=lessonGenerationSchema(4);expect(schema.required).toContain("slides");expect(schema.properties.slides).toMatchObject({minItems:5,maxItems:5});const l=generatedLesson(lessonPlan(),{...input,presentation:false})!;const decks=l.content.stages.flatMap(s=>s.blocks).filter(b=>b.type==="presentation");expect(decks).toHaveLength(1);expect(decks[0].slides).toHaveLength(5);expect(l.content.stages[2].blocks).toContain(decks[0]);});

it("ЖИ сабагында баштапкы текшерүү жана деңгээлдүү машыгуу бар; бузук болсо сакталбайт", () => {
  const input = { topic: "Шарт", grade: 7, duration: 45, context: "", pairs: false, groups: false, groupSize: 4 };
  const l = generatedLesson(lessonPlan(), input)!;
  const pre = l.content.stages[0].blocks.filter((b) => b.type === "mcq");
  expect(pre).toHaveLength(3);
  expect(pre.every((b) => b.type === "mcq" && b.precheck && !b.xp)).toBe(true);
  const practice = l.content.stages[3].blocks.filter((b) => b.id.startsWith("r-q"));
  expect(practice.map((b) => b.type === "mcq" && [b.xp, !!b.explain])).toEqual([[10, true], [10, true], [10, true]]);
  const bad = lessonPlan();
  bad.practiceQuestions[0].explain = "";
  expect(generatedLesson(bad, input)).toBeNull();
  const bad2 = lessonPlan();
  bad2.precheckQuestions = bad2.precheckQuestions.slice(0, 2);
  expect(generatedLesson(bad2, input)).toBeNull();
});

it("ЖИ сабагы — бир миссия: окуя, билим карталары жана деңгээлдер", () => {
  const input = { topic: "Шарт", grade: 7, duration: 45, context: "", pairs: false, groups: false, groupSize: 4 };
  const l = generatedLesson(lessonPlan(), input)!;
  expect(l.content.quest?.title).toBe("Мектептин коңгуроосу");
  expect(l.content.cards).toEqual([expect.objectContaining({ id: "k1", title: "if шарты" })]);
  expect(l.content.stages[3].blocks.map((b) => b.level)).toEqual([1, 2, 3, 3]);
  const noQuest = lessonPlan() as Partial<ReturnType<typeof lessonPlan>>;
  delete noQuest.quest;
  expect(generatedLesson(noQuest, input)).toBeNull();
  const tooMany = lessonPlan();
  tooMany.cards = [tooMany.cards[0], tooMany.cards[0], tooMany.cards[0]];
  expect(generatedLesson(tooMany, input)).toBeNull();
});
