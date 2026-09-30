import { AppNav } from "@/components/app-nav";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: { default: "Админ", template: "%s · Админ · ellora" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Ар бир барак өзү да текшерет; layout — менюну көрсөтүү үчүн.
  const { profile } = await requireAdmin();
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <AppNav
        name={profile.full_name || "Админ"}
        sub="Платформанын админи"
        items={[
          { href: "/admin", label: "Жалпы", icon: "stats", exact: true },
          { href: "/admin/teachers", label: "Мугалимдер", icon: "person" },
          { href: "/admin/classes", label: "Класстар", icon: "classes" },
          { href: "/admin/students", label: "Окуучулар", icon: "lessons" },
          { href: "/teacher", label: "Мугалим", icon: "back", exact: true },
        ]}
      />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-7 px-4 pt-6 pb-24 sm:px-8 lg:py-9">{children}</main>
    </div>
  );
}
