import {describe,it,expect} from "vitest";
import {explanationView} from "./explanation-view";
import {stageDone} from "./grading";
import type {Stage} from "./lesson-types";
const stage:Stage={key:"practice",title:"Түшүндүрүү",minutes:8,blocks:[{id:"q",type:"open",prompt:"Түшүндүр"},{id:"text",type:"text",body:"Толук түшүндүрмө"},{id:"deck",type:"presentation",title:"Слайддар",slides:[]}]};
describe("Түшүндүрүүдө презентациянын көрүнүшү",()=>{
 it("мугалим алдын ала көргөндө жоопсуз эле бардык блок ачылат",()=>expect(explanationView(stage,"5e",{},true,false).blocks).toHaveLength(3));
 it("окуучу үчүн презентациянын бардыгы белгилүү, баскыч менен ачылат",()=>{const before=explanationView(stage,"5e",{},false,false);expect(before.hasPresentation).toBe(true);expect(before.blocks.map(b=>b.id)).toEqual(["q"]);const after=explanationView(stage,"5e",{},false,true);expect(after.blocks.map(b=>b.id)).toEqual(["q","deck"]);expect(after.ready).toBe(false);expect(stageDone(stage,{})).toBe(false);});
 it("жооптон кийин презентация жана текст кадимкидей ачылат",()=>{const answers={q:{response:{text:"Менин оюм"},is_correct:null,tries:1}};expect(explanationView(stage,"5e",answers,false,false).blocks).toHaveLength(3);});
 it("башка модель жана бөлүктөргө жооп дарбазасы кошулбайт",()=>{expect(explanationView(stage,undefined,{},false,false).blocks).toHaveLength(3);expect(explanationView({...stage,key:"learning"},"5e",{},false,false).blocks).toHaveLength(3);});
});
