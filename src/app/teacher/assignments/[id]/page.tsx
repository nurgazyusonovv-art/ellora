import {AssignmentTermForm} from "@/components/assignment-term-fields";
import {ShareCard} from "@/components/share-card";
import {reviewSource,sourceHash} from "@/lib/review-source";
import {readDelivery,readLiveSession} from "@/lib/live-session";
import { liveState } from "@/lib/classroom";
import { ClassInsightsPanel } from "@/components/class-insights";
import { classInsights } from "@/lib/class-insights";
import { RevisionCard, RequestRevisionForm } from "@/components/revision-forms";
import { REVISION_COLUMNS, canRevise, type Revision } from "@/lib/revisions";
import { SessionControls, ReviewForm } from "@/components/classroom-forms";
import type { Review } from "@/lib/classroom";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { AssignmentControls } from "@/components/teacher-forms";
import { Card, Chip, PageTitle, Progress } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { CONFIDENCE_LABELS, stageMeta, type LessonContent, type McqBlock } from "@/lib/lesson-types";
import { formatDate, STATUS_META, studentStatus, type AttemptRow } from "@/lib/stats";

type Answer = { attempt_id: string; block_id: string; stage: number; response: unknown; is_correct: boolean | null; tries: number };

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole("teacher");

  const { data: a } = await supabase
    .from("assignments")
    .select("id, due_at, class_id, academic_year, quarter, work_kind, lessons(title, content), classes(name)")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      due_at: string | null; academic_year:number|null;quarter:number|null;work_kind:string;
      class_id: string;
      lessons: { title: string; content: LessonContent } | null;
      classes: { name: string } | null;
    }>();
  if (!a || !a.lessons) notFound();

  const [{ data: members, error: membersError }, { data: attempts, error: attemptsError }] = await Promise.all([
    supabase
      .from("class_members")
      .select("student_id, profiles(full_name)")
      .eq("class_id", a.class_id)
      .returns<{ student_id: string; profiles: { full_name: string } | null }[]>(),
    supabase.from("attempts").select("*").eq("assignment_id", id).returns<AttemptRow[]>(),
  ]);
  const attemptIds = (attempts ?? []).map((t) => t.id);
  const { data: answers, error: answersError } = attemptIds.length
    ? await supabase.from("answers").select("attempt_id, block_id, stage, response, is_correct, tries").in("attempt_id", attemptIds).returns<Answer[]>()
    : { data: [] as Answer[], error: null };

  const [delivery, { data: session, error: sessionError }, { data: reviews, error: reviewsError }, {data: revisions, error: revisionError}] = await Promise.all([
    readDelivery(supabase, id),
    readLiveSession(supabase,id).then(data=>({data,error:null})).catch(()=>({data:null,error:{message:"Сабак режими жүктөлгөн жок"}})),
    attemptIds.length ? supabase.from("answer_reviews").select("attempt_id, block_id, criteria_met, feedback").in("attempt_id", attemptIds) : Promise.resolve({ data: [], error: null }),
    attemptIds.length ? supabase.from("answer_revisions").select(REVISION_COLUMNS).in("attempt_id",attemptIds).order("revision_no").returns<Revision[]>() : Promise.resolve({data:[] as Revision[],error:null}),
  ]);
  const content = a.lessons.content;
  const insightsError = membersError || attemptsError || answersError || reviewsError || revisionError;
  const insights = insightsError ? null : classInsights({content,members:members??[],attempts:attempts??[],answers:answers??[],reviews:(reviews??[]) as {attempt_id:string;block_id:string;criteria_met:boolean[]}[],revisions:revisions??[]});
  const exitStage = content.stages.findIndex((s) => s.key === "exit");
  const exitMcqs = (content.stages[exitStage]?.blocks ?? []).filter((b): b is McqBlock => b.type === "mcq");
  const exitOpen = content.stages[exitStage]?.blocks.find((b) => b.type === "open");

  const total = members?.length ?? 0;
  const atts = attempts ?? [];
  const finished = atts.filter((t) => t.finished_at);
  const avgExit = finished.length ? finished.reduce((s, t) => s + (t.exit_score ?? 0), 0) / finished.length : null;

  const funnel = content.stages.map((st, i) => ({ label: stageMeta(content, st.key).label, n: atts.filter((t) => t.current_stage > i).length }));

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
      <ShareCard assignmentId={id}/><AssignmentTermForm assignmentId={id} year={a.academic_year} quarter={a.quarter} kind={a.work_kind} activityKind={content.activityKind}/><AutoRefresh seconds={session?.timed?3:20} />
      {sessionError ? <p className="rounded-xl bg-amber-soft p-4 text-sm text-amber border border-amber/25">Жандуу режим жана баалоо үчүн 0008 база жаңыртуусу керек.</p> : <>
        <LiveLink id={id} state={liveState(delivery, session)} />
        {/* «Класста өтөм» сабагы жандуу экрандан башкарылат; мурунку режимдер өз алдынча дайындамалар үчүн калат. */}
        {delivery === "self" && <SessionControls key={JSON.stringify(session)} assignmentId={id} session={session} content={content} />}
      </>}
      {content.teacherNotes && <details className="rounded-xl bg-accent-soft p-4 border border-accent/20"><summary className="min-h-11 cursor-pointer font-semibold">Сабакты өткөрүү боюнча көрсөтмө</summary><p className="leading-relaxed">{content.teacherNotes}</p></details>}
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">
          <Link href={`/teacher/classes/${a.class_id}`} className="text-accent">{a.classes?.name}</Link> · Мөөнөт: {formatDate(a.due_at)}
        </span>
        <PageTitle title={a.lessons.title} />
        <AssignmentControls id={a.id} classId={a.class_id} dueDate={dueInput(a.due_at)} started={atts.length} />
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

        <div className="flex flex-col gap-2.5 rounded-2xl border border-accent/25 bg-accent-soft p-5 sm:p-6">
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
                <p className="text-[15px] leading-relaxed">Бул тесттерде жалпы кайталоого ачык белги жок. Түшүндүрмө, колдонуу жана текшерилбеген жоопторду да караңыз.</p>
              )}
              {helpNames.length > 0 && <p className="text-[15px] leading-relaxed">Жеке иштеңиз: {helpNames.slice(0, 5).join(", ")}.</p>}
            </>
          )}
        </div>
      </div>

      {insights ? <ClassInsightsPanel data={insights} assignmentId={id}/> : <p role="alert" className="rounded-xl bg-amber-soft p-4 text-sm text-amber border border-amber/25">Класстын далилдери толук ачылган жок. Байланышты же база жаңыртылганын текшериңиз; бош маалыматтан жыйынтык чыгарылган жок.</p>}

      <Card className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-left font-mono text-[11px] tracking-[0.06em] text-muted uppercase">
              <th className="px-5 py-2.5 font-medium">Окуучу</th>
              <th className="px-3 py-2.5 font-medium">Бөлүк</th>
              <th className="px-3 py-2.5 font-medium">XP</th>
              <th className="px-3 py-2.5 font-medium">Exit ticket</th>
              <th className="px-3 py-2.5 font-medium">Ишеним</th>
              <th className="px-3 py-2.5 font-medium">Түшүнбөгөнү</th>
              <th className="px-5 py-2.5 font-medium">Абалы</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-line transition-colors hover:bg-surface-2/50">
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
      <Link href={`/teacher/assignments/${id}/teams`} className="flex min-h-11 items-center font-semibold text-accent">Жуп жана топ иштерин уюштуруу →</Link>
      <Link href={`/teacher/assignments/${id}/pathways`} className="flex min-h-11 items-center rounded-xl bg-accent-soft px-4 font-semibold text-accent border border-accent/20">Колдоо менен / негизги / тереңдетилген практика →</Link>
      <Link href={`/teacher/assignments/${id}/repetition`} className="flex min-h-11 items-center rounded-xl bg-accent-soft px-4 font-semibold text-accent border border-accent/20">Аралык кайталоону пландоо жана жыйынтыктар →</Link>
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Окуучунун далили жана өз алдынча колдонуу</h2>
        <p className="text-sm text-muted">Тесттин баллы өзүнчө. Түшүндүрмө жана колдонуу төмөнкү критерийлер менен мугалим тарабынан бааланат.</p>
        {students.map(s => {
          if (!s.t) return null;
          const blocks = content.stages.flatMap(st => st.blocks).filter(b => b.type === "investigation" || (b.type === "open" && b.rubric?.length));
          return <details key={s.id} className="rounded-2xl border border-line bg-surface p-5"><summary className="min-h-11 cursor-pointer font-semibold">{s.name}</summary><div className="flex flex-col gap-5">{blocks.map(b => {
            const answer = (answers ?? []).find(x => x.attempt_id === s.t!.id && x.block_id === b.id);
            const r = answer?.response as Record<string, string> | undefined;
            if (!r) return <p key={b.id} className="text-sm text-muted">{"prompt" in b ? b.prompt : ""}: жооп жок</p>;
            const review = (reviews ?? []).find(x => x.attempt_id === s.t!.id && x.block_id === b.id) as Review | undefined;
            const history=(revisions??[]).filter(x=>x.attempt_id===s.t!.id&&x.block_id===b.id);
            const last=history.at(-1);
            const stageKey=content.stages.find(st=>st.blocks.some(x=>x.id===b.id))!.key;
            const initial = b.type === "open" && b.compareTo ? (answers ?? []).find(x => x.attempt_id === s.t!.id && x.block_id === b.compareTo)?.response as {text?: string} | undefined : undefined;
            return <div key={b.id} id={`class-answer-${s.id}-${b.id}`} className="flex flex-col gap-3 border-t border-line pt-4"><h3 className="font-semibold">{"prompt" in b ? b.prompt : ""}</h3>{initial?.text && <p className="rounded-xl bg-accent-soft p-3 whitespace-pre-wrap border border-accent/20">Баштапкы ой: {initial.text}</p>}{b.type === "investigation" ? <><p className="whitespace-pre-wrap">Божомол: {r.prediction}</p><p className="whitespace-pre-wrap">Байкоо: {r.observations}</p><p className="whitespace-pre-wrap">Жыйынтык: {r.conclusion}</p></> : <p className="whitespace-pre-wrap">{r.text}</p>}{b.type === "open" && b.rubric?.length && !sessionError && <ReviewForm initialSourceHash={sourceHash(reviewSource(b,r))} key={JSON.stringify(review)} attemptId={s.t!.id} blockId={b.id} rubric={b.rubric} review={review} />}
            {history.map(revision=><RevisionCard key={revision.id} revision={revision} teacher/>)}
            {canRevise(b,stageKey)&&review&&!revisionError&&(!last||last.status==="reviewed")&&<RequestRevisionForm key={last?.id??"first"} attemptId={s.t!.id} blockId={b.id} feedback={last?.feedback??review.feedback}/>}
            {revisionError&&canRevise(b,stageKey)&&<p className="text-sm text-muted">Кайра иштөө тарыхы жеткиликсиз. База жаңыртылганын текшериңиз.</p>}
            </div>;
          })}</div></details>;
        })}
      </section>
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

/** Сактоодогу мөөнөт (Бишкек 23:59) → <input type="date"> мааниси. */
function dueInput(iso: string | null) {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + 6 * 36e5).toISOString().slice(0, 10);
}


function LiveLink({ id, state }: { id: string; state: ReturnType<typeof liveState> }) {
  const text = state === "waiting" ? "Сабак али башталган жок." : state === "live" ? "Сабак азыр жүрүп жатат." : state === "paused" ? "Сабак тыныгууда." : state === "ended" ? "Сабак жабылды." : "Сабакты класста мугалим башкарган режимде өткөрө аласыз.";
  return (
    <Link href={`/teacher/live/${id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/25 bg-accent-soft p-4 transition-colors hover:border-accent/50">
      <span className="flex flex-col gap-0.5">
        <span className="font-medium text-accent-dark">Жандуу сабак экраны</span>
        <span className="text-sm text-muted">{text} Баштоо, бөлүктөрдү которуу жана окуучуларды көзөмөлдөө — ушул жерде.</span>
      </span>
      <span className="text-sm font-medium text-accent">Ачуу →</span>
    </Link>
  );
}
