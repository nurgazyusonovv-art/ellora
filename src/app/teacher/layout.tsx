import { TeacherSidebar } from "@/components/teacher-sidebar";
import { AppNav } from "@/components/app-nav";
import { requireRole } from "@/lib/auth";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await requireRole("teacher");
  const { data: classes } = await supabase.from("classes").select("id, name").eq("teacher_id", profile.id).order("name");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bishkek", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return (
    <div className="app-shell flex min-h-dvh flex-col lg:flex-row">
      <AppNav
        name={profile.full_name || "Мугалим"}
        sub={profile.school || "Информатика"}
        items={[
          { href: "/teacher", label: "Башкы бет", icon: "home", exact: true },
          { href: "/teacher/lessons", label: "Сабактар", icon: "lessons" },
          { href: "/teacher/ktp", label: "КТП", icon: "ktp" },
          { href: "/teacher/classes", label: "Класстар", icon: "classes" },
          ...(profile.is_admin ? [{ href: "/admin", label: "Админ", icon: "admin" as const }] : []),
        ]}
      />
      <div className="app-content flex min-w-0 flex-1 flex-col min-[1440px]:flex-row">
        <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col gap-8 px-4 pt-6 pb-24 sm:px-8 lg:px-9 lg:py-10 print:max-w-none print:p-0">{children}</main>
        <TeacherSidebar name={profile.full_name || "Мугалим"} school={profile.school || "Информатика"} today={today} classes={classes ?? []} />
      </div>
    </div>
  );
}
