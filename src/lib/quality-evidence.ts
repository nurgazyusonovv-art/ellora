import {classInsights,type InsightAnswer,type InsightReview,type EvidenceState} from "./class-insights";
import {isGraded,type LessonContent} from "./lesson-types";
import type {Revision} from "./revisions";
export type QualityEvidence={assignmentId:string;title:string;blockId:string;prompt:string;state:EvidenceState};
export function qualityEvidence(input:{members:{student_id:string;profiles:{full_name:string}|null}[];assignments:{id:string;lessons:{title:string;content:LessonContent}|null}[];attempts:{id:string;assignment_id:string;student_id:string;current_stage:number}[];answers:InsightAnswer[];reviews:InsightReview[];revisions:Revision[]}) {
 const out=new Map(input.members.map(m=>[m.student_id,{met:0,help:0,pending:0,items:[] as QualityEvidence[]}]));
 for(const assignment of input.assignments){
  if(!assignment.lessons)throw Error("Сабактын мазмуну жеткиликсиз.");
  const content=assignment.lessons.content;
  // Баштапкы ой жана ишеним жетишкендик эмес. Критерийсиз байкоо автоматтык бааланбайт.
  const eligible=new Set(content.stages.flatMap(stage=>stage.blocks.filter(b=>isGraded(b)||(stage.key!=="discover"&&stage.key!=="exit"&&b.type==="open"&&b.rubric?.length)).map(b=>b.id)));
  const attempts=input.attempts.filter(t=>t.assignment_id===assignment.id);const ids=new Set(attempts.map(t=>t.id));
  const insights=classInsights({content,members:input.members,attempts,answers:input.answers.filter(a=>ids.has(a.attempt_id)),reviews:input.reviews.filter(r=>ids.has(r.attempt_id)),revisions:input.revisions.filter(r=>ids.has(r.attempt_id))});
  for(const block of insights.blocks.filter(b=>eligible.has(b.id)))for(const student of block.students){
   const row=out.get(student.id)!;
   if(student.state==="correct")row.met++;else if(["incorrect","retry","revision"].includes(student.state))row.help++;else row.pending++;
   row.items.push({assignmentId:assignment.id,title:assignment.lessons.title,blockId:block.id,prompt:block.prompt,state:student.state});
  }
 }
 return out;
}
