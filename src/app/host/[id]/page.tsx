import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { hostState } from "@/app/actions/live-games";
import { LiveHost } from "@/components/live-host";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Жандуу оюн" };

/** Проектор экраны (мугалимдин менюсусуз). Укук: requireRole + RLS (өз оюну гана). */
export default async function HostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireRole("teacher");
  const state = await hostState(id);
  if (!state) notFound();
  const h = await headers();
  const joinUrl = `${h.get("host") ?? "ellora"}/play`;
  return <LiveHost liveId={id} teacherId={profile.id} initial={state} joinUrl={joinUrl} />;
}
