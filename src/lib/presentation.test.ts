import {describe,it,expect} from "vitest";
import {validSlides} from "./presentation";
import {newBlock,emptyLesson,checkStructure,validateLesson} from "./lesson-edit";
import {isInteractive,isGraded} from "./lesson-types";
import {generatedLesson} from "./lesson-generator";
import {lessonPlan} from "@/test/lesson-plan";
const slides=()=>Array.from({length:5},()=>({title:"Маалыматтан жыйынтыкка",body:"Киргизилген санды формула менен эсептейбиз.",icon:"table" as const,diagram:["Сан: 5","Формула: 5 × 2","Жыйынтык: 10"],question:"Сан өзгөрсө эмне болот?"}));
describe("Презентация",()=>{
 it("5–6 слайд жана коопсуз чектелген формат",()=>{expect(validSlides(slides())).toBe(true);expect(validSlides([...slides(),slides()[0]])).toBe(true);expect(validSlides(slides().slice(1))).toBe(false);expect(validSlides([...slides(),...slides()])).toBe(false);expect(validSlides(slides().map(s=>({...s,icon:"<script>"})))).toBe(false);expect(validSlides(slides().map(s=>({...s,body:"x".repeat(601)})))).toBe(false);});
 it("жооп/упай талап кылбайт, туура бөлүктө жарыяланат",()=>{const b=newBlock("presentation","p1");expect(isInteractive(b)).toBe(false);expect(isGraded(b)).toBe(false);const c=emptyLesson();c.stages[2].blocks=[{...b,type:"presentation",title:"Түшүндүрмө",slides:slides()}];expect(checkStructure(c)).toBeNull();expect(validateLesson("Сабак",c).some(i=>i.blockId==="p1")).toBe(false);c.stages[0].blocks=c.stages[2].blocks;expect(validateLesson("Сабак",c).some(i=>i.message.includes("Презентацияны"))).toBe(true);});
 it("ЖИ ар дайым презентацияны талап кылат",()=>{const input={topic:"Таблица",grade:7,duration:45,context:"",pairs:false,groups:false,groupSize:4};expect(generatedLesson({...lessonPlan(),slides:undefined},{...input,presentation:true})).toBeNull();const result=generatedLesson({...lessonPlan(),slides:slides()},{...input,presentation:true})!;expect(result.content.stages[2].blocks.some(b=>b.type==="presentation")).toBe(true);expect(checkStructure(result.content)).toBeNull();});
});

import {validSlideImage,MAX_SLIDE_IMAGE_BYTES} from "./presentation";
const image=()=>({src:"data:image/png;base64,iVBORw0KGgoAAA==",alt:"Таблица",caption:"Мисал",credit:"Автор"});
it("сүрөт үчүн тышкы URL, SVG, жасалма түр жана көлөм кабыл алынбайт",()=>{
 expect(validSlideImage(image())).toBe(true);
 for(const src of ["https://example.com/pic.png","data:image/svg+xml;base64,PHN2Zz4=","data:image/png;base64,PHN2Zz4=",`data:image/png;base64,iVBORw0KGgo${"A".repeat(MAX_SLIDE_IMAGE_BYTES*2)}`])expect(validSlideImage({...image(),src})).toBe(false);
 expect(validSlides(slides().map(s=>({...s,image:image()})))).toBe(true);
});
it("сүрөт менен сактоо/кайра окуу жана альтернативдүү тексттин талабы",()=>{
 const c=emptyLesson();c.stages[2].blocks=[{id:"slides",type:"presentation",title:"Тема",slides:slides().map(s=>({...s,image:{...image(),alt:""}}))}];
 const restored=JSON.parse(JSON.stringify(c));expect(checkStructure(restored)).toBeNull();expect(validateLesson("Сабак",restored).some(i=>i.message.includes("альтернативдүү"))).toBe(true);
 expect(checkStructure({...c,teacherNotes:"x".repeat(860000)})).toMatch(/көлөмү/);
});
