"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";

const MESSAGES: Record<string, string> = {
  queued: "Application queued — we'll submit it and keep you posted.",
  ready: "We filled in your application — review and submit.",
  submitted: "Application submitted 🎉",
};

/**
 * Lightweight toast: a server action redirects with `?toast=<key>`; we derive
 * the message from the URL, then dismissing (auto after 5s, or the close button)
 * simply strips the param so it disappears and a refresh won't replay it.
 * Mounted once in the (app) layout.
 */
export function Toaster() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const key = params.get("toast");
  const message = key ? (MESSAGES[key] ?? null) : null;

  const dismiss = useCallback(() => {
    const sp = new URLSearchParams(params.toString());
    sp.delete("toast");
    router.replace(`${pathname}${sp.toString() ? `?${sp}` : ""}`, { scroll: false });
  }, [params, pathname, router]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(dismiss, 5000);
    return () => clearTimeout(t);
  }, [message, dismiss]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4 sm:justify-end sm:pr-6">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-card">
        <CheckCircle2 size={18} className="shrink-0 text-green-600" />
        <p className="text-sm text-foreground">{message}</p>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="ml-1 shrink-0 text-muted transition-colors hover:text-foreground"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
