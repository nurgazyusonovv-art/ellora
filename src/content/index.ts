/**
 * Мугалимдер өз сабактарына көчүрүп ала турган даяр сабактар (китепкана).
 * Азырынча бош. Жаңы сабак кошуу: файлды ушул папкада түзүп, `LIBRARY`ге `slug` менен кош.
 * `src/content/examples/` — демо (`/lab/mobile`) жана тесттер үчүн гана үлгүлөр; китепканага кирбейт.
 */
import type { LessonContent } from "@/lib/lesson-types";

/** `topic` — КТП'деги теманын так тексти болсо, тема тандагычта таанылат. */
export type LibraryLesson = { title: string; grade: number; topic: string; content: LessonContent };

/** Тартиби — КТП боюнча (класс, анан тема). `slug` өзгөрбөсүн: мугалимдин «Сабактарыма кошуу» баскычы ушуну колдонот. */
export const LIBRARY: (LibraryLesson & { slug: string })[] = [];
