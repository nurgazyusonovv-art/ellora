# Сабактын JSON форматы

Сабактын мазмуну `lessons.content` талаасында JSON болуп сакталат. TypeScript түрлөрү: `src/lib/lesson-types.ts`
(бул файл — бирдиктүү булак; айырма болсо, коддун айтканы туура). Толук мисалдар: `src/content/lessons/` (китепкана — `src/content/index.ts`).

```jsonc
{
  "version": 1,
  "duration": 45,            // милдеттүү эмес: сабактын жалпы узактыгы (мүнөт), жок болсо 45
  "stages": [
    // ар дайым 5 бөлүк, ушул тартипте:
    { "key": "discover",  "title": "...", "intro": "...", "minutes": 5,  "blocks": [ ... ] },
    { "key": "learning",  "title": "...", "minutes": 10, "blocks": [ ... ] },
    { "key": "practice",  "title": "...", "minutes": 15, "blocks": [ ... ] },
    { "key": "reinforce", "title": "...", "minutes": 7,  "blocks": [ ... ] },
    { "key": "exit",      "title": "...", "minutes": 3,  "blocks": [ ... ] }
  ]
}
```

`duration` мугалимге гана керек: конструктор бөлүктөрдүн `minutes` суммасын ушуга салыштырып көрсөтөт.

Ар бир блоктун сабак ичинде уникалдуу `id`'си болот (мисалы `p2`). Жооптор `answers.block_id` аркылуу ушул id'ге байланат,
ошондуктан **жарыяланган сабактагы блоктун id'син өзгөртпө**.

Тексттерде `**калың**` жана `` `код` `` белгилери иштейт, абзацтар бош сап (`\n\n`) менен бөлүнөт.

## Блок түрлөрү

| type | Талаалар | Бааланабы | Эскертүү |
| --- | --- | --- | --- |
| `investigation` | `prompt`, `procedure`, `code?` | жок | Божомол → сынап көрүү → байкоо → жыйынтык; божомол биринчи сакталат |
| `text` | `body`, `title?` | жок | |
| `code_example` | `code`, `caption?`, `runnable?` | жок | `runnable: true` — окуучу өзгөртүп иштете алат |
| `mcq` | `prompt`, `options[]`, `correct` (индекс), `code?`, `mono?`, `explain?`, `hint?`, `xp?` | ооба | Exit ticket'те бир гана аракет |
| `code_task` | `prompt`, `starter`, `tests[{input, expected}]`, `hint?`, `xp?` | ооба | stdin → stdout; бардык тесттер өтсө туура |
| `parsons` | `prompt`, `lines[]` (туура тартипте), `xp?` | ооба | Саптар аралаштырылып көрсөтүлөт |
| `bug_hunt` | `prompt`, `code`, `bugs[{line, explain}]`, `fixed?`, `xp?` | ооба | `line` 1ден башталат |
| `open` | `prompt`, `placeholder?`, `optional?`, `feedback?`, `feedbackCode?`, `compareTo?`, `rubric?`, `lockOnSubmit?` | жок | `feedback` жооптон кийин көрсөтүлөт |
| `confidence` | `prompt` | жок | 1–4 шкала; exit ticket үчүн |

## Бөлүктү бүтүрүү эрежеси

- Бааланган блоктор (`mcq`, `code_task`, `parsons`, `bug_hunt`) туура аткарылышы керек.
- `open` (милдеттүү) жана `confidence` — жооп берилсе жетиштүү. `optional: true` болсо талап кылынбайт.
- Интерактивдүү блогу жок бөлүк «Түшүндүм, улантуу» баскычы менен бүтөт.
- Exit ticket'те туура/туура эмес талап кылынбайт, окуучу «Билетти тапшыруу» баскычын басат.
  `exit_score` = туура жооп берилген `mcq` саны, `exit_total` = бардык `mcq` саны.

