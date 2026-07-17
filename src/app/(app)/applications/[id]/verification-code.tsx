"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { MailCheck, Loader2 } from "lucide-react";
import { submitVerificationCode } from "./actions";

/**
 * Email verification-code entry. The worker pauses mid-submit when the ATS
 * emails a code; the user enters it here and the worker (holding the browser
 * session) types it in to finish. Two states: enter the code, or — once
 * submitted — a "finishing" indicator while the worker completes.
 */
export function VerificationCode({
  applicationId,
  prompt,
  submitted,
}: {
  applicationId: string;
  prompt?: string | null;
  submitted?: boolean;
}) {
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-background p-6 shadow-card">
        <p className="flex items-center gap-2.5 text-sm font-medium text-foreground">
          <Loader2 size={16} className="animate-spin text-muted" />
          Code received — finishing your application…
        </p>
        <p className="mt-1.5 text-sm text-muted">Keep this page open; we&apos;re submitting it now.</p>
      </div>
    );
  }

  // Expected length, if the prompt states it (e.g. "8-character" / "6 digit").
  const len = Number(prompt?.match(/(\d+)[-\s]?(?:character|digit)/i)?.[1]) || undefined;

  const submit = () => {
    const c = code.trim();
    if (!c) return;
    start(async () => {
      const fd = new FormData();
      fd.set("applicationId", applicationId);
      fd.set("code", c);
      await submitVerificationCode(fd);
    });
  };

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
      <p className="flex items-center gap-2 text-base font-medium text-amber-900">
        <MailCheck size={18} />
        Verify your email to finish applying
      </p>
      <p className="mt-2 text-sm text-amber-800">
        {prompt ?? "The employer emailed you a code. Enter it below to complete your application."}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-5"
      >
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          maxLength={len}
          autoComplete="one-time-code"
          placeholder={len ? "•".repeat(len) : "Enter code"}
          aria-label="Verification code"
          className="w-full rounded-xl border border-amber-300 bg-white px-5 py-4 text-center font-mono text-2xl tracking-[0.5em] text-foreground caret-amber-600 outline-none placeholder:text-2xl placeholder:tracking-[0.3em] placeholder:text-amber-300 focus:border-amber-500"
        />
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <button
            type="submit"
            disabled={pending || !code.trim()}
            className="rounded-full bg-[#19191a] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Submitting…" : "Submit code"}
          </button>
          <span className="text-xs text-amber-700">Check your inbox · keep this page open until it submits</span>
        </div>
      </form>
    </div>
  );
}
