import Link from "next/link";
import { CodeTraceLab } from "@/components/code-trace-lab";

export const metadata = { title: "Кодду кадамдап изилдөө" };

export default function LabPage() {
  return <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
    <Link href="/" className="flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">← Башкы бет</Link>
    <h1 className="font-display text-2xl font-semibold tracking-tight">Кодду кадамдап изилдөө</h1>
    <p className="text-muted">Алгач божомолдо, анан шарттын же циклдин аткарылышын байка. Бул жалпыга ачык машыгуу: жооптор аккаунтка сакталбайт, баа жана монета берилбейт. Башка кодду иштетүү үчүн сабактагы Python редакторун колдон.</p>
    <Link href="/lab/game" className="flex min-h-11 items-center rounded-xl border border-accent bg-accent-soft px-4 font-semibold text-accent">Жаңы оюндарды сынап көр →</Link>
    <Link href="/lab/interactive" className="flex min-h-11 items-center rounded-xl border border-accent bg-accent-soft px-4 font-semibold text-accent">Дал келтирүү жана кадамдарды иреттөө тапшырмаларын сынап көр →</Link>
    <CodeTraceLab />
  </main>;
}
