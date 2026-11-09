import {describe,expect,it} from "vitest";
import {validRepeatRounds,type RepeatRound} from "./repetition";
export const repeatFixture=():RepeatRound[]=>[1,3,7].map(days=>({days,questions:[0,1,2].map(i=>({prompt:`${days}-күн ${i}-суроо`,options:["А","Б","В"],correct:0,explain:"Эмне үчүн туура экенин түшүндүрүү"}))}));
describe("Кайталоо планын текшерүү",()=>{
 it("үч иреттелген күн жана тогуз жаңы суроону кабыл алат",()=>expect(validRepeatRounds(repeatFixture())).toBe(true));
 it("кайталанган же туура эмес күндөрдү четке кагат",()=>{for(const days of [[1,1,7],[3,1,7],[0,3,7],[1,3,91],[1.5,3,7]]){const r=repeatFixture();r.forEach((x,i)=>x.days=days[i]);expect(validRepeatRounds(r)).toBe(false);}});
 it("кайталанган суроо/вариант, жараксыз жооп жана бош түшүндүрмөнү четке кагат",()=>{let r=repeatFixture();r[1].questions[0].prompt=r[0].questions[0].prompt;expect(validRepeatRounds(r)).toBe(false);r=repeatFixture();r[0].questions[0].options=["А"," А "];expect(validRepeatRounds(r)).toBe(false);r=repeatFixture();r[0].questions[0].correct=3;expect(validRepeatRounds(r)).toBe(false);r=repeatFixture();r[0].questions[0].explain=" ";expect(validRepeatRounds(r)).toBe(false);});
 it("ашык көлөмдү жана жетишпеген суроону четке кагат",()=>{const r=repeatFixture();r[0].questions[0].prompt="x".repeat(1001);expect(validRepeatRounds(r)).toBe(false);r[0].questions.pop();expect(validRepeatRounds(r)).toBe(false);expect(validRepeatRounds(null)).toBe(false);});
});
