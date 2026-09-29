import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { ReportSheet } from "@/components/report-sheet";
import { requireRole } from "@/lib/auth";
import { getOwnReport } from "@/lib/student-report";

export const metadata = { title: "Менин жыйынтыгым" };

export default async function MyReportPage() {
  const { supabase, profile } = await requireRole("student");
  const report = await getOwnReport(supabase, profile);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/student" className="text-sm font-semibold text-accent">
          ← Менин сабактарым
        </Link>
        <PrintButton label="PDF сактоо" />
      </div>
      <ReportSheet report={report} />
    </main>
  );
}
