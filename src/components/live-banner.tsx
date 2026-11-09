import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = { assignment_id: string; max_stage: number; paused: boolean; assignments: { delivery: string; lessons: { title: string } | null; classes: { name: string } | null } | null };

/**
 * Мугалимдин жүрүп жаткан (бүтө элек) «Класста өтөм» сабактары. RLS: мугалим өз класстарынын сессияларын гана көрөт.
 * 0018 иштетиле элек болсо же ката болсо — баннер көрсөтүлбөйт.
 */
export async function LiveBanner({ supabase }: { supabase: SupabaseClient }) {
  const { data, error } = await supabase
    .from("lesson_sessions")
    .select("assignment_id, max_stage, paused, assignments(delivery, lessons(title), classes(name))")
    .eq("ended", false)
    .limit(5)
    .returns<Row[]>();
  if (error) return null;
  const live = (data ?? []).filter((r) => r.assignments?.delivery === "class");
  if (!live.length) return null;
  return (
    <div className="flex flex-col gap-2 print:hidden" role="status">
      {live.map((r) => (
        <Link
          key={r.assignment_id}
          href={`/teacher/live/${r.assignment_id}`}
          className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-good/30 bg-good-soft px-4 py-2.5 text-sm transition-colors hover:border-good/60"
        >
          <span className="relative flex size-2.5 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-good opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-good" />
          </span>
          <span className="font-medium text-good">{r.paused ? "Тыныгуу" : "Жүрүп жаткан сабак"}</span>
          <span className="min-w-0 flex-1 truncate text-ink">
            {r.assignments?.lessons?.title} · {r.assignments?.classes?.name} · {r.max_stage + 1}/5-бөлүк
          </span>
          <span className="font-medium text-good">Ачуу →</span>
        </Link>
      ))}
    </div>
  );
}
