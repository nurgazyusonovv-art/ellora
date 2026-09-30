"use client";

import { useActionState, useState } from "react";
import { adminResetStudentPassword } from "@/app/actions/admin";
import type { FormState } from "@/app/actions/auth";
import { Button } from "@/components/ui";

export function AdminResetPasswordForm({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const [state, act, pending] = useActionState<(FormState & { ok?: string }) | undefined, FormData>(adminResetStudentPassword, undefined);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 text-sm font-semibold text-accent hover:underline">
        Сырсөздү жаңылоо
      </button>
    );
  return (
    <form action={act} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="student_id" value={studentId} />
      <input
        name="password"
        aria-label="Жаңы сырсөз"
        placeholder="Жаңы сырсөз"
        minLength={6}
        required
        className="min-h-11 w-36 rounded-[10px] border border-line px-3 text-sm"
      />
      <Button className="min-h-11 px-3 text-sm" disabled={pending}>
        Сактоо
      </Button>
      {state?.error && <span className="basis-full text-sm text-bad">{state.error}</span>}
      {state?.ok && <span className="basis-full text-sm text-good">{state.ok}</span>}
    </form>
  );
}
