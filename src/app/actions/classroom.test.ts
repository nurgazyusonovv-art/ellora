import { beforeEach, describe, expect, it, vi } from "vitest";
import { pythonIf } from "@/content/lessons/python-if";
const db=vi.hoisted(()=>({own:true,answered:true,write:vi.fn()}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/lib/auth",()=>({requireRole:async()=>({profile:{id:"teacher"},supabase:{from:(table:string)=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==="attempts"?{assignment_id:"a"}:table==="assignments"?{class_id:"c",lessons:pythonIf}:table==="classes"?(db.own?{id:"c"}:null):db.answered?{block_id:"explain-1"}:null}),upsert:async(v:unknown)=>{db.write(table,v);return {error:null};},delete:()=>({eq:async()=>{db.write(table,"delete");return {error:null};}})};return q;}}})}));
import { controlSession, reviewAnswer } from "./classroom";
function fd(){const f=new FormData();f.set("assignmentId","a");f.set("attemptId","t");f.set("blockId","explain-1");f.set("mode","live");f.set("maxStage","1");f.set("criteria","[true,false]");f.set("feedback","Далилди тактаңыз");return f;}
beforeEach(()=>{db.own=true;db.answered=true;db.write.mockClear();});
describe("мугалимдин класс укугу",()=>{
 it("башка класска баалоо же режим жазылбайт",async()=>{db.own=false;expect((await controlSession({},fd())).error).toBeTruthy();expect((await reviewAnswer({},fd())).error).toBeTruthy();expect(db.write).not.toHaveBeenCalled();});
 it("бош жооп же туура эмес критерийлер бааланбайт",async()=>{db.answered=false;expect((await reviewAnswer({},fd())).error).toBeTruthy();db.answered=true;const f=fd();f.set("criteria","[true]");expect((await reviewAnswer({},f)).error).toBeTruthy();expect(db.write).not.toHaveBeenCalled();});
 it("мыйзамдуу баа учурдагы мугалимдин id'си менен жазылат",async()=>{expect((await reviewAnswer({},fd())).success).toBeTruthy();expect(db.write).toHaveBeenCalledWith("answer_reviews",expect.objectContaining({teacher_id:"teacher",criteria_met:[true,false]}));});
 it("бөлүк диапазону текшерилет жана пауза сакталат",async()=>{const f=fd();f.set("maxStage","5");expect((await controlSession({},f)).error).toBeTruthy();expect(db.write).not.toHaveBeenCalled();f.set("maxStage","2");f.set("paused","true");expect((await controlSession({},f)).success).toBeTruthy();expect(db.write).toHaveBeenCalledWith("lesson_sessions",expect.objectContaining({max_stage:2,paused:true}));});
});
