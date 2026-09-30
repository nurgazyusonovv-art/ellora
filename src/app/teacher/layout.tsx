import { AppNav } from "@/components/app-nav";
import { requireRole } from "@/lib/auth";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("teacher");
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
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
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-7 px-4 pt-6 pb-24 sm:px-8 lg:py-9 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
