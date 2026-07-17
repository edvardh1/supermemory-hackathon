import type { ScrapablePlatform } from "../scrapers";

export interface ProbeResult {
  platform: ScrapablePlatform;
  slug: string;
  valid: boolean;
  jobCount: number;
  name: string | null;
}

const PROBE_TIMEOUT_MS = 15_000;

async function probeJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Checks whether a board slug exists on a platform, without pulling full descriptions. */
export async function probeBoard(
  platform: ScrapablePlatform,
  slug: string
): Promise<ProbeResult> {
  const invalid: ProbeResult = { platform, slug, valid: false, jobCount: 0, name: null };

  switch (platform) {
    case "ashby": {
      const data = (await probeJson(
        `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`
      )) as { jobs?: unknown[] } | null;
      if (!data?.jobs) return invalid;
      return { platform, slug, valid: true, jobCount: data.jobs.length, name: null };
    }
    case "greenhouse": {
      const [board, jobs] = await Promise.all([
        probeJson(
          `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}`
        ) as Promise<{ name?: string } | null>,
        probeJson(
          `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`
        ) as Promise<{ jobs?: unknown[] } | null>,
      ]);
      if (!jobs?.jobs) return invalid;
      return {
        platform,
        slug,
        valid: true,
        jobCount: jobs.jobs.length,
        name: board?.name ?? null,
      };
    }
    case "lever": {
      const data = (await probeJson(
        `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`
      )) as unknown[] | null;
      if (!Array.isArray(data)) return invalid;
      return { platform, slug, valid: true, jobCount: data.length, name: null };
    }
    // Workday isn't slug-discoverable (a board is tenant:dc:site) — added
    // manually, not via harvest/probe.
    default:
      return invalid;
  }
}

/** Turns a slug like "perplexity-ai" into a readable fallback name ("Perplexity Ai"). */
export function slugToName(slug: string): string {
  return slug
    .replace(/[-_.]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return results;
}
