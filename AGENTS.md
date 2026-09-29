# AGENTS.md — ellora үчүн нускама (Codex жана башка AI агенттер)

Бул файлды ар бир тапшырманын башында оку. Толук контекст `docs/` папкасында.

## Долбоор эмне

ellora — информатика мугалимдери 5 бөлүктүү интерактивдүү сабак түзүп, класска бөлүшө турган веб-тиркеме.
Сабактын бөлүктөрү ар дайым ушул тартипте: **Discover → Learning → Practice → Бышыктоо → Exit ticket**.
Колдонуучулар: мугалим (email менен катталат) жана окуучу (класс коду + логин, email жок).

- Пландын толугу: `docs/PLAN.md`
- Кийинки тапшырмалар: `docs/TASKS.md` ← **иштин тизмеси ушул жерде**
- Сабактын JSON форматы: `docs/LESSON_FORMAT.md`
- Дизайн эрежелери: `docs/DESIGN.md`, макеттер: `design/mockups/*.html`

## Стек

- Next.js 15 App Router, React 19, TypeScript (strict)
- Supabase: Postgres + Auth + RLS (`@supabase/ssr`)
- Tailwind CSS 4 (токендер `src/app/globals.css` ичинде `@theme`)
- Pyodide 314 (Python браузерде, `public/pyodide-worker.js`)
- Хостинг: Vercel

## Командалар

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint     # ESLint — ар бир өзгөртүүдөн кийин
npm test         # Vitest: баалоо, сервер аракеттери, конструктор, КТП (src/**/*.test.ts)
npm run build    # ар бир тапшырманын аягында сөзсүз өтүшү керек
```

`.env.local` керек (`.env.example`ти көчүр).

## Папкалар

```
src/app/                  беттер (App Router)
  actions/                Server Actions (auth.ts, teacher.ts)
  teacher/                мугалимдин беттери (requireRole("teacher"))
  student/                окуучунун беттери (requireRole("student"))
src/components/
  ui.tsx                  Button, Card, Chip, Field, Progress, RichText…
  player/                 сабак ойноткуч жана блок компоненттери
  code.tsx                Python кодун көрсөтүү/редактор/консоль
src/lib/
  lesson-types.ts         сабактын формат түрлөрү (бирдиктүү булак)
  auth.ts                 getSession, requireRole, логин/класс коду генерациясы
  stats.ts                окуучунун абалы (help/attention/done…)
  python.ts               Pyodide worker менен байланыш
  supabase/               server/client/admin клиенттери
src/content/              даяр сабактар (китепкана)
supabase/migrations/      SQL схема + RLS
design/mockups/           HTML макеттер (браузерде ач)
docs/                     пландар жана спецификациялар
```

## Эрежелер

1. **Интерфейстин тили — кыргызча.** Бардык көрүнгөн текст кыргызча, жөнөкөй жана так. Англисче сөз калтырба
   (5 бөлүктүн аталыштары Discover/Learning/Practice/Exit ticket гана өзгөчө).
2. **Коопсуздук RLS аркылуу.** Жаңы таблица кошсоң — сөзсүз `enable row level security` жана саясаттар.
   Жаңы миграцияны `supabase/migrations/000N_*.sql` деп өзүнчө файлга жаз, эскисин өзгөртпө.
3. **Service role ачкычы** (`createAdminClient`) серверде гана жана RLS'ти айланып өтүү чындап керек болгондо гана.
   Андан мурун колдонуучунун укугун кадимки клиент менен текшер (мисал: `resetStudentPassword`).
4. **Телефон биринчи.** Окуучулардын көбү телефондон кирет: 375px туурада баары иштеши керек, баскычтар ≥44px.
5. **Дизайн токендерин колдон** (`bg-accent`, `text-muted`, `bg-surface`…). Жаңы түс коддоп жазба — `docs/DESIGN.md`.
6. Жаңы блок түрү кошуу тартиби: `lesson-types.ts` → `player/blocks.tsx` → `lesson-player.tsx`тагы `renderBlock`
   → `docs/LESSON_FORMAT.md`.
7. Server Actions `"use server"` файлдарында, формалар `useActionState` менен. Каталар `{ error: "кыргызча текст" }`.
8. Кичинекей, текшерилген кадамдар. Ар бир тапшырманын аягында `npm run lint && npm test && npm run build`.
9. Коммит билдирүүлөрү кыргызча же англисче, кыска: `Сабак конструктору: блок кошуу`.

## Азыркы абалы

Даяр: каттоо/кирүү (мугалим, окуучу), класстар, сабак китепканасы, класска жөнөтүү, 5 бөлүктүү ойноткуч,
Python тесттери, натыйжалар барагы, сабак конструктору, КТП. Кийинки иш — `docs/TASKS.md`.
