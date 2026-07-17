import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPostedAt, formatSalary } from "@/lib/format";
import {
  CATEGORIES, WORKPLACE_FILTERS, type WorkplaceType,
} from "@job-automation/core/categorize";
import { CompanyLogo } from "./company-logo";
import { JobFilters } from "./job-filters";
import { ProviderBadge } from "./provider-badge";

const PAGE_SIZE = 25;

const DAYS: Record<string, number> = { "1": 1, "3": 3, "7": 7, "30": 30 };
const PROVIDERS = ["ashby", "greenhouse", "lever", "workday"] as const;
const EMPLOYMENT_VARIANTS: Record<string, string[]> = {
  "full-time": ["full-time", "Full Time", "Full-Time", "fulltime", "FullTime"],
  "part-time": ["part-time", "Part Time", "Part-Time"],
  contract: ["contract", "Contract", "Contractor", "Full Time Contractor"],
  internship: ["internship", "Internship", "Intern"],
};

interface JobsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export const dynamic = "force-dynamic";

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const sp = await searchParams;
  const currentPage = Math.max(1, Number(sp.page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;

  const supabase = await createClient();

  // Company list powers the searchable Company filter and validates its param.
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");
  const companyList = companies ?? [];

  // Validate each filter against known values so a bad param can't break the
  // query (e.g. a non-uuid company id would throw a Postgres cast error).
  const q = (sp.q ?? "").trim();
  const scope = sp.scope === "all" ? "all" : "title";
  const date = sp.date && DAYS[sp.date] ? sp.date : "";
  const role = CATEGORIES.includes(sp.role as (typeof CATEGORIES)[number]) ? sp.role! : "";
  const provider = (PROVIDERS as readonly string[]).includes(sp.provider ?? "")
    ? (sp.provider as (typeof PROVIDERS)[number])
    : "";
  const workplace = WORKPLACE_FILTERS.find((w) => w.value === sp.workplace)?.value ?? "";
  const employment = sp.employment && EMPLOYMENT_VARIANTS[sp.employment] ? sp.employment : "";
  const salary = sp.salary && Number(sp.salary) > 0 ? Number(sp.salary) : 0;
  const company = sp.company && companyList.some((c) => c.id === sp.company) ? sp.company : "";
  const location = (sp.location ?? "").trim();

  let query = supabase
    .from("jobs")
    .select(
      "id, title, platform, location, is_remote, workplace_type, category, salary_min, salary_max, salary_currency, posted_at, companies(name, logo_url)",
      { count: "exact" }
    )
    .eq("status", "open");

  if (q) {
    // Strip chars that break PostgREST's or() grammar before interpolating.
    const safe = q.replace(/[,()%*]/g, " ").trim();
    if (safe) {
      query =
        scope === "all"
          ? query.or(`title.ilike.%${safe}%,description_md.ilike.%${safe}%`)
          : query.ilike("title", `%${safe}%`);
    }
  }
  if (date) {
    const since = new Date(Date.now() - DAYS[date] * 86_400_000).toISOString();
    query = query.gte("posted_at", since);
  }
  if (role) query = query.eq("category", role);
  if (provider) query = query.eq("platform", provider);
  if (workplace) query = query.eq("workplace_type", workplace as WorkplaceType);
  if (employment) query = query.in("employment_type", EMPLOYMENT_VARIANTS[employment]);
  if (salary) query = query.gte("salary_max", salary);
  if (company) query = query.eq("company_id", company);
  if (location) query = query.ilike("location", `%${location}%`);

  const { data: jobs, count, error } = await query
    .order("posted_at", { ascending: false, nullsFirst: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) throw new Error(`Failed to load jobs: ${error.message}`);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageUrl = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v && k !== "page") params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/jobs?${qs}` : "/jobs";
  };

  const workplaceLabel = (w: WorkplaceType) =>
    WORKPLACE_FILTERS.find((f) => f.value === w)?.label;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-14">
      <h1 className="text-[32px] font-semibold leading-[38px] tracking-[-0.4px] text-foreground">
        Jobs
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        {total.toLocaleString()} open position{total === 1 ? "" : "s"}
      </p>

      <div className="mt-6">
        <JobFilters companies={companyList} />
      </div>

      <ul className="mt-8 space-y-3.5">
        {jobs.map((job) => {
          const salaryText = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
          const posted = formatPostedAt(job.posted_at);
          const wp =
            job.workplace_type && job.workplace_type !== "unspecified"
              ? workplaceLabel(job.workplace_type)
              : null;
          return (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}`}
                className="flex items-start gap-4 rounded-xl bg-background p-5 shadow-card transition-shadow hover:shadow-[rgba(0,0,0,0.08)_0px_1px_16px_0px,rgba(0,0,0,0.12)_0px_1px_2px_0px,rgba(0,0,0,0.06)_0px_0px_0px_0.5px,rgba(0,0,0,0.08)_0px_4px_24px_0px]"
              >
                <CompanyLogo name={job.companies?.name ?? "?"} logoUrl={job.companies?.logo_url} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-semibold text-foreground">{job.title}</span>
                    {posted && <span className="shrink-0 text-xs text-muted">{posted}</span>}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    <ProviderBadge platform={job.platform} />
                    <span>{job.companies?.name}</span>
                    {job.location && <span>· {job.location.slice(0, 80)}</span>}
                    {wp && <span>· {wp}</span>}
                    {salaryText && <span>· {salaryText}</span>}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {jobs.length === 0 && (
        <p className="mt-10 text-sm text-muted">No jobs match your filters.</p>
      )}

      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-between text-sm">
          {currentPage > 1 ? (
            <Link href={pageUrl(currentPage - 1)} className="font-normal text-muted underline">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">Page {currentPage} of {totalPages}</span>
          {currentPage < totalPages ? (
            <Link href={pageUrl(currentPage + 1)} className="font-normal text-muted underline">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
