import { requireRole } from "@/lib/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireRole("student");
  return <div className="min-h-dvh">{children}</div>;
}
