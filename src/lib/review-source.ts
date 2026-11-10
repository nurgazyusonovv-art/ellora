import {createHash} from "node:crypto";
import type {CodeTaskBlock,OpenBlock} from "./lesson-types";
export function canonical(value:unknown):string {if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;if(value&&typeof value==="object")return `{${Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;return JSON.stringify(value)??"null";}
export const sourceHash=(value:unknown)=>createHash("sha256").update(canonical(value)).digest("hex");
export const reviewSource=(block:OpenBlock,response:unknown)=>({prompt:block.prompt,rubric:block.rubric??[],response});
/** Python тапшырмасы: тесттердин санын браузер билдирет, ошондуктан чейректик баага мугалим ырастаганы гана кирет. 0016 триггериндей: rubric жок → null. */
export const codeReviewSource=(block:CodeTaskBlock,response:unknown)=>({prompt:block.prompt,rubric:null,response});
