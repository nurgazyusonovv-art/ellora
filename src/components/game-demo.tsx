"use client";

import { useMemo, useRef } from "react";
import { GamePlayer, type GameApi } from "@/components/game-player";
import { gradeQuestion, roundScore, studentQuestion, type GameQuestion } from "@/lib/game-questions";

const DEMO_STUDENT = "demo";

/** Базага жазбаган үлгү: баалоо браузерде. Чыныгы оюнда туура жооптор серверде калат. */
export function GameDemo({ title, questions }: { title: string; questions: GameQuestion[] }) {
  const log = useRef<Map<string, { question_id: string; is_correct: boolean }[]>>(new Map());
  const view = useMemo(() => questions.map((q) => studentQuestion(q, DEMO_STUDENT)), [questions]);
  const api: GameApi = {
    answer: async (round, qid, response) => {
      const q = questions.find((x) => x.id === qid);
      const r = q && gradeQuestion(q, DEMO_STUDENT, response);
      if (!r) return { error: "Жооп толук эмес." };
      log.current.set(round, [...(log.current.get(round) ?? []), { question_id: qid, is_correct: r.correct }]);
      return r;
    },
    finish: async (round) => {
      const r = roundScore(questions.map((q) => q.id), log.current.get(round) ?? []);
      return r.complete ? { score: r.score, firstTry: r.firstTry, total: questions.length } : { error: "Бардык суроолорду чечип бүтүр." };
    },
  };
  return <GamePlayer assignmentId="demo" title={title} questions={view} best={null} backHref="/lab" api={api} />;
}
