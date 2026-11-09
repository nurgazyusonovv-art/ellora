"use client";

import { useRef, useState } from "react";
import { answerLessonGame, type Progress } from "@/app/actions/student";
import { GamePlayer, type GameApi } from "@/components/game-player";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import type { SavedAnswer } from "@/lib/grading";
import { applyLessonGameAnswer, gradeQuestion, PREVIEW_VIEWER, readLessonGame, type LessonGameState } from "@/lib/game-questions";
import type { GameBlock } from "@/lib/lesson-types";

/**
 * Сабактын ичиндеги оюн. Окуучу: ар жоопту сервер баалайт (answerLessonGame), прогресс сабактын жообуна жазылат.
 * Алдын ала көрүү: мугалимдин `answerKey`и менен браузерде бааланат, эч нерсе сакталбайт.
 */
export type GameCtx = { attemptId?: string; onServer: (r: Progress) => void; onLocal: (answer: SavedAnswer) => void };

export function LessonGame({ block, saved, attemptId, onServer, onLocal }: GameCtx & { block: GameBlock; saved?: SavedAnswer }) {
  const state = readLessonGame(saved?.response);
  const done = saved?.is_correct === true;
  const [playing, setPlaying] = useState(!done);
  const rounds = useRef(new Map<string, LessonGameState>());
  const questions = block.questions ?? [];
  const ids = (block.answerKey ?? []).map((q) => q.id);

  if (!questions.length) return <p className="rounded-md border border-line bg-surface-2 p-3 text-sm text-muted">Оюндун суроолору жүктөлгөн жок. Мугалимге кайрыл.</p>;

  if (!playing)
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-good/25 bg-good-soft p-4">
        <p className="flex items-center gap-2 font-medium text-good"><Icon name="trophy" size={18} /> «{block.title}» оюну бүттү</p>
        <p className="text-sm text-ink">
          {state.score !== null && <>Акыркы раунд: <b>{state.score}%</b>. </>}
          {state.best !== null && <>Рекорд: <b>{state.best}%</b>. </>}
          Кааласаң кайра ойноп, рекордуңду жакшырт.
        </p>
        <Button variant="secondary" onClick={() => setPlaying(true)}><Icon name="repeat" size={16} /> Кайра ойноо</Button>
      </div>
    );

  const api: GameApi = {
    answer: async (round, qid, response) => {
      if (attemptId) {
        const r = await answerLessonGame(attemptId, block.id, round, qid, response);
        if (r.error) return { error: r.error };
        if (r.answer) rounds.current.set(round, readLessonGame(r.answer.response) as LessonGameState);
        onServer(r);
        return { correct: r.correct, reveal: r.reveal, explain: r.explain };
      }
      const q = block.answerKey?.find((x) => x.id === qid);
      const r = q && gradeQuestion(q, PREVIEW_VIEWER, response);
      if (!r) return { error: "Жооп толук эмес." };
      const prev = rounds.current.get(round) ?? saved?.response;
      const next = applyLessonGameAnswer(prev, ids, round, qid, r.correct);
      rounds.current.set(round, next);
      onLocal({ response: next, is_correct: done || next.complete ? true : null, tries: next.rounds });
      return r;
    },
    finish: async (round) => {
      const s = rounds.current.get(round);
      if (!s?.complete || s.score === null) return { error: "Бардык суроолорду чечип бүтүр." };
      return { score: s.score, firstTry: Object.values(s.first).filter(Boolean).length, total: questions.length, best: s.best ?? s.score };
    },
  };

  return <GamePlayer assignmentId={block.id} title={block.title} questions={questions} best={state.best ?? null} backHref="#" api={api} embedded />;
}
