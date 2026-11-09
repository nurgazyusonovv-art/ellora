import Link from "next/link";
import {PracticalEvidence} from "@/components/practical-evidence";
import {practicalEvidence,practicalSnapshot} from "@/lib/practical-evidence";
import {defaultClassification} from "@/lib/classification";
import {defaultSheet} from "@/lib/sheet";
import {parsonsSeed,shufflePerm} from "@/lib/student-view";
import type {Block} from "@/lib/lesson-types";
export const metadata={title:"Практикалык иштин отчет үлгүсү"};
export default function EvidenceLab(){
 const c=defaultClassification("example-class"),m:Block={id:"example-match",type:"matching",prompt:"Түрүн дал келтир",pairs:[{left:"баяндама.txt",right:"Текст"},{left:"сүрөт.png",right:"Сүрөт"},{left:"эсеп.py",right:"Python программасы"}]},o:Block={id:"example-order",type:"ordering",prompt:"Иретте",steps:["Сан жана бааны киргиз","Чыгымды эсепте","Бюджет менен салыштыр"]},s=defaultSheet("example-sheet"),id="fictional-attempt";
 const perm=shufflePerm(c.items.length,parsonsSeed(c.id,id)),groups=perm.map(i=>c.items[i].category);groups[0]=(groups[0]+1)%c.categories.length;
 const examples=[{label:"Категорияларга бөлүштүрүү",block:c,response:{groups}},{label:"Дал келтирүү",block:m,response:{picks:[0,1,2]}},{label:"Кадамдардын ирети",block:o,response:{order:[0,1,2]}},{label:"Уячалар жана формулалар",block:s,response:{cells:{...s.initialCells,D2:"=320",D3:"=B3*C3",D4:"=SUM(D2:D3)"}}}];
 return <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6"><Link href="/lab/interactive" className="flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">← Машыгуулар</Link><h1 className="font-display text-2xl font-semibold tracking-tight">Мугалим практикалык ишти кандай көрөт?</h1><p className="text-muted">Бул ойдон чыгарылган жооптордун үлгүсү. Чыныгы окуучунун маалыматы жок; жооп же баа сакталбайт. Жеке окуучу отчетунда жана класстын талдоо панелинде ушундай деталдар көрсөтүлөт.</p>{examples.map((e,i)=>{const data=practicalEvidence(e.block,{attempt_id:id,response:{...e.response,task:practicalSnapshot(e.block,id)}})!;return <details key={e.block.id} open={i===0} className="min-w-0 rounded-2xl border border-line bg-surface p-4 sm:p-5"><summary className="min-h-11 cursor-pointer font-display text-lg font-semibold tracking-tight">{e.label}</summary><PracticalEvidence data={data}/></details>;})}</main>;
}
