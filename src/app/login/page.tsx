import { AuthShell } from "@/components/auth-shell";
import { TeacherSignInForm } from "@/components/auth-forms";
import {getSession} from "@/lib/auth";
import {redirect} from "next/navigation";

export const metadata = { title: "Мугалим катары кирүү" };

export default async function Page({ searchParams }: { searchParams: Promise<{ check_email?: string }> }) {
  const sp = await searchParams;
  const {profile}=await getSession();
  if(profile)redirect(profile.role==="student"?"/student":"/teacher");
  return (
    <AuthShell title="Мугалим катары кирүү">
      <TeacherSignInForm
        notice={sp.check_email ? "Катталдыңыз! Email'иңизге келген шилтемени басып, андан кийин кириңиз." : undefined}
      />
    </AuthShell>
  );
}
