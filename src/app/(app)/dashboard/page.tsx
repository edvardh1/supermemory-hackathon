import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { STATUS_CLASSES, STATUS_LABELS } from "@/lib/application-status";
import { formatPostedAt } from "@/lib/format";
import { CompanyLogo } from "../jobs/company-logo";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: apps }, { count: openJobs }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle(),
    supabase
      .from("applications")
      .select("id, status, updated_at, jobs(title, companies(name, logo_url))")
      .order("updated_at", { ascending: false }),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const applications = apps ?? [];
  const count = (s: string) => applications.filter((a) => a.status === s).length;

  const stats = [
    { label: "Total applications", value: applications.length },
    { label: "Submitted", value: count("submitted") },
    { label: "Needs you", value: count("needs_review") },
    { label: "In flight", value: count("queued") + count("in_progress") },
  ];

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-14">
      <h1 className="text-[32px] font-semibold leading-[38px] tracking-[-0.4px] text-foreground">
        {firstName ? `Welcome back, ${firstName}` : "Dashboard"}
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        {(openJobs ?? 0).toLocaleString()} open positions to explore.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-background p-5 shadow-card">
            <div className="text-2xl font-semibold text-foreground">{s.value}</div>
            <div className="mt-1 text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Recent activity</h2>
        <Link href="/applications" className="text-sm text-muted underline">
          View all
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="mt-4 rounded-xl bg-background p-8 text-center shadow-card">
          <p className="text-sm text-muted">
            You haven&apos;t applied to anything yet.
          </p>
          <Link
            href="/jobs"
            className="mt-4 inline-flex min-h-[45px] items-center justify-center rounded-full bg-[#19191a] px-5 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Browse jobs
          </Link>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_28px] items-center gap-4 border-b border-border px-5 py-2.5 text-xs font-medium text-muted sm:grid-cols-[1fr_180px_130px_28px]">
            <span>Application</span>
            <span className="hidden sm:block">Company</span>
            <span>Status</span>
            <span />
          </div>

          {/* Rows */}
          {applications.slice(0, 6).map((a) => {
            const company = a.jobs?.companies?.name ?? null;
            return (
              <Link
                key={a.id}
                href={`/applications/${a.id}`}
                className="grid grid-cols-[1fr_auto_28px] items-center gap-4 border-b border-border px-5 py-3.5 transition-colors last:border-0 hover:bg-black/[0.02] sm:grid-cols-[1fr_180px_130px_28px]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CompanyLogo name={company ?? "?"} logoUrl={a.jobs?.companies?.logo_url} size={32} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {a.jobs?.title ?? "Job"}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {formatPostedAt(a.updated_at)}
                    </div>
                  </div>
                </div>
                <div className="hidden truncate text-sm text-muted sm:block">{company ?? "—"}</div>
                <span
                  className={`justify-self-start rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[a.status]}`}
                >
                  {STATUS_LABELS[a.status]}
                </span>
                <ChevronRight size={16} className="justify-self-end text-muted" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
