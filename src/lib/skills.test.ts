import { describe, expect, it } from "vitest";
import { skillMap, skillEvidence, type SkillEvidence } from "./skills";
import { checkStructure, emptyLesson } from "./lesson-edit";
const row = (lessonId:string, result:SkillEvidence["result"]="correct", date="2026-10-01"):SkillEvidence=>({skill:"logic",lessonId,assignmentId:`a-${lessonId}`,blockId:"q1",title:"Логика",date,result});
describe("Көндүмдөрдүн далилдери",()=>{
 it("бир тесттен өздөштүрдү деген жыйынтык чыгарбайт",()=>{expect(skillMap([row("l1")]).find(s=>s.id==="logic")?.status).toBe("few");});
 it("эки башка сабактын далилин талап кылат",()=>{expect(skillMap([row("l1"),row("l2")])[1].status).toBe("evidence");expect(skillMap([row("l1"),{...row("l1"),blockId:"q2"}])[1].status).toBe("few");});
 it("кайталанган дайындоону кош эсептебейт",()=>{expect(skillMap([row("l1"),{...row("l1"),assignmentId:"another"}])[1].evidence).toHaveLength(1);});
 it("акыркы ката же кайра аракет машыгууга багыттайт",()=>{expect(skillMap([row("l1"),row("l2"),row("l3","retry")])[1].status).toBe("practice");expect(skillMap([row("l1","incorrect")])[1].status).toBe("practice");});
 it("баштапкы массивдин иретин өзгөртпөйт жана акыркы үч далилди колдонот",()=>{const a=[row("l1","incorrect","2026-09-01"),row("l2"),row("l3"),row("l4")];const before=structuredClone(a);expect(skillMap(a)[1].status).toBe("evidence");expect(a).toEqual(before);});
 it("ачык жоопту автоматтык туура дебейт, жооп жок болсо далил кошпойт",()=>{const b={id:"q",type:"open" as const,prompt:"Далилде",skills:["logic" as const]};expect(skillEvidence(b,undefined,row("l1"))).toEqual([]);expect(skillEvidence(b,{is_correct:null,tries:1},row("l1"))[0].result).toBe("pending");});
 it("ишеним шкаласы далил эмес, туура жооптор далилге агып чыкпайт",()=>{const b={id:"q",type:"confidence" as const,prompt:"Ишенимиң",skills:["logic" as const]};expect(skillEvidence(b,{is_correct:null,tries:1},row("l1"))).toEqual([]);expect(JSON.stringify(skillMap([row("l1")]))).not.toContain('"answer"');});
 it("белгисиз, кайталанган жана ашык көндүмдөрдү четке кагат",()=>{for(const skills of [["unknown"],["logic","logic"],["logic","algorithm","conditions","loops"]]){const c=emptyLesson();c.stages[0].blocks=[{id:"q",type:"open",prompt:"Суроо"}];Object.assign(c.stages[0].blocks[0],{skills});expect(checkStructure(c)).toContain("көндүм");}});
});
