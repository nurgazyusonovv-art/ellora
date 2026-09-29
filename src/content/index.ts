/** Мугалимдер өз сабактарына көчүрүп ала турган даяр сабактар. Ар бир сабак — `lessons/` ичинде өзүнчө файл. */
import { logicOperations } from "@/content/lessons/logic-operations";
import { logicProblemSolving } from "@/content/lessons/logic-problem-solving";
import { pythonIf } from "@/content/lessons/python-if";
import type { LessonContent } from "@/lib/lesson-types";

/** `topic` — КТП'деги теманын так тексти болсо, тема тандагычта таанылат. */
export type LibraryLesson = { title: string; grade: number; topic: string; content: LessonContent };

/** Тартиби — КТП боюнча (класс, анан тема). `slug` өзгөрбөсүн: мугалимдин «Сабактарыма кошуу» баскычы ушуну колдонот. */
export const LIBRARY: (LibraryLesson & { slug: string })[] = [
  { slug: "logic-operations", ...logicOperations },
  { slug: "logic-problem-solving", ...logicProblemSolving },
  { slug: "python-if", ...pythonIf },
];
