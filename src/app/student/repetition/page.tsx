import { AutoRefresh } from "@/components/auto-refresh";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import type { RepeatTask } from "@/lib/repetition";
import { RepeatTaskCard } from "@/components/repetition-forms";
export const metadata={title:"Аралык менен кайталоо"};
export default async function RepetitionPage(){
 const {supabase}=await requireRole("student");const {data,error}=await supabase.rpc("spaced_review_tasks");const tasks=(Array.isArray(data)?data:[]) as RepeatTask[];
 const order={due:0,scheduled:1,waiting:2,done:3};tasks.sort((a,b)=>order[a.status]-order[b.status]||(a.dueAt??"").localeCompare(b.dueAt??""));
 return <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6"><Link href="/student" className="flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">← Менин сабактарым</Link>{tasks.some(t=>t.status==="scheduled")&&<AutoRefresh seconds={60}/>}<h1 className="font-display text-2xl font-semibold tracking-tight">Аралык менен кайталоо</h1><p className="text-muted">Алгач сабакты карабай эстеп жооп бер. Мугалим бекиткен кайталоолор сабакты бүткөндөн кийин ачылат. Кеч тапшырсаң, кийинки кайталоого чейин да аралык сакталат. Бул машыгуу баага, XP же монетага кошулбайт.</p>{error?<p role="alert">Кайталоолор ачылган жок. Байланышты жана база жаңыртылганын текшериңиз.</p>:!tasks.length?<p className="rounded-xl bg-surface p-4">Азырынча бүткөн сабактарыңа бекитилген кайталоо жок.</p>:<>{tasks.length===150&&<p className="text-sm text-muted">Акыркы 50 пландын кайталоолору көрсөтүлдү.</p>}{tasks.map(t=><RepeatTaskCard key={`${t.planId}:${t.attemptId}:${t.round}`} task={t}/>)}</>}</main>;
}
