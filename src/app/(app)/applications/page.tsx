import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ALL_STATUSES,
  STATUS_CLASSES,
  STATUS_LABELS,
} from "@/lib/application-status";
import { formatPostedAt } from "@/lib/format";
import { CompanyLogo } from "../jobs/company-logo";
import { requeueApplication } from "./actions";

export const dynamic = "force-dynamic";

interface ApplicationsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const { status } = await searchParams;
  const activeStatus = ALL_STATUSES.find((s) => s === status);

  const supabase = await createClient();

  let query = supabase
    .from("applications")
    .select(
      "id, status, updated_at, submitted_at, job_id, jobs(title, location, platform, companies(name, logo_url))"
    )
    .order("updated_at", { ascending: false });
  if (activeStatus) query = query.eq("status", activeStatus);

  const { data: apps, error } = await query;
  if (error) throw new Error(`Failed to load applications: ${error.message}`);

  const applications = apps ?? [];

  const tab = (label: string, href: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors ${
        active
          ? "bg-[#19191a] font-medium text-white"
          : "border border-border text-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-14">
      <h1 className="text-[32px] font-semibold leading-[38px] tracking-[-0.4px] text-foreground">
        Applications
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        {applications.length} {activeStatus ? STATUS_LABELS[activeStatus].toLowerCase() : ""}{" "}
        application{applications.length === 1 ? "" : "s"}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {tab("All", "/applications", !activeStatus)}
        {ALL_STATUSES.map((s) =>
          tab(STATUS_LABELS[s], `/applications?status=${s}`, activeStatus === s)
        )}
      </div>

      {applications.length === 0 ? (
        <div className="mt-8 rounded-xl bg-background p-8 text-center shadow-card">
          <p className="text-sm text-muted">No applications here yet.</p>
          <Link
            href="/jobs"
            className="mt-4 inline-flex min-h-[45px] items-center justify-center rounded-full bg-[#19191a] px-5 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Browse jobs
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {applications.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-4 rounded-xl bg-background p-4 shadow-card transition-shadow hover:shadow-[rgba(0,0,0,0.08)_0px_1px_16px_0px,rgba(0,0,0,0.12)_0px_1px_2px_0px,rgba(0,0,0,0.06)_0px_0px_0px_0.5px,rgba(0,0,0,0.08)_0px_4px_24px_0px]"
            >
              <Link href={`/jobs/${a.job_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <CompanyLogo
                  name={a.jobs?.companies?.name ?? "?"}
                  logoUrl={a.jobs?.companies?.logo_url}
                  size={40}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {a.jobs?.title ?? "Job"}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {a.jobs?.companies?.name}
                    {a.jobs?.location ? ` · ${a.jobs.location.slice(0, 60)}` : ""}
                    {" · "}
                    {a.submitted_at
                      ? `Applied ${formatPostedAt(a.submitted_at)}`
                      : `Updated ${formatPostedAt(a.updated_at)}`}
                  </div>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-2.5">
                {a.status === "failed" && (
                  <form action={requeueApplication}>
                    <input type="hidden" name="applicationId" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:border-foreground"
                    >
                      Retry
                    </button>
                  </form>
                )}
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[a.status]}`}
                >
                  {STATUS_LABELS[a.status]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
