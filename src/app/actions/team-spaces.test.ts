import {beforeEach,describe,expect,it,vi} from "vitest";
const state=vi.hoisted(()=>({role:"teacher",rpc:vi.fn(),refresh:vi.fn()}));
vi.mock("@/lib/auth",()=>({requireRole:async(role:string)=>{if(role!==state.role)throw Error("forbidden");return {supabase:{rpc:state.rpc}};}}));
vi.mock("next/cache",()=>({revalidatePath:state.refresh}));
import {createTeamSpace,manageTeamSpace,saveTeamWork,submitTeamWork,submitTeamNote} from "./team-spaces";
const id="00000000-0000-0000-0000-000000009001",a="00000000-0000-0000-0000-000000009002",b="00000000-0000-0000-0000-000000009003";
function fd(v:Record<string,string|string[]>){const f=new FormData();Object.entries(v).forEach(([k,value])=>(Array.isArray(value)?value:[value]).forEach(s=>f.append(k,s)));return f;}
const team=()=>fd({assignmentId:id,name:"Жуп",prompt:"Бирге изилде",stage:"1",members:[a,b],roles:"Жазуучу\nТекшерүүчү"});
beforeEach(()=>{state.role="teacher";state.rpc.mockReset().mockResolvedValue({data:"ok",error:null});state.refresh.mockClear();});
describe("Топтук иш аракеттери",()=>{
 it("мугалим жана окуучу аракеттерин ажыратат",async()=>{state.role="student";await expect(createTeamSpace({},team())).rejects.toThrow();await expect(manageTeamSpace({},fd({}))).rejects.toThrow();state.role="teacher";await expect(saveTeamWork({},fd({}))).rejects.toThrow();await expect(submitTeamNote({},fd({}))).rejects.toThrow();expect(state.rpc).not.toHaveBeenCalled();});
 it("топтун текшерилген талааларын гана өткөрөт",async()=>{const f=team();f.set("active","false");f.set("xp","999");await createTeamSpace({},f);expect(state.rpc).toHaveBeenCalledWith("create_team_space",{p_assignment:id,p_name:"Жуп",p_prompt:"Бирге изилде",p_stage:1,p_members:[a,b],p_roles:["Жазуучу","Текшерүүчү"]});});
 it("кайталанган мүчө жана ролдордун башка санын өткөрбөйт",async()=>{const f=team();f.delete("members");f.append("members",a);f.append("members",a);expect((await createTeamSpace({},f)).error).toBeTruthy();f.delete("members");f.append("members",a);f.append("members",b);f.set("roles","Бир роль");await createTeamSpace({},f);expect(state.rpc).not.toHaveBeenCalled();});
 it.each(["","-1","NaN","1.5"])("жараксыз %s версиясы жазууга жетпейт",async version=>{state.role="student";await saveTeamWork({},fd({teamId:id,version,response:"Жооп"}));expect(state.rpc).not.toHaveBeenCalled();});
 it("окуучунун жасалма аракетин, редакторун же упайын албайт",async()=>{state.role="student";await saveTeamWork({},fd({teamId:id,version:"0",response:"Жооп",action:"rotate",studentId:b,xp:"999"}));expect(state.rpc).toHaveBeenCalledWith("change_team_space",{p_team:id,p_version:0,p_action:"save",p_text:"Жооп"});});
 it("бекитүү жаңы жоопту жашыруун жазбайт",async()=>{state.role="student";await submitTeamWork({},fd({teamId:id,version:"3",response:"Сакталбаган жооп"}));expect(state.rpc).toHaveBeenCalledWith("change_team_space",{p_team:id,p_version:3,p_action:"submit"});});
 it("мугалимдин аракетин чектейт",async()=>{await manageTeamSpace({},fd({teamId:id,version:"1",action:"save"}));expect(state.rpc).not.toHaveBeenCalled();await manageTeamSpace({},fd({teamId:id,version:"1",action:"rotate"}));expect(state.rpc).toHaveBeenCalledWith("change_team_space",{p_team:id,p_version:1,p_action:"rotate"});});
 it("жеке түшүндүрмөдө башка окуучунун idсин өткөрбөйт",async()=>{state.role="student";await submitTeamNote({},fd({teamId:id,explanation:"Өз сөзүм",contribution:"Өз салымым",studentId:b}));expect(state.rpc).toHaveBeenCalledWith("submit_team_note",{p_team:id,p_explanation:"Өз сөзүм",p_contribution:"Өз салымым"});});
 it("версия кагылышуусунда ийгилик көрсөтпөйт",async()=>{state.role="student";state.rpc.mockResolvedValue({data:"changed",error:null});expect((await saveTeamWork({},fd({teamId:id,version:"0",response:"Жооп"}))).error).toContain("версиясы өзгөрдү");expect(state.refresh).not.toHaveBeenCalled();});
 it("ички база катасын жашырат",async()=>{state.rpc.mockResolvedValue({data:null,error:{message:"private-detail"}});expect(JSON.stringify(await createTeamSpace({},team()))).not.toContain("private-detail");expect(state.refresh).not.toHaveBeenCalled();});
});
