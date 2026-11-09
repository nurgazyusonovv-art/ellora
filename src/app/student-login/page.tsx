import { AuthShell } from "@/components/auth-shell";
import { StudentSignInForm } from "@/components/auth-forms";
import {getSession} from "@/lib/auth";
import {safeStudentNext} from "@/lib/sharing";
import {redirect} from "next/navigation";

export const metadata = { title: "Окуучу катары кирүү" };

export default async function Page({searchParams}:{searchParams:Promise<{next?:string}>}) {
 const {next}=await searchParams;
 const {profile}=await getSession();
 if(profile)redirect(profile.role==="student"?safeStudentNext(next):"/teacher");
  return (
    <AuthShell title="Окуучу катары кирүү">
      <StudentSignInForm next={next} />
    </AuthShell>
  );
}
