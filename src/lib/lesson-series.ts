import { checkKtpSections, type KtpSection } from "@/content/ktp";

/** Серверден алынган, текшерилген пландын гана кыска контексти. */
export function lessonSeries(sections: unknown, topic: string, sessionId: string) {
  if (checkKtpSections(sections)) return null;
  const matches = (sections as KtpSection[]).flatMap(s => s.topics).filter(t => t.title === topic && t.sessions?.some(x => x.id === sessionId));
  if (matches.length !== 1) return null;
  const t = matches[0];
  const sessions = t.sessions!;
  const index = sessions.findIndex(x => x.id === sessionId);
  if (sessions.some(x => !x.title.trim() || !x.objective.trim() || !x.product.trim())) return null;
  const brief = (x: typeof sessions[number]) => ({sessionId:x.id,title:x.title.trim(),objective:x.objective.trim(),product:x.product.trim(),skills:x.skills??t.skills??[],kind:x.kind??t.kind??"lesson",quarter:x.quarter??t.quarter??null});
  const context = {topicId:t.id!,sessionId,position:index+1,total:sessions.length,current:brief(sessions[index]),previous:sessions.slice(0,index).map(brief),next:sessions.slice(index+1).map(brief)};
  // Өтө чоң контекстти үнсүз кесип салбайбыз.
  return JSON.stringify(context).length <= 16000 ? context : null;
}

import type { LessonContent } from "@/lib/lesson-types";
const normalize = (text: string) => text.toLocaleLowerCase("ky").replace(/[\s.,!?;:«»“”"'`]+/g," ").trim();
export function seriesTasks(content: LessonContent): string[] {
  return content.stages.slice(1,4).flatMap(s => s.blocks.flatMap(b => "prompt" in b && typeof b.prompt === "string" && b.prompt.trim().length >= 30 ? [b.prompt] : []));
}
export function repeatsSeriesTask(content: LessonContent, previous: LessonContent[]) {
  const used=new Set(previous.flatMap(seriesTasks).map(normalize));
  return seriesTasks(content).some(text=>used.has(normalize(text)));
}
export function previousLessonBrief(title: string, content: LessonContent) {
  return {title, objectives:content.objectives ?? [], tasks:seriesTasks(content)};
}

/** Белгилер/иштин түрү кардардын жашыруун талаасынан эмес, текшерилген КТПден алынат. */
export function ktpTopicContext(sections:unknown,topic:string,sessionId?:string){
 if(checkKtpSections(sections))return null;
 const matches=(sections as KtpSection[]).flatMap(s=>s.topics).filter(t=>t.title===topic);
 if(matches.length!==1)return null;const t=matches[0];
 const session=sessionId?t.sessions?.find(s=>s.id===sessionId):undefined;
 if(sessionId&&!session)return null;
 return {title:t.title,skills:[...(session?.skills??t.skills??[])],kind:session?.kind??t.kind??"lesson",quarter:session?.quarter??t.quarter??null,product:session?.product??t.product??""};
}
