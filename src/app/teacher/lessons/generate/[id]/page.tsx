import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { Card, PageTitle } from "@/components/ui";
import { AutoRefresh } from "@/components/auto-refresh";
export default async function GenerationPage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;const {supabase,profile}=await requireRole("teacher");
 const {data:g}=await supabase.from("ai_lesson_generations").select("lesson_id,input,status,result,error,created_at").eq("id",id).eq("teacher_id",profile.id).maybeSingle();
 if(!g) notFound();
 const isGame=(g.input as {activityKind?:string})?.activityKind==="game";
 const topic=(g.input as {topic?:string})?.topic??"Сабак долбоору";
 return <><PageTitle eyebrow={isGame?"ЖИ менен оюн түзүү":"ЖИ менен сабак түзүү"} title={topic} /><Card className="flex flex-col gap-4">
  {g.status==="pending" && <><AutoRefresh /><p role="status">Сурам катталган. Даяр болгондо натыйжа ушул жерде көрүнөт. Эгер түзүү үзүлсө, жаңы сурамды жөнөтө аласыз.</p></>}
  {g.error && <p role="alert" className="text-bad">{g.error}</p>}
  {g.lesson_id && <Link className="flex min-h-11 items-center font-semibold text-accent" href={`/teacher/lessons/${g.lesson_id}/edit`}>{isGame?"Сакталган оюнду ачуу →":"Сакталган сабакты ачуу →"}</Link>}
  {g.result && <details><summary className="min-h-11 cursor-pointer font-semibold">Түзүлгөн текстти көрүү</summary><pre className="max-h-96 overflow-auto rounded-xl bg-surface-2 p-4 text-sm break-words whitespace-pre-wrap border border-line">{g.result}</pre></details>}
  <Link href={isGame?"/teacher/games":"/teacher/lessons/new"} className="flex min-h-11 items-center text-accent">{isGame?"Жаңы оюн түзүү →":"Жаңы сабак түзүү →"}</Link>
 </Card></>;
}
