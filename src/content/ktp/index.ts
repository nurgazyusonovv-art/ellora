/** КТП үлгүлөрү (расмий пландар). Мугалим үлгүнү өзүнө көчүрүп, «КТП» барагында түзөтөт (ktp_plans таблицасы). */
import { ktpGrade7 } from "@/content/ktp/grade7";

export type KtpTopic = { title: string; hours?: number };
export type KtpSection = { title: string; hours: number; topics: KtpTopic[] };
export type Ktp = { grade: number; year: string; hoursPerWeek?: number; source?: string; sections: KtpSection[] };

/** Жаңы класстын үлгүсүн кошуу: `gradeN.ts` файлын түзүп, ушул жерге каттаңыз. */
export const KTP_TEMPLATES: Record<number, Ktp> = {
  7: ktpGrade7,
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

/** Сактоодон мурун түзүлүштү текшерүү. Ката болсо — текст. */
export function checkKtpSections(sections: unknown): string | null {
  if (!Array.isArray(sections)) return "КТП'нин форматы туура эмес.";
  if (sections.length > 60) return "Бөлүм өтө көп.";
  for (const s of sections as KtpSection[]) {
    if (!s || typeof s.title !== "string" || typeof s.hours !== "number" || !Array.isArray(s.topics)) return "КТП'нин форматы туура эмес.";
    if (s.topics.length > 100) return "Бир бөлүмдө тема өтө көп.";
    for (const t of s.topics)
      if (!t || typeof t.title !== "string" || (t.hours !== undefined && typeof t.hours !== "number")) return "КТП'нин форматы туура эмес.";
  }
  return null;
}
