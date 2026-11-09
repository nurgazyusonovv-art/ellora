"use client";

import { useActionState } from "react";
import { assignGameSet, deleteGameAssignment, type AssignGameState } from "@/app/actions/game-sets";
import { Button, FormError } from "./ui";

const selectCls = "min-h-11 w-full min-w-0 rounded-md border border-line-strong bg-surface px-2.5 text-sm shadow-xs lg:min-h-9";

export function GameAssignForm({ slug, classes }: { slug: string; classes: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<AssignGameState, FormData>(assignGameSet, undefined);
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="slug" value={slug} />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">
          Класс
          <select name="class_id" required className={selectCls} defaultValue={classes[0]?.id}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-muted">
          Мөөнөт (милдеттүү эмес)
          <input type="date" name="due_at" className={selectCls} />
        </label>
      </div>
      <Button disabled={pending} className="self-start">{pending ? "Жөнөтүлүүдө…" : "Класска жөнөтүү"}</Button>
      <FormError message={state?.error} />
      {state?.ok && <p role="status" className="text-sm text-good">{state.ok}</p>}
    </form>
  );
}

export function DeleteGameAssignment({ id }: { id: string }) {
  return (
    <form
      action={deleteGameAssignment.bind(null, id)}
      onSubmit={(e) => {
        if (!confirm("Бул оюнду класстан алып саласызбы? Окуучулардын жыйынтыгы да өчөт.")) e.preventDefault();
      }}
    >
      <button className="min-h-11 rounded-md px-2.5 text-sm text-muted hover:bg-bad-soft hover:text-bad lg:min-h-9">Алып салуу</button>
    </form>
  );
}
