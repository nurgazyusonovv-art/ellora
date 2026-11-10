"use client";

import { useActionState } from "react";
import { generateQuiz, type QuizAiState } from "@/app/actions/game-ai";
import { GRADES } from "@/lib/grades";
import { QUIZ_LEVELS, QUIZ_MAX, QUIZ_MIN } from "@/lib/quiz-generator";
import { Icon } from "./icons";
import { Button, Field, FormError } from "./ui";

const selectCls = "min-h-11 w-full rounded-md border border-line-strong bg-surface px-2.5 text-sm shadow-xs";

/** ЖИ менен квиз-оюн: тема → тест суроолору → редактор. */
export function QuizAiForm() {
  const [state, action, pending] = useActionState<QuizAiState, FormData>(generateQuiz, {});
  return (
    <form action={action} className="flex min-w-0 flex-col gap-4">
      <Field label="Оюндун темасы" name="topic" placeholder="Мисалы: Python — циклдер (for, range)" required maxLength={200} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Класс
          <select name="grade" defaultValue={7} className={selectCls}>
            {GRADES.map((g) => <option key={g} value={g}>{g}-класс</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Суроо саны
          <select name="count" defaultValue={10} className={selectCls}>
            {Array.from({ length: QUIZ_MAX - QUIZ_MIN + 1 }, (_, i) => QUIZ_MIN + i).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="col-span-2 flex flex-col gap-1.5 text-sm font-medium sm:col-span-1">
          Деңгээли
          <select name="level" defaultValue="mixed" className={selectCls}>
            {Object.entries(QUIZ_LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" name="with_code" value="true" defaultChecked className="size-4 accent-accent" />
        Python коду бар суроолор да болсун («бул код эмнени чыгарат?»)
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Кошумча каалоо (милдеттүү эмес)
        <textarea name="context" maxLength={1500} rows={2} className="rounded-md border border-line-strong bg-surface p-3 text-sm shadow-xs" placeholder="Мисалы: өткөн сабакта range() түшүнүксүз болду, ага көбүрөөк суроо" />
      </label>
      <p className="text-xs text-muted">Тема жана каалооңуз ЖИ кызматына (OpenAI) жөнөтүлөт — окуучулардын жеке маалыматын жазбаңыз. Сабактар менен жалпы лимит: күнүнө 10 долбоор. Түзүлгөн оюн редактордо ачылат — жоопторун текшериңиз.</p>
      <Button disabled={pending} className="self-start">
        <Icon name="spark" size={16} /> {pending ? "ЖИ суроолорду түзүүдө… (30–60 сек)" : "ЖИ менен оюн түзүү"}
      </Button>
      <FormError message={state.error} />
    </form>
  );
}
