import { AuthShell } from "@/components/auth-shell";
import { StudentSignInForm } from "@/components/auth-forms";

export const metadata = { title: "Окуучу катары кирүү" };

export default function Page() {
  return (
    <AuthShell title="Окуучу катары кирүү">
      <StudentSignInForm />
    </AuthShell>
  );
}
