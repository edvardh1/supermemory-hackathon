"use client";

import { useFormStatus } from "react-dom";
import { prepareApplication } from "./actions";

function Button() {
  const { pending } = useFormStatus();
  return (
    <>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[45px] w-full items-center justify-center rounded-full bg-[#19191a] px-5 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-70"
      >
        {pending ? "Preparing your application…" : "Apply automatically"}
      </button>

      {pending && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background/85 backdrop-blur-sm">
          <span
            aria-hidden
            className="h-9 w-9 animate-spin rounded-full border-2 border-black/15 border-t-foreground"
          />
          <div className="max-w-xs text-center">
            <p className="text-sm font-medium text-foreground">Preparing your application…</p>
            <p className="mt-1 text-sm text-muted">
              Our AI is reading the posting and filling in the form. This takes a few seconds.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export function ApplyButton({ jobId }: { jobId: string }) {
  return (
    <form action={prepareApplication}>
      <input type="hidden" name="jobId" value={jobId} />
      <Button />
    </form>
  );
}
