import {isSkillId,type SkillId} from "@/lib/skills";
import {enrichKtp,addQuarterlyWorks} from "./enrichment";
/** КТП түпнускасынын негизиндеги үлгүлөр; көндүм/чейректик иштер — педагогикалык сунуштар. Мугалим үлгүнү өзүнө көчүрүп, «КТП» барагында түзөтөт (ktp_plans таблицасы). */
import { ktpGrade7 } from "@/content/ktp/grade7";
import { ktpGrade8 } from "@/content/ktp/grade8";

export const KTP_KINDS = {lesson:"Сабак",practical:"Практикалык сабак",quarterly:"Чейректик иш"} as const;
export type KtpMetadata = {skills?:SkillId[];kind?:keyof typeof KTP_KINDS;quarter?:number;product?:string};
export type KtpSession = KtpMetadata & { id: string; title: string; objective: string; product: string };
export type KtpTopic = KtpMetadata & { id?: string; title: string; hours?: number; sessions?: KtpSession[] };
export type KtpSection = { title: string; hours: number; topics: KtpTopic[] };
export type Ktp = { grade: number; year: string; hoursPerWeek?: number; source?: string; sections: KtpSection[] };

const withWorks=(raw:Ktp):Ktp=>{const p=enrichKtp(raw);return {...p,sections:addQuarterlyWorks(p.sections,p.grade)};};

/** Жаңы класстын үлгүсүн кошуу: `gradeN.ts` файлын түзүп, ушул жерге каттаңыз. */
export const KTP_TEMPLATES: Record<number, Ktp> = {
  7: withWorks(ktpGrade7),
  8: withWorks(ktpGrade8),
};

/** Тема КТП'дегилердин бирине дал келсе — анын орду (бөлүм, тема). */
export function findKtpTopic(ktp: Pick<Ktp, "sections"> | undefined, topic: string) {
  if (!ktp || !topic) return undefined;
  for (let s = 0; s < ktp.sections.length; s++) {
    const t = ktp.sections[s].topics.findIndex((x) => x.title === topic);
    if (t >= 0) return { section: s, topic: t };
  }
  return undefined;
}

export const sectionHours = (s: KtpSection) => s.topics.reduce((a, t) => a + (t.hours ?? 0), 0);
export const planHours = (k: Pick<Ktp, "sections">) => k.sections.reduce((a, s) => a + (s.hours || 0), 0);

export function checkKtpMetadata(value:KtpMetadata):string|null {
 if(value.skills!==undefined&&(!Array.isArray(value.skills)||value.skills.length>3||new Set(value.skills).size!==value.skills.length||!value.skills.every(isSkillId)))return "Тизмеден үчкө чейин кайталанбаган көндүм тандаңыз.";
 if(value.kind!==undefined&&!Object.hasOwn(KTP_KINDS,value.kind))return "Сабактын түрүн тизмеден тандаңыз.";
 if(value.quarter!==undefined&&(!Number.isInteger(value.quarter)||value.quarter<1||value.quarter>4))return "Чейрек 1ден 4кө чейин болсун.";
 if(value.product!==undefined&&(typeof value.product!=="string"||value.product.length>2000))return "Практикалык жыйынтык 2000 белгиден ашпасын.";
 return null;
}
/** Сактоодон мурун түзүлүштү текшерүү. Ката болсо — текст. */
export function checkKtpSections(sections: unknown): string | null {
  if (!Array.isArray(sections)) return "КТП'нин форматы туура эмес.";
  if (sections.length > 60) return "Бөлүм өтө көп.";
  const ids = new Set<string>();
  for (const s of sections as KtpSection[]) {
    if (!s || typeof s.title !== "string" || (!Number.isInteger(s.hours)||s.hours<0||s.hours>200) || !Array.isArray(s.topics)) return "КТП'нин форматы туура эмес.";
    if (s.topics.length > 100) return "Бир бөлүмдө тема өтө көп.";
    for (const t of s.topics) {
      if (!t || typeof t.title !== "string" || (t.hours !== undefined && (!Number.isInteger(t.hours)||t.hours<0||t.hours>200))) return "КТП'нин форматы туура эмес.";
      const metadataError=checkKtpMetadata(t);if(metadataError)return metadataError;
      if (t.id !== undefined && (typeof t.id !== "string" || !t.id || t.id.length > 100 || ids.has(t.id))) return "Теманын белгилери кайталанбасын.";
      if (t.id) ids.add(t.id);
      if (t.sessions !== undefined) {
        if (!t.id || !Array.isArray(t.sessions) || t.sessions.length > 40) return "Темада 40ка чейин сабак пландаңыз.";
        for (const lesson of t.sessions) {
          if (!lesson || typeof lesson.id !== "string" || !lesson.id || lesson.id.length > 100 || ids.has(lesson.id)) return "Сабактын белгилери кайталанбасын.";
          ids.add(lesson.id);
          const lessonError=checkKtpMetadata(lesson);if(lessonError)return lessonError;
          if (![lesson.title, lesson.objective, lesson.product].every(v => typeof v === "string" && v.length <= 2000)) return "Сабактын планы туура эмес.";
        }
      }
    }
  }
  return null;
}
