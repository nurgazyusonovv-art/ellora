import { AuthShell } from "@/components/auth-shell";
import { TeacherSignUpForm } from "@/components/auth-forms";

export const metadata = { title: "Мугалим катары катталуу" };

export default function Page() {
  return (
    <AuthShell title="Мугалим катары катталуу" sub="Сабак түзүп, класстарыңызга бөлүшүү үчүн.">
      <TeacherSignUpForm />
    </AuthShell>
  );
}
