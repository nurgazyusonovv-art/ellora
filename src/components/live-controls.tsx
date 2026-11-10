"use client";

import { useActionState, useEffect, useState } from "react";
import { useLive } from "@/components/live-sync";
import { liveCommand, type LiveCommandState } from "@/app/actions/live-lesson";
import { Icon } from "@/components/icons";
import { Button, cx, FormError } from "@/components/ui";
import type { LiveState } from "@/lib/classroom";

/** Мугалимдин башкаруу тилкеси: баштоо, бөлүктөр, тыныгуу, бүтүрүү. Телефондо ылдыйга жабышып турат. */
export function LiveControls({ assignmentId, state, stage, stages }: { assignmentId: string; state: LiveState; stage: number; stages: string[] }) {
  const [res, action, pending] = useActionState<LiveCommandState, FormData>(liveCommand, undefined);
  const [ending, setEnding] = useState(false);
  const { notify } = useLive();
  // Буйрук сакталганда окуучуларга дароо «жаңырт» белгиси (Postgres Changes да келет; бул тезирээк жана delete'ти камтыйт).
  useEffect(() => {
    if (res?.success) notify("session");
  }, [res, notify]);
  const [withBoard, setWithBoard] = useState(true);
  // Басуу учурунда ачылат — браузер калкып чыкма терезе катары бөгөттөбөйт. Бир эле аталыштагы өтмөк кайра колдонулат.
  const openBoard = () => {
    if (withBoard) window.open(`/board/${assignmentId}`, `ellora-board-${assignmentId}`);
  };
  const last = stage >= stages.length - 1;
  const running = state === "live" || state === "paused";

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="stage" value={stage} />

      <ol className="grid grid-cols-5 gap-1.5" aria-label="Сабактын бөлүктөрү">
        {stages.map((label, i) => {
          const current = running && i === stage;
          const passed = (running || state === "ended" || state === "homework") && i < stage;
          return (
            <li
              key={label}
              aria-current={current ? "step" : undefined}
              className={cx(
                "flex min-w-0 flex-col gap-0.5 rounded-md border px-2 py-1.5",
                current ? "border-accent bg-accent-soft ring-1 ring-accent/20" : passed ? "border-good/30 bg-good-soft" : "border-line bg-surface",
              )}
            >
              <span className="flex items-center gap-1 font-mono text-[11px] text-muted">
                {i + 1}/5 {passed && <Icon name="check" size={11} className="text-good" />}
              </span>
              <span className={cx("truncate text-xs font-medium sm:text-sm", current ? "text-accent-dark" : "text-ink")}>{label}</span>
            </li>
          );
        })}
      </ol>

      <fieldset disabled={pending} className="flex flex-wrap items-center gap-2">
        {state === "waiting" || state === "self" ? (
          <>
            <Button name="command" value="start" className="min-h-12 px-6 text-base" onClick={openBoard}>
              <Icon name="bolt" size={18} /> Сабакты баштоо
            </Button>
            <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={withBoard} onChange={(e) => setWithBoard(e.target.checked)} className="size-4 accent-accent" />
              Тактаны (чоң экранды) жаңы өтмөктө ачуу
            </label>
          </>
        ) : state === "homework" ? (
          <>
            <span className="text-sm text-muted">Сабак бүттү. Бүтүрө албагандар үйдө өз алдынча бүтүрүп жатат.</span>
            <Button name="command" value="close" variant="secondary">Сабакты жабуу</Button>
            <Button name="command" value="start" variant="ghost">Кайра баштоо</Button>
          </>
        ) : state === "ended" ? (
          <>
            <span className="text-sm text-muted">Сабак жабылды.</span>
            <Button type="button" variant="secondary" onClick={() => setEnding(true)}>Үйдө бүтүрүүгө ачуу</Button>
            <Button name="command" value="start" variant="ghost">Кайра баштоо</Button>
          </>
        ) : (
          <>
            {!last ? (
              <Button name="command" value="next" className="min-h-12 px-5 text-base">
                Кийинки бөлүк <Icon name="arrow" size={18} />
              </Button>
            ) : (
              <Button type="button" className="min-h-12 px-5 text-base" onClick={() => setEnding(true)}>
                Сабакты бүтүрүү
              </Button>
            )}
            {state === "paused" ? (
              <Button name="command" value="resume" variant="secondary">Улантуу</Button>
            ) : (
              <Button name="command" value="pause" variant="secondary">Тыныгуу</Button>
            )}
            <Button name="command" value="back" variant="ghost" disabled={stage === 0}>← Артка</Button>
            {!last && (
              <Button type="button" variant="ghost" onClick={() => setEnding(true)}>Бүтүрүү</Button>
            )}
          </>
        )}
      </fieldset>

      {ending && (state === "live" || state === "paused" || state === "ended") && (
        <div className="flex flex-col gap-3 rounded-md border border-line-strong bg-surface-2 p-3.5">
          <p className="text-sm font-medium">Сабакты кантип бүтүрөсүз?</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Үйдө бүтүрүү мөөнөтү (милдеттүү эмес)
              <input type="date" name="due_at" className="min-h-11 rounded-md border border-line-strong bg-surface px-2.5 text-sm shadow-xs lg:min-h-9" />
            </label>
            <Button name="command" value="homework" disabled={pending}>Бүтүрө албагандар үйдө бүтүрсүн</Button>
            {state !== "ended" && (
              <Button name="command" value="close" variant="secondary" disabled={pending}>Сабакты жабуу</Button>
            )}
            <Button type="button" variant="ghost" onClick={() => setEnding(false)}>Жокко чыгаруу</Button>
          </div>
          <p className="text-xs text-muted">
            «Үйдө бүтүрсүн» — сабак өз алдынча режимге өтөт, окуучулар калган бөлүктөрдү өздөрү бүтүрөт. «Жабуу» — жооп кабыл алынбайт.
          </p>
        </div>
      )}

      <FormError message={res?.error} />
      {res?.success && <p role="status" className="text-sm text-good">{res.success}</p>}
    </form>
  );
}
