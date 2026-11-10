import { StudentTabBar } from "@/components/student-tab-bar";
import { requireRole } from "@/lib/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireRole("student");
  return (
    <div className="min-h-dvh bg-surface-2">
      {children}
      <StudentTabBar />
    </div>
  );
}
