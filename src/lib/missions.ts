import {isGraded,isInteractive,type Block,type Stage} from "./lesson-types";
import {stageDone,type Answers} from "./grading";
export function missionSteps(stage:Stage){return stage.blocks.filter(isInteractive);}
export function missionError(stage:Stage):string|null {
 if(stage.mission===undefined)return null;
 const m=stage.mission;
 if(!m||stage.key!=="reinforce"||[m.title,m.story,m.goal].some(v=>typeof v!=="string"||!v.trim()||v.length>2000)||typeof m.challengeId!=="string")return "Миссия Колдонууда болсун; аталышын, окуясын жана максатын толтуруңуз.";
 const steps=missionSteps(stage),last=steps.at(-1);
 if(steps.length<2||steps.length>5||steps.some(b=>b.type==="confidence")||!last||last.id!==m.challengeId||last.type!=="open"||!last.lockOnSubmit||last.collaboration&&last.collaboration!=="individual"||last.teamwork||!Array.isArray(last.rubric)||last.rubric.length<2||last.rubric.some(x=>typeof x!=="string"||!x.trim()))return "Миссияда 2–5 милдеттүү тапшырма болсун. Акыркысы — кеминде эки критерийи бар, жообу бекитилген жеке ачык тапшырма.";
 return null;
}
export function missionChallenge(stage:Stage,blockId:string){return !!stage.mission&&stage.mission.challengeId===blockId;}
export function missionAllows(stage:Stage,blockId:string,answers:Answers){
 if(!stage.mission)return true;
 if(missionError(stage))return false;
 const steps=missionSteps(stage),index=steps.findIndex(b=>b.id===blockId);
 if(index<0)return true;
 return steps.slice(0,index).every(b=>stageDone({...stage,blocks:[b]},answers));
}
export function missionProgress(stage:Stage,answers:Answers){
 const steps=missionSteps(stage);
 return steps.map(b=>({id:b.id,independent:missionChallenge(stage,b.id),submitted:!!answers[b.id],done:stageDone({...stage,blocks:[b]},answers),graded:isGraded(b)}));
}
/** Жеке далилде кеңеш жана даяр жооп кардарга жөнөтүлбөйт. */
export function missionStudentBlock(stage:Stage,block:Block):Block {
 return missionChallenge(stage,block.id)?{...block,support:undefined,extension:undefined,...(block.type==="open"?{feedback:undefined,feedbackCode:undefined}:{})}:block;
}

export function insertMissionPractice(stage:Stage,block:Block):Stage {
 const blocks=[...stage.blocks],index=stage.mission?blocks.findIndex(b=>b.id===stage.mission!.challengeId):-1;
 blocks.splice(index<0?blocks.length:index,0,block);return {...stage,blocks};
}
