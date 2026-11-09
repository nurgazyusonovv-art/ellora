import {safeStudentNext} from "@/lib/sharing";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { StudentJoinForm } from "@/components/auth-forms";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Класска кошулуу" };

export default async function Page({ searchParams }: { searchParams: Promise<{ code?: string;next?:string }> }) {
  const { code,next } = await searchParams;
  const { profile } = await getSession();
  if (profile?.role === "student") redirect(safeStudentNext(next));
  return (
    <AuthShell title="Класска кошулуу" sub="Мугалимиң берген кодду жаз. Логиниңди программа өзү түзүп берет.">
      <StudentJoinForm code={code?.toUpperCase()} next={next}/>
    </AuthShell>
  );
}
