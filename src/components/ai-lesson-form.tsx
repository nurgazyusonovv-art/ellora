"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { Ktp } from "@/content/ktp";
import { generateLesson, type LessonAiState } from "@/app/actions/lesson-ai";
import { GRADES } from "@/lib/grades";
import { DURATION_OPTIONS } from "@/lib/lesson-edit";
import { TopicPicker } from "@/components/topic-picker";
import { Button, FormError } from "@/components/ui";
const cls="min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-base font-normal";
export function AiLessonForm({plans,available}:{plans:Record<number,Ktp>;available:boolean}) {
 const [state,action,pending]=useActionState<LessonAiState,FormData>(generateLesson,{});
 const [grade,setGrade]=useState<number|null>(7);const [topic,setTopic]=useState("");
 const [sessionId,setSessionId]=useState("");
 const sessions=plans[grade??7]?.sections.flatMap(s=>s.topics).find(t=>t.title===topic)?.sessions ?? [];
 return <form action={action} className="flex flex-col gap-5">
  <fieldset disabled={pending||!available} className="flex min-w-0 flex-col gap-4">
   <div className="grid grid-cols-2 gap-3"><label className="flex flex-col gap-1.5 text-sm font-semibold">Класс<select className={cls} name="grade" value={grade??7} onChange={e=>{setGrade(Number(e.target.value));setSessionId("");setTopic("");}}>{GRADES.map(g=><option key={g} value={g}>{g}-класс</option>)}</select></label><label className="flex flex-col gap-1.5 text-sm font-semibold">Убакыт<select className={cls} name="duration" defaultValue={45}>{DURATION_OPTIONS.map(m=><option key={m} value={m}>{m} мүнөт</option>)}</select></label></div>
   <TopicPicker plans={plans} grade={grade} name="topic" value={topic} onChange={value=>{setTopic(value);setSessionId("");}} />
   <p className="text-sm text-muted">КТПден тема тандаңыз же теманы өзүңүз жазыңыз (3–200 белги).</p>
   {!!sessions.length && <div className="flex flex-col gap-2 rounded-xl bg-accent-soft p-4 border border-accent/20"><label className="flex flex-col gap-1.5 text-sm font-semibold">Сериядагы сабак<select name="sessionId" className={cls} value={sessionId} onChange={e=>setSessionId(e.target.value)}><option value="">Өзүнчө сабак түзүү</option>{sessions.map((s,i)=><option key={s.id} value={s.id}>{i+1}/{sessions.length}: {s.title || "Аталышы толтурула элек"}</option>)}</select></label>{sessionId && <p className="text-sm text-muted">Бул сабактын жаңы максаты: {sessions.find(s=>s.id===sessionId)?.objective}. Мурунку жана кийинки сабактардын планы да ЖИге берилет. Бул орунга мурда долбоор түзүлсө, жаңы сурамдын ордуна анын шилтемеси көрсөтүлөт.</p>}</div>}
   <label className="flex flex-col gap-1.5 text-sm font-semibold">Окуучулар жөнүндө жана сабакка каалооңуз<textarea className={cls} name="context" rows={3} maxLength={2000} placeholder="Мисалы: Python’ду жаңы баштадык. Бир компьютерге эки окуучу. Турмуштук мисалдар керек." /></label>
   <p className="rounded-xl bg-accent-soft p-4 text-sm font-semibold border border-accent/20">Ар бир сабактын Түшүндүрүү бөлүгүнө так 5 слайддык презентация автоматтык кошулат: кыска текст, иконка жана схема же ЖИ иллюстрациясы.</p>
   <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input name="interactive" type="checkbox" value="true" defaultChecked className="size-5 accent-accent"/>Колдонууга дал келтирүү, Баалоого кадамдарды иреттөө тапшырмасын кошуу</label>
   <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input name="mission" type="checkbox" value="true" className="size-5 accent-accent"/>Колдонууну окуясы бар миссия кылуу: машыгуу → жаңы жеке иш (интерактив кошулат)</label>
   <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input name="spreadsheet" type="checkbox" value="true" className="size-5 accent-accent"/>Колдонууга формула жазылчу электрондук таблица кошуу (6 × 4 уяча)</label>
   <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input name="classification" type="checkbox" value="true" className="size-5 accent-accent"/>Колдонууга объекттерди категорияларга бөлүштүрүү тапшырмасын кошуу</label>
   <fieldset className="flex min-w-0 flex-col gap-3 rounded-xl bg-accent-soft p-4 border border-accent/20"><legend className="px-1 font-semibold">Бирге аткарылчу тапшырмалар</legend><label className="flex min-h-11 items-center gap-3"><input name="pairs" type="checkbox" value="true" defaultChecked className="size-5 accent-accent" />Жуптук тапшырма кошуу</label><label className="flex min-h-11 items-center gap-3"><input name="groups" type="checkbox" value="true" defaultChecked className="size-5 accent-accent" />Топтук тапшырма кошуу</label><label className="flex flex-col gap-1.5 text-sm font-semibold">Топтогу окуучулардын саны<select name="groupSize" defaultValue={4} className={cls}>{[3,4,5,6].map(n=><option key={n} value={n}>{n} окуучу</option>)}</select></label><p className="text-sm text-muted">ЖИ ролдорду, иштөө кадамдарын жана жалпы жыйынтыкты даярдайт.</p></fieldset>
   <p className="text-sm text-muted">Слайддар үчүн 5 кошумча акы төлөнүүчү сүрөт сурамы жөнөтүлөт. Сүрөт кызматы жеткиликсиз болсо, презентация иконка жана схемалары менен сакталат. Жарыялоодон мурда мазмунун текшериңиз.</p>
   <p className="text-sm text-muted">Тема, тандалган сериянын планы жана бул формадагы текст OpenAI кызматына жөнөтүлөт. Окуучулардын аттарын же жеке маалыматын жазбаңыз. ЖИ ар тапшырмага 1–3 көндүм сунуштайт. Жарыялоодон мурда мазмунун, жоопторун жана «Көндүмдөр» бөлүмүндөгү белгилерди конструктордон текшериңиз.</p>
   <Button disabled={pending||!available}>{pending?"Сабак даярдалууда…":"ЖИ менен 5E сабагын түзүү"}</Button>
  </fieldset>
  {pending && <p role="status" className="text-sm text-accent">Беш бөлүк, тапшырмалар жана критерийлер даярдалууда. Иллюстрациялар менен бир нече мүнөткө созулушу мүмкүн.</p>}
  <FormError message={state.error} />
  {state.warning && <p role="status" className="rounded-xl bg-accent-soft p-4 text-sm border border-accent/20">{state.warning}</p>}
  {state.lessonId && <div role="status" className="flex flex-col gap-3 rounded-xl bg-good-soft p-4 border border-good/25"><p className="font-semibold">Сабак долбоору сакталды. Мазмунун текшерип, өзүңүзгө ылайыктаңыз.</p><Link className="flex min-h-11 items-center font-semibold text-accent" href={`/teacher/lessons/${state.lessonId}/edit`}>Долбоорду ачып текшерүү →</Link></div>}
  {state.generationId && <Link className="flex min-h-11 items-center text-sm font-semibold text-accent" href={`/teacher/lessons/generate/${state.generationId}`}>Түзүү натыйжасын көрүү →</Link>}
 </form>;
}
