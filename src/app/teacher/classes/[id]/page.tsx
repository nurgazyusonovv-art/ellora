import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { removeStudent } from "@/app/actions/teacher";
import { ButtonLink, Card, PageTitle } from "@/components/ui";
import { CopyButton, ResetPasswordForm } from "@/components/teacher-forms";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/stats";

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole("teacher");
  const { data: cls } = await supabase.from("classes").select("id, name, join_code").eq("id", id).maybeSingle();
  if (!cls) notFound();

  const [{ data: members }, { data: assignments }] = await Promise.all([
    supabase.from("class_members").select("student_id, joined_at, profiles(full_name, username)").eq("class_id", id).returns<
      { student_id: string; joined_at: string; profiles: { full_name: string; username: string } | null }[]
    >(),
    supabase.from("assignments").select("id, due_at, lessons(title)").eq("class_id", id).order("created_at", { ascending: false }).returns<
      { id: string; due_at: string | null; lessons: { title: string } | null }[]
    >(),
  ]);

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const joinUrl = `${origin}/join?code=${cls.join_code}`;
  const sorted = [...(members ?? [])].sort((a, b) => (a.profiles?.full_name ?? "").localeCompare(b.profiles?.full_name ?? "", "ky"));

  return (
    <>
      <PageTitle eyebrow="Класс" title={cls.name}>
        <ButtonLink href="/teacher/lessons">Сабак жөнөтүү</ButtonLink>
      </PageTitle>

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-[0.07em] text-muted uppercase">Окуучулар үчүн кошулуу коду</span>
          <span className="font-mono text-3xl tracking-[0.2em]">{cls.join_code}</span>
          <span className="text-sm break-all text-muted">{joinUrl}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={joinUrl} label="Шилтемени көчүрүү" />
          <CopyButton
            text={`${cls.name} классы, информатика. Бул шилтеме аркылуу ellora'га кошулгула: ${joinUrl} (класс коду: ${cls.join_code})`}
            label="WhatsApp үчүн текст"
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium">Окуучулар · {sorted.length}</h2>
          {sorted.length === 0 && <p className="text-sm text-muted">Азырынча эч ким кошула элек. Кодду окуучуларга бериңиз.</p>}
          <ul className="flex flex-col">
            {sorted.map((m) => (
              <li key={m.student_id} className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-2 py-3 last:border-0">
                <div className="flex flex-col">
                  <span className="font-semibold">{m.profiles?.full_name}</span>
                  <span className="font-mono text-sm text-muted">{m.profiles?.username}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <ResetPasswordForm studentId={m.student_id} />
                  <form action={removeStudent.bind(null, cls.id, m.student_id)}>
                    <button className="text-sm text-muted hover:text-bad">Чыгаруу</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium">Жөнөтүлгөн сабактар</h2>
          {(assignments?.length ?? 0) === 0 && <p className="text-sm text-muted">Бул класска али сабак жөнөтүлө элек.</p>}
          {assignments?.map((a) => (
            <Link key={a.id} href={`/teacher/assignments/${a.id}`} className="flex justify-between gap-2 rounded-xl border border-line p-3.5 hover:border-accent">
              <span className="font-semibold">{a.lessons?.title}</span>
              <span className="text-sm text-muted">{formatDate(a.due_at)}</span>
            </Link>
          ))}
        </Card>
      </div>
    </>
  );
}
