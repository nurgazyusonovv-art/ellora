import {notFound,redirect} from "next/navigation";
import {getSession} from "@/lib/auth";
import {UUID} from "@/lib/sharing";
import {AuthShell} from "@/components/auth-shell";
import {ButtonLink} from "@/components/ui";
export const metadata={title:"Бөлүшүлгөн тапшырма"};
export default async function Shared({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!UUID.test(id))notFound();const {profile,supabase}=await getSession();
 if(profile){const {data:a}=await supabase.from("assignments").select("id").eq("id",id).maybeSingle();if(!a)return <AuthShell title="Тапшырма жеткиликсиз"><p>Бул класска кошулганыңызды мугалим менен тактаңыз.</p><ButtonLink href={profile.role==="student"?"/student":"/teacher"}>Башкы бетке</ButtonLink></AuthShell>;redirect(profile.role==="student"?`/student/assignments/${id}`:`/teacher/assignments/${id}`);}
 const next=encodeURIComponent(`/s/${id}`);return <AuthShell title="Сабакты же оюнду ачуу" sub="Дайындалган класстын окуучусу катары кириңиз."><div className="flex flex-col gap-3"><ButtonLink href={`/student-login?next=${next}`}>Логин менен кирүү</ButtonLink><ButtonLink variant="secondary" href={`/join?next=${next}`}>Класс коду менен катталуу</ButtonLink></div></AuthShell>;
}
