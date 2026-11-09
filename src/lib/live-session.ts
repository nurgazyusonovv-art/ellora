import "server-only";
import type {createClient} from "./supabase/server";
import type {LiveSession} from "./classroom";
export async function readLiveSession(supabase:Awaited<ReturnType<typeof createClient>>,assignmentId:string):Promise<LiveSession|null> {
 const {data,error}=await supabase.from("lesson_sessions").select("*").eq("assignment_id",assignmentId).maybeSingle();
 if(error){if(error.code==="PGRST205"||error.code==="42P01")return null;throw Error("Сабак режими жүктөлгөн жок.");}
 if(!data?.timed)return data;
 const result=await supabase.rpc("lesson_clock_state",{p_assignment:assignmentId});
 if(result.error || (result.data as {error?:string}|null)?.error)throw Error("Сабактын сааты жүктөлгөн жок.");
 return result.data as LiveSession|null;
}
