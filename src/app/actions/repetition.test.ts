import {beforeEach,describe,expect,it,vi} from "vitest";
import type {RepeatRound} from "@/lib/repetition";
const state=vi.hoisted(()=>({role:"teacher",rpc:vi.fn(),refresh:vi.fn()}));
vi.mock("next/cache",()=>({revalidatePath:(...args:unknown[])=>state.refresh(...args)}));
vi.mock("@/lib/auth",()=>({requireRole:async(role:string)=>{if(role!==state.role)throw Error("forbidden");return {supabase:{rpc:state.rpc}};}}));
import {createRepeatPlan,toggleRepeatPlan,submitRepeat} from "./repetition";
const id="00000000-0000-0000-0000-000000005001";
const rounds=():RepeatRound[]=>[1,3,7].map(days=>({days,questions:[0,1,2].map(i=>({prompt:`${days}-${i}`,options:["А","Б"],correct:0,explain:"Түшүндүрмө"}))}));
const fd=(values:Record<string,string>)=>{const f=new FormData();for(const[k,v]of Object.entries(values))f.set(k,v);return f;};
beforeEach(()=>{state.role="teacher";state.rpc.mockReset().mockResolvedValue({data:"ok",error:null});state.refresh.mockClear();});
describe("Кайталоонун сервер аракеттери",()=>{
 it("мугалим жана окуучунун ролдорун текшерет",async()=>{state.role="student";await expect(createRepeatPlan({},fd({assignmentId:id,rounds:JSON.stringify(rounds())}))).rejects.toThrow();await expect(toggleRepeatPlan({},fd({planId:id,active:"true"}))).rejects.toThrow();state.role="teacher";await expect(submitRepeat({},fd({planId:id,attemptId:id,round:"0",picked:"[0,0,0]"}))).rejects.toThrow();expect(state.rpc).not.toHaveBeenCalled();});
 it("бекитилген планды гана RPCге берет",async()=>{expect((await createRepeatPlan({},fd({assignmentId:id,rounds:JSON.stringify(rounds()),teacherId:"fake"}))).success).toBeTruthy();expect(state.rpc).toHaveBeenCalledWith("create_spaced_review",{p_assignment:id,p_rounds:rounds()});});
 it("бузулган планды же idни сактабайт",async()=>{await createRepeatPlan({},fd({assignmentId:id,rounds:"{}"}));await createRepeatPlan({},fd({assignmentId:"bad",rounds:JSON.stringify(rounds())}));await toggleRepeatPlan({},fd({planId:id,active:"maybe"}));expect(state.rpc).not.toHaveBeenCalled();});
 it("кардардын туура жооп, балл жана убакыт маанилерине ишенбейт",async()=>{state.role="student";await submitRepeat({},fd({planId:id,attemptId:id,round:"1",picked:"[0,1,0]",results:"[true,true,true]",dueAt:"past",xp:"999"}));expect(state.rpc).toHaveBeenCalledWith("submit_spaced_review",{p_plan:id,p_attempt:id,p_round:1,p_picked:[0,1,0]});});
 it("бош же жараксыз варианттарды четке кагат",async()=>{state.role="student";for(const picked of ["[]","[0,-1,0]",'[0,"1",0]',"null"]){expect((await submitRepeat({},fd({planId:id,attemptId:id,round:"0",picked}))).error).toBeTruthy();}expect(state.rpc).not.toHaveBeenCalled();});
 it("убакыт жана ички база каталарын коопсуз көрсөтөт",async()=>{state.role="student";state.rpc.mockResolvedValue({data:"not_due",error:null});expect((await submitRepeat({},fd({planId:id,attemptId:id,round:"0",picked:"[0,0,0]"}))).error).toContain("убактысы");expect(state.refresh).not.toHaveBeenCalled();state.rpc.mockResolvedValue({data:null,error:{message:"secret"}});expect(JSON.stringify(await submitRepeat({},fd({planId:id,attemptId:id,round:"0",picked:"[0,0,0]"})))).not.toContain("secret");});
});
