import { notFound } from "next/navigation";
import { playState } from "@/app/actions/live-games";
import { LivePlay } from "@/components/live-play";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Оюн" };

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireRole("student");
  const state = await playState(id);
  if ("error" in state) notFound();
  return <LivePlay liveId={id} studentId={profile.id} initial={state} />;
}
