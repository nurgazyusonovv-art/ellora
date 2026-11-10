import Link from "next/link";
import { ReviewQuiz } from "@/components/review-quiz";
import { requireRole } from "@/lib/auth";
import { reviewQuestions, reviewStatus, todayReview } from "@/lib/review-data";

export const metadata = { title: "Күнүмдүк кайталоо" };

export default async function DailyReview() {
  const { supabase, profile } = await requireRole("student");
  const row = await todayReview(supabase, profile.id);
  const [questions, status] = await Promise.all([row ? reviewQuestions(supabase, row) : Promise.resolve([]), reviewStatus(supabase, profile.id)]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6 sm:px-6">
      <Link href="/student" className="flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">← Башкы бет</Link>
      <header className="flex flex-col gap-1 border-b border-line pb-5">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Серия · {status?.streak ?? 0} күн</span>
        <h1 className="text-2xl font-medium">Күнүмдүк кайталоо</h1>
        <p className="text-sm text-muted">Мурунку сабактардан 3 суроо. Эстеп жооп берүү билимди эң жакшы бекемдейт. Ар суроого бир аракет.</p>
      </header>
      {questions.length ? (
        <ReviewQuiz questions={questions} streak={status?.streak ?? 0} />
      ) : (
        <p className="rounded-lg border border-dashed border-line-strong p-5 text-sm text-muted">
          Азырынча кайталай турган суроо жок. Сабактын Түшүндүрүү бөлүгүн бүткөндө, ал жердеги суроолор кийинки күндөрү кайталоого кошулат.
        </p>
      )}
    </main>
  );
}
