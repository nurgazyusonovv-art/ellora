export type QualityAttempt={id:string;assignment_id:string;student_id:string;finished_at:string|null;exit_score:number|null;exit_total:number|null};
export function learningQuality(studentIds:string[],assignmentIds:string[],attempts:QualityAttempt[],threshold=70) {
 const assignments=new Set(assignmentIds), students=[...new Set(studentIds)];
 const rows=students.map(id=>{
  const unique=new Map<string,QualityAttempt>();
  for(const a of attempts)if(a.student_id===id && assignments.has(a.assignment_id)) {if(unique.has(a.assignment_id))throw Error("Кайталанган аракет бар.");unique.set(a.assignment_id,a);}
  const completed=[...unique.values()].filter(a=>a.finished_at);
  const scores=completed.filter(a=>Number.isInteger(a.exit_total)&&a.exit_total!>0&&Number.isInteger(a.exit_score)&&a.exit_score!>=0&&a.exit_score!<=a.exit_total!).map(a=>a.exit_score!/a.exit_total!*100);
  const mean=scores.length?scores.reduce((s,n)=>s+n,0)/scores.length:null;
  return {id,assigned:assignments.size,completed:completed.length,assessed:scores.length,mean,meets:mean===null?null:mean>=threshold};
 });
 const assessed=rows.filter(r=>r.mean!==null),meets=assessed.filter(r=>r.meets).length;
 return {rows,students:rows.length,assessed:assessed.length,meets,quality:assessed.length?meets/assessed.length*100:null,coverage:rows.length?assessed.length/rows.length*100:null,mean:assessed.length?assessed.reduce((s,r)=>s+r.mean!,0)/assessed.length:null,completion:rows.length&&assignments.size?rows.reduce((s,r)=>s+r.completed,0)/(rows.length*assignments.size)*100:null};
}
