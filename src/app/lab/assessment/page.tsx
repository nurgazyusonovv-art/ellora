import Link from "next/link";
import {GAMES,gameLesson} from "@/content/games";
import {LessonPlayer} from "@/components/player/lesson-player";
import {ShareCard} from "@/components/share-card";
import {quarterScore} from "@/lib/quarter-scoring";
export const metadata={title:"Оюн жана чейректик эсеп үлгүсү"};
export default async function AssessmentLab({searchParams}:{searchParams:Promise<{game?:string}>}){
 const {game}=await searchParams,g=GAMES.find(g=>g.slug===game)??GAMES[0];
 const result=quarterScore([{id:"daily",kind:"daily",title:"Күнүмдүк иш",state:"ready",percentage:80,points:4,total:5},{id:"quarter",kind:"quarterly",title:"Чейректик иш",state:"ready",percentage:90,points:9,total:10}]);
 return <main className="mx-auto flex max-w-4xl min-w-0 flex-col gap-6 p-4 pb-24"><h1 className="font-display text-2xl font-semibold tracking-tight">Оюн жана чейректик эсеп үлгүсү</h1><p className="text-muted">Бул ойдон чыгарылган маалыматтагы үлгү. Жооптор базага сакталбайт, ЖИге сурам жөнөтүлбөйт, чыныгы окуучуга баа коюлбайт.</p><section className="rounded-2xl border border-line bg-surface p-4"><h2 className="font-semibold">Чейректик эсеп кандай иштейт?</h2><p>Күнүмдүк иштер 80% × 60% + чейректик иш 90% × 40% = {result.percentage}%. Сунушталган баа: {result.grade}.</p><p className="mt-3 text-sm text-muted">Акыркы бааны мугалим бекитет. Жетишпеген же текшериле элек иш болсо эсеп күтөт. Монета жана оюн упайлары чейректик баага кирбейт.</p></section><nav aria-label="Оюн тандоо" className="flex flex-wrap gap-2">{GAMES.map(item=><Link key={item.slug} href={`/lab/assessment?game=${item.slug}`} aria-current={item.slug===g.slug?"page":undefined} className="flex min-h-11 items-center rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-accent">{item.title}</Link>)}</nav><LessonPlayer key={g.slug} title={g.title} content={gameLesson(g)} backHref="/lab/assessment"/><p className="text-sm text-muted">Төмөнкү QR-код — жасалма тапшырманын үлгүсү; чыныгы класска дайындалган тапшырманы ачпайт.</p><ShareCard assignmentId="00000000-0000-4000-8000-000000000001"/></main>;
}
