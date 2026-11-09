import { beforeEach, describe, expect, it, vi } from "vitest";
import { lessonPlan } from "@/test/lesson-plan";
vi.mock("server-only",()=>({}));
const imageMock=vi.hoisted(()=>({run:vi.fn()}));
vi.mock("@/lib/slide-illustrations",()=>({illustrateSlides:imageMock.run}));
const db=vi.hoisted(()=>({lessons:[] as unknown[],history:[] as {id:string;input:unknown;status:string;lesson_id:string|null}[],plan:null as unknown,owned:true,reserve:"gid" as string|null,role:"teacher",rpc:vi.fn(),insert:vi.fn(),updates:[] as Record<string,unknown>[],auth:vi.fn()}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/lib/auth",()=>({
 requireRole:async(role:string)=>{
  db.auth(role);if(role!==db.role)throw Error("forbidden");
  return {profile:{id:"me"},supabase:{
   rpc:async(...args:unknown[])=>{db.rpc(...args);return {data:db.reserve,error:null};},
   from:(table:string)=>{
    const q={select:()=>q,eq:()=>q,contains:()=>q,order:()=>q,in:async()=>({data:db.lessons,error:null}),limit:async()=>({data:db.history,error:null}),maybeSingle:async()=>({data:table==="ktp_plans"?db.plan:db.owned?{id:"gid"}:null}),insert:(value:unknown)=>{db.insert(table,value);return q;},single:async()=>({data:{id:"lesson"},error:null})};
    return q;
   }
  }};
 }
}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({from:()=>({update:(v:Record<string,unknown>)=>{db.updates.push(v);const q={eq:()=>q,then:(resolve:(v:unknown)=>unknown)=>Promise.resolve({error:null}).then(resolve)};return q;}})})}));
import { generateLesson } from "./lesson-ai";
const form=()=>{const f=new FormData();for(const[k,v]of Object.entries({topic:"Шарттуу оператор",grade:7,duration:45,context:"",pairs:true,groups:true,groupSize:4}))f.set(k,String(v));return f;};
beforeEach(()=>{imageMock.run.mockReset();imageMock.run.mockImplementation(async(slides)=>({slides,created:slides.length,missing:0,model:"test"}));db.lessons=[];db.history=[];db.plan=null;db.owned=true;db.reserve="gid";db.role="teacher";db.rpc.mockClear();db.auth.mockClear();db.insert.mockClear();db.updates=[];vi.stubEnv("OPENAI_API_KEY","private-key");vi.stubGlobal("fetch",vi.fn());});
describe("ЖИ менен сабак түзүү",()=>{
 it("окуучу чакыра албайт",async()=>{db.role="student";await expect(generateLesson({},form())).rejects.toThrow("forbidden");expect(fetch).not.toHaveBeenCalled();});
 it("лимит же ээлик текшерүүсү өтпөсө API чакырылбайт",async()=>{db.reserve=null;expect((await generateLesson({},form())).error).toMatch(/10/);db.reserve="gid";db.owned=false;expect((await generateLesson({},form())).error).toBeTruthy();expect(fetch).not.toHaveBeenCalled();});
 it("текшерилген сабак долбоор катары сакталат, натыйжа жана токен саны сакталат",async()=>{vi.mocked(fetch).mockResolvedValue({ok:true,json:async()=>({status:"completed",usage:{input_tokens:100,output_tokens:200},output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(lessonPlan())}]}]})} as Response);
  expect(await generateLesson({},form())).toEqual({lessonId:"lesson",generationId:"gid"});expect(db.insert).toHaveBeenCalledWith("lessons",expect.objectContaining({author_id:"me",status:"draft",grade:7}));expect(db.updates[0]).toMatchObject({input_tokens:100,output_tokens:200});expect(db.updates.at(-1)).toMatchObject({status:"ready",lesson_id:"lesson"});const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);expect(body.store).toBe(false);expect(body.text.format.strict).toBe(true);
 });
 it("жараксыз ЖИ текст сакталат, сабак түзүлбөйт",async()=>{vi.mocked(fetch).mockResolvedValue({ok:true,json:async()=>({status:"completed",output:[{type:"message",content:[{type:"output_text",text:'{"bad":true}'}]}]})} as Response);expect((await generateLesson({},form())).error).toBeTruthy();expect(db.updates[0].result).toBe('{"bad":true}');expect(db.insert).not.toHaveBeenCalled();expect(db.updates.at(-1)?.status).toBe("failed");});
 it("тармак катасында ачкыч көрсөтүлбөйт",async()=>{vi.mocked(fetch).mockRejectedValue(Error("private-key"));const r=await generateLesson({},form());expect(r.generationId).toBe("gid");expect(JSON.stringify(r)).not.toContain("private-key");});
});

it("серия табылбаса лимит жана OpenAI чакырылбайт",async()=>{const f=form();f.set("sessionId","missing");expect((await generateLesson({},f)).error).toMatch(/Серия/);expect(db.rpc).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();});
it("серверден алынган серия гана OpenAIге берилет",async()=>{
 db.plan={sections:[{title:"Бөлүм",hours:2,topics:[{id:"t",title:"Шарттуу оператор",sessions:[{id:"s1",title:"Биринчи",objective:"Салыштырат",product:"Мисал"},{id:"s2",title:"Экинчи",objective:"Чечет",product:"Код"}]}]}]};
 const f=form();f.set("sessionId","s2");f.set("series",'{"previous":"fake"}');
 vi.mocked(fetch).mockResolvedValue({ok:false} as Response);await generateLesson({},f);
 const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);const input=JSON.parse(body.input);expect(input.series.position).toBe(2);expect(input.series.previous[0].title).toBe("Биринчи");expect(body.input).not.toContain("fake");
});

