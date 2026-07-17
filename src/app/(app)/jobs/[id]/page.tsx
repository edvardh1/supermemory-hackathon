import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/server";
import { formatPostedAt, formatSalary } from "@/lib/format";
import { ApplyButton } from "./apply-button";
import { ProviderBadge } from "../provider-badge";

interface JobPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ apply_error?: string }>;
}

export const dynamic = "force-dynamic";

export default async function JobPage({ params, searchParams }: JobPageProps) {
  const { id } = await params;
  const { apply_error } = await searchParams;

  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("*, companies(name, website)")
    .eq("id", id)
    .maybeSingle();

  if (!job) notFound();

  const canAutoApply =
    (job.platform === "ashby" || job.platform === "greenhouse" || job.platform === "lever") &&
    job.status === "open";

  // Has the user already applied / prepared an application for this job?
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: existing } = user
    ? await supabase
        .from("applications")
        .select("id, status")
        .eq("job_id", id)
        .eq("profile_id", user.id)
        .maybeSingle()
    : { data: null };

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  const posted = formatPostedAt(job.posted_at);

  const headline = [job.companies?.name, job.location, job.is_remote ? "Remote" : null]
    .filter(Boolean)
    .join(" · ");

  const overview = ([
    ["Company", job.companies?.name],
    ["Location", job.location],
    ["Work model", job.is_remote ? "Remote" : null],
    ["Employment", job.employment_type],
    ["Department", job.department],
    ["Compensation", salary ?? job.compensation_raw],
    ["Posted", posted],
  ] as [string, string | null | undefined][]).filter(([, v]) => Boolean(v)) as [string, string][];

  const ctaClass =
    "inline-flex min-h-[45px] w-full items-center justify-center rounded-full bg-[#19191a] px-5 py-3 text-sm font-medium text-white hover:opacity-90";

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <Link href="/jobs" className="text-sm font-normal text-muted underline">
        ← All jobs
      </Link>

      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          <ProviderBadge platform={job.platform} />
          {job.status !== "open" && (
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs capitalize text-muted">
              {job.status}
            </span>
          )}
        </div>
        <h1 className="mt-3 text-[32px] font-semibold leading-[38px] tracking-[-0.4px] text-foreground">
          {job.title}
        </h1>
        {headline && <p className="mt-2 text-sm text-muted">{headline}</p>}
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Description */}
        <div className="min-w-0">
          {job.description_md ? (
            <section className="overflow-hidden rounded-2xl bg-background shadow-card">
              <div className="flex items-center gap-2.5 border-b border-border px-6 py-4 sm:px-8">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.05] text-foreground">
                  <FileText size={16} />
                </span>
                <h2 className="text-sm font-semibold text-foreground">About this role</h2>
              </div>
              <article className="px-6 py-7 text-[15px] leading-7 text-foreground/80 sm:px-8 [&_*:first-child]:mt-0 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_h1]:mt-8 [&_h1]:mb-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:tracking-[-0.2px] [&_h1]:text-foreground [&_h2]:mt-8 [&_h2]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:mb-1 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-foreground [&_h4]:mt-5 [&_h4]:font-semibold [&_h4]:text-foreground [&_hr]:my-6 [&_hr]:border-border [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_ol]:marker:text-muted [&_p]:mt-4 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:marker:text-muted/60">
                <ReactMarkdown>{job.description_md}</ReactMarkdown>
              </article>
            </section>
          ) : (
            <div className="rounded-2xl bg-background p-6 text-sm text-muted shadow-card">
              No description provided for this listing.
            </div>
          )}
        </div>

        {/* Sticky apply + overview */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <div className="flex flex-col gap-3 rounded-2xl bg-background p-5 shadow-card">
            {existing ? (
              <Link href={`/applications/${existing.id}`} className={ctaClass}>
                {existing.status === "submitted" ? "View application" : "Review & submit"}
              </Link>
            ) : canAutoApply ? (
              <ApplyButton jobId={job.id} />
            ) : (
              <a href={job.url} target="_blank" rel="noopener noreferrer" className={ctaClass}>
                Apply on {job.platform}
              </a>
            )}
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-sm text-muted underline"
            >
              View job posting ↗
            </a>
            {apply_error && (
              <p className="text-sm text-red-600">
                {apply_error === "prepare"
                  ? "We couldn't prepare this application. Please try again."
                  : "Automatic apply isn't available for this job."}
              </p>
            )}
          </div>

          {overview.length > 0 && (
            <div className="rounded-2xl bg-background p-5 shadow-card">
              <h2 className="text-sm font-semibold text-foreground">Overview</h2>
              <dl className="mt-3 flex flex-col gap-2.5">
                {overview.map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-4">
                    <dt className="shrink-0 text-xs text-muted">{k}</dt>
                    <dd className="text-right text-sm text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
