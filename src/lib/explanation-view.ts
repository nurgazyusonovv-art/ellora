import type {LessonContent,Stage} from "./lesson-types";
import type {SavedAnswer} from "./grading";
/** Презентацияны ачуу окуучунун жообун/прогрессин өзгөртпөйт. */
export function explanationView(stage:Stage,model:LessonContent["model"],answers:Record<string,SavedAnswer>,preview:boolean,presentationOpened:boolean) {
 const question=model==="5e" && stage.key==="practice" ? stage.blocks.find(b=>b.type==="open" && !b.optional) : undefined;
 const ready=preview || !question || !!answers[question.id];
 const hasPresentation=stage.blocks.some(b=>b.type==="presentation");
 return {ready,hasPresentation,blocks:stage.blocks.filter(b=>ready || b.id===question?.id || (b.type==="presentation" && presentationOpened))};
}
