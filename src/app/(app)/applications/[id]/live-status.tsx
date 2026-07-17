"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Auto-refreshes the application detail page while the worker is processing it
 * (auto mode: queued → in_progress → submitted / needs_review-for-OTP / failed),
 * so the user watches a live "Applying…" screen without manual reloads. Mounted
 * only for non-terminal states; unmounts (stops polling) once the page re-renders
 * in a terminal state.
 */
export function LiveStatus({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);
  return null;
}
