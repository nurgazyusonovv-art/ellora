"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  joinAnotherClass,
  studentJoin,
  studentSignIn,
  teacherSignIn,
  teacherSignUp,
  type FormState,
} from "@/app/actions/auth";
import { Button, Field, FormError } from "@/components/ui";

type Action = (s: FormState, fd: FormData) => Promise<FormState>;

function useForm(action: Action) {
  return useActionState<FormState, FormData>(action, undefined);
}

export function TeacherSignInForm({ notice }: { notice?: string }) {
  const [state, act, pending] = useForm(teacherSignIn);
  return (
    <form action={act} className="flex flex-col gap-4">
      {notice && <p className="rounded-[10px] bg-accent-soft px-3.5 py-2.5 text-sm">{notice}</p>}
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Сырсөз" name="password" type="password" autoComplete="current-password" required />
      <FormError message={state?.error} />
      <Button disabled={pending}>{pending ? "Кирип жатат…" : "Кирүү"}</Button>
      <p className="text-sm text-muted">
        Аккаунтуңуз жокпу? <Link href="/signup" className="font-semibold text-accent">Катталуу</Link>
      </p>
    </form>
  );
}

export function TeacherSignUpForm() {
  const [state, act, pending] = useForm(teacherSignUp);
  return (
    <form action={act} className="flex flex-col gap-4">
      <Field label="Аты-жөнүңүз" name="full_name" autoComplete="name" required />
      <Field label="Мектеп" name="school" placeholder="Мисалы: №61 мектеп-гимназия" />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Сырсөз" name="password" type="password" autoComplete="new-password" minLength={8} hint="Кеминде 8 белги" required />
      <FormError message={state?.error} />
      <Button disabled={pending}>{pending ? "Түзүлүүдө…" : "Аккаунт түзүү"}</Button>
      <p className="text-sm text-muted">
        Аккаунтуңуз барбы? <Link href="/login" className="font-semibold text-accent">Кирүү</Link>
      </p>
    </form>
  );
}

export function StudentSignInForm() {
  const [state, act, pending] = useForm(studentSignIn);
  return (
    <form action={act} className="flex flex-col gap-4">
      <Field label="Логин" name="username" autoComplete="username" autoCapitalize="none" placeholder="мисалы: aibek482" required />
      <Field label="Сырсөз" name="password" type="password" autoComplete="current-password" required />
      <FormError message={state?.error} />
      <Button disabled={pending}>{pending ? "Кирип жатат…" : "Кирүү"}</Button>
      <p className="text-sm text-muted">
        Биринчи жолубу? <Link href="/join" className="font-semibold text-accent">Класс коду менен кошул</Link>
      </p>
    </form>
  );
}

export function StudentJoinForm({ code }: { code?: string }) {
  const [state, act, pending] = useForm(studentJoin);
  return (
    <form action={act} className="flex flex-col gap-4">
      <Field
        label="Класс коду"
        name="code"
        defaultValue={code}
        autoCapitalize="characters"
        className="rounded-[10px] border border-line bg-surface px-3 py-2.5 font-mono text-lg uppercase tracking-[0.2em]"
        placeholder="K7P2QX"
        maxLength={6}
        required
      />
      <Field label="Атың жана фамилияң" name="full_name" autoComplete="name" placeholder="Айбек Маратов" required />
      <Field label="Сырсөз ойлоп тап" name="password" type="password" autoComplete="new-password" minLength={6} hint="Кеминде 6 белги. Унутпа!" required />
      <FormError message={state?.error} />
      <Button disabled={pending}>{pending ? "Кошулууда…" : "Класска кошулуу"}</Button>
      <p className="text-sm text-muted">
        Аккаунтуң барбы? <Link href="/student-login" className="font-semibold text-accent">Кирүү</Link>
      </p>
    </form>
  );
}

export function JoinAnotherClassForm() {
  const [state, act, pending] = useForm(joinAnotherClass);
  return (
    <form action={act} className="flex flex-wrap items-end gap-2.5">
      <div className="min-w-40 flex-1">
        <Field label="Жаңы класстын коду" name="code" autoCapitalize="characters" maxLength={6} placeholder="K7P2QX" required />
      </div>
      <Button variant="secondary" disabled={pending}>Кошулуу</Button>
      <div className="basis-full">
        <FormError message={state?.error} />
      </div>
    </form>
  );
}
