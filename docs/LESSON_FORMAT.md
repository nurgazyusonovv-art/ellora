# Сабактын JSON форматы

Сабактын мазмуну `lessons.content` талаасында JSON болуп сакталат. TypeScript түрлөрү: `src/lib/lesson-types.ts`
(бул файл — бирдиктүү булак; айырма болсо, коддун айтканы туура). Толук мисал: `src/content/python-if.ts`.

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
| `text` | `body`, `title?` | жок | |
| `code_example` | `code`, `caption?`, `runnable?` | жок | `runnable: true` — окуучу өзгөртүп иштете алат |
| `mcq` | `prompt`, `options[]`, `correct` (индекс), `code?`, `mono?`, `explain?`, `hint?`, `xp?` | ооба | Exit ticket'те бир гана аракет |
| `code_task` | `prompt`, `starter`, `tests[{input, expected}]`, `hint?`, `xp?` | ооба | stdin → stdout; бардык тесттер өтсө туура |
| `parsons` | `prompt`, `lines[]` (туура тартипте), `xp?` | ооба | Саптар аралаштырылып көрсөтүлөт |
| `bug_hunt` | `prompt`, `code`, `bugs[{line, explain}]`, `fixed?`, `xp?` | ооба | `line` 1ден башталат |
| `open` | `prompt`, `placeholder?`, `optional?`, `feedback?`, `feedbackCode?` | жок | `feedback` жооптон кийин көрсөтүлөт |
| `confidence` | `prompt` | жок | 1–4 шкала; exit ticket үчүн |

## Бөлүктү бүтүрүү эрежеси

- Бааланган блоктор (`mcq`, `code_task`, `parsons`, `bug_hunt`) туура аткарылышы керек.
- `open` (милдеттүү) жана `confidence` — жооп берилсе жетиштүү. `optional: true` болсо талап кылынбайт.
- Интерактивдүү блогу жок бөлүк «Түшүндүм, улантуу» баскычы менен бүтөт.
- Exit ticket'те туура/туура эмес талап кылынбайт, окуучу «Билетти тапшыруу» баскычын басат.
  `exit_score` = туура жооп берилген `mcq` саны, `exit_total` = бардык `mcq` саны.

Бул эрежелер серверде текшерилет: `src/lib/grading.ts` (баалоо, бөлүк, XP) жана `src/app/actions/student.ts`.
Ойноткуч жоопту дароо көрсөтөт, бирок XP, ачылган бөлүк жана натыйжа серверден келет.

## XP

Ар бир бааланган блок биринчи жолу туура аткарылганда `xp` (адатта 10) кошулат. Exit ticket'ти тапшырганда +20.

## Жаңы блок түрүн кошуу

1. `src/lib/lesson-types.ts` — түрүн кош, `Block` union'уна жаз, `isGraded`/`isInteractive` текшер.
2. `src/components/player/blocks.tsx` — компонент (`Props<B>`: `block`, `saved`, `onAnswer`).
3. `src/components/player/lesson-player.tsx` — `renderBlock` ичине case кош.
4. `src/app/teacher/lessons/[id]/page.tsx` — `BLOCK_LABELS`ке аталышын кош.
5. Бул файлдагы таблицаны жаңырт.
