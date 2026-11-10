/**
 * Проектордогу «Такта»: азыркы бөлүктүн мазмуну слайддар катары.
 * Туура жооптор, кеңештер, тесттер жана каталардын тизмеси эч качан кирбейт — такта класска көрүнөт.
 */
import type { Block, LessonSlide, Stage } from "./lesson-types";

export type BoardSlide =
  | { kind: "intro"; title: string; intro?: string; mission?: { title: string; story: string; goal: string } }
  | { kind: "slide"; deck: string; n: number; of: number; slide: LessonSlide }
  | { kind: "text"; title?: string; body: string }
  | { kind: "code"; code: string; caption?: string }
  | { kind: "task"; label: string; prompt: string; code?: string; options?: string[]; mono?: boolean };

const TASK_LABELS: Partial<Record<Block["type"], string>> = {
  mcq: "Суроо",
  code_task: "Код жаз",
  parsons: "Иретке кой",
  bug_hunt: "Катаны тап",
  open: "Ойлон жана жаз",
  investigation: "Изилдөө",
  matching: "Дал келтир",
  ordering: "Иретке кой",
  classification: "Топторго бөл",
  spreadsheet: "Электрондук таблица",
  game: "Оюн",
};

function blockSlides(b: Block): BoardSlide[] {
  switch (b.type) {
    case "presentation":
      return b.slides.map((slide, i) => ({ kind: "slide", deck: b.title, n: i + 1, of: b.slides.length, slide }));
    case "text":
      return [{ kind: "text", title: b.title, body: b.body }];
    case "code_example":
      return [{ kind: "code", code: b.code, caption: b.caption }];
    case "mcq":
      return [{ kind: "task", label: TASK_LABELS.mcq!, prompt: b.prompt, code: b.code, options: b.options, mono: b.mono }];
    case "code_task":
      return [{ kind: "task", label: TASK_LABELS.code_task!, prompt: b.prompt, code: b.starter.trim() ? b.starter : undefined }];
    case "bug_hunt":
      return [{ kind: "task", label: TASK_LABELS.bug_hunt!, prompt: b.prompt, code: b.code }];
    case "investigation":
      return [{ kind: "task", label: TASK_LABELS.investigation!, prompt: `${b.prompt}\n\n${b.procedure}`, code: b.code }];
    case "game":
      return [{ kind: "task", label: TASK_LABELS.game!, prompt: b.title }];
    case "confidence":
      return [];
    // Туура иреттеги саптар/кадамдар жана жуптар тактага чыкпайт — тапшырманын шарты гана.
    case "parsons":
    case "open":
    case "matching":
    case "ordering":
    case "classification":
    case "spreadsheet":
      return [{ kind: "task", label: TASK_LABELS[b.type]!, prompt: b.prompt }];
  }
}

export function boardSlides(stage: Stage): BoardSlide[] {
  const intro: BoardSlide = {
    kind: "intro",
    title: stage.title,
    intro: stage.intro?.trim() || undefined,
    mission: stage.mission ? { title: stage.mission.title, story: stage.mission.story, goal: stage.mission.goal } : undefined,
  };
  return [intro, ...stage.blocks.flatMap(blockSlides)];
}
