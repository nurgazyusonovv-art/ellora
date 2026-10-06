import type { LibraryLesson } from "@/content";
import type { InvestigationBlock, OpenBlock } from "@/lib/lesson-types";

/** Китепкананын жаңы көчүрмөлөрү гана өзгөрөт; базага көчүрүлгөн эски сабактарга тийбейт. */
export function fiveELesson(base: LibraryLesson, config: {
  objectives: string[]; criteria: string[];
  investigation: Omit<InvestigationBlock, "id" | "type">;
  application: Omit<OpenBlock, "id" | "type">;
}): LibraryLesson {
  const [engage, explain, practice, reinforce, evaluate] = base.content.stages;
  const initial = engage.blocks.find(b => b.type === "open");
  const duration = base.content.duration ?? 45;
  const minutes = duration === 40 ? [5, 10, 8, 12, 5] : [5, 12, 8, 15, 5];
  return { ...base, content: {
    ...base.content, model: "5e", objectives: config.objectives, successCriteria: config.criteria,
    teacherNotes: "Баштапкы жоопту баалабаңыз. Изилдөөдөн кийин 2–3 окуучунун байкоосун талкуулаңыз. Түшүндүрүүдө окуучулардын далилдерине таяныңыз. Колдонуу тапшырмасын критерийлер менен баалаңыз. Бир телефон менен иштеген жупта ар ким өз оюн айтсын.",
    stages: [
      { ...engage, minutes: minutes[0], blocks: engage.blocks.map(b => b.type === "open" ? { ...b, lockOnSubmit: true, feedback: undefined, feedbackCode: undefined } : b) },
      { key: "learning", title: "Божомолду сынап көр", minutes: minutes[1], blocks: [{ id: "investigate-1", type: "investigation", ...config.investigation }] },
      { ...explain, key: "practice", title: "Байкооңду түшүндүр", intro: "Божомолуңду байкооң менен салыштырып, жыйынтыгыңды негизде.", minutes: minutes[2], blocks: [
        { id: "explain-1", type: "open", prompt: "Байкооңдо кандай мыйзам ченемдүүлүк бар? Эмне үчүн ушундай болду? Кеминде бир далил менен түшүндүр.", rubric: ["Байкоодон конкреттүү далил келтирди", "Далил менен жыйынтыктын байланышын түшүндүрдү"] },
        ...explain.blocks,
      ] },
      { ...reinforce, title: "Жаңы кырдаалда колдон", minutes: minutes[3], blocks: [
        ...practice.blocks,
        { id: "apply-1", type: "open", ...config.application },
      ] },
      { ...evaluate, minutes: minutes[4], blocks: [...evaluate.blocks,
        { id: "reflect-1", type: "open", prompt: "Баштапкы оюңду кайра кара. Эмне өзгөрдү? Кайсы байкоо же далил оюңду өзгөрттү?", compareTo: initial?.id, rubric: ["Баштапкы жана акыркы оюн салыштырды", "Өзгөрүүнү конкреттүү далил менен негиздеди"] },
      ] },
    ],
  } };
}
