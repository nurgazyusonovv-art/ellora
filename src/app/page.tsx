import { redirect } from "next/navigation";
import Link from "next/link";
import { ButtonLink, Logo } from "@/components/ui";
import { getSession } from "@/lib/auth";

const STAGES = [
  ["Discover", "Суроо менен кызыгууну ойготуу"],
  ["Learning", "Кыска түшүндүрмө жана иштеген мисал"],
  ["Practice", "Код жазуу, автоматтык текшерүү"],
  ["Бышыктоо", "Катаны тап, натыйжаны болжолдо"],
  ["Exit ticket", "Мугалим ким түшүнгөнүн дароо көрөт"],
];

export default async function Home() {
  const { profile } = await getSession();
  if (profile) redirect(profile.role === "teacher" ? "/teacher" : "/student");

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-12 px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <Logo />
        <Link href="/login" className="text-sm font-semibold text-accent">
          Мугалим катары кирүү
        </Link>
      </header>

      <section className="grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div className="flex flex-col gap-5">
          <h1 className="font-display text-3xl leading-tight font-bold sm:text-[44px]">
            Информатика сабагы, окуучу <span className="text-accent">өзү жазып</span> үйрөнгөндөй
          </h1>
          <p className="max-w-[56ch] text-lg text-muted">
            Мугалим 5 бөлүктүү интерактивдүү сабак түзүп, класска код менен бөлүшөт. Окуучулар телефондон өтөт, мугалим
            натыйжаны ошол замат көрөт.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/join">Класска кошулуу</ButtonLink>
            <ButtonLink href="/student-login" variant="secondary">
              Окуучу катары кирүү
            </ButtonLink>
          </div>
          <p className="text-sm text-muted">
            Мугалимсизби? <Link href="/signup" className="font-semibold text-accent">Акысыз катталыңыз</Link>
          </p>
        </div>

        <ol className="flex flex-col gap-2 rounded-2xl bg-nav p-5 text-white sm:p-6">
          {STAGES.map(([t, d], i) => (
            <li key={t} className="flex items-center gap-4 rounded-xl bg-white/5 px-4 py-3">
              <span className="font-mono text-sm text-[#7fd8c3]">{i + 1}/5</span>
              <span className="flex flex-col">
                <span className="font-semibold">{t}</span>
                <span className="text-sm text-[#b7c7c9]">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
