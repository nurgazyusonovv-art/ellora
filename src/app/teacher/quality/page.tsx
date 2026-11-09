import Link from "next/link";
import {notFound} from "next/navigation";
import {requireRole} from "@/lib/auth";
import {Card,PageTitle,Button} from "@/components/ui";
import {learningQuality,type QualityAttempt} from "@/lib/learning-quality";
import {qualityEvidence} from "@/lib/quality-evidence";
import type {LessonContent} from "@/lib/lesson-types";
import type {InsightAnswer,InsightReview} from "@/lib/class-insights";
import type {Revision} from "@/lib/revisions";
import {qualityRows} from "@/lib/quality-data";
const pct=(n:number|null)=>n===null?"Маалымат жок":`${n.toFixed(1)}%`;
export const maxDuration=120;
export const metadata={title:"Билим сапаты"};
export default async function QualityPage({searchParams}:{searchParams:Promise<{classId?:string;threshold?:string}>}) {
 const params=await searchParams;const {supabase,profile}=await requireRole("teacher");
 let classes:{id:string;name:string}[];
 try{classes=await qualityRows(supabase.from("classes").select("id,name",{count:"exact"}).eq("teacher_id",profile.id).order("id").returns<{id:string;name:string}[]>());classes.sort((a,b)=>a.name.localeCompare(b.name,"ky"));}
 catch{return <Card>Класстар жүктөлгөн жок. Кайра аракет кылыңыз.</Card>;}
 const selected=classes?.find(c=>c.id===params.classId);if(params.classId&&!selected)notFound();
 const raw=Number(params.threshold??70);const threshold=Number.isInteger(raw)&&raw>=1&&raw<=100?raw:70;
 let result:ReturnType<typeof learningQuality>|null=null;let names=new Map<string,string>();let failed=false;let evidence:ReturnType<typeof qualityEvidence>=new Map();
 if(selected)try {
  const [members,assignments]=await Promise.all([
   qualityRows(supabase.from("class_members").select("student_id,profiles(full_name)",{count:"exact"}).eq("class_id",selected.id).order("student_id").returns<{student_id:string;profiles:{full_name:string}|null}[]>()),
   qualityRows(supabase.from("assignments").select("id,lessons(title,content)",{count:"exact"}).eq("class_id",selected.id).order("id").returns<{id:string;lessons:{title:string;content:LessonContent}|null}[]>())
  ]);
  names=new Map(members.map(m=>[m.student_id,m.profiles?.full_name??"Аты көрсөтүлгөн эмес"]));
  const attempts:(QualityAttempt & {current_stage:number})[]=[];
  for(let i=0;i<assignments.length;i+=100)attempts.push(...await qualityRows(supabase.from("attempts").select("id,assignment_id,student_id,finished_at,exit_score,exit_total,current_stage",{count:"exact"}).in("assignment_id",assignments.slice(i,i+100).map(a=>a.id)).order("id").returns<(QualityAttempt & {current_stage:number})[]>()));
  const answers:InsightAnswer[]=[],reviews:InsightReview[]=[],revisions:Revision[]=[];
  for(let i=0;i<attempts.length;i+=100){const ids=attempts.slice(i,i+100).map(t=>t.id);const [a,r,v]=await Promise.all([
   qualityRows(supabase.from("answers").select("attempt_id,block_id,response,is_correct,tries",{count:"exact"}).in("attempt_id",ids).order("attempt_id").order("block_id").returns<InsightAnswer[]>()),
   qualityRows(supabase.from("answer_reviews").select("attempt_id,block_id,criteria_met",{count:"exact"}).in("attempt_id",ids).order("attempt_id").order("block_id").returns<InsightReview[]>()),
   qualityRows(supabase.from("answer_revisions").select("*",{count:"exact"}).in("attempt_id",ids).order("id").returns<Revision[]>())
  ]);answers.push(...a);reviews.push(...r);revisions.push(...v);}
  evidence=qualityEvidence({members,assignments,attempts,answers,reviews,revisions});
  result=learningQuality(members.map(m=>m.student_id),assignments.map(a=>a.id),attempts,threshold);
 }catch{failed=true;}
 return <><PageTitle eyebrow="Мугалимдин панели" title="Билим сапаты"/><Card className="flex flex-col gap-4"><form className="flex flex-wrap items-end gap-3"><label className="flex min-w-0 flex-col gap-2">Класс<select name="classId" defaultValue={selected?.id??""} className="shadow-xs min-h-11 rounded-xl border border-line-strong bg-surface px-3"><option value="">Классты тандаңыз</option>{classes?.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="flex flex-col gap-2">Тест үчүн чек (%)<input name="threshold" type="number" min={1} max={100} defaultValue={threshold} className="shadow-xs min-h-11 w-28 rounded-xl border border-line-strong bg-surface px-3"/></label><Button>Көрсөтүү</Button></form><p className="text-sm text-muted">Көрсөткүчтөр класска жөнөтүлгөн бардык сабактар жана учурдагы окуучулар боюнча эсептелет. Маалымат барак ачылганда жаңыланат. Бул расмий чейректик баа эмес. 70% — тест үчүн өзгөртүлүүчү демейки чек, теманы өздөштүрүүнүн универсалдуу чеги эмес.</p></Card>
 {!selected && <div className="mt-4 grid gap-3 sm:grid-cols-2">{classes?.map(c=><Link key={c.id} className="min-h-11 rounded-xl border border-line bg-surface p-4 font-semibold text-accent" href={`/teacher/quality?classId=${c.id}`}>{c.name} · Билим сапатын көрүү →</Link>)}</div>}
 {failed&&<Card><p role="alert">Маалымат толук жүктөлгөн жок. Кайра аракет кылыңыз; толук эмес маалыматтан пайыз эсептелбейт.</p></Card>}
 {result&&<><Card className="mt-4"><h2 className="text-xl font-semibold">Түшүнүүнүн далилдери</h2><div className="mt-3 grid gap-3 sm:grid-cols-3">{[["Аткарылган далил",[...evidence.values()].reduce((s,r)=>s+r.met,0)],["Кайра аракет же жардам",[...evidence.values()].reduce((s,r)=>s+r.help,0)],["Текшерүүнү күтөт",[...evidence.values()].reduce((s,r)=>s+r.pending,0)]].map(([label,value])=><div key={label}><p className="text-sm text-muted">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}</div><p className="mt-3 text-sm text-muted">Тесттер, код/практика жана критерийи бар жеке түшүндүрмөлөр каралат. Оңдолгон жооптун акыркы абалы баштапкы баалоодон артыкчылык алат. Текшерилбеген жооп ката деп эсептелбейт. Бир туура жооп теманы толук өздөштүргөнүн далилдебейт; жардам менен же өз алдынча аткарганы автоматтык аныкталбайт.</p></Card><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Орточо тест натыйжасы",pct(result.mean)],[`${threshold}% чегине жеткендер`,pct(result.quality)],["Тест далили бар окуучулар",`${result.assessed}/${result.students}`],["Сабактарды бүтүрүү",pct(result.completion)]].map(([label,value])=><Card key={label}><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>)}</div><Card className="mt-4"><p className="text-sm text-muted">Орточо натыйжа — ар окуучунун бүткөн сабактарындагы акыркы тест пайыздарынын орточосу, андан окуучулар боюнча орточо алынат. Чекке жеткендер: {result.meets}/{result.assessed} бааланган окуучу. Камтуу: {pct(result.coverage)}. Тести жок окуучу нөл упай алган деп эсептелбейт; камтууну кошо караңыз. Монета жана тажрыйба упайлары эсепке кирбейт.</p></Card>
 <section className="mt-5 flex flex-col gap-3"><h2 className="text-xl font-semibold">Ар бир окуучунун натыйжасы</h2>{result.rows.sort((a,b)=>(names.get(a.id)??"").localeCompare(names.get(b.id)??"","ky")).map(row=><Card key={row.id} className="flex flex-col gap-3"><Link className="flex min-h-11 items-center font-semibold text-accent" href={`/teacher/students/${row.id}`}>{names.get(row.id)} → Жеке отчет</Link><dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Орточо тест",pct(row.mean)],["Бааланган сабак",`${row.assessed}`],["Бүткөн сабак",`${row.completed}/${row.assigned}`],["Чек боюнча абал",row.meets===null?"Далил жок":row.meets?"Чекке жетти":"Кошумча жардам керек"]].map(([label,value])=><div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>{evidence.get(row.id)?.items.length ? <details><summary className="min-h-11 cursor-pointer py-3 font-semibold text-accent">Жооптор жана түшүнүүнүн далилдери: {evidence.get(row.id)!.met} аткарылган · {evidence.get(row.id)!.help} кайра аракет/жардам · {evidence.get(row.id)!.pending} текшерүүдө</summary><ul className="flex flex-col gap-3">{evidence.get(row.id)!.items.map(item=><li key={`${item.assignmentId}:${item.blockId}`} className="rounded-xl bg-surface-2 p-3 border border-line"><p className="text-xs text-muted">{item.title}</p><p className="mt-1 break-words">{item.prompt}</p><p className="mt-2 text-sm font-semibold">{{correct:"Аткарылган далил",retry:"Кайра аракетте аткарды",incorrect:"Кошумча машыгуу керек",review:"Мугалим текшере элек",revision:"Оңдоо суралган",submitted:"Оңдолгон жооп текшерүүнү күтөт"}[item.state]}</p><Link className="flex min-h-11 items-center text-sm text-accent" href={`/teacher/assignments/${item.assignmentId}#insight-${item.blockId}`}>Жоопту жана критерийлерди караңыз →</Link></li>)}</ul></details>:<p className="text-sm text-muted">Баалана турган жооптор азырынча жок.</p>}</Card>)}{!result.rows.length&&<p>Класска окуучулар кошула элек.</p>}</section></>}
 </>;
}
