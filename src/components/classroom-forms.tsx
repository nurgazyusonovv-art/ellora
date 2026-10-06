"use client";
import { useActionState, useState } from "react";
import { controlSession, reviewAnswer, type ClassroomState } from "@/app/actions/classroom";
import type { LiveSession, Review } from "@/lib/classroom";
import { stageMeta, type LessonContent } from "@/lib/lesson-types";
import { Button, FormError } from "@/components/ui";

export function SessionControls({ assignmentId, session, content }: { assignmentId: string; session: LiveSession | null; content: LessonContent }) {
  const [state, action, pending] = useActionState<ClassroomState, FormData>(controlSession, {});
  return <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
    <h2 className="font-semibold">Сабакты өткөрүү режими</h2>
    <p className="text-sm text-muted">Жандуу режимде мугалим ачкан бөлүктөр гана жеткиликтүү. Жоопторду талкуулоодо сабакты токтото аласыз.</p>
    <input type="hidden" name="assignmentId" value={assignmentId} />
    <div className="flex flex-wrap gap-3">
      <label className="flex flex-col gap-1 text-sm">Режим<select name="mode" defaultValue={session ? "live" : "independent"} className="min-h-11 rounded-xl border border-line p-2"><option value="independent">Өз алдынча өтүү</option><option value="live">Жандуу класс</option></select></label>
      <label className="flex flex-col gap-1 text-sm">Ачылган акыркы бөлүк<select name="maxStage" defaultValue={session?.max_stage ?? 0} className="min-h-11 rounded-xl border border-line p-2">{content.stages.map((s, i) => <option value={i} key={s.key}>{i+1}. {stageMeta(content, s.key).label}</option>)}</select></label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input name="paused" type="checkbox" value="true" defaultChecked={session?.paused} className="size-5 accent-accent" />Талкуу үчүн токтотуу</label>
      <Button disabled={pending}>{pending ? "Сакталууда…" : "Режимди сактоо"}</Button>
    </div><FormError message={state.error} />{state.success && <p role="status" className="text-sm text-accent">{state.success}</p>}
  </form>;
}

export function ReviewForm({ attemptId, blockId, rubric, review }: { attemptId: string; blockId: string; rubric: string[]; review?: Review }) {
  const [met, setMet] = useState(rubric.map((_, i) => review?.criteria_met[i] ?? false));
  const [state, action, pending] = useActionState<ClassroomState, FormData>(reviewAnswer, {});
  return <form action={action} className="flex flex-col gap-3">
    <input type="hidden" name="attemptId" value={attemptId} /><input type="hidden" name="blockId" value={blockId} /><input type="hidden" name="criteria" value={JSON.stringify(met)} />
    {rubric.map((r, i) => <label key={i} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={met[i]} className="size-5 shrink-0 accent-accent" onChange={e => setMet(met.map((v,j)=> j===i ? e.target.checked : v))} />{r}</label>)}
    <label className="flex flex-col gap-2 text-sm font-semibold">Окуучуга пикир<textarea name="feedback" defaultValue={review?.feedback} required maxLength={2000} rows={3} className="rounded-xl border border-line bg-bg p-3" /></label>
    <Button disabled={pending}>{pending ? "Сакталууда…" : "Баалоону сактоо"}</Button><FormError message={state.error} />{state.success && <p role="status" className="text-sm text-accent">{state.success}</p>}
  </form>;
}