it("мурда түзүлгөн серия долбоорун APIге кайра жөнөтпөйт",async()=>{
 db.plan={sections:[{title:"Бөлүм",hours:1,topics:[{id:"t",title:"Шарттуу оператор",sessions:[{id:"s1",title:"Сабак",objective:"Максат",product:"Код"}]}]}]};
 db.history=[{id:"old",input:{series:{sessionId:"s1"}},status:"ready",lesson_id:"existing"}];const f=form();f.set("sessionId","s1");
 expect(await generateLesson({},f)).toMatchObject({lessonId:"existing",generationId:"old"});expect(fetch).not.toHaveBeenCalled();expect(db.rpc).not.toHaveBeenCalled();
});

it("мурунку чыныгы тапшырманы кайталаган сабак сакталбайт",async()=>{
 db.plan={sections:[{title:"Бөлүм",hours:2,topics:[{id:"t",title:"Шарттуу оператор",sessions:[{id:"s1",title:"Бир",objective:"Биринчи максат",product:"Биринчи иш"},{id:"s2",title:"Эки",objective:"Экинчи максат",product:"Экинчи иш"}]}]}]};
 db.history=[{id:"old",input:{series:{sessionId:"s1"}},status:"ready",lesson_id:"first"}];
 const {generatedLesson}=await import("@/lib/lesson-generator");
 const first=generatedLesson(lessonPlan(),{topic:"Шарттуу оператор",grade:7,duration:45,context:"",pairs:true,groups:true,groupSize:4})!;
 first.content.stages[1].blocks=[{id:"old-task",type:"investigation",prompt:"Ушул маанилерди өзгөртүп, жаңы жыйынтыкты салыштырып түшүндүргүлө.",procedure:"Сына"}];
 db.lessons=[{id:"first",title:"Биринчи",content:first.content}];
 const result=lessonPlan();result.explore.prompt="Ушул маанилерди өзгөртүп, жаңы жыйынтыкты салыштырып түшүндүргүлө.";
 vi.mocked(fetch).mockResolvedValue({ok:true,json:async()=>({status:"completed",output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(result)}]}]})} as Response);
 const f=form();f.set("sessionId","s2");expect((await generateLesson({},f)).error).toMatch(/кайталады/);expect(db.insert).not.toHaveBeenCalled();
 const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);expect(JSON.parse(body.input).actualPrevious[0].title).toBe("Биринчи");
});

it("презентациянын сүрөт кызматы иштебесе сабак схемалары менен сакталат",async()=>{
 const slides=Array.from({length:5},()=>({title:"Маалымат",body:"Маалыматтан жыйынтык алабыз",icon:"computer",diagram:["Киргизүү","Жыйынтык"],question:"Эмне өзгөрөт?"}));
 imageMock.run.mockResolvedValue({slides,created:0,missing:5,model:"test"});
 vi.mocked(fetch).mockResolvedValue({ok:true,json:async()=>({status:"completed",output:[{type:"message",content:[{type:"output_text",text:JSON.stringify({...lessonPlan(),slides})}]}]})} as Response);
 const f=form();f.set("presentation","true");const result=await generateLesson({},f);
 expect(result.lessonId).toBe("lesson");expect(result.warning).toMatch(/0\/5/);expect(imageMock.run).toHaveBeenCalledOnce();expect(db.insert).toHaveBeenCalled();expect(db.updates.at(-1)).toMatchObject({status:"ready",error:expect.stringContaining("0/5")});
});

it("КТП көндүмү/иштин түрү серверден алынат, формадагы жасалма контекст өтпөйт",async()=>{
 db.plan={sections:[{title:"Б",hours:1,topics:[{title:"Шарттуу оператор",skills:["conditions"],kind:"quarterly",quarter:2,product:"Жеке программа"}]}]};
 const f=form();f.set("curriculum",JSON.stringify({skills:["web"],kind:"lesson",product:"fake"}));vi.mocked(fetch).mockResolvedValue({ok:false} as Response);await generateLesson({},f);
 const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);expect(JSON.parse(body.input).curriculum).toEqual({title:"Шарттуу оператор",skills:["conditions"],kind:"quarterly",quarter:2,product:"Жеке программа"});expect(body.input).not.toContain("fake");
});
it("бузук КТП менен API же лимитти колдонбойт",async()=>{db.plan={sections:[{title:"Б",hours:1,topics:[{title:"Т",skills:["unknown"]}]}]};expect((await generateLesson({},form())).error).toMatch(/КТП/);expect(fetch).not.toHaveBeenCalled();expect(db.rpc).not.toHaveBeenCalled();});

it("презентацияны өчүргөн форма да беш слайд жана иллюстрация менен түзүлөт",async()=>{const f=form();f.set("presentation","false");vi.mocked(fetch).mockResolvedValue({ok:true,json:async()=>({status:"completed",output:[{type:"message",content:[{type:"output_text",text:JSON.stringify(lessonPlan())}]}]})} as Response);expect((await generateLesson({},f)).lessonId).toBe("lesson");expect(imageMock.run).toHaveBeenCalledOnce();expect(imageMock.run.mock.calls[0][0]).toHaveLength(5);const body=JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);expect(JSON.parse(body.input).presentation).toBe(true);expect(body.text.format.schema.properties.slides).toMatchObject({minItems:5,maxItems:5});const record=db.insert.mock.calls[0][1];expect(record.content.stages[2].blocks.find((b:{type:string})=>b.type==="presentation").slides).toHaveLength(5);});
