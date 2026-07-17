import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationPlan } from "@/lib/appliers/plan";
import { planHasCoverLetter } from "@/lib/appliers/plan";
import { STATUS_CLASSES, STATUS_LABELS } from "@/lib/application-status";
import { CompanyLogo } from "../../jobs/company-logo";
import { ReviewForm } from "./review-form";
import { VerificationCode } from "./verification-code";
import { LiveStatus } from "./live-status";

export const dynamic = "force-dynamic";

const ARTIFACT_BUCKET = "application-artifacts";

type ShotMeta = { label: string; path: string; at?: string; url?: string };

function collectScreenshotPaths(events: { event_type: string; detail: unknown }[]): ShotMeta[] {
  const out: ShotMeta[] = [];
  const seen = new Set<string>();
  for (const ev of events) {
    const d = (ev.detail ?? {}) as {
      screenshotPath?: string;
      screenshots?: { label?: string; path?: string; at?: string }[];
    };
    if (Array.isArray(d.screenshots)) {
      for (const s of d.screenshots) {
        if (!s?.path || seen.has(s.path)) continue;
        seen.add(s.path);
        out.push({ label: s.label || "shot", path: s.path, at: s.at });
      }
    }
    if (d.screenshotPath && !seen.has(d.screenshotPath)) {
      seen.add(d.screenshotPath);
      out.push({ label: "final", path: d.screenshotPath });
    }
  }
  return out;
}

export default async function ApplicationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, status, error, verification, answers, job_id, jobs(title, url, companies(name, logo_url))")
    .eq("id", id)
    .maybeSingle();

  if (!application) notFound();

  const { data: events } = await supabase
    .from("application_events")
    .select("event_type, detail, created_at")
    .eq("application_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const shotMeta = collectScreenshotPaths(events ?? []);
  const shots: ShotMeta[] = [];
  for (const s of shotMeta) {
    const { data } = await supabase.storage
      .from(ARTIFACT_BUCKET)
      .createSignedUrl(s.path, 60 * 60); // 1h
    if (data?.signedUrl) shots.push({ ...s, url: data.signedUrl });
  }

  const plan = application.answers as unknown as ApplicationPlan | null;
  const job = application.jobs;
  // Failed applications are re-queueable: reopen the review form so the user can
  // check/adjust the answers and re-submit (which puts it back in the queue).
  const editable =
    application.status === "draft" ||
    application.status === "needs_review" ||
    application.status === "failed";

  // The worker pauses mid-submit when the ATS emails a verification code.
  const verification = application.verification as
    | { awaiting_code?: boolean; prompt?: string; code?: string | null }
    | null;
  const awaitingCode = Boolean(verification?.awaiting_code && !verification?.code);
  const codeSubmitted = Boolean(verification?.awaiting_code && verification?.code);

  // While the worker is actively processing (auto mode especially), keep the
  // page live so the user sees it progress to a confirmation / OTP prompt.
  const isWorking =
    application.status === "queued" || application.status === "in_progress" || codeSubmitted;

  const statusMessage: Record<string, string> = {
    queued: "Queued — the apply worker will submit this shortly.",
    in_progress: "Applying now — filling and submitting the form on the employer's site.",
    submitted: `Submitted to ${job?.companies?.name ?? "the employer"}.`,
    failed: "Submission failed. You can review and re-queue it.",
    withdrawn: "This application was withdrawn.",
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/applications" className="text-sm text-muted underline">
        ← Applications
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <CompanyLogo
            name={job?.companies?.name ?? "?"}
            logoUrl={job?.companies?.logo_url}
            size={44}
          />
          <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-8 tracking-[-0.4px] text-foreground">
            {job?.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {job?.companies?.name}
            {job?.url && (
              <>
                {" · "}
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  View job posting ↗
                </a>
              </>
            )}
          </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[application.status]}`}
        >
          {STATUS_LABELS[application.status]}
        </span>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {(awaitingCode || codeSubmitted) && (
          <VerificationCode
            applicationId={application.id}
            prompt={verification?.prompt}
            submitted={codeSubmitted}
          />
        )}

        {editable && plan?.fields ? (
          <div className="flex flex-col gap-4">
            {application.status === "failed" && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">Last submission failed</p>
                <p className="mt-1 text-sm text-red-700">
                  {application.error ?? "Something went wrong."} Review the answers below and
                  submit again to re-queue it.
                </p>
              </div>
            )}
            <ReviewForm
              applicationId={application.id}
              companyName={job?.companies?.name ?? "this company"}
              fields={plan.fields}
              coverLetter={plan.coverLetter ?? null}
              showCoverLetter={planHasCoverLetter(plan)}
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-background p-6 shadow-card">
            <div className="flex items-center gap-3">
              {isWorking && (
                <span
                  aria-hidden
                  className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-black/15 border-t-foreground"
                />
              )}
              <p className="text-sm font-medium text-foreground">
                {application.status === "submitted"
                  ? "Application submitted 🎉"
                  : isWorking
                    ? "Applying…"
                    : STATUS_LABELS[application.status]}
              </p>
            </div>
            <p className="mt-2 text-sm text-muted">
              {statusMessage[application.status] ?? "Application recorded."}
            </p>
          </div>
        )}
        {isWorking && <LiveStatus />}

        {shots.length > 0 && (
          <details className="group rounded-2xl bg-background shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
              <span className="text-sm font-medium text-foreground">
                Automation screenshots <span className="text-muted">({shots.length})</span>
              </span>
              <span className="text-xs text-muted">
                <span className="group-open:hidden">Show</span>
                <span className="hidden group-open:inline">Hide</span>
              </span>
            </summary>
            <ul className="flex flex-col gap-6 border-t border-border px-5 py-5">
              {shots.map((s) => (
                <li key={s.path}>
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">{s.label}</span>
                    {s.at && (
                      <span className="text-[11px] text-muted">
                        {new Date(s.at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg border border-black/5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.url} alt={`Screenshot: ${s.label}`} className="h-auto w-full" />
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
