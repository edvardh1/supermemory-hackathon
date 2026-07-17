import { categorizeTitle, normalizeWorkplaceType } from "../categorize";
import type { NormalizedJob } from "./types";

// Workday public jobs API. Each tenant hosts its board at
//   https://{tenant}.{dc}.myworkdayjobs.com/{site}
// and exposes a JSON search endpoint:
//   POST https://{tenant}.{dc}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
// We encode the board identifier as "tenant:dc:site" (e.g.
// "nvidia:wd5:NVIDIAExternalCareerSite") since a single slug isn't enough.

interface WorkdayPosting {
  title: string;
  externalPath: string;
  locationsText: string | null;
  postedOn: string | null;
  bulletFields: string[];
}

interface WorkdayJobsResponse {
  total: number;
  jobPostings: WorkdayPosting[];
}

function parseBoard(board: string): { tenant: string; dc: string; site: string; host: string } {
  const [tenant, dc, site] = board.split(":");
  if (!tenant || !dc || !site) {
    throw new Error(`Invalid Workday board "${board}" — expected "tenant:dc:site"`);
  }
  return { tenant, dc, site, host: `${tenant}.${dc}.myworkdayjobs.com` };
}

/** Workday lists a relative "Posted 5 Days Ago" — approximate it as a date. */
function parsePostedOn(text: string | null): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/today|just posted/.test(t)) return new Date().toISOString();
  if (/yesterday/.test(t)) return new Date(Date.now() - 86_400_000).toISOString();
  const days = t.match(/(\d+)\+?\s*day/);
  if (days) return new Date(Date.now() - Number(days[1]) * 86_400_000).toISOString();
  const months = t.match(/(\d+)\+?\s*month/);
  if (months) return new Date(Date.now() - Number(months[1]) * 30 * 86_400_000).toISOString();
  return null;
}

/**
 * How many postings to pull from a single Workday board. Mega-boards
 * (e.g. NVIDIA's ~2,000 open roles, ~75 posted/day) otherwise flood the
 * "recent" feed and bury every other company. Workday returns newest-first
 * with honest, monotonically-older dates as you page deeper, so this cap keeps
 * the freshest roles and lets stale ones age out cleanly. Tune via
 * WORKDAY_MAX_POSTINGS; 0 or negative disables the cap.
 */
export const WORKDAY_MAX_POSTINGS = (() => {
  const raw = Number(process.env.WORKDAY_MAX_POSTINGS);
  if (Number.isFinite(raw) && raw > 0) return raw;
  if (Number.isFinite(raw) && raw <= 0) return Infinity;
  return 300;
})();

export async function fetchWorkdayPostings(board: string): Promise<WorkdayPosting[]> {
  const { tenant, dc, site, host } = parseBoard(board);
  const url = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;
  const out: WorkdayPosting[] = [];
  const limit = 20;
  // Workday reports `total` only on the first page; later pages report 0 while
  // still returning jobs. So capture the total once and page until we hit it.
  let total = Infinity;

  for (let offset = 0; offset < total && offset < 10_000 && out.length < WORKDAY_MAX_POSTINGS; offset += limit) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      cache: "no-store",
      body: JSON.stringify({ appliedFacets: {}, limit, offset, searchText: "" }),
    });
    if (!res.ok) throw new Error(`Workday API returned ${res.status} for board "${board}"`);
    const data = (await res.json()) as WorkdayJobsResponse;
    if (offset === 0) total = data.total ?? 0;
    const batch = data.jobPostings ?? [];
    out.push(...batch);
    if (batch.length < limit) break;
  }
  return out.length > WORKDAY_MAX_POSTINGS ? out.slice(0, WORKDAY_MAX_POSTINGS) : out;
}

export function normalizeWorkdayJob(board: string, job: WorkdayPosting): NormalizedJob {
  const { host, site } = parseBoard(board);
  const location = job.locationsText ?? null;
  const isRemote = location ? /remote/i.test(location) : null;

  return {
    platform: "workday",
    external_id: job.externalPath,
    url: `https://${host}/${site}${job.externalPath}`,
    title: job.title,
    description_md: null, // Workday descriptions need a per-job fetch — omitted for now
    location,
    is_remote: isRemote,
    workplace_type: normalizeWorkplaceType(null, isRemote),
    category: categorizeTitle(job.title),
    employment_type: null,
    department: null,
    team: null,
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    compensation_raw: null,
    status: "open",
    posted_at: parsePostedOn(job.postedOn),
    closed_at: null,
    raw: JSON.parse(JSON.stringify(job)),
  };
}

export async function scrapeWorkday(board: string): Promise<NormalizedJob[]> {
  const postings = await fetchWorkdayPostings(board);
  return postings.map((p) => normalizeWorkdayJob(board, p));
}
