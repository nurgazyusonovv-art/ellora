"use client";

import { Button } from "@/components/ui";

/** Браузердин басып чыгаруу терезесин ачат — ал жерден «PDF катары сактоо» тандалат. */
export function PrintButton({ label = "PDF жүктөө" }: { label?: string }) {
  return (
    <Button type="button" onClick={() => window.print()}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
      </svg>
      {label}
    </Button>
  );
}
