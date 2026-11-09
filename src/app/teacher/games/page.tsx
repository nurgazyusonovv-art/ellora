import Link from "next/link";
import { GameAiForm } from "@/components/game-ai-form";
import { DeleteGameAssignment, GameAssignForm } from "@/components/game-assign-form";
import { Card, Chip, PageTitle, Progress } from "@/components/ui";
import { GAME_SETS } from "@/content/game-sets";
import { requireRole } from "@/lib/auth";
import { QUESTION_TYPES } from "@/lib/game-questions";
import { SKILLS } from "@/lib/skills";
import { formatDate } from "@/lib/stats";
import type { LessonContent } from "@/lib/lesson-types";

export const metadata = { title: "Оюндар" };

type AssignmentRow = { id: string; class_id: string; due_at: string | null; created_at: string; game_sets: { title: string; questions: unknown[] } | null; classes: { name: string } | null };

export default async function GamesPage() {
  const { supabase, profile } = await requireRole("teacher");
  const [{ data: classes }, { data: assignments }, { data: members }, { data: progress }, { data: oldGames }] = await Promise.all([
    supabase.from("classes").select("id, name").eq("teacher_id", profile.id).order("name"),
    supabase.from("game_assignments").select("id, class_id, due_at, created_at, game_sets(title, questions), classes(name)").order("created_at", { ascending: false }).returns<AssignmentRow[]>(),
    supabase.from("class_members").select("class_id, student_id"),
    supabase.from("game_progress").select("assignment_id, best_score, rounds"),
    supabase.from("lessons").select("id, title, content").eq("author_id", profile.id).order("created_at", { ascending: false }).returns<{ id: string; title: string; content: LessonContent }[]>(),
  ]);
  const legacy = (oldGames ?? []).filter((g) => g.content.activityKind === "game");
  const rows = (assignments ?? []).map((a) => {
    const total = (members ?? []).filter((m) => m.class_id === a.class_id).length;
    const played = (progress ?? []).filter((p) => p.assignment_id === a.id && p.rounds > 0);
    const avg = played.length ? Math.round(played.reduce((s, p) => s + p.best_score, 0) / played.length) : null;
    return { ...a, total, played: played.length, avg };
  });

  return (
    <>
      <PageTitle eyebrow="Машыгуу" title="Оюндар" />
      <p className="max-w-[70ch] text-sm text-muted">
        Оюн — бир темадагы кыска суроолор топтому. Окуучу жооп берген замат туура же туура эмес экенин көрөт. Ката кетирилген суроо бир аздан кийин кайра чыгат,
        ошондуктан раунд бардык суроо чечилгенде гана бүтөт. Оюндун натыйжасы чейректик баага кошулбайт.
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Класстарга жөнөтүлгөн оюндар</h2>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong p-4 text-sm text-muted">Азырынча жок. Төмөндөгү даяр оюндардын бирин класска жөнөтүңүз.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-col gap-3 border-b border-line p-4 last:border-0 sm:flex-row sm:items-center">
                <Link href={`/teacher/games/${r.id}`} className="flex min-w-0 flex-1 flex-col gap-1 hover:text-accent">
                  <span className="font-medium">{r.game_sets?.title ?? "Оюн"}</span>
                  <span className="text-sm text-muted">
                    {r.classes?.name} · {r.game_sets?.questions.length ?? 0} суроо{r.due_at ? ` · Мөөнөт: ${formatDate(r.due_at)}` : ""}
                  </span>
                </Link>
                <div className="flex items-center gap-3 sm:w-64">
                  <div className="flex-1"><Progress value={r.total ? (r.played / r.total) * 100 : 0} tone="good" /></div>
                  <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
                    {r.played}/{r.total} ойноду{r.avg !== null ? ` · ${r.avg}%` : ""}
                  </span>
                </div>
                <DeleteGameAssignment id={r.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Даяр оюндар</h2>
        {(classes ?? []).length === 0 && (
          <p className="text-sm text-muted">
            Оюнду жөнөтүү үчүн адегенде <Link href="/teacher/classes" className="font-medium text-accent hover:underline">класс ачыңыз</Link>.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {GAME_SETS.map((g) => {
            const types = [...new Set(g.questions.map((q) => q.type))];
            return (
              <Card key={g.slug} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{g.title}</h3>
                  <span className="shrink-0 font-mono text-xs text-muted">{g.grade}-класс</span>
                </div>
                <p className="text-sm text-muted">{g.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Chip tone="accent">{g.questions.length} суроо</Chip>
                  {types.map((t) => <Chip key={t}>{QUESTION_TYPES[t]}</Chip>)}
                </div>
                <p className="text-xs text-muted">{g.skills.map((s) => SKILLS[s]).join(" · ")}</p>
                {(classes ?? []).length > 0 && (
                  <div className="mt-auto border-t border-line pt-3">
                    <GameAssignForm slug={g.slug} classes={classes ?? []} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <details className="rounded-lg border border-line bg-surface">
        <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-medium">ЖИ менен оюн-сабак түзүү (мурунку формат)</summary>
        <div className="flex flex-col gap-4 border-t border-line p-4">
          <p className="text-sm text-muted">
            Бул форма оюн блогу бар 5 бөлүктүү сабак түзөт. ЖИ менен суроо топтомун түзүү кийинки жаңыртууда кошулат.
          </p>
          <GameAiForm />
          {legacy.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Менин оюн-сабактарым</h3>
              {legacy.map((g) => (
                <Link key={g.id} href={`/teacher/lessons/${g.id}`} className="flex min-h-11 items-center rounded-md border border-line px-3 text-sm hover:bg-surface-2">
                  {g.title} →
                </Link>
              ))}
            </div>
          )}
        </div>
      </details>
    </>
  );
}
