import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game-player";
import { requireRole } from "@/lib/auth";
import { studentGame } from "@/lib/game-data";
import { studentQuestion } from "@/lib/game-questions";

export const metadata = { title: "Оюн" };

export default async function StudentGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("student");
  const game = await studentGame(supabase, id);
  if (!game) notFound();
  const { data: progress } = await supabase.from("game_progress").select("best_score, rounds").eq("assignment_id", id).eq("student_id", profile.id).maybeSingle();
  return (
    <main>
      <GamePlayer
        assignmentId={id}
        title={game.set.title}
        questions={game.set.questions.map((q) => studentQuestion(q, profile.id))}
        best={progress?.rounds ? progress.best_score : null}
        backHref="/student"
      />
    </main>
  );
}
