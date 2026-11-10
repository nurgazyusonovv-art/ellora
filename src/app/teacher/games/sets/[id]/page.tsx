import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteGameSet } from "@/app/actions/game-sets";
import { GameSetEditor } from "@/components/game-set-editor";
import { PageTitle } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import type { GameQuestion } from "@/lib/game-questions";

export const metadata = { title: "Оюнду өзгөртүү" };

export default async function EditGameSet({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ai?: string }> }) {
  const { id } = await params;
  const { ai } = await searchParams;
  const { supabase, profile } = await requireRole("teacher");
  const { data: set } = await supabase.from("game_sets").select("id, title, questions").eq("id", id).eq("author_id", profile.id).maybeSingle<{ id: string; title: string; questions: GameQuestion[] }>();
  if (!set) notFound();
  return (
    <>
      <Link href="/teacher/games" className="text-sm font-medium text-muted hover:text-ink">← Оюндар</Link>
      <PageTitle eyebrow="Оюн түзүү" title={set.title} />
      <p className="max-w-[70ch] text-sm text-muted">
        Тест суроолору жандуу оюнда (проектордо) жана машыгууда ойнолот. Ар суроого 2–4 вариант жана туура жоопту белгилеңиз. Убакыт — жандуу оюнда суроого берилген мөөнөт.
      </p>
      {ai && (
        <p role="status" className="rounded-lg border border-amber/25 bg-amber-soft p-4 text-sm text-amber">
          <b className="font-medium">ЖИ долбоору даяр.</b> Ойнотуудан мурда ар бир суроонун туура жообун, коддун натыйжасын жана класска ылайыктуулугун текшериңиз. Өзгөртүп, «Сактоо» басыңыз.
        </p>
      )}
      <GameSetEditor id={set.id} initialTitle={set.title} initialQuestions={set.questions} />
      <form action={deleteGameSet.bind(null, set.id)} className="border-t border-line pt-4">
        <button className="min-h-11 rounded-md px-3 text-sm text-muted hover:bg-bad-soft hover:text-bad">Оюнду өчүрүү (жыйынтыктары да өчөт)</button>
      </form>
    </>
  );
}
