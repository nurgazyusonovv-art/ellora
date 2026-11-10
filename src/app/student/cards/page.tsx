import Link from "next/link";
import { KnowledgeCardView } from "@/components/knowledge-card";
import { requireRole } from "@/lib/auth";
import { bookEntries } from "@/lib/quest";
import { lessonsByIds } from "@/lib/student-lessons";

export const metadata = { title: "Билим китеби" };

export default async function KnowledgeBook() {
  const { supabase, profile } = await requireRole("student");
  // RLS: окуучу өз классынын дайындамаларын жана өз аракеттерин гана көрөт. Сабактын мазмуну — ошолор үчүн гана (admin).
  const [{ data: assignments }, { data: attempts }] = await Promise.all([
    supabase.from("assignments").select("id, lesson_id"),
    supabase.from("attempts").select("assignment_id, current_stage, finished_at, started_at").eq("student_id", profile.id),
  ]);
  const lessonOf = new Map((assignments ?? []).map((a) => [a.id as string, a.lesson_id as string]));
  const mine = (attempts ?? []).filter((t) => lessonOf.has(t.assignment_id as string));
  const lessons = await lessonsByIds([...new Set(mine.map((t) => lessonOf.get(t.assignment_id as string)!))]);
  const book = bookEntries(
    mine.flatMap((t) => {
      const id = lessonOf.get(t.assignment_id as string)!;
      const l = lessons.get(id);
      return l ? [{ lessonId: id, title: l.title, cards: l.content.cards, currentStage: t.current_stage as number, finished: !!t.finished_at, at: (t.finished_at ?? t.started_at ?? "") as string }] : [];
    }),
  );
  const total = book.reduce((s, e) => s + e.cards.length, 0);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <Link href="/student" className="flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">← Башкы бет</Link>
      <header className="flex flex-col gap-1 border-b border-line pb-5">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Чогулган карталар · {total}</span>
        <h1 className="text-2xl font-medium">Билим китеби</h1>
        <p className="text-sm text-muted">Ар сабактын «Ачылыш» бөлүгүн бүткөндө эреже жана мисал менен карта ачылат. Кайталоо үчүн ушул жерге кайт.</p>
      </header>
      {book.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong p-5 text-sm text-muted">Азырынча карта жок. Сабактын Түшүндүрүү бөлүгүн бүткөндө биринчи картаң ушул жерде пайда болот.</p>
      ) : (
        book.map((e) => (
          <section key={e.lessonId} className="flex flex-col gap-3">
            <h2 className="text-base font-medium">{e.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2">{e.cards.map((k) => <KnowledgeCardView key={k.id} card={k} />)}</div>
          </section>
        ))
      )}
    </main>
  );
}
