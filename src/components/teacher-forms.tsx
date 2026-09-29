"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { assignLesson, createClass, resetStudentPassword } from "@/app/actions/teacher";
import { Button, Field, FormError } from "@/components/ui";

export function CreateClassForm() {
  const [state, act, pending] = useActionState<FormState, FormData>(createClass, undefined);
  return (
    <form action={act} className="flex flex-wrap items-end gap-2.5">
      <div className="min-w-44 flex-1">
        <Field label="Жаңы класстын аты" name="name" placeholder="Мисалы: 8-Б" maxLength={20} required />
      </div>
      <Button disabled={pending}>Класс ачуу</Button>
      <div className="basis-full">
        <FormError message={state?.error} />
      </div>
    </form>
  );
}

export function AssignForm({ lessonId, classes }: { lessonId: string; classes: { id: string; name: string }[] }) {
  const [state, act, pending] = useActionState<FormState, FormData>(assignLesson, undefined);
  if (classes.length === 0)
    return <p className="text-sm text-muted">Адегенде «Класстар» бөлүмүнөн класс ачыңыз.</p>;
  return (
    <form action={act} className="flex flex-col gap-3.5">
      <input type="hidden" name="lesson_id" value={lessonId} />
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Класс
        <select name="class_id" className="rounded-[10px] border border-line bg-surface px-3 py-2.5 text-base font-normal" required>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <Field label="Мөөнөт (милдеттүү эмес)" name="due_at" type="date" />
      <FormError message={state?.error} />
      <Button disabled={pending}>{pending ? "Жөнөтүлүүдө…" : "Класска жөнөтүү"}</Button>
    </form>
  );
}

export function ResetPasswordForm({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const [state, act, pending] = useActionState<(FormState & { ok?: string }) | undefined, FormData>(
    resetStudentPassword,
    undefined,
  );
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-accent hover:underline">
        Сырсөздү жаңылоо
      </button>
    );
  return (
    <form action={act} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="student_id" value={studentId} />
      <input name="password" aria-label="Жаңы сырсөз" placeholder="Жаңы сырсөз" minLength={6} required className="w-36 rounded-lg border border-line px-2.5 py-1.5 text-sm" />
      <Button className="px-3 py-1.5 text-sm" disabled={pending}>Сактоо</Button>
      {state?.error && <span className="basis-full text-sm text-bad">{state.error}</span>}
      {state?.ok && <span className="basis-full text-sm text-good">{state.ok}</span>}
    </form>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* көчүрүү мүмкүн болбосо, текст экранда көрүнүп турат */
        }
      }}
    >
      {done ? "Көчүрүлдү" : label}
    </Button>
  );
}
