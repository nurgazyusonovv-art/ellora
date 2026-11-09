import { describe,it,expect } from "vitest";
import {lessonSeries} from "./lesson-series";
const plan=()=>[{title:"Бөлүм",hours:6,topics:[{id:"topic",title:"Таблица",sessions:Array.from({length:6},(_,i)=>({id:`s${i}`,title:`Сабак ${i}`,objective:`Максат ${i}`,product:`Иш ${i}`}))}]}];
describe("ЖИ серия контексти",()=>{
 it("алты сабактын төртүнчүсүнө туура өткөн/кийинки максаттарды берет",()=>{const s=lessonSeries(plan(),"Таблица","s3")!;expect(s.position).toBe(4);expect(s.total).toBe(6);expect(s.previous).toHaveLength(3);expect(s.current.objective).toBe("Максат 3");expect(s.next).toHaveLength(2);});
 it("башка тема, өчүрүлгөн орун жана бузук план кабыл алынбайт",()=>{expect(lessonSeries(plan(),"Башка","s0")).toBeNull();expect(lessonSeries(plan(),"Таблица","gone")).toBeNull();expect(lessonSeries(null,"Таблица","s0")).toBeNull();});
 it("толук эмес жана өтө чоң пландарды APIге жөнөтпөйт",()=>{const p=plan();p[0].topics[0].sessions[0].objective="";expect(lessonSeries(p,"Таблица","s3")).toBeNull();for(const s of p[0].topics[0].sessions){s.objective="x".repeat(2000);s.product="y".repeat(2000);}expect(lessonSeries(p,"Таблица","s3")).toBeNull();});
});

import { repeatsSeriesTask } from "./lesson-series";
import type { LessonContent } from "./lesson-types";
const content=(prompt:string):LessonContent=>({version:1,stages:[{key:"discover",title:"",minutes:5,blocks:[]},{key:"learning",title:"",minutes:10,blocks:[{id:"i",type:"investigation",prompt,procedure:"Сына"}]}]});
it("мурдагы тапшырманын тыныш/боштук айырмасын да кайталоо деп табат",()=>{
 const a=content("Бюджеттеги товарлардын жалпы баасын эсептеп түшүндүр.");expect(repeatsSeriesTask(content("БЮДЖЕТТЕГИ товарлардын жалпы баасын  эсептеп түшүндүр!"),[a])).toBe(true);
 expect(repeatsSeriesTask(content("Жаңы маалыматтардын орточо маанисин эсептеп салыштыр."),[a])).toBe(false);
});

import {ktpTopicContext} from "./lesson-series";
it("КТП метадатасы мурасталат, сабактагы атайын белгилер жана бош тизме сакталат",()=>{
 const p=[{title:"Б",hours:2,topics:[{id:"t",title:"Таблица",skills:["spreadsheets" as const],kind:"practical" as const,quarter:2,product:"Жалпы иш",sessions:[{id:"s1",title:"Бир",objective:"М",product:"Таблица"},{id:"s2",title:"Эки",objective:"М",product:"Жеке иш",skills:[],kind:"quarterly" as const,quarter:3}]}]}];
 expect(ktpTopicContext(p,"Таблица")).toMatchObject({skills:["spreadsheets"],kind:"practical",quarter:2,product:"Жалпы иш"});
 expect(ktpTopicContext(p,"Таблица","s1")).toMatchObject({skills:["spreadsheets"],kind:"practical",quarter:2,product:"Таблица"});
 expect(ktpTopicContext(p,"Таблица","s2")).toMatchObject({skills:[],kind:"quarterly",quarter:3,product:"Жеке иш"});
 expect(lessonSeries(p,"Таблица","s2")?.current).toMatchObject({skills:[],kind:"quarterly",quarter:3});
 expect(ktpTopicContext(p,"Таблица","gone")).toBeNull();expect(ktpTopicContext([...p,...p],"Таблица")).toBeNull();
});
