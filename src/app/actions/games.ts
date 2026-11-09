"use server";
import {redirect} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {GAMES,gameLesson} from "@/content/games";
import {checkStructure,validateLesson} from "@/lib/lesson-edit";
import type {FormState} from "./auth";
export async function createGame(_:FormState,fd:FormData):Promise<FormState>{const {supabase,profile}=await requireRole("teacher"),game=GAMES.find(g=>g.slug===fd.get("slug"));if(!game)return {error:"Оюн табылган жок."};const content=gameLesson(game);if(checkStructure(content)||validateLesson(game.title,content).length)return {error:"Оюндун мазмунун текшерүү керек."};const {data}=await supabase.from("lessons").insert({author_id:profile.id,title:`Оюн: ${game.title}`,content,status:"published",grade:null,topic:game.title}).select("id").single();if(data)redirect(`/teacher/lessons/${data.id}`);return {error:"Оюн сакталган жок. Кайра аракет кылыңыз."};}
