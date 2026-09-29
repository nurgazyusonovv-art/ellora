"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { assignLesson, createClass, createLesson, resetStudentPassword } from "@/app/actions/teacher";
import { Button, Field, FormError } from "@/components/ui";
import { TopicPicker } from "@/components/topic-picker";
import type { Ktp } from "@/content/ktp";
import { DEFAULT_DURATION, DURATION_OPTIONS } from "@/lib/lesson-edit";

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

export function NewLessonForm({ plans }: { plans: Record<number, Ktp> }) {
  const [state, act, pending] = useActionState<FormState, FormData>(createLesson, undefined);
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState<number | null>(7);
  const [topic, setTopic] = useState("");
  // Мугалим атты өзү жазбаса — КТП'ден тандалган тема сабактын аты болот.
  const [autoTitle, setAutoTitle] = useState(true);
  return (
    <form action={act} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[110px_150px]">
        <Field
          label="Класс"
          name="grade"
          type="number"
          min={1}
          max={11}
          inputMode="numeric"
          value={grade ?? ""}
          onChange={(e) => setGrade(e.target.value ? Number(e.target.value) : null)}
        />
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Узактыгы
          <select
            name="duration"
            defaultValue={DEFAULT_DURATION}
            className="rounded-[10px] border border-line bg-surface px-3 py-2.5 text-base font-normal"
          >
            {DURATION_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} мүнөт
              </option>
            ))}
          </select>
        </label>
      </div>
      <TopicPicker
        plans={plans}
        grade={grade}
        value={topic}
        name="topic"
        onChange={(t) => {
          setTopic(t);
          if (autoTitle) setTitle(t);
        }}
      />
      <Field
        label="Сабактын аты"
        name="title"
        placeholder="Мисалы: Python: for цикли"
        maxLength={120}
        required
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setAutoTitle(e.target.value === "");
        }}
      />
      <FormError message={state?.error} />
      <Button disabled={pending} className="self-start">
        {pending ? "Түзүлүүдө…" : "Сабакты түзүү"}
      </Button>
    </form>
  );
}
