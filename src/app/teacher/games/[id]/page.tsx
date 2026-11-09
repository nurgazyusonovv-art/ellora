import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Chip, PageTitle, Progress } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { QUESTION_TYPES, type GameQuestion } from "@/lib/game-questions";
import { formatDate } from "@/lib/stats";

export const metadata = { title: "Оюндун жыйынтыгы" };

const plain = (s: string) => s.replace(/\*\*|`/g, "");

export default async function GameResults({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole("teacher");
  // RLS: мугалим өз классынын дайындамасын жана өз топтомун гана көрөт.
  const { data: a } = await supabase
    .from("game_assignments")
    .select("id, class_id, due_at, game_sets(title, questions), classes(name)")
    .eq("id", id)
    .maybeSingle<{ id: string; class_id: string; due_at: string | null; game_sets: { title: string; questions: GameQuestion[] } | null; classes: { name: string } | null }>();
  if (!a?.game_sets) notFound();
  const [{ data: members }, { data: progress }, { data: answers }] = await Promise.all([
    supabase.from("class_members").select("student_id, profiles(full_name)").eq("class_id", a.class_id).returns<{ student_id: string; profiles: { full_name: string } | null }[]>(),
    supabase.from("game_progress").select("student_id, rounds, best_score, last_score, updated_at").eq("assignment_id", id),
    supabase.from("game_answers").select("student_id, round_id, question_id, is_correct").eq("assignment_id", id).order("id"),
  ]);
  const questions = a.game_sets.questions;

  // Ар суроо: окуучунун ар раундундагы биринчи жообу гана эсептелет.
  const seen = new Set<string>();
  const stat = new Map<string, { n: number; ok: number }>();
  for (const r of answers ?? []) {
    const k = `${r.student_id}:${r.round_id}:${r.question_id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const s = stat.get(r.question_id) ?? { n: 0, ok: 0 };
    s.n++;
    if (r.is_correct) s.ok++;
    stat.set(r.question_id, s);
  }
  const qRows = questions
    .map((q, i) => ({ q, i, s: stat.get(q.id), pct: stat.get(q.id) ? Math.round((stat.get(q.id)!.ok / stat.get(q.id)!.n) * 100) : null }))
    .sort((x, y) => (x.pct ?? 101) - (y.pct ?? 101));

  const students = (members ?? [])
    .map((m) => ({ id: m.student_id, name: m.profiles?.full_name || "Окуучу", p: progress?.find((p) => p.student_id === m.student_id) }))
    .sort((x, y) => (y.p?.best_score ?? -1) - (x.p?.best_score ?? -1) || x.name.localeCompare(y.name));
  const played = students.filter((s) => s.p?.rounds).length;

  return (
    <>
      <Link href="/teacher/games" className="text-sm font-medium text-muted hover:text-ink">← Оюндар</Link>
      <PageTitle eyebrow={`${a.classes?.name ?? ""}${a.due_at ? ` · Мөөнөт: ${formatDate(a.due_at)}` : ""}`} title={a.game_sets.title} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Ойноду</span>
          <span className="font-mono text-2xl font-medium tabular-nums">{played}/{students.length}</span>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Суроо</span>
          <span className="font-mono text-2xl font-medium tabular-nums">{questions.length}</span>
        </Card>
        <Card className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Орточо рекорд</span>
          <span className="font-mono text-2xl font-medium tabular-nums">
            {played ? `${Math.round(students.reduce((s, x) => s + (x.p?.rounds ? x.p.best_score : 0), 0) / played)}%` : "—"}
          </span>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">Окуучулар</h2>
          <Card className="overflow-x-auto p-0 sm:p-0">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
                  <th className="px-4 py-2.5 font-medium">Окуучу</th>
                  <th className="px-3 py-2.5 text-right font-medium">Раунд</th>
                  <th className="px-3 py-2.5 text-right font-medium">Акыркы</th>
                  <th className="px-4 py-2.5 text-right font-medium">Рекорд</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="px-4 py-2.5">
                      <Link href={`/teacher/students/${s.id}`} className="font-medium hover:text-accent">{s.name}</Link>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{s.p?.rounds ?? 0}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{s.p?.rounds ? `${s.p.last_score}%` : "—"}</td>
                    <td className="px-4 py-2.5 text-right">{s.p?.rounds ? <Chip tone={s.p.best_score >= 80 ? "good" : s.p.best_score >= 50 ? "warn" : "bad"}>{s.p.best_score}%</Chip> : <span className="text-muted">Ойной элек</span>}</td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-4 text-muted">Класста окуучу жок.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-medium">Суроолор: кыйынынан баштап</h2>
          <p className="text-sm text-muted">Ар раунддагы биринчи жооп боюнча туура жооп бергендердин үлүшү.</p>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            {qRows.map(({ q, i, s, pct }) => (
              <div key={q.id} className="flex flex-col gap-2 border-b border-line p-3.5 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm"><span className="font-mono text-muted">{i + 1}.</span> {plain(q.prompt)}</span>
                  <span className="shrink-0 font-mono text-[11px] uppercase text-muted">{QUESTION_TYPES[q.type]}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1"><Progress value={pct ?? 0} tone={pct === null ? "accent" : pct >= 70 ? "good" : "bad"} /></div>
                  <span className="w-28 shrink-0 text-right font-mono text-xs text-muted tabular-nums">{pct === null ? "жооп жок" : `${pct}% · ${s!.n} жооп`}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
