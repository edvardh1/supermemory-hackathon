"use client";

import { useActionState } from "react";
import type { PlannedField } from "@/lib/appliers/plan";
import {
  submitApplication, cancelApplication,
  type SubmitState,
} from "./actions";

const inputClass =
  "min-h-[42px] w-full rounded-lg border border-border bg-transparent px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-foreground";

function needsYou(f: PlannedField) {
  return (
    f.resolution === "needs_user" ||
    f.resolution === "needs_selection" ||
    f.resolution === "needs_generation" ||
    f.resolution === "missing_data"
  );
}

export function ReviewForm({
  applicationId,
  companyName,
  fields,
  coverLetter,
  showCoverLetter,
}: {
  applicationId: string;
  companyName: string;
  fields: PlannedField[];
  coverLetter?: string | null;
  showCoverLetter?: boolean;
}) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitApplication, {});

  // Fields AI couldn't answer from your profile — you still need to fill these.
  const openCount = fields.filter((f) => needsYou(f) && f.type !== "File").length;

  return (
    <form action={action}>
      <input type="hidden" name="applicationId" value={applicationId} />

      <div className="rounded-xl bg-background p-6 shadow-card">
        <div>
          <p className="text-sm font-medium text-foreground">
            Filled in with AI — review before submit
          </p>
          <p className="mt-1 text-sm text-muted">
            We drafted your answers for {companyName} from your profile. Edit anything, then submit.
            {openCount > 0 && (
              <>
                {" "}
                <span className="text-orange-600">{openCount}</span> field{openCount === 1 ? "" : "s"} marked{" "}
                <span className="text-orange-600">Needs you</span> still need an answer.
              </>
            )}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-5">
          {fields.map((field) => (
            <FieldControl key={`${field.path}:${String(field.value ?? "")}`} field={field} />
          ))}
        </div>
      </div>

      {showCoverLetter && (
        <div className="mt-4 rounded-xl bg-background p-6 shadow-card">
          <p className="text-sm font-medium text-foreground">Cover letter</p>
          <p className="mt-1 text-sm text-muted">
            AI-drafted for this role — edit anything before you submit.
          </p>
          <textarea
            name="__cover_letter"
            defaultValue={coverLetter ?? ""}
            rows={14}
            placeholder="Write or paste a cover letter…"
            className="mt-4 w-full rounded-lg border border-border bg-transparent px-3.5 py-3 text-sm leading-6 text-foreground outline-none focus:border-foreground"
          />
        </div>
      )}

      {state.error && <p className="mt-4 text-sm text-red-600">{state.error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-[45px] rounded-full bg-[#19191a] px-6 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit application"}
        </button>
        <button
          type="submit"
          formAction={cancelApplication}
          className="min-h-[45px] rounded-full px-5 py-3 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function FieldControl({ field }: { field: PlannedField }) {
  const value = typeof field.value === "boolean" ? String(field.value) : (field.value ?? "");
  const strValue = Array.isArray(value) ? value.join(", ") : String(value);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted">
        <span>
          {field.title}
          {field.isRequired && <span className="text-red-500"> *</span>}
        </span>
        {needsYou(field) && <span className="text-orange-600 normal-case">Needs you</span>}
      </span>

      {/* Resume / cover-letter files are locked to the profile */}
      {field.type === "File" ? (
        <div className="rounded-lg border border-border bg-black/[0.02] px-3.5 py-2.5 text-sm text-muted">
          {field.value ? "From your profile" : "(no file)"} — managed in your profile
        </div>
      ) : field.type === "Boolean" ? (
        <BooleanControl field={field} value={strValue} />
      ) : (field.type === "ValueSelect" || field.type === "MultiValueSelect") && field.options?.length ? (
        <select name={field.path} defaultValue={strValue} className={inputClass}>
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.type === "LongText" ? (
        <textarea name={field.path} defaultValue={strValue} rows={4} className={`${inputClass} min-h-[80px]`} />
      ) : (
        <input
          name={field.path}
          type={field.type === "Date" ? "date" : "text"}
          defaultValue={strValue}
          className={inputClass}
        />
      )}
    </label>
  );
}

function BooleanControl({ field, value }: { field: PlannedField; value: string }) {
  return (
    <div className="flex gap-2">
      {["true", "false"].map((v) => (
        <label
          key={v}
          className="flex-1 cursor-pointer rounded-lg border border-border px-3 py-2 text-center text-sm text-foreground has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-background"
        >
          <input
            type="radio"
            name={field.path}
            value={v}
            defaultChecked={value === v}
            className="sr-only"
          />
          {v === "true" ? "Yes" : "No"}
        </label>
      ))}
    </div>
  );
}
