"use server";
import {revalidatePath} from "next/cache";
import {requireRole} from "@/lib/auth";
import {isUuid} from "@/lib/repetition";
import {TEAM_ERRORS} from "@/lib/team-spaces";
export type TeamState={error?:string;success?:string};
const text=(f:FormData,k:string)=>String(f.get(k)??"").trim();
function version(f:FormData){const s=text(f,"version");return s!==""&&Number.isInteger(Number(s))&&Number(s)>=0&&Number(s)<2147483647?Number(s):null;}
function result(data:unknown,error:unknown):TeamState {if(error)return {error:"Топтук иш сакталган жок. Байланышты же кызматтын жеткиликтүүлүгүн текшериңиз."};if(data!=="ok")return {error:TEAM_ERRORS[String(data)]??"Иш аткарылган жок."};revalidatePath("/teacher","layout");revalidatePath("/student","layout");return {success:"Сакталды. Топтун жаңы абалы көрсөтүлдү."};}
export async function createTeamSpace(_:TeamState,fd:FormData):Promise<TeamState>{
 const {supabase}=await requireRole("teacher");
 const assignment=text(fd,"assignmentId"),name=text(fd,"name"),prompt=text(fd,"prompt"),stage=Number(text(fd,"stage"));
 const members=fd.getAll("members").map(x=>String(x).trim().toLowerCase());const roles=text(fd,"roles").split("\n").map(x=>x.trim()).filter(Boolean);
 if(!isUuid(assignment)||!name||name.length>100||!prompt||prompt.length>3000||![1,3].includes(stage)||members.length<2||members.length>6||!members.every(isUuid)||new Set(members).size!==members.length||roles.length!==members.length||roles.some(x=>x.length>100))return {error:TEAM_ERRORS.invalid};
 const {data,error}=await supabase.rpc("create_team_space",{p_assignment:assignment,p_name:name,p_prompt:prompt,p_stage:stage,p_members:members,p_roles:roles});return result(data,error);
}
export async function manageTeamSpace(_:TeamState,fd:FormData):Promise<TeamState>{
 const {supabase}=await requireRole("teacher");const id=text(fd,"teamId"),v=version(fd),action=text(fd,"action");if(!isUuid(id)||v===null||!["rotate","pause","resume"].includes(action))return {error:TEAM_ERRORS.invalid};
 const {data,error}=await supabase.rpc("change_team_space",{p_team:id,p_version:v,p_action:action});return result(data,error);
}
export async function saveTeamWork(_:TeamState,fd:FormData):Promise<TeamState>{
 const {supabase}=await requireRole("student");const id=text(fd,"teamId"),v=version(fd),response=text(fd,"response");if(!isUuid(id)||v===null||!response||response.length>10000)return {error:TEAM_ERRORS.invalid};
 const {data,error}=await supabase.rpc("change_team_space",{p_team:id,p_version:v,p_action:"save",p_text:response});return result(data,error);
}
export async function submitTeamWork(_:TeamState,fd:FormData):Promise<TeamState>{
 const {supabase}=await requireRole("student");const id=text(fd,"teamId"),v=version(fd);if(!isUuid(id)||v===null)return {error:TEAM_ERRORS.invalid};
 const {data,error}=await supabase.rpc("change_team_space",{p_team:id,p_version:v,p_action:"submit"});return result(data,error);
}
export async function submitTeamNote(_:TeamState,fd:FormData):Promise<TeamState>{
 const {supabase}=await requireRole("student");const id=text(fd,"teamId"),explanation=text(fd,"explanation"),contribution=text(fd,"contribution");if(!isUuid(id)||!explanation||explanation.length>5000||!contribution||contribution.length>2000)return {error:TEAM_ERRORS.invalid};
 const {data,error}=await supabase.rpc("submit_team_note",{p_team:id,p_explanation:explanation,p_contribution:contribution});return result(data,error);
}
