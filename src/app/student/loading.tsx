import { PageSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto flex max-w-3xl px-4 py-6 sm:px-6">
      <PageSkeleton cards={2} />
    </main>
  );
}
