import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { ButtonLink, cx, Logo, LogoMark } from "@/components/ui";
import { getSession } from "@/lib/auth";

export const metadata = { title: { absolute: "ellora — информатиканы өзү жазып үйрөнгөн платформа" } };

const STAGES: { name: string; text: string; icon: IconName }[] = [
  { name: "Discover", text: "Турмуштан алынган суроо кызыгууну ойготот. Окуучу өз оюн жазат.", icon: "spark" },
  { name: "Learning", text: "Кыска түшүндүрмө жана иштеген мисал — кодду өзгөртүп, иштетип көрсө болот.", icon: "book" },
  { name: "Practice", text: "Тест, код жазуу, саптарды иреттөө — жооп ошол замат текшерилет.", icon: "code" },
  { name: "Бышыктоо", text: "Катаны тап, өз мисалыңды ойлоп тап — тема бекемделет.", icon: "layers" },
  { name: "Exit ticket", text: "Акыркы 3 суроо: мугалим ким түшүнгөнүн дароо көрөт.", icon: "target" },
];

const FOR_STUDENTS: { icon: IconName; title: string; text: string }[] = [
  { icon: "phone", title: "Телефондон да, компьютерден да", text: "Сайтты телефонго колдонмо катары орнотсо болот." },
  { icon: "key", title: "Email керек эмес", text: "Мугалим берген класс коду менен кошулуп, логин аласың." },
  { icon: "code", title: "Python браузердин ичинде", text: "Эч нерсе орнотпой эле код жазып, иштетесиң." },
  { icon: "bolt", title: "Кеңеш жана XP", text: "Ката кетсе — кеңеш, туура чыгарсаң — упай топтойсуң." },
  { icon: "wifi", title: "Интернет үзүлсө да", text: "Жоопторуң сакталып турат, байланыш келгенде жөнөтүлөт." },
  { icon: "chart", title: "Өз жыйынтыгың", text: "Бардык сабактар боюнча натыйжаңды көрүп, PDF кылып сактайсың." },
];

const FOR_TEACHERS: { icon: IconName; title: string; text: string }[] = [
  { icon: "book", title: "КТП боюнча даяр сабактар", text: "7–8-класстын 2026–2027-окуу жылындагы КТП'си ичинде. Өзүңүзгө ылайыктап өзгөртсөңүз болот." },
  { icon: "layers", title: "Сабак конструктору", text: "8 түрдүү тапшырма, 5 бөлүк, өзү сакталат. Окуучу катары алдын ала көрөсүз." },
  { icon: "users", title: "Класс ошол замат көрүнөт", text: "Ким бүттү, кимге жардам керек, кайсы суроо кыйын болду — сабак учурунда эле." },
  { icon: "shield", title: "Чынчыл баа", text: "Жооптор серверде текшерилет: туура жооптор окуучуга алдын ала көрүнбөйт." },
  { icon: "file", title: "PDF отчет", text: "Ар бир окуучунун бардык жыйынтыгы бир баракта — графиктер менен." },
  { icon: "message", title: "WhatsApp эскертмеси", text: "Баштай элек окуучулардын тизмесин бир баскыч менен көчүрөсүз." },
];

const TEACHER_STEPS = ["Катталыңыз (email менен)", "Класс ачып, кошулуу кодун алыңыз", "Китепканадан сабак кошуп, класска жөнөтүңүз", "Натыйжаны көрүп, кийинки сабакты пландаңыз"];
const STUDENT_STEPS = ["Мугалимиңден класс кодун ал", "«Класска кошулуу» баскычын басып, атыңды жаз", "Логиниңди дептериңе жазып ал", "Сабакты ач жана 5 бөлүктү өт"];

