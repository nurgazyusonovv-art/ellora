import Link from "next/link";
import { KtpEditor } from "@/components/ktp-editor";
import { cx, PageTitle } from "@/components/ui";
import { KTP_TEMPLATES } from "@/content/ktp";
import { requireRole } from "@/lib/auth";
import { getTeacherPlans } from "@/lib/ktp";

export const metadata = { title: "КТП" };

/** Информатика 5-класстан окутулат. Мугалим башка класска план түзсө, ал да көрүнөт. */
const BASE_GRADES = [5, 6, 7, 8, 9, 10, 11];

export default async function KtpPage({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const { supabase } = await requireRole("teacher");
  const [{ grade: g }, plans] = await Promise.all([searchParams, getTeacherPlans(supabase)]);

  const own = new Set(plans.map((p) => p.grade));
  const grades = [...new Set([...BASE_GRADES, ...own])].sort((a, b) => a - b);
  const asked = Number(g);
  const grade = grades.includes(asked) ? asked : (plans[0]?.grade ?? 7);
  const plan = plans.find((p) => p.grade === grade);
  const tpl = KTP_TEMPLATES[grade];
  const shown = plan ?? tpl;

  return (
    <>
      <PageTitle eyebrow="Календардык-тематикалык план" title="КТП" />
      <p className="-mt-3 max-w-2xl text-muted">
        Классты тандаңыз. Сабак түзгөндө тема ушул пландан тандалат. Темаларды кошуп, өзгөртүп же өчүрсөңүз болот — өзү сакталат.
      </p>

      <nav aria-label="Класстар" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {grades.map((t) => (
          <Link
            key={t}
            href={`/teacher/ktp?grade=${t}`}
            aria-current={t === grade ? "page" : undefined}
            className={cx(
              "flex min-h-11 shrink-0 flex-col justify-center rounded-[10px] border px-4 py-1.5 text-[15px] font-semibold",
              t === grade ? "border-2 border-accent bg-accent-soft" : "border-line bg-surface hover:bg-surface-2",
            )}
          >
            {t}-класс
            <span className="text-xs font-normal text-muted">{own.has(t) ? "өз планым" : KTP_TEMPLATES[t] ? "расмий үлгү" : "бош"}</span>
          </Link>
        ))}
      </nav>

      <KtpEditor
        key={`${grade}-${plan ? "own" : "tpl"}`}
        grade={grade}
        hasOwn={!!plan}
        hasTemplate={!!tpl}
        source={shown?.source}
        initialYear={shown?.year ?? ""}
        initialSections={shown?.sections ?? [{ title: "", hours: 0, topics: [{ title: "" }] }]}
      />
    </>
  );
}
