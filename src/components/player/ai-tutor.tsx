"use client";
import { useActionState } from "react";
import { askTutor, type TutorState } from "@/app/actions/ai";
import { Button, FormError } from "@/components/ui";

export function AiTutor({ attemptId, blockId }: { attemptId: string; blockId: string }) {
  const [state, action, pending] = useActionState<TutorState, FormData>(askTutor, {});
  return <details className="rounded-xl border border-line p-3">
    <summary className="min-h-11 cursor-pointer font-semibold text-accent">AI менен ойлонуп көр</summary>
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm text-muted">Жардамчы даяр жооптун ордуна багыттоочу суроо берет. Жообун текшерип, өзүң ойлон. Бул жерге жазган текстиң OpenAI кызматына жөнөтүлөт; жеке маалымат жазба.</p>
      <input type="hidden" name="attemptId" value={attemptId} /><input type="hidden" name="blockId" value={blockId} />
      <label className="flex flex-col gap-2 text-sm font-semibold">Азыр кандай ойлоп жатасың?<textarea name="thought" required minLength={2} maxLength={1000} rows={3} className="rounded-xl border border-line bg-bg p-3" /></label>
      <Button disabled={pending}>{pending ? "Ойлонуп жатат…" : "Багыттоочу суроо алуу"}</Button>
      <FormError message={state.error} />
      {state.question && <p role="status" className="rounded-xl bg-accent-soft p-4">{state.question}</p>}
    </form>
  </details>;
}
