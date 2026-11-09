import Link from "next/link";
import {ClassificationDemo} from "@/components/classification-demo";
export const metadata={title:"Категорияларга бөлүштүрүү"};
export default function ClassificationLab(){return <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6"><Link href="/lab/interactive" className="flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">← Машыгуулар</Link><h1 className="font-display text-2xl font-semibold tracking-tight">Категорияларга бөлүштүрүүнү сына</h1><p className="text-muted">Бул аккаунтсуз үлгү: жооп браузерде текшерилет, базага сакталбайт жана монета берилбейт. Чыныгы сабакта жоопту сервер текшерет. Телефондо тандоо баскычтары же клавиатура менен аткарылат.</p><ClassificationDemo/></main>}
