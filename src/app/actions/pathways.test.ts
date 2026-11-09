import {beforeEach,describe,expect,it,vi} from "vitest";
const state=vi.hoisted(()=>({role:"teacher",rpc:vi.fn(),refresh:vi.fn()}));
vi.mock("next/cache",()=>({revalidatePath:(...args:unknown[])=>state.refresh(...args)}));
vi.mock("@/lib/auth",()=>({requireRole:async(role:string)=>{if(role!==state.role)throw Error("forbidden");return {supabase:{rpc:state.rpc}};}}));
import {createPathwayPlan,assignPathway,requestPathwaySupport,submitPathwayWork,reviewPathwayWork,togglePathwayPlan} from "./pathways";
const id="00000000-0000-0000-0000-000000006001";
const plan={goal:"Максат",variants:{support:"Кадамдар",core:"Негизги мисал",challenge:"Жаңы кырдаал"},check_prompt:"Өз алдынча мисал",rubric:["Критерий1","Критерий2"]};
const fd=(v:Record<string,string>)=>{const f=new FormData();for(const[k,x]of Object.entries(v))f.set(k,x);return f;};
beforeEach(()=>{state.role="teacher";state.rpc.mockReset().mockResolvedValue({data:"ok",error:null});state.refresh.mockClear();});
describe("Варианттуу практиканын аракеттери",()=>{
 it("ролдорду текшерет",async()=>{state.role="student";await expect(assignPathway({},fd({planId:id,attemptId:id,pathway:"core"}))).rejects.toThrow();await expect(reviewPathwayWork({},fd({workId:id,criteria:"[true,true]",feedback:"Пикир"}))).rejects.toThrow();state.role="teacher";await expect(requestPathwaySupport({},fd({planId:id,attemptId:id}))).rejects.toThrow();expect(state.rpc).not.toHaveBeenCalled();});
 it("текшерилген планды бекитет",async()=>{expect((await createPathwayPlan({},fd({assignmentId:id,plan:JSON.stringify(plan)}))).success).toBeTruthy();expect(state.rpc).toHaveBeenCalledWith("create_pathway_plan",{p_assignment:id,p_plan:plan});});
 it("жараксыз вариант же idни өткөрбөйт",async()=>{await assignPathway({},fd({planId:id,attemptId:id,pathway:"weak"}));await togglePathwayPlan({},fd({planId:id,active:"maybe"}));await createPathwayPlan({},fd({assignmentId:id,plan:"{}"}));expect(state.rpc).not.toHaveBeenCalled();});
 it("окуучунун өз алдынча жообун талап кылат",async()=>{state.role="student";expect((await submitPathwayWork({},fd({planId:id,attemptId:id,pathway:"core",response:"Жооп"}))).error).toBeTruthy();expect(state.rpc).not.toHaveBeenCalled();});
 it("баа/XP/окуучу idсин кардардан албайт",async()=>{state.role="student";await submitPathwayWork({},fd({planId:id,attemptId:id,pathway:"core",response:"Жооп",checkResponse:"Жаңы далил",xp:"999",studentId:"other",criteria:"[true,true]"}));expect(state.rpc).toHaveBeenCalledWith("submit_pathway_work",{p_plan:id,p_attempt:id,p_path:"core",p_text:"Жооп",p_check:"Жаңы далил"});});
 it("баалоодо boolean критерий гана кабыл алат",async()=>{await reviewPathwayWork({},fd({workId:id,criteria:'[true,"true"]',feedback:"Пикир"}));expect(state.rpc).not.toHaveBeenCalled();await reviewPathwayWork({},fd({workId:id,criteria:'[true,false]',feedback:"Пикир"}));expect(state.rpc).toHaveBeenCalledWith("review_pathway_work",{p_work:id,p_criteria:[true,false],p_feedback:"Пикир"});});
 it("эски вариантты жана ички катаны коопсуз кайтарат",async()=>{state.role="student";state.rpc.mockResolvedValue({data:"changed",error:null});expect((await submitPathwayWork({},fd({planId:id,attemptId:id,pathway:"core",response:"Жооп",checkResponse:"Текшерүү"}))).error).toContain("өзгөрттү");expect(state.refresh).not.toHaveBeenCalled();state.rpc.mockResolvedValue({data:null,error:{message:"secret"}});expect(JSON.stringify(await requestPathwaySupport({},fd({planId:id,attemptId:id})))).not.toContain("secret");});
});
