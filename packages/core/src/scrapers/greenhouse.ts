import { decodeHtmlEntities, htmlToMarkdown } from "./html";
import { categorizeTitle, normalizeWorkplaceType } from "../categorize";
import type { NormalizedJob } from "./types";

// Greenhouse public job board API:
// GET https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string } | null;
  offices: { name: string }[];
  departments: { name: string }[];
  content: string; // entity-escaped HTML
  first_published: string | null;
  updated_at: string | null;
  company_name?: string;
  metadata: unknown;
}

interface GreenhouseBoard {
  jobs: GreenhouseJob[];
  meta?: { total: number };
}

export async function fetchGreenhouseBoard(board: string): Promise<GreenhouseBoard> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,
    { headers: { accept: "application/json" }, cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Greenhouse API returned ${res.status} for board "${board}"`);
  }

  return res.json();
}

export function normalizeGreenhouseJob(job: GreenhouseJob): NormalizedJob {
  const location = job.location?.name ?? null;

  return {
    platform: "greenhouse",
    external_id: String(job.id),
    url: job.absolute_url,
    title: job.title,
    description_md: htmlToMarkdown(decodeHtmlEntities(job.content)),
    location,
    is_remote: location ? /remote/i.test(location) : null,
    workplace_type: normalizeWorkplaceType(null, location ? /remote/i.test(location) : null),
    category: categorizeTitle(job.title),
    employment_type: null, // not exposed by the Greenhouse board API
    department: job.departments[0]?.name ?? null,
    team: null,
    salary_min: null, // Greenhouse only publishes pay ranges inside the description
    salary_max: null,
    salary_currency: null,
    compensation_raw: null,
    status: "open",
    posted_at: job.first_published,
    closed_at: null,
    raw: JSON.parse(JSON.stringify({ ...job, content: undefined })),
  };
}

export async function scrapeGreenhouse(board: string): Promise<NormalizedJob[]> {
  const data = await fetchGreenhouseBoard(board);
  return data.jobs.map(normalizeGreenhouseJob);
}
