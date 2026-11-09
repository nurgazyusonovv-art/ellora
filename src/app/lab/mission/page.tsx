import Link from "next/link";
import {MissionDemo} from "@/components/mission-demo";
export const metadata={title:"Миссияны сынап көр"};
export default function MissionLab(){return <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6"><Link href="/lab/interactive" className="flex min-h-11 items-center text-sm font-medium text-muted hover:text-ink">← Интерактив тапшырмалар</Link><h1 className="font-display text-2xl font-semibold tracking-tight">Миссияны сынап көр</h1><p className="text-muted">Бул аккаунтсуз үлгү: тапшырмалар браузерде гана текшерилет, жооптор базага сакталбайт, монета берилбейт. Чыныгы сабакта тартипти сервер текшерет; жеке ишти мугалим критерий менен карайт.</p><MissionDemo/></main>}
