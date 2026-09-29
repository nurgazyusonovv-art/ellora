import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { Card, Chip, PageTitle, Progress } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { CONFIDENCE_LABELS, STAGE_META, type LessonContent, type McqBlock } from "@/lib/lesson-types";
import { formatDate, STATUS_META, studentStatus, type AttemptRow } from "@/lib/stats";

type Answer = { attempt_id: string; block_id: string; stage: number; response: unknown; is_correct: boolean | null };

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole("teacher");

  const { data: a } = await supabase
    .from("assignments")
    .select("id, due_at, class_id, lessons(title, content), classes(name)")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      due_at: string | null;
      class_id: string;
      lessons: { title: string; content: LessonContent } | null;
      classes: { name: string } | null;
    }>();
  if (!a || !a.lessons) notFound();

  const [{ data: members }, { data: attempts }] = await Promise.all([
    supabase
      .from("class_members")
      .select("student_id, profiles(full_name)")
      .eq("class_id", a.class_id)
      .returns<{ student_id: string; profiles: { full_name: string } | null }[]>(),
    supabase.from("attempts").select("*").eq("assignment_id", id).returns<AttemptRow[]>(),
  ]);
  const attemptIds = (attempts ?? []).map((t) => t.id);
  const { data: answers } = attemptIds.length
    ? await supabase.from("answers").select("attempt_id, block_id, stage, response, is_correct").in("attempt_id", attemptIds).returns<Answer[]>()
    : { data: [] as Answer[] };

  const content = a.lessons.content;
  const exitStage = content.stages.findIndex((s) => s.key === "exit");
  const exitMcqs = (content.stages[exitStage]?.blocks ?? []).filter((b): b is McqBlock => b.type === "mcq");
  const exitOpen = content.stages[exitStage]?.blocks.find((b) => b.type === "open");

  const total = members?.length ?? 0;
  const atts = attempts ?? [];
  const finished = atts.filter((t) => t.finished_at);
  const avgExit = finished.length ? finished.reduce((s, t) => s + (t.exit_score ?? 0), 0) / finished.length : null;

  const funnel = content.stages.map((st, i) => ({ label: STAGE_META[st.key].label, n: atts.filter((t) => t.current_stage > i).length }));

  const questionStats = exitMcqs.map((q) => {
    const rows = (answers ?? []).filter((x) => x.block_id === q.id);
    const right = rows.filter((x) => x.is_correct).length;
    return { q, n: rows.length, pct: rows.length ? Math.round((right / rows.length) * 100) : null };
  });
  const weakest = questionStats.filter((s) => s.pct !== null && s.n >= 3).sort((x, y) => x.pct! - y.pct!)[0];

  const students = (members ?? [])
    .map((m) => {
      const t = atts.find((x) => x.student_id === m.student_id);
      const st = studentStatus(t);
      const unclear = exitOpen ? (answers ?? []).find((x) => x.attempt_id === t?.id && x.block_id === exitOpen.id) : undefined;
      const text = (unclear?.response as { text?: string } | undefined)?.text;
      return { id: m.student_id, name: m.profiles?.full_name ?? "Окуучу", t, st, text };
    })
    .sort((x, y) => STATUS_META[x.st].order - STATUS_META[y.st].order || x.name.localeCompare(y.name, "ky"));
  const helpNames = students.filter((s) => s.st === "help" || s.st === "stuck").map((s) => s.name.split(" ")[0]);

  return (
    <>
      <AutoRefresh />
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">
          <Link href={`/teacher/classes/${a.class_id}`} className="text-accent">{a.classes?.name}</Link> · Мөөнөт: {formatDate(a.due_at)}
        </span>
        <PageTitle title={a.lessons.title} />
        <span className="text-muted">
          {total} окуучунун {finished.length}и бүттү
          {avgExit !== null && ` · орточо exit ticket ${avgExit.toFixed(1)} / ${exitMcqs.length}`}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Бөлүктөр боюнча прогресс</h2>
          <div className="grid grid-cols-[96px_1fr_32px] items-center gap-x-3 gap-y-2.5 text-sm">
            {funnel.map((f) => (
              <FunnelRow key={f.label} label={f.label} n={f.n} total={total} />
            ))}
          </div>
          <span className="text-xs text-muted">{total} окуучудан, бөлүктү бүтүргөндөр.</span>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">Exit ticket суроолору</h2>
          {questionStats.map((s, i) => (
            <div key={s.q.id} className="flex flex-col gap-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className={s === weakest ? "font-semibold" : ""}>
                  {i + 1}. {s.q.prompt.replace(/`/g, "")}
                </span>
                <span className="font-mono tabular-nums">{s.pct === null ? "—" : `${s.pct}%`}</span>
              </div>
              <Progress value={s.pct ?? 0} tone={s.pct !== null && s.pct < 60 ? "bad" : "good"} />
            </div>
          ))}
          <span className="text-xs text-muted">Туура жооп бергендердин үлүшү.</span>
        </Card>

        <div className="flex flex-col gap-2.5 rounded-2xl border border-[#a9d3c7] bg-accent-soft p-5 sm:p-6">
          <h2 className="font-semibold">Кийинки сабакка сунуш</h2>
          {finished.length < 3 ? (
            <p className="text-sm">Кеминде 3 окуучу бүткөндө сунуш пайда болот.</p>
          ) : (
            <>
              {weakest && weakest.pct! < 60 ? (
                <p className="text-[15px] leading-relaxed">
                  Сабакты кыска кайталоо менен баштаңыз: «{weakest.q.prompt.replace(/`/g, "")}» суроосуна {weakest.pct}% гана туура жооп берди.
                </p>
              ) : (
                <p className="text-[15px] leading-relaxed">Класс теманы жакшы өздөштүрдү. Кийинки темага өтсөңүз болот.</p>
              )}
              {helpNames.length > 0 && <p className="text-[15px] leading-relaxed">Жеке иштеңиз: {helpNames.slice(0, 5).join(", ")}.</p>}
            </>
          )}
        </div>
      </div>

      <Card className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs tracking-[0.06em] text-muted uppercase">
              <th className="px-5 py-3 font-semibold">Окуучу</th>
              <th className="px-3 py-3 font-semibold">Бөлүк</th>
              <th className="px-3 py-3 font-semibold">XP</th>
              <th className="px-3 py-3 font-semibold">Exit ticket</th>
              <th className="px-3 py-3 font-semibold">Ишеним</th>
              <th className="px-3 py-3 font-semibold">Түшүнбөгөнү</th>
              <th className="px-5 py-3 font-semibold">Абалы</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-surface-2">
                <td className="px-5 py-3 font-semibold">
                  <Link href={`/teacher/students/${s.id}`} className="hover:text-accent hover:underline">
                    {s.name}
                  </Link>
                </td>
                <td className="px-3 py-3 tabular-nums">{s.t ? `${Math.min(s.t.current_stage, 5)}/5` : "—"}</td>
                <td className="px-3 py-3 font-mono tabular-nums">{s.t?.xp ?? "—"}</td>
                <td className="px-3 py-3 font-mono tabular-nums">{s.t?.finished_at ? `${s.t.exit_score}/${s.t.exit_total}` : "—"}</td>
                <td className="px-3 py-3">{s.t?.confidence ? `${s.t.confidence} · ${CONFIDENCE_LABELS[s.t.confidence - 1]}` : "—"}</td>
                <td className="max-w-64 px-3 py-3 text-muted">{s.text || "—"}</td>
                <td className="px-5 py-3">
                  <Chip tone={STATUS_META[s.st].tone}>{STATUS_META[s.st].label}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && <p className="px-5 pb-5 text-sm text-muted">Класста окуучу жок.</p>}
      </Card>
    </>
  );
}

function FunnelRow({ label, n, total }: { label: string; n: number; total: number }) {
  return (
    <>
      <span>{label}</span>
      <Progress value={total ? (n / total) * 100 : 0} />
      <span className="text-right font-mono tabular-nums">{n}</span>
    </>
  );
}
