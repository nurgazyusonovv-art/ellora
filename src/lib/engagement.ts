import { nextBlockId } from "@/lib/lesson-edit";
import type { LessonContent, OpenBlock } from "@/lib/lesson-types";

/** Учурдагы блокторду жана жооптордун id’лерин сактап, үч кадам кошот. */
export function engagementSequence(content: LessonContent): OpenBlock[] {
  const copy = structuredClone(content);
  const stage = copy.stages.find(s => s.key === "discover")!;
  const prompts = [
    "Бул темага байланыштуу күнүмдүк жашоодон бир мисал эстеп жаз.",
    "Ошол мисалды бир нерсе өзгөргөн кырдаал менен салыштыр. Эмнеси окшош, эмнеси башкача?",
    "Эгер дагы бир шартты өзгөртсөк, эмне болот деп ойлойсуң? Божомолуңду мисал же сүрөттөмө менен негизде.",
  ];
  return prompts.map((prompt, i) => {
    const block: OpenBlock = { id: nextBlockId(copy, "discover"), type: "open", prompt, lockOnSubmit: true, engagement: { level: (i + 1) as 1 | 2 | 3, kind: i === 1 ? "activity" : "question" } };
    stage.blocks.push(block);
    return block;
  });
}
