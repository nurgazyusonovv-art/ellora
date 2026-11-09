import { Card, PageTitle } from "@/components/ui";
import Link from "next/link";
import { AiLessonForm } from "@/components/ai-lesson-form";
import { NewLessonForm } from "@/components/teacher-forms";
import { requireRole } from "@/lib/auth";
import { getPickerPlans } from "@/lib/ktp";

export const maxDuration = 300;

export const metadata = { title: "Жаңы сабак" };

export default async function NewLessonPage() {
  const { supabase } = await requireRole("teacher");
  const plans = await getPickerPlans(supabase);
  const { data: generations, error: aiError } = await supabase.from("ai_lesson_generations").select("id,input,status,created_at").order("created_at", {ascending:false}).limit(5);
  return (
    <>
      <PageTitle eyebrow="Сабак конструктору" title="Жаңы сабак" />
      <div className="grid items-start gap-5 xl:grid-cols-2">
      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">ЖИ менен даярдоо</h2>
        <p className="text-muted">Тема боюнча максаттары, изилдөөсү, жуптук жана топтук тапшырмалары, баалоосу бар 5E долбоору түзүлөт.</p>
        {aiError && <p role="alert" className="text-sm text-amber">ЖИ менен түзүү үчүн база жаңыртуусу керек (0009).</p>}
        <AiLessonForm plans={plans} available={!aiError} />
        {!!generations?.length && <div className="flex flex-col gap-2 border-t border-line pt-4"><h3 className="font-semibold">Акыркы ЖИ долбоорлору</h3>{generations.map(g=><Link key={g.id} className="flex min-h-11 items-center justify-between gap-2 text-sm text-accent" href={`/teacher/lessons/generate/${g.id}`}><span>{(g.input as {topic?:string})?.topic ?? "Сабак"}</span><span>{g.status==="ready"?"Даяр":g.status==="failed"?"Ката":"Түзүлүүдө"}</span></Link>)}</div>}
      </Card>
      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Өзүм түзөм</h2>
        <p className="text-muted">
          Сабак Кызыктыруу, Изилдөө, Түшүндүрүү, Колдонуу жана Баалоо бөлүктөрүнөн турат. Класс жана КТП боюнча теманы тандаңыз, блокторду
          кийинки бетте кошосуз.
        </p>
        <NewLessonForm plans={plans} />
      </Card>
      </div>
    </>
  );
}
