import Link from "next/link";
import type { SkillProgress } from "@/lib/skills";
const STATUS = {few:"Далил аз",practice:"Кайра машыгуу керек",evidence:"Аткаруу далили бар"};
const RESULT = {correct:"Биринчи аракетте туура",retry:"Кайра аракеттен кийин туура",incorrect:"Азырынча туура эмес",pending:"Мугалимдин текшерүүсү керек"};
export function SkillMap({skills,teacher=false}:{skills:SkillProgress[];teacher?:boolean}) {
  return <section className="flex flex-col gap-3" aria-label="Көндүмдөрдүн картасы">
    <h2 className="font-display text-xl font-semibold">Көндүмдөрдүн картасы</h2>
    <p className="text-sm text-muted">Бул баа эмес. Белгиленген тапшырмалардын акыркы үч далили көрсөтүлөт. Эки башка сабактагы биринчи аракетте туура жооп аткаруу далили болуп эсептелет. Жардам колдонулганын бул көрсөткүч аныктабайт.</p>
    <div className="grid gap-3 sm:grid-cols-2">{skills.map(s=><article key={s.id} className="min-w-0 rounded-2xl border border-line bg-surface p-4">
      <h3 className="font-semibold">{s.label}</h3><p className={`mt-2 text-sm font-semibold ${s.status==="practice"?"text-amber":s.status==="evidence"?"text-good":"text-muted"}`}>{STATUS[s.status]}</p>
      {!s.evidence.length?<p className="mt-2 text-sm text-muted">Азырынча жооп берилген, ушул көндүм белгиленген тапшырма жок.</p>:<details className="mt-2"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-accent">Далилдерди көрүү ({s.evidence.length})</summary><ul className="space-y-2">{s.evidence.slice(0,3).map(e=><li key={`${e.lessonId}:${e.blockId}`} className="text-sm"><Link className="flex min-h-11 flex-col justify-center break-words text-accent underline" href={teacher?`#answer-${e.assignmentId}-${e.blockId}`:`/student/assignments/${e.assignmentId}#block-${e.blockId}`}><span>{e.title}</span><span className="text-muted">{RESULT[e.result]}</span></Link></li>)}</ul></details>}
    </article>)}</div>
    <p className="text-sm text-muted">Кийинки кадам: машыгуу керек болгон көндүмдүн тапшырмасын мугалим менен карап, башка мисалда кайра сына. Ачык жооп автоматтык туура деп эсептелбейт.</p>
  </section>;
}
