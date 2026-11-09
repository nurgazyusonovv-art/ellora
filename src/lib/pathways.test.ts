import {describe,expect,it} from "vitest";
import {validPathwayPlan,isPathway} from "./pathways";
const plan=()=>({goal:"Шартты далил менен түшүндүрүү",variants:{support:"Кадамдарды салыштыр",core:"Өз алдынча чеч",challenge:"Башка кырдаалга колдон"},check_prompt:"Жаңы мисал",rubric:["Шартты туура түздү","Далил келтирди"]});
describe("Үч варианттын планы",()=>{
 it("бир максат жана үч башка вариантты кабыл алат",()=>{expect(validPathwayPlan(plan())).toBe(true);expect(isPathway("core")).toBe(true);expect(isPathway("weak")).toBe(false);});
 it("кайталанган/жетишпеген вариантты жана бош максатты четке кагат",()=>{const p=plan();p.variants.support=p.variants.core;expect(validPathwayPlan(p)).toBe(false);expect(validPathwayPlan({...plan(),variants:{core:"Бирөө"}})).toBe(false);expect(validPathwayPlan({...plan(),goal:" "})).toBe(false);});
 it("өз алдынча суроону жана 2–5 критерийди талап кылат",()=>{expect(validPathwayPlan({...plan(),check_prompt:""})).toBe(false);expect(validPathwayPlan({...plan(),rubric:["Бирөө"]})).toBe(false);expect(validPathwayPlan({...plan(),rubric:Array(6).fill("Критерий")})).toBe(false);expect(validPathwayPlan(null)).toBe(false);});
});
