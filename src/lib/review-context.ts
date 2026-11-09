import "server-only";
import type {createClient} from "./supabase/server";
import type {LessonContent} from "./lesson-types";
import {findBlock} from "./grading";
import {reviewSource,sourceHash} from "./review-source";
type Db=Awaited<ReturnType<typeof createClient>>;
export async function loadReviewContext(db:Db,teacherId:string,attemptId:string,blockId:string){
 const {data:t}=await db.from("attempts").select("assignment_id").eq("id",attemptId).maybeSingle();if(!t)return null;
 const {data:a}=await db.from("assignments").select("class_id,lessons(content)").eq("id",t.assignment_id).maybeSingle<{class_id:string;lessons:{content:LessonContent}|null}>();if(!a?.lessons)return null;
 const {data:c}=await db.from("classes").select("id").eq("id",a.class_id).eq("teacher_id",teacherId).maybeSingle();if(!c)return null;
 const b=findBlock(a.lessons.content,blockId)?.block;if(b?.type!=="open"||!b.rubric?.length)return null;
 const {data:r}=await db.from("answers").select("response").eq("attempt_id",attemptId).eq("block_id",blockId).maybeSingle();
 const text=r?.response?.text;if(!r||typeof text!=="string"||!text.trim()||text.length>12000)return null;
 const snapshot=reviewSource(b,r.response);return {assignmentId:t.assignment_id,block:b,text,snapshot,hash:sourceHash(snapshot)};
}
