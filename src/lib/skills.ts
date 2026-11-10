import { isGraded, isInteractive, type Block } from "@/lib/lesson-types";

export const SKILLS = {
  algorithm: "Алгоритм түзүү",
  logic: "Логикалык ой жүгүртүү",
  conditions: "Шарттуу операторлор",
  loops: "Кайталоо жана циклдер",
  variables: "Өзгөрмөлөр жана маалымат",
  debugging: "Катаны табуу жана оңдоо",
  testing: "Сыноо жана чек маанилери",
  explanation: "Чечимди далил менен түшүндүрүү",
  spreadsheets: "Электрондук таблица жана формулалар",
  information: "Маалыматты уюштуруу жана классификациялоо",
  computing: "Компьютер жана программалык камсыздоо",
  networks: "Тармак жана санариптик баарлашуу",
  safety: "Санариптик коопсуздук жана укук",
  ai_literacy: "ЖИни сынчыл жана жоопкерчиликтүү колдонуу",
  modeling: "Маалыматтык жана компьютердик моделдөө",
  multimedia: "Мультимедиа жана санариптик долбоор",
  number_systems: "Сан эсептөө системалары",
  databases: "Маалымат базасы жана суроо-талаптар",
  web: "Веб-баракча түзүү",
} as const;
export type SkillId = keyof typeof SKILLS;
export const isSkillId = (v: unknown): v is SkillId => typeof v === "string" && Object.hasOwn(SKILLS,v);
export type SkillEvidence = { skill: SkillId; lessonId: string; assignmentId: string; blockId: string; title: string; date: string; result: "correct" | "retry" | "incorrect" | "pending" };
export type SkillProgress = { id: SkillId; label: string; status: "few" | "practice" | "evidence"; evidence: SkillEvidence[] };
export function skillEvidence(block: Block, answer: {is_correct:boolean|null;tries:number}|undefined, context: Omit<SkillEvidence,"skill"|"result">): SkillEvidence[] {
  if (!answer || !isInteractive(block) || block.type === "confidence" || (block.type === "mcq" && block.precheck)) return [];
  const result: SkillEvidence["result"] = !isGraded(block) ? "pending" : answer.is_correct === true ? (answer.tries === 1 ? "correct" : "retry") : "incorrect";
  return (block.skills ?? []).filter(isSkillId).map(skill=>({...context,skill,result}));
}
/** Бир сабактагы бир блок бир нече класска берилсе да бир далил. Эч кандай баа/монета колдонулбайт. */
export function skillMap(rows: SkillEvidence[]): SkillProgress[] {
  return (Object.keys(SKILLS) as SkillId[]).map(id=>{
    const unique = new Map<string,SkillEvidence>();
    for(const row of rows.filter(r=>r.skill===id).sort((a,b)=>a.date.localeCompare(b.date)||a.assignmentId.localeCompare(b.assignmentId))) unique.set(`${row.lessonId}:${row.blockId}`,row);
    const evidence = [...unique.values()].sort((a,b)=>b.date.localeCompare(a.date));
    const recent = evidence.slice(0,3);
    const practice = recent.some(r=>r.result==="incorrect" || r.result==="retry");
    const lessons = new Set(recent.filter(r=>r.result==="correct").map(r=>r.lessonId));
    return {id,label:SKILLS[id],status:practice?"practice":lessons.size>=2?"evidence":"few",evidence};
  });
}
