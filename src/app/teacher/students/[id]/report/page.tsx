import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { ReportSheet } from "@/components/report-sheet";
import { requireRole } from "@/lib/auth";
import { getStudentReport } from "@/lib/student-report";

export const metadata = { title: "Окуучунун отчету" };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole("teacher");
  const r = await getStudentReport(supabase, profile.id, id);
  if (!r) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/teacher/students/${id}`} className="text-sm font-semibold text-accent">
          ← Окуучунун барагы
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">Ачылган терезеде «PDF катары сактоо» тандаңыз.</span>
          <PrintButton />
        </div>
      </div>
      <ReportSheet report={r} school={profile.school} teacherName={profile.full_name} signature />
    </>
  );
}
