"use client";

import { useActionState, useEffect } from "react";
import { liveCommand, type LiveCommandState } from "@/app/actions/live-lesson";
import { useLive } from "@/components/live-sync";
import { Button, cx } from "@/components/ui";

/** Сакталганда такта жана окуучулар дароо жаңырсын (Realtime белгиси). */
function useBoardAction() {
  const [res, action, pending] = useActionState<LiveCommandState, FormData>(liveCommand, undefined);
  const { notify } = useLive();
  useEffect(() => {
    if (res?.success) notify("session");
  }, [res, notify]);
  return { res, action, pending };
}

/** Тапшырманын карточкасындагы «Тактага» жана «Туура жоопту ачуу». */
export function BoardButtons({ assignmentId, blockId, active, reveal, canReveal }: { assignmentId: string; blockId: string; active: boolean; reveal: boolean; canReveal: boolean }) {
  const { res, action, pending } = useBoardAction();
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <fieldset disabled={pending} className="contents">
        {active ? (
          <>
            <span className="rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-dark">Тактада</span>
            <input type="hidden" name="block" value="" />
            <Button name="command" value="spotlight" variant="ghost" className="text-xs">Тактадан алуу</Button>
            {canReveal && (
              <>
                <input type="hidden" name="on" value={String(!reveal)} />
                <Button name="command" value="reveal" variant="secondary" className="text-xs">{reveal ? "Туура жоопту жашыруу" : "Туура жоопту ачуу"}</Button>
              </>
            )}
          </>
        ) : (
          <>
            <input type="hidden" name="block" value={blockId} />
            <Button name="command" value="spotlight" variant="secondary" className="text-xs">Тактага</Button>
          </>
        )}
      </fieldset>
      {res?.error && <span role="alert" className="text-xs text-bad">{res.error}</span>}
    </form>
  );
}

/** Тактадагы ачык жоопту жашыруу же кайтаруу (мугалим гана көрөт, аты менен). */
export function HideAnswer({ assignmentId, attemptId, hidden }: { assignmentId: string; attemptId: string; hidden: boolean }) {
  const { action, pending } = useBoardAction();
  return (
    <form action={action}>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="attempt" value={attemptId} />
      <button
        name="command"
        value={hidden ? "unhide" : "hide"}
        disabled={pending}
        className={cx("min-h-11 shrink-0 rounded-md border px-2.5 text-xs font-medium lg:min-h-8", hidden ? "border-line-strong bg-surface text-ink hover:bg-surface-2" : "border-transparent text-muted hover:bg-bad-soft hover:text-bad")}
      >
        {hidden ? "Тактага кайтаруу" : "Жашыруу"}
      </button>
    </form>
  );
}
