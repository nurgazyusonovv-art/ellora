"use client";
import {createContext,useContext,useEffect,useState,type SetStateAction} from "react";
export const DraftScope=createContext<string|null>(null);
/** Черновик бааланган жооп эмес, браузердеги ушул аракетке гана тиешелүү. */
export function useLessonDraft(blockId:string,field:string,initial:string){
 const scope=useContext(DraftScope),key=scope?`ellora:draft:${scope}:${blockId}:${field}`:null;
 const [draft,setDraft]=useState({key,value:initial,ready:false});
 useEffect(()=>{let value=initial;try{value=(key?localStorage.getItem(key):null)??initial;}catch{}setDraft({key,value,ready:true});},[key,initial]);
 const value=draft.key===key?draft.value:initial;
 const update=(next:SetStateAction<string>)=>{const value=typeof next==="function"?next(draft.value):next;try{if(key)localStorage.setItem(key,value);}catch{}setDraft({key,value,ready:true});};
 return [value,update] as const;
}
