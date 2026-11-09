import Link from "next/link";
import {SheetDemo} from "@/components/sheet-demo";
export const metadata={title:"Электрондук таблица"};
export default function SheetLab(){return <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6"><Link href="/lab/interactive" className="flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">← Машыгуулар</Link><h1 className="font-display text-2xl font-semibold tracking-tight">Электрондук таблицаны сынап көр</h1><p className="text-muted">Бул аккаунтсуз үлгү: жооп браузерде текшерилет, базага сакталбайт, монета берилбейт. Черновик ушул браузерде сакталат; «кайра баштоо» аны тазалайт. Чыныгы сабакта формулаларды сервер текшерет жана тапшырылган иш аккаунтка сакталат.</p><SheetDemo/></main>}