export default async function Home() {
  const { profile } = await getSession();
  if (profile) redirect(profile.role === "teacher" ? "/teacher" : "/student");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <nav aria-label="Барактын бөлүмдөрү" className="hidden items-center gap-6 text-sm font-semibold text-muted md:flex">
            <a href="#how" className="hover:text-ink">
              Сабак кантип өтөт
            </a>
            <a href="#students" className="hover:text-ink">
              Окуучуга
            </a>
            <a href="#teachers" className="hover:text-ink">
              Мугалимге
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden min-h-11 items-center px-2 text-sm font-semibold text-accent sm:inline-flex">
              Мугалим кирүү
            </Link>
            <ButtonLink href="/student-login" variant="secondary" className="min-h-11 px-3.5 text-sm">
              Окуучу кирүү
            </ButtonLink>
          </div>
        </div>
      </header>

      <main className="flex flex-col">
        {/* ───────── Башы ───────── */}
        <section className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 px-4 pt-10 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:pt-16">
          <div className="flex flex-col gap-6">
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-dark">
              <Icon name="book" size={14} />
              Информатика · 5–9-класстар · кыргыз тилинде
            </span>
            <h1 className="font-display text-[27px] leading-[1.18] font-bold min-[400px]:text-[30px] sm:text-[44px]">
              Информатиканы <span className="text-accent">өзү жазып</span>, өзү текшерип үйрөнгөн платформа
            </h1>
            <p className="max-w-[58ch] text-lg text-muted">
              ellora — мугалим менен окуучуну бириктирген онлайн класс. Мугалим сабакты даярдап, класска жөнөтөт. Окуучу аны телефондон
              же компьютерден өтөт: суроолорго жооп берет, {"Python'до"} код жазат жана жыйынтыгын ошол замат көрөт.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <RoleCard
                icon="users"
                title="Мен окуучумун"
                text="Мугалимиң берген код менен класска кошул. Email керек эмес."
                primary={{ href: "/join", label: "Класска кошулуу" }}
                secondary={{ href: "/student-login", label: "Логиним бар — кирүү" }}
              />
              <RoleCard
                icon="book"
                title="Мен мугалиммин"
                text="Даяр сабакты алыңыз же өзүңүз түзүп, класска жөнөтүңүз."
                primary={{ href: "/signup", label: "Катталуу" }}
                secondary={{ href: "/login", label: "Аккаунтум бар — кирүү" }}
              />
            </div>
          </div>

          <PhonePreview />
        </section>

        {/* ───────── 5 бөлүк ───────── */}
        <section id="how" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6">
            <SectionTitle eyebrow="Сабак кантип өтөт" title="Ар бир сабак — 5 кадам" text="Бардык сабактар бирдей түзүлүштө: окуучу эмне күтөрүн билет, мугалим ар бир кадамдын натыйжасын көрөт." />
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {STAGES.map((s, i) => (
                <li key={s.name} className="flex flex-col gap-3 rounded-2xl border border-line bg-bg p-4">
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-accent text-white">
                      <Icon name={s.icon} size={20} />
                    </span>
                    <span className="font-mono text-sm text-muted">{i + 1}/5</span>
                  </div>
                  <span className="font-display text-base font-bold">{s.name}</span>
                  <span className="text-sm leading-relaxed text-muted">{s.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ───────── Окуучуга / Мугалимге ───────── */}
        <section className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <Audience id="students" eyebrow="Окуучуга" title="Үйрөнүү — оюн сыяктуу, бирок чындап" items={FOR_STUDENTS} />
          <Audience id="teachers" eyebrow="Мугалимге" title="Сабакка даярдануу — мүнөттөр менен" items={FOR_TEACHERS} dark />
        </section>

        {/* ───────── Кантип баштайт ───────── */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6">
            <SectionTitle eyebrow="Кантип баштайт" title="Беш мүнөттө класс даяр" />
            <div className="grid gap-4 md:grid-cols-2">
              <Steps title="Мугалим" icon="book" steps={TEACHER_STEPS} cta={{ href: "/signup", label: "Мугалим катары катталуу" }} />
              <Steps title="Окуучу" icon="users" steps={STUDENT_STEPS} cta={{ href: "/join", label: "Класска кошулуу" }} />
            </div>
          </div>
        </section>

        {/* ───────── Акыркы чакырык ───────── */}
        <section className="bg-nav text-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <LogoMark size={48} dark />
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-xl font-bold sm:text-2xl">Биринчи сабакты бүгүн эле баштаңыз</h2>
                <p className="text-[#b7c7c9]">Мугалим класс ачат — окуучулар код менен кошулат.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <ButtonLink href="/join" className="bg-[#3dc3a5] text-[#0b1b17] hover:bg-[#5fd4ba]">
                Класска кошулуу
              </ButtonLink>
              <ButtonLink href="/signup" variant="secondary" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                Мугалим катары катталуу
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <span>Информатика сабактары кыргыз тилинде · 5–9-класстар</span>
          <div className="flex gap-4">
            <Link href="/student-login" className="font-semibold text-accent">
              Окуучу кирүү
            </Link>
            <Link href="/login" className="font-semibold text-accent">
              Мугалим кирүү
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <span className="text-xs font-semibold tracking-[0.08em] text-accent uppercase">{eyebrow}</span>
      <h2 className="font-display text-2xl font-bold sm:text-[30px]">{title}</h2>
      {text && <p className="text-muted">{text}</p>}
    </div>
  );
}

function RoleCard({
  icon,
  title,
  text,
  primary,
  secondary,
}: {
  icon: IconName;
  title: string;
  text: string;
  primary: { href: string; label: string };
  secondary: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <span className="flex items-center gap-2.5 font-semibold">
        <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent-dark">
          <Icon name={icon} size={18} />
        </span>
        {title}
      </span>
      <span className="text-sm text-muted">{text}</span>
      <ButtonLink href={primary.href} className="mt-auto">
        {primary.label}
        <Icon name="arrow" size={16} />
      </ButtonLink>
      <Link href={secondary.href} className="text-center text-sm font-semibold text-accent hover:underline">
        {secondary.label}
      </Link>
    </div>
  );
}

function Audience({ id, eyebrow, title, items, dark }: { id: string; eyebrow: string; title: string; items: { icon: IconName; title: string; text: string }[]; dark?: boolean }) {
  return (
    <div id={id} className={cx("flex scroll-mt-20 flex-col gap-6 rounded-3xl p-6 sm:p-8", dark ? "bg-nav text-white" : "border border-line bg-surface")}>
      <div className="flex flex-col gap-2">
        <span className={cx("text-xs font-semibold tracking-[0.08em] uppercase", dark ? "text-[#7fd8c3]" : "text-accent")}>{eyebrow}</span>
        <h2 className="font-display text-2xl font-bold">{title}</h2>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.title} className="flex gap-3">
            <span className={cx("grid size-10 shrink-0 place-items-center rounded-xl", dark ? "bg-white/10 text-[#7fd8c3]" : "bg-accent-soft text-accent-dark")}>
              <Icon name={it.icon} size={20} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{it.title}</span>
              <span className={cx("text-sm leading-relaxed", dark ? "text-[#b7c7c9]" : "text-muted")}>{it.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Steps({ title, icon, steps, cta }: { title: string; icon: IconName; steps: string[]; cta: { href: string; label: string } }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-bg p-5 sm:p-6">
      <span className="flex items-center gap-2.5 font-display text-lg font-bold">
        <Icon name={icon} size={20} className="text-accent" />
        {title}
      </span>
      <ol className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-sm font-semibold text-accent-dark">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <ButtonLink href={cta.href} variant="secondary" className="self-start">
        {cta.label}
      </ButtonLink>
    </div>
  );
}

/** Сабактын телефондогу көрүнүшү (сүрөт катары — чыныгы ойноткучтун түстөрү жана түзүлүшү). */
function PhonePreview() {
  const stages = ["Discover", "Learning", "Practice", "Бышыктоо", "Exit"];
  return (
    <div aria-hidden className="mx-auto w-full max-w-[340px]">
      <div className="rounded-[36px] border-[10px] border-nav bg-bg p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <LogoMark size={24} />
          <span className="rounded-full bg-amber-soft px-2.5 py-0.5 font-mono text-xs font-semibold text-amber">70 XP</span>
        </div>
        <div className="mb-3 grid grid-cols-5 gap-1">
          {stages.map((s, i) => (
            <span
              key={s}
              className={cx(
                "flex flex-col rounded-lg border bg-surface px-1.5 py-1 text-[9px] leading-tight",
                i === 2 ? "border-accent shadow-[inset_0_-2px_0_var(--color-accent)]" : "border-line",
                i > 2 && "opacity-45",
              )}
            >
              <span className="font-mono text-muted">
                {i + 1}/5 {i < 2 && <b className="text-good">✓</b>}
              </span>
              <span className="truncate font-semibold">{s}</span>
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-3">
          <span className="text-[13px] font-semibold">Шартты өзүң жаз: кинотеатр 18+</span>
          <pre className="overflow-hidden rounded-lg bg-code px-3 py-2 font-mono text-[11px] leading-[1.7] text-code-ink">
            <span>jash = int(input())</span>
            {"\n"}
            <span className="font-semibold text-code-kw">if</span> jash {">"}= <span className="text-code-num">18</span>:
            {"\n"}
            {"    "}print(<span className="text-code-str">&quot;Кире аласыз&quot;</span>)
            {"\n"}
            <span className="font-semibold text-code-kw">else</span>:
            {"\n"}
            {"    "}print(<span className="text-code-str">&quot;Али эрте&quot;</span>)
          </pre>
          <div className="flex flex-col gap-1 text-[11px]">
            {[
              ["12", "Али эрте"],
              ["18", "Кире аласыз"],
              ["25", "Кире аласыз"],
            ].map(([i, o]) => (
              <span key={String(i)} className="flex items-center justify-between rounded-md bg-good-soft px-2 py-1 text-good">
                <span className="font-mono">jash = {i}</span>
                <span className="flex items-center gap-1">
                  {o} <Icon name="check" size={12} />
                </span>
              </span>
            ))}
          </div>
          <span className="rounded-lg bg-good-soft px-2.5 py-1.5 text-[11px] font-semibold text-good">Бардык тесттер өттү · +10 XP</span>
        </div>
      </div>
    </div>
  );
}
