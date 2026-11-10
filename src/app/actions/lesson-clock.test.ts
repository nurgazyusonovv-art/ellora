import {beforeEach,it,expect,vi} from "vitest";
const db=vi.hoisted(()=>({role:"teacher",own:true,rpc:vi.fn(),read:vi.fn()}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({from:(t:string)=>{const q={select:()=>q,eq:async()=>t==="class_members"?{count:4}:{data:[{current_stage:2,finished_at:null},{current_stage:1,finished_at:null},{current_stage:0,finished_at:"x"}]}};return q;}})}));
vi.mock("@/lib/live-session",()=>({readLiveSession:db.read,readStudentSession:db.read}));
vi.mock("@/lib/auth",()=>({requireRole:async(role:string)=>{if(role!==db.role)throw Error("forbidden");const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:db.own?{assignment_id:"assignment"}:null})};return {profile:{id:"me"},supabase:{rpc:db.rpc,from:()=>q}};}}));
import {controlClock,pollLessonClock} from "./lesson-clock";
const form=()=>{const f=new FormData();f.set("assignmentId","30000000-0000-0000-0000-000000008001");f.set("command","start");f.set("version","-1");f.set("auto","true");f.set("minutes","2");return f;};
beforeEach(()=>{db.role="teacher";db.own=true;db.rpc.mockReset().mockResolvedValue({data:"ok",error:null});db.read.mockReset().mockResolvedValue(null);});
it("окуучу таймерди башкара албайт",async()=>{db.role="student";await expect(controlClock({},form())).rejects.toThrow();expect(db.rpc).not.toHaveBeenCalled();});
it("кардар deadline же узактык массивин бере албайт",async()=>{const f=form();f.set("deadline","2099");f.set("durations","[1,1,1,1,1]");expect((await controlClock({},f)).success).toBeTruthy();expect(db.rpc).toHaveBeenCalledWith("control_lesson_clock",{p_assignment:f.get("assignmentId"),p_command:"start",p_version:-1,p_seconds:120,p_auto:true});});
it("эски версия жана жараксыз убакыт ачык ката берет",async()=>{db.rpc.mockResolvedValue({data:"version",error:null});expect((await controlClock({},form())).error).toMatch(/өзгөрдү/);db.rpc.mockClear();const f=form();f.set("minutes","99");expect((await controlClock({},f)).error).toBeTruthy();expect(db.rpc).not.toHaveBeenCalled();});
it("башка окуучунун аракетинин сааты окулбайт",async()=>{db.role="student";db.own=false;expect((await pollLessonClock("other")).error).toBeTruthy();expect(db.read).not.toHaveBeenCalled();});
it("байланыш катасы сессия жок катары берилбейт",async()=>{db.role="student";db.read.mockRejectedValue(Error("private database"));expect(await pollLessonClock("mine")).toEqual({error:expect.stringContaining("жаңырган жок")});});

it("жүрүп жаткан сабакта класстын жалпы максатын аттарсыз кайтарат; таймерде жок",async()=>{
 db.role="student";db.read.mockResolvedValue({max_stage:1,paused:false});
 expect((await pollLessonClock("attempt")).goal).toEqual({done:2,total:4,target:4,reached:false});
 db.read.mockResolvedValue({max_stage:1,paused:false,timed:true});
 expect((await pollLessonClock("attempt")).goal).toBeNull();
 db.read.mockResolvedValue({max_stage:0,paused:true,waiting:true});
 expect((await pollLessonClock("attempt")).goal).toBeNull();
});
