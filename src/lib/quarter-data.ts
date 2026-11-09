import "server-only";
import type {createClient} from "./supabase/server";
import type {LessonContent} from "./lesson-types";
import {sourceHash} from "./review-source";
import {DEFAULT_QUARTER_RULES,quarterScore,workScore,type QuarterRules,type WorkAnswer,type WorkReview} from "./quarter-scoring";
type Db=Awaited<ReturnType<typeof createClient>>;
export async function quarterData(db:Db,teacherId:string,classId:string,year:number,quarter:number){
 const {data:cls,error:ce}=await db.from("classes").select("id,name").eq("id",classId).eq("teacher_id",teacherId).maybeSingle();if(ce||!cls)throw Error("Класс табылган жок.");
 const [members,assignments,settings,grades]=await Promise.all([
 db.from("class_members").select("student_id,profiles(full_name)").eq("class_id",classId).returns<{student_id:string;profiles:{full_name:string}|null}[]>(),
 db.from("assignments").select("id,work_kind,lessons(id,title,content)").eq("class_id",classId).eq("academic_year",year).eq("quarter",quarter).returns<{id:string;work_kind:string;lessons:{id:string;title:string;content:LessonContent}|null}[]>(),
 db.from("quarter_settings").select("daily_weight,grade3_min,grade4_min,grade5_min").eq("class_id",classId).eq("academic_year",year).eq("quarter",quarter).maybeSingle<QuarterRules>(),
 db.from("quarter_grades").select("id,student_id,grade,percentage,note,basis_hash,approved_at").eq("class_id",classId).eq("academic_year",year).eq("quarter",quarter).order("approved_at",{ascending:false})]);
 if(members.error||assignments.error||settings.error||grades.error||assignments.data?.some(a=>!a.lessons))throw Error("Чейрек маалыматтары толук жүктөлгөн жок. 0016 база жаңыртуусун текшериңиз.");
 const ids=(assignments.data??[]).map(a=>a.id);
 const atts=ids.length?await db.from("attempts").select("id,assignment_id,student_id,finished_at").in("assignment_id",ids):{data:[],error:null};if(atts.error)throw Error("Аракеттер жүктөлгөн жок.");
 const attemptIds=(atts.data??[]).map(t=>t.id);
 const [answers,reviews]=attemptIds.length?await Promise.all([db.from("answers").select("attempt_id,block_id,response,is_correct,tries").in("attempt_id",attemptIds),db.from("answer_reviews").select("attempt_id,block_id,criteria_met,source_snapshot").in("attempt_id",attemptIds)]):[{data:[],error:null},{data:[],error:null}];
 if(answers.error||reviews.error)throw Error("Жооптор же бекитилген критерийлер жүктөлгөн жок.");
 const rules=settings.data??DEFAULT_QUARTER_RULES;
 const rows=(members.data??[]).map(m=>{
 const works=(assignments.data??[]).map(a=>{const t=atts.data?.find(t=>t.student_id===m.student_id&&t.assignment_id===a.id);return {id:a.id,kind:a.work_kind,title:a.lessons!.title,...workScore(a.lessons!.content,!!t?.finished_at,(answers.data??[]).filter(r=>r.attempt_id===t?.id) as WorkAnswer[],(reviews.data??[]).filter(r=>r.attempt_id===t?.id) as WorkReview[])};});
 const basis={rules,works:works.filter(w=>w.kind!=="game"&&w.state!=="excluded").sort((a,b)=>a.id.localeCompare(b.id)),sources:(assignments.data??[]).filter(a=>a.work_kind!=="game"&&a.lessons?.content.activityKind!=="game").map(a=>{const t=atts.data?.find(t=>t.student_id===m.student_id&&t.assignment_id===a.id);return {id:a.id,kind:a.work_kind,content:a.lessons!.content,attempt:t??null,answers:(answers.data??[]).filter(r=>r.attempt_id===t?.id).sort((a,b)=>a.block_id.localeCompare(b.block_id)),reviews:(reviews.data??[]).filter(r=>r.attempt_id===t?.id).sort((a,b)=>a.block_id.localeCompare(b.block_id))};}).sort((a,b)=>a.id.localeCompare(b.id))};
 const hash=sourceHash(basis),approved=grades.data?.find(g=>g.student_id===m.student_id);
 return {studentId:m.student_id,name:m.profiles?.full_name??"Окуучу",works,...quarterScore(works,rules),hash,approved,stale:!!approved&&approved.basis_hash!==hash};
 });
 return {cls,rules,rows,assignments:assignments.data??[],history:grades.data??[]};
}
