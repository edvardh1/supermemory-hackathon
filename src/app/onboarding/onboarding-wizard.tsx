"use client";

import { useActionState, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@job-automation/core/database.types";
import { saveOnboarding, type OnboardingState } from "./actions";
import { AddressFields } from "./address-fields";

type ResumeState = "none" | "uploading" | "pending" | "parsed" | "failed";

const inputClass =
  "min-h-[45px] w-full rounded-full border border-border bg-transparent px-5 py-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-foreground";

const STEPS = [
  { section: "Resume", title: "Upload your resume" },
  { section: "About", title: "Tell us about you" },
  { section: "Contact", title: "How should we reach out?" },
  { section: "Work eligibility", title: "What's your work status?" },
  { section: "Preferences", title: "What should we suggest?" },
];

export function OnboardingWizard({
  userId,
  email,
  profile,
  prefs,
  resume,
}: {
  userId: string;
  email: string;
  profile: Tables<"profiles"> | null;
  prefs: Tables<"job_preferences"> | null;
  resume: Tables<"resume_data"> | null;
}) {
  const [step, setStep] = useState(0);
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    saveOnboarding,
    {}
  );

  const [resumeState, setResumeState] = useState<ResumeState>(
    resume?.parse_status === "parsed"
      ? "parsed"
      : resume?.parse_status === "failed"
        ? "failed"
        : profile?.resume_path
          ? "pending"
          : "none"
  );
  const [resumeHeadline, setResumeHeadline] = useState(resume?.headline ?? null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const wa = (profile?.work_authorization ?? {}) as {
    us?: boolean;
    needs_sponsorship?: boolean;
  };

  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  async function pollParseStatus() {
    const supabase = createClient();
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const { data } = await supabase
        .from("resume_data")
        .select("parse_status, headline")
        .eq("profile_id", userId)
        .maybeSingle();
      if (data && data.parse_status !== "pending") {
        setResumeState(data.parse_status === "parsed" ? "parsed" : "failed");
        setResumeHeadline(data.headline);
        return;
      }
    }
  }

  async function uploadResume(): Promise<boolean> {
    const file = fileRef.current?.files?.[0];
    if (!file) return true; // nothing to upload — allow skipping

    if (file.type !== "application/pdf") {
      setUploadError("Please upload a PDF.");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Resume must be under 10 MB.");
      return false;
    }

    setUploadError(null);
    setResumeState("uploading");
    const supabase = createClient();
    const path = `${userId}/resume.pdf`;
    const { error: upErr } = await supabase.storage
      .from("resumes")
      .upload(path, file, { upsert: true, contentType: "application/pdf" });
    if (upErr) {
      setUploadError(`Upload failed: ${upErr.message}`);
      setResumeState("none");
      return false;
    }
    await supabase.from("profiles").update({ resume_path: path }).eq("id", userId);

    // Kick off parsing in the background — don't block the wizard on it.
    setResumeState("pending");
    fetch("/api/resume/parse", { method: "POST" })
      .then(() => pollParseStatus())
      .catch(() => setResumeState("failed"));

    return true;
  }

  async function next() {
    setStepError(null);
    if (step === 0) {
      const ok = await uploadResume();
      if (!ok) return;
    }
    if (step === 1) {
      const name = (
        document.querySelector<HTMLInputElement>('input[name="full_name"]')?.value ?? ""
      ).trim();
      if (!name) {
        setStepError("Please enter your name.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      {/* Progress header */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">
          Step {step + 1} of {STEPS.length}
        </span>
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            className="text-muted hover:text-foreground"
          >
            ← Back
          </button>
        )}
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-black/[0.06]">
        <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-8 flex gap-8">
        {/* Sidebar */}
        <aside className="hidden w-48 shrink-0 md:block">
          <ResumeStatus state={resumeState} headline={resumeHeadline} />
          <p className="mt-6 text-xs font-medium text-foreground">Why we ask</p>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            Every application asks these. Answer once here, and we fill the forms for you.
          </p>
        </aside>

        {/* Step content */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {STEPS[step].section}
          </p>
          <h1 className="mt-2 text-[28px] font-semibold leading-9 tracking-[-0.4px] text-foreground">
            {STEPS[step].title}
          </h1>

          <form
            action={action}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLast) e.preventDefault();
            }}
            className="mt-6"
          >
            {/* Step 0 — Resume */}
            <Section show={step === 0}>
              <p className="text-sm text-muted">
                PDF only, under 10 MB. We parse it to pre-fill your profile and draft cover letters.
              </p>
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-10 text-center hover:border-foreground">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    setUploadError(null);
                    setFileName(e.target.files?.[0]?.name ?? null);
                  }}
                />
                <span className="text-sm font-medium text-foreground">
                  Drop your PDF here, or browse
                </span>
                <span className="mt-1 text-xs text-muted">Resume · PDF only · up to 10 MB</span>
              </label>
              <p className="mt-3 text-xs text-muted">
                {fileName
                  ? `Selected: ${fileName}`
                  : profile?.resume_path
                    ? "A resume is already on file — upload to replace it."
                    : ""}
              </p>
              {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
            </Section>

            {/* Step 1 — About */}
            <Section show={step === 1}>
              <Field label="Full name">
                <input name="full_name" defaultValue={profile?.full_name ?? ""} placeholder="Jane Doe" className={inputClass} />
              </Field>
              <Field label="Email">
                <input value={email} disabled className={`${inputClass} opacity-60`} />
              </Field>
              <AddressFields
                defaultAddress={profile?.address ?? ""}
                defaultCity={profile?.city ?? profile?.location ?? ""}
                defaultPostalCode={profile?.postal_code ?? ""}
                defaultCountry={profile?.country ?? ""}
              />
            </Section>

            {/* Step 2 — Contact */}
            <Section show={step === 2}>
              <p className="text-sm text-muted">
                Phone and LinkedIn show up on most applications.
              </p>
              <div className="mt-4 flex flex-col gap-4">
                <Field label="Phone">
                  <input name="phone" defaultValue={profile?.phone ?? ""} placeholder="+1 555 000 0000" className={inputClass} />
                </Field>
                <Field label="LinkedIn">
                  <input name="linkedin_url" defaultValue={profile?.linkedin_url ?? ""} placeholder="https://linkedin.com/in/…" className={inputClass} />
                </Field>
                <Field label="GitHub">
                  <input name="github_url" defaultValue={profile?.github_url ?? ""} placeholder="https://github.com/…" className={inputClass} />
                </Field>
                <Field label="Portfolio / website">
                  <input name="portfolio_url" defaultValue={profile?.portfolio_url ?? ""} placeholder="https://…" className={inputClass} />
                </Field>
              </div>
            </Section>

            {/* Step 3 — Work eligibility */}
            <Section show={step === 3}>
              <p className="text-sm text-muted">
                We use this to fill work-authorization questions and skip jobs you can&apos;t apply to.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <label className="flex items-center gap-2.5 text-sm text-foreground">
                  <input type="checkbox" name="authorized_us" defaultChecked={wa.us ?? false} className="accent-accent" />
                  I am authorized to work in the US
                </label>
                <label className="flex items-center gap-2.5 text-sm text-foreground">
                  <input type="checkbox" name="needs_sponsorship" defaultChecked={wa.needs_sponsorship ?? false} className="accent-accent" />
                  I now or in the future require visa sponsorship
                </label>
              </div>
            </Section>

            {/* Step 4 — Preferences */}
            <Section show={step === 4}>
              <p className="text-sm text-muted">Helps us suggest the right roles.</p>
              <div className="mt-4 flex flex-col gap-4">
                <Field label="Target titles (comma-separated)">
                  <input name="titles" defaultValue={prefs?.titles?.join(", ") ?? ""} placeholder="Software Engineer, Backend Engineer" className={inputClass} />
                </Field>
                <Field label="Minimum salary (optional)">
                  <input name="min_salary" type="number" defaultValue={prefs?.min_salary ?? ""} placeholder="120000" className={inputClass} />
                </Field>
                <label className="flex items-center gap-2.5 text-sm text-foreground">
                  <input type="checkbox" name="remote_only" defaultChecked={prefs?.remote_only ?? false} className="accent-accent" />
                  Remote roles only
                </label>
              </div>
            </Section>

            {(stepError || state.error) && (
              <p className="mt-4 text-sm text-red-600">{stepError ?? state.error}</p>
            )}

            {/* Nav */}
            <div className="mt-8">
              {isLast ? (
                <button
                  type="submit"
                  disabled={pending}
                  className="min-h-[45px] rounded-full bg-[#19191a] px-6 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Finish setup"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  disabled={resumeState === "uploading"}
                  className="min-h-[45px] rounded-full bg-[#19191a] px-6 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  {resumeState === "uploading"
                    ? "Uploading…"
                    : step === 0 && !fileName
                      ? "Skip for now"
                      : "Continue"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function ResumeStatus({ state, headline }: { state: ResumeState; headline: string | null }) {
  const label =
    state === "parsed"
      ? "Parsed"
      : state === "pending" || state === "uploading"
        ? "In progress"
        : state === "failed"
          ? "Needs attention"
          : "Not uploaded";
  const dot =
    state === "parsed"
      ? "bg-green-500"
      : state === "failed"
        ? "bg-orange-500"
        : state === "none"
          ? "bg-neutral-300"
          : "bg-blue-500";
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Resume</span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {label}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">
        {state === "parsed"
          ? headline ?? "We pulled your work history and skills."
          : state === "pending"
            ? "Parsing your resume while you finish setup…"
            : state === "failed"
              ? "We couldn't parse it — you can still finish setup."
              : "Upload your resume and we'll pre-fill the rest."}
      </p>
    </div>
  );
}

function Section({ show, children }: { show: boolean; children: React.ReactNode }) {
  return <div className={show ? "flex flex-col gap-4" : "hidden"}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
