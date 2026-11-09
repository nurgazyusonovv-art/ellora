import { parsonsSeed, shufflePerm } from "./student-view";
import type { ClassificationBlock, MatchingBlock, OrderingBlock } from "./lesson-types";
/** Экрандагы индекстер гана кабыл алынат; баштапкы туура ирет кардарга кайтарылбайт. */
export function interactiveResponse(block:ClassificationBlock|MatchingBlock|OrderingBlock,raw:Record<string,unknown>,attemptId:string) {
 if(block.type==="classification") {
  if(!Array.isArray(raw.groups)||raw.groups.length!==block.items.length)return {groups:raw.groups};
  const perm=shufflePerm(block.items.length,parsonsSeed(block.id,attemptId)),groups:unknown[]=Array(block.items.length);
  raw.groups.forEach((value,i)=>{groups[perm[i]]=value;});return {groups};
 }
 const field=block.type==="matching"?"picks":"order";
 const values=raw[field];
 const n=block.type==="matching"?block.pairs.length:block.steps.length;
 const perm=shufflePerm(n,parsonsSeed(block.id,attemptId));
 return {[field]:Array.isArray(values)?values.map(k=>Number.isInteger(k)?perm[k as number]:k):values};
}
