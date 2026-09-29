# ellora

Информатика сабактарын 5 бөлүктүү методика менен (Discover → Learning → Practice → Бышыктоо → Exit ticket) онлайн өтүү платформасы.

- **Мугалим:** класс ачат, китепканадан сабак алат, класска жөнөтөт, натыйжаны көрөт.
- **Окуучу:** класс коду менен кошулат, сабакты телефондон өтөт, Python кодун браузерде жазып текшертет.

Стек: Next.js 15 (App Router) · Supabase (Postgres, Auth, RLS) · Tailwind CSS 4 · Pyodide (Python браузерде).

## Документтер

| Файл | Эмне |
| --- | --- |
| `AGENTS.md` | Codex жана башка AI агенттер үчүн нускама (эрежелер, командалар, папкалар) |
| `docs/PLAN.md` | Платформанын толук планы |
| `docs/TASKS.md` | Кийинки тапшырмалар, ирети менен |
| `docs/LESSON_FORMAT.md` | Сабактын JSON форматы жана блок түрлөрү |
| `docs/DESIGN.md` | Түстөр, шрифттер, компоненттер |
| `design/mockups/` | HTML макеттер (браузерде ач) |

## Орнотуу

### 1. Supabase

1. [supabase.com](https://supabase.com) → **New project** (аймак: Frankfurt же Сингапур).
2. **SQL Editor** → `supabase/migrations/0001_init.sql` файлын толугу менен көчүрүп, **Run** басыңыз.
3. **Authentication → Sign In / Providers → Email**: пилот учурунда **Confirm email** өчүрүп коюңуз.
   Акысыз тарифте Supabase саатына бир нече гана кат жөнөтөт, ошондуктан мугалимдер каттала албай калышы мүмкүн.
4. **Authentication → URL Configuration → Site URL**: сайттын дареги (мисалы `https://ellora.vercel.app`).
5. **Project Settings → API** бөлүмүнөн үч ачкычты алыңыз:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (**жашыруун**, эч кимге бербеңиз)

### 2. Компьютерде иштетүү

```bash
cp .env.example .env.local   # ачкычтарды жазыңыз
npm install
npm run dev                  # http://localhost:3000
```

### 3. Vercel

1. [vercel.com/new](https://vercel.com/new) → GitHub'дагы `ellora` репозиторийин тандаңыз.
2. **Environment Variables** бөлүмүнө жогорудагы үч ачкычты кошуңуз.
3. **Deploy**. Даяр болгондо Supabase'теги **Site URL**'ду Vercel берген дарекке алмаштырыңыз.

## Биринчи текшерүү

1. `/signup` — мугалим катары катталыңыз.
2. **Класстар** → класс ачыңыз, кошулуу кодун көчүрүңүз.
3. **Сабактар** → китепканадан «Python: шарттуу оператор if» сабагын кошуп, класска жөнөтүңүз.
4. Башка браузерде (же телефондо) `/join` → кодду жазып окуучу катары кошулуңуз, сабакты өтүңүз.
5. Мугалим панелинде натыйжа 20 секунд ичинде жаңырат.

## Папкалар

```
supabase/migrations/     маалымат базасынын схемасы жана RLS
src/content/             даяр сабактар (китепкана)
src/lib/lesson-types.ts  сабактын JSON форматы (блок түрлөрү)
src/components/player/   5 бөлүктүү сабак ойноткучу
public/pyodide-worker.js Python'ду браузерде иштеткен worker
src/app/teacher/         мугалимдин беттери
src/app/student/         окуучунун беттери
```

## Окуучу аккаунттары

Окуучулардан email талап кылынбайт. Кошулганда программа логин түзөт (мисалы `aibek482`), окуучу өзү сырсөз ойлоп табат.
Сырсөзүн унутса, мугалим класс барагынан **Сырсөздү жаңылоо** баскычы менен жаңысын коёт.

## Кийинки этап

- Сабак конструктору (мугалим өзү сабак түзөт)
- Окуучунун жооптору серверде текшерилиши (азыр браузерде бааланат)
- Орусча интерфейс, PWA жана офлайн режим
