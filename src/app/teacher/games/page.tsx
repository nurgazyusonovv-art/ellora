import {GameAiForm} from "@/components/game-ai-form";
import Link from "next/link";
import {requireRole} from "@/lib/auth";
import {GAMES} from "@/content/games";
import {GameCopyForm} from "@/components/game-copy-form";
import {Card,PageTitle} from "@/components/ui";
import {SKILLS} from "@/lib/skills";
import type {LessonContent} from "@/lib/lesson-types";
export const metadata={title:"Интерактивдүү оюндар"};
export default async function GamesPage(){const {supabase,profile}=await requireRole("teacher");const {data,error}=await supabase.from("lessons").select("id,title,content").eq("author_id",profile.id).order("created_at",{ascending:false}).returns<{id:string;title:string;content:LessonContent}[]>();return <><PageTitle title="Интерактивдүү оюндар"/><p className="text-muted">Оюнду көчүрүп, каалаган классыңызга жөнөтүңүз. Класста жалпы таймер/жандуу режим менен уюштуруп, шилтеме же QR-код аркылуу ача аласыз. Мазмунун конструктордон өзүңүзгө ылайыктаңыз. Оюндар чейректик баага кошулбайт.</p><Card><h2 className="mb-4 font-display text-xl font-semibold">ЖИ менен жаңы оюн түзүү</h2><GameAiForm/></Card><section className="grid gap-4 sm:grid-cols-2">{GAMES.map(g=><Card key={g.slug} className="flex flex-col gap-3"><h2 className="font-display text-xl font-semibold">{g.title}</h2><p>{g.description}</p><p className="text-xs text-muted">{g.skills.map(s=>SKILLS[s]).join(" · ")}</p><GameCopyForm slug={g.slug}/></Card>)}</section><section className="flex flex-col gap-3"><h2 className="font-display text-xl font-semibold">Менин оюндарым</h2>{error&&<p role="alert">Оюндар жүктөлгөн жок.</p>}{data?.filter(g=>g.content.activityKind==="game").map(g=><Link key={g.id} href={`/teacher/lessons/${g.id}`} className="flex min-h-14 items-center rounded-xl border border-line bg-surface p-3 font-semibold text-accent">{g.title} →</Link>)}</section></>;}
