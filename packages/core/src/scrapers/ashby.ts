import { htmlToMarkdown } from "./html";
import { categorizeTitle, normalizeWorkplaceType } from "../categorize";
import type { NormalizedJob } from "./types";

// Ashby public job board API:
// GET https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true

interface AshbyCompensationComponent {
  compensationType: string;
  interval: string | null;
  currencyCode: string | null;
  minValue: number | null;
  maxValue: number | null;
}

interface AshbyCompensation {
  compensationTierSummary: string | null;
  scrapeableCompensationSalarySummary: string | null;
  summaryComponents: AshbyCompensationComponent[] | null;
}

export interface AshbyJob {
  id: string;
  title: string;
  department: string | null;
  team: string | null;
  employmentType: string | null;
  location: string | null;
  secondaryLocations: { location: string }[];
  publishedAt: string | null;
  isListed: boolean;
  isRemote: boolean | null;
  workplaceType: string | null;
  jobUrl: string;
  applyUrl: string;
  descriptionHtml: string | null;
  descriptionPlain: string | null;
  compensation?: AshbyCompensation | null;
}

export interface AshbyBoard {
  apiVersion: string;
  jobs: AshbyJob[];
}

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  FullTime: "full-time",
  PartTime: "part-time",
  Intern: "internship",
  Contract: "contract",
  Temporary: "temporary",
};

export async function fetchAshbyBoard(board: string): Promise<AshbyBoard> {
  const res = await fetch(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`,
    { headers: { accept: "application/json" }, cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Ashby API returned ${res.status} for board "${board}"`);
  }

  return res.json();
}

export function normalizeAshbyJob(job: AshbyJob): NormalizedJob {
  const salary = job.compensation?.summaryComponents?.find(
    (c) => c.compensationType === "Salary"
  );

  const locations = [
    job.location,
    ...job.secondaryLocations.map((l) => l.location),
  ].filter(Boolean);

  return {
    platform: "ashby",
    external_id: job.id,
    url: job.jobUrl,
    title: job.title,
    description_md: htmlToMarkdown(job.descriptionHtml, job.descriptionPlain ?? null),
    location: locations.length > 0 ? locations.join("; ") : null,
    is_remote: job.isRemote ?? job.workplaceType === "Remote",
    workplace_type: normalizeWorkplaceType(job.workplaceType, job.isRemote),
    category: categorizeTitle(job.title),
    employment_type: job.employmentType
      ? (EMPLOYMENT_TYPE_MAP[job.employmentType] ?? job.employmentType)
      : null,
    department: job.department,
    team: job.team,
    salary_min: salary?.minValue ?? null,
    salary_max: salary?.maxValue ?? null,
    salary_currency: salary?.currencyCode ?? null,
    compensation_raw: job.compensation?.compensationTierSummary ?? null,
    status: "open",
    posted_at: job.publishedAt,
    closed_at: null,
    raw: JSON.parse(JSON.stringify({ ...job, descriptionHtml: undefined })),
  };
}

export async function scrapeAshby(board: string): Promise<NormalizedJob[]> {
  const data = await fetchAshbyBoard(board);
  return data.jobs.filter((j) => j.isListed).map(normalizeAshbyJob);
}
