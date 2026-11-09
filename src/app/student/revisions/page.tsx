import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { REVISION_COLUMNS, type Revision } from "@/lib/revisions";
import { RevisionCard } from "@/components/revision-forms";
export const metadata={title:"Кайра иштөө"};
export default async function RevisionsPage(){
 const {supabase}=await requireRole("student");
 const {data,error}=await supabase.from("answer_revisions").select(REVISION_COLUMNS).order("created_at",{ascending:false}).limit(100).returns<Revision[]>();
 return <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6"><Link href="/student" className="flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">← Менин сабактарым</Link><h1 className="font-display text-2xl font-semibold tracking-tight">Пикирден кийин кайра иштөө</h1><p className="text-muted">Мугалимдин пикирин окуп, жообуңду жакшырт. Биринчи жооп жана ар бир оңдоо сакталат. Кайра иштөө XP, монета же тапшырылган тесттин упайын өзгөртпөйт.</p>
 {error?<p role="alert">Кайра иштөө тарыхы ачылган жок. Байланышты жана база жаңыртылганын текшериңиз.</p>:!data?.length?<p className="rounded-xl bg-surface p-4">Мугалим азырынча кайра иштөөгө тапшырма берген жок.</p>:<>{data.length===100&&<p className="text-sm text-muted">Акыркы 100 аракет көрсөтүлдү.</p>}{data.map(r=><section key={r.id} className="flex flex-col gap-2"><h2 className="font-semibold text-muted">{r.lesson_title}</h2><RevisionCard revision={r}/></section>)}</>}
 </main>;
}
