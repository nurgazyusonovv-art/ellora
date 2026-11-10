"use client";

import { useActionState } from "react";
import { assignGameSet, deleteGameAssignment, type AssignGameState } from "@/app/actions/game-sets";
import { startLiveGame, type StartLiveState } from "@/app/actions/live-games";
import { Icon } from "./icons";
import { Button, FormError } from "./ui";

const selectCls = "min-h-11 w-full min-w-0 rounded-md border border-line-strong bg-surface px-2.5 text-sm shadow-xs lg:min-h-9";

export function GameAssignForm({ slug, setId, classes }: { slug?: string; setId?: string; classes: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<AssignGameState, FormData>(assignGameSet, undefined);
  return (
    <form action={action} className="flex flex-col gap-2.5">
      {slug && <input type="hidden" name="slug" value={slug} />}
      {setId && <input type="hidden" name="set_id" value={setId} />}
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

/** Жандуу оюнду баштоо: класс жана ылдамдык бонусу. Мугалим проектор экранына өтөт. */
export function LiveStartForm({ slug, setId, classes }: { slug?: string; setId?: string; classes: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<StartLiveState, FormData>(startLiveGame, undefined);
  return (
    <form action={action} className="flex flex-col gap-2.5">
      {slug && <input type="hidden" name="slug" value={slug} />}
      {setId && <input type="hidden" name="set_id" value={setId} />}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted">
          Класс
          <select name="class_id" required className={selectCls} defaultValue={classes[0]?.id}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <Button disabled={pending}>
          <Icon name="bolt" size={16} /> {pending ? "Ачылууда…" : "Жандуу ойнотуу"}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" name="speed_bonus" value="true" defaultChecked className="size-4 accent-accent" />
        Ылдамдык үчүн кошумча упай
      </label>
      <FormError message={state?.error} />
    </form>
  );
}
