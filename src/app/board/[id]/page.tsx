import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardStage } from "@/components/board-stage";
import { BoardView } from "@/components/live-board";
import { FullscreenButton } from "@/components/fullscreen-button";
import { LiveSync } from "@/components/live-sync";
import { Logo } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { readLiveSession } from "@/lib/live-session";
import { boardSlides } from "@/lib/board-slides";
import { lessonGoal } from "@/lib/goal-check";
import { boardResult, type BoardRow } from "@/lib/live-results";
import { stageMeta, type LessonContent } from "@/lib/lesson-types";

export const metadata = { title: "Такта" };

type Spot = { spotlight_block?: string | null; spotlight_reveal?: boolean; spotlight_hidden?: string[] | null };

/**
 * Проектор үчүн «Такта» (0020): мугалим тандаган тапшырманын жыйынтыгы — атсыз.
 * Мугалимдин каптал менюсусуз (`/teacher` layout'унан тышкары); укук requireRole + RLS менен.
 */
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("teacher");
  const { data: a } = await supabase
    .from("assignments")
    .select("id, class_id, lessons(title, content), classes(name)")
    .eq("id", id)
    .maybeSingle<{ id: string; class_id: string; lessons: { title: string; content: LessonContent } | null; classes: { name: string } | null }>();
  if (!a?.lessons) notFound();
  const content = a.lessons.content;
  const [session, { count: total }, { data: attempts }] = await Promise.all([
    readLiveSession(supabase, id).catch(() => null),
    supabase.from("class_members").select("student_id", { count: "exact", head: true }).eq("class_id", a.class_id),
    supabase.from("attempts").select("id").eq("assignment_id", id),
  ]);
  const spot = (session ?? {}) as Spot;
  const found = spot.spotlight_block ? content.stages.flatMap((st, si) => st.blocks.map((b) => ({ b, si }))).find((x) => x.b.id === spot.spotlight_block) : undefined;
  const ids = (attempts ?? []).map((t) => t.id as string);
  const { data: rows } =
    found && ids.length
      ? await supabase.from("answers").select("attempt_id, response, is_correct").eq("block_id", found.b.id).in("attempt_id", ids).returns<BoardRow[]>()
      : { data: [] as BoardRow[] };
  const result = found ? boardResult(found.b, rows ?? [], spot.spotlight_hidden ?? []) : null;
  const stage = Math.min(session?.max_stage ?? 0, content.stages.length - 1);
  const running = !!session && !session.ended;
  const prompt = found ? ("prompt" in found.b ? found.b.prompt : found.b.type === "game" ? `Оюн: ${found.b.title}` : "") : "";
  const code = found?.b.type === "mcq" ? found.b.code : undefined;

  return (
    <LiveSync assignmentId={id} teacherId={profile.id} active={!!session && !session.ended}>
      <main className="flex min-h-dvh flex-col gap-8 bg-surface-2 px-5 py-5 sm:px-10 lg:px-16">
        <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line pb-4">
          <Logo />
          <span className="min-w-0 flex-1 truncate text-lg text-muted">
            {a.classes?.name} · {a.lessons.title}
          </span>
          {session && !session.ended && (
            <span className="font-mono text-sm uppercase tracking-[0.08em] text-muted">
              {stage + 1}/5 · {stageMeta(content, content.stages[stage].key).label}
            </span>
          )}
          <FullscreenButton />
          <Link href={`/teacher/live/${id}`} className="text-sm font-medium text-muted hover:text-ink print:hidden">Башкарууга ←</Link>
        </header>

        {found && result ? (
          <BoardView prompt={prompt} code={code} result={result} reveal={!!spot.spotlight_reveal} total={total ?? 0} />
        ) : running && !session.paused ? (
          <BoardStage key={stage} slides={boardSlides(content.stages[stage], stage === 0 ? lessonGoal(content) : null)} stageLabel={`${stage + 1}/5 · ${stageMeta(content, content.stages[stage].key).label}`} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="font-mono text-sm uppercase tracking-[0.08em] text-muted">{session?.paused ? "Тыныгуу" : session && !session.ended ? "Сабак жүрүп жатат" : "Такта"}</p>
            <p className="max-w-2xl text-3xl font-medium lg:text-4xl">
              {session && !session.ended ? stageMeta(content, content.stages[stage].key).label : a.lessons.title}
            </p>
            <p className="text-lg text-muted">{session?.paused ? "Мугалим сабакты улантканда бул жерде бөлүктүн мазмуну кайра чыгат." : "Мугалим сабакты баштаганда бул жерде бөлүктүн мазмуну чыгат, ал эми тапшырманы «Тактага» чыгарганда — класстын жыйынтыгы (аттарсыз)."}</p>
          </div>
        )}
      </main>
    </LiveSync>
  );
}
