"use client";

import { Button } from "@/components/ui";

/** Проектордо такта толук экранга ачылат (Esc менен чыгат). */
export function FullscreenButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.().catch(() => {});
      }}
    >
      Толук экран
    </Button>
  );
}
