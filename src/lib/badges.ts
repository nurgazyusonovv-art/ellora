/**
 * Бейдждер окуучунун жыйынтыгынан эсептелет (жаңы таблица жок). Жооптор серверде бааланат —
 * ошондуктан бейджди «жасалма» алуу мүмкүн эмес. Тартиби — көрсөтүү тартиби.
 */
import type { IconName } from "@/components/icons";
import type { StudentReport } from "@/lib/student-report";

export type Badge = {
  id: string;
  title: string;
  /** Кантип алынат — окуучуга түшүнүктүү */
  how: string;
  icon: IconName;
  earned: boolean;
  progress: { value: number; target: number };
};

type Input = Pick<StudentReport, "lessons" | "graded"> & { summary: Pick<StudentReport["summary"], "totalXp"> };

type Rule = { id: string; title: string; how: string; icon: IconName; target: number; value: (r: Input) => number };

const finished = (r: Input) => r.lessons.filter((l) => l.finishedAt);
const perfect = (r: Input) => finished(r).filter((l) => l.exitTotal && l.exitScore === l.exitTotal);
const solved = (r: Input, type: string) => r.graded.filter((g) => g.type === type && g.correct).length;

const RULES: Rule[] = [
  { id: "first_lesson", title: "Биринчи кадам", how: "Биринчи сабакты бүтүр", icon: "spark", target: 1, value: (r) => finished(r).length },
  { id: "perfect_exit", title: "Мерген", how: "Exit ticket'ке баарына туура жооп бер", icon: "target", target: 1, value: (r) => perfect(r).length },
  { id: "five_lessons", title: "Талыкпас", how: "5 сабакты бүтүр", icon: "flame", target: 5, value: (r) => finished(r).length },
  { id: "coder", title: "Коддун устасы", how: "3 код тапшырмасын чеч", icon: "code", target: 3, value: (r) => solved(r, "code_task") },
  { id: "bug_hunter", title: "Ката издөөчү", how: "«Катаны тап» тапшырмасын 3 жолу чеч", icon: "bug", target: 3, value: (r) => solved(r, "bug_hunt") },
  {
    id: "persistent",
    title: "Көшөрүү",
    how: "Тапшырманы 3 же андан көп аракеттен кийин чеч",
    icon: "repeat",
    target: 1,
    value: (r) => r.graded.filter((g) => g.correct && g.tries >= 3).length,
  },
  {
    id: "sharpshooter",
    title: "Так атуу",
    how: "10 тапшырманын жок дегенде 80%ын биринчи аракетте чеч",
    icon: "star",
    target: 10,
    // 10 тапшырмага чейин — прогресс; андан кийин тактык 80%дан жогору болсо — алынды
    value: (r) => {
      const n = r.graded.length;
      if (n < 10) return n;
      return r.graded.filter((g) => g.correct && g.tries === 1).length / n >= 0.8 ? 10 : 9;
    },
  },
  {
    id: "on_time",
    title: "Өз убагында",
    how: "3 сабакты мөөнөтүнөн мурун бүтүр",
    icon: "clock",
    target: 3,
    value: (r) => finished(r).filter((l) => l.dueAt && l.finishedAt! <= l.dueAt).length,
  },
  {
    id: "confident",
    title: "Өзүнө ишенген",
    how: "Exit ticket 100% жана «башкага түшүндүрө алам» деп белгиле",
    icon: "shield",
    target: 1,
    value: (r) => perfect(r).filter((l) => l.confidence === 4).length,
  },
  { id: "triple_perfect", title: "Үч жолу мерген", how: "3 сабакта exit ticket 100%", icon: "medal", target: 3, value: (r) => perfect(r).length },
  { id: "xp100", title: "100 XP", how: "100 XP топто", icon: "bolt", target: 100, value: (r) => r.summary.totalXp },
  { id: "ten_lessons", title: "Марафончу", how: "10 сабакты бүтүр", icon: "trophy", target: 10, value: (r) => finished(r).length },
  { id: "xp500", title: "500 XP", how: "500 XP топто", icon: "trophy", target: 500, value: (r) => r.summary.totalXp },
];

export const BADGE_COUNT = RULES.length;

export function computeBadges(r: Input): Badge[] {
  return RULES.map((rule) => {
    const v = Math.max(0, rule.value(r));
    return {
      id: rule.id,
      title: rule.title,
      how: rule.how,
      icon: rule.icon,
      earned: v >= rule.target,
      progress: { value: Math.min(v, rule.target), target: rule.target },
    };
  });
}
