import { AuthShell } from "@/components/auth-shell";
import { TeacherSignInForm } from "@/components/auth-forms";

export const metadata = { title: "Мугалим катары кирүү" };

export default async function Page({ searchParams }: { searchParams: Promise<{ check_email?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Мугалим катары кирүү">
      <TeacherSignInForm
        notice={sp.check_email ? "Катталдыңыз! Email'иңизге келген шилтемени басып, андан кийин кириңиз." : undefined}
      />
    </AuthShell>
  );
}