Бул эрежелер серверде текшерилет: `src/lib/grading.ts` (баалоо, бөлүк, XP) жана `src/app/actions/student.ts`.
Ойноткуч жоопту дароо көрсөтөт, бирок XP, ачылган бөлүк жана натыйжа серверден келет.
Окуучуга сабак жашырылган түрдө жөнөтүлөт (`src/lib/student-view.ts`): `mcq.correct` = -1, `parsons` саптары
аралаштырылган (`shuffled: true`), `bug_hunt`та табылган каталар гана (`bugCount` — жалпы саны). Блок чечилгенде
сервер анын ачык көрүнүшүн кайтарат.

## XP

Ар бир бааланган блок биринчи жолу туура аткарылганда `xp` (адатта 10) кошулат. Exit ticket'ти тапшырганда +20.

## Жаңы блок түрүн кошуу

1. `src/lib/lesson-types.ts` — түрүн кош, `Block` union'уна жаз, `isGraded`/`isInteractive` текшер.
2. `src/components/player/blocks.tsx` — компонент (`Props<B>`: `block`, `saved`, `onAnswer`).
3. `src/components/player/lesson-player.tsx` — `renderBlock` ичине case кош.
4. `src/app/teacher/lessons/[id]/page.tsx` — `BLOCK_LABELS`ке аталышын кош.
5. Бул файлдагы таблицаны жаңырт.

## 5E модели (жаңы сабактар)

`model: "5e"`, `objectives: string[]`, `successCriteria: string[]`, `teacherNotes?: string` кошулат.
Базадагы `key` тартиби ошол бойдон, бирок 5E сабакта мааниси төмөнкүдөй:

| key | 5E бөлүгү | Милдеттүү окуу далили |
| --- | --- | --- |
| discover | Кызыктыруу (Engage) | `open` + `lockOnSubmit: true`: баштапкы ой |
| learning | Изилдөө (Explore) | `investigation`: божомол, байкоо, жыйынтык; туура жоопту талап кылган тест жок |
| practice | Түшүндүрүү (Explain) | Окуучунун өз сөзү менен `open` жообу, андан кийин түшүндүрмө |
| reinforce | Колдонуу (Elaborate) | Жаңы кырдаалда `code_task` же `rubric` менен ачык жооп |
| exit | Баалоо (Evaluate) | Тест жана `compareTo` менен баштапкы ойго кайрылган рефлексия |

`model` жок эски сабактар мурдагы маанисин сактайт. Даяр үч сабактын жаңы көчүрмөлөрү 5E; базада мурда сакталган сабактар автоматтык өзгөрбөйт.

Ар бир блокто `support?: string`, `extension?: string`, `collaboration?: "individual" | "pair" | "group"` болот. Жуп/топ талкуусу үчүн нускама берилет; ар бир окуучу жеке жооп сактайт.
`open.rubric` — мугалим белгилеген критерийлер. `compareTo` биринчи бөлүктөгү ачык жооптун id’си. `lockOnSubmit` биринчи жоопту өзгөртүүгө жол бербейт.
Изилдөөнүн `response` талаалары: `prediction`, `observations`, `conclusion`. Алгач `{phase:"prediction", prediction}` сакталат; андан кийин биринчи божомол өзгөрбөй, байкоо жана жыйынтык кошулат. Баа же XP коюлбайт.

Мугалимдин нускамасы окуучуга берилбейт. Тесттин упайы жалпы өздөштүрүүнүн далили катары каралбайт: мугалим түшүндүрүү, колдонуу жана рефлексияны критерийлер менен өзүнчө баалайт.

Жандуу сабак: `lesson_sessions.max_stage` 0–4 жана `paused` серверде текшерилет. Таблицада сап жок болсо өз алдынча режим. Окуучунун бетиндеги абал 20 секунд сайын жаңыланат. Баалоо `answer_reviews` таблицасына сакталат; окуучу өз пикирин гана көрөт.
