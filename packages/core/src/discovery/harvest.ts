import type { ScrapablePlatform } from "../scrapers";

export interface BoardCandidate {
  platform: ScrapablePlatform;
  slug: string;
  source: string;
}

const SLUG_PATTERNS: { platform: ScrapablePlatform; re: RegExp }[] = [
  { platform: "ashby", re: /jobs\.ashbyhq\.com\/([a-z0-9][a-z0-9\-_.]*)/gi },
  {
    platform: "greenhouse",
    re: /(?:boards|job-boards)\.greenhouse\.io\/([a-z0-9][a-z0-9\-_]*)/gi,
  },
  { platform: "lever", re: /jobs\.lever\.co\/([a-z0-9][a-z0-9\-_.]*)/gi },
];

// Path segments on these domains that are not company slugs
const SLUG_BLACKLIST = new Set(["embed", "api", "v1", "job_board", "jobs"]);

export function extractCandidates(text: string, source: string): BoardCandidate[] {
  const found: BoardCandidate[] = [];
  for (const { platform, re } of SLUG_PATTERNS) {
    for (const match of text.matchAll(re)) {
      const slug = match[1].toLowerCase().replace(/[.,)]+$/, "");
      if (slug.length < 2 || SLUG_BLACKLIST.has(slug)) continue;
      found.push({ platform, slug, source });
    }
  }
  return found;
}

function decodeHnText(s: string): string {
  return s
    .replace(/&#x2F;/g, "/")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Searches Hacker News (Algolia API, no key needed) for links to ATS job
 * boards — "Who is hiring" threads are full of them.
 */
export async function harvestHackerNews(): Promise<BoardCandidate[]> {
  const queries = ["jobs.ashbyhq.com", "boards.greenhouse.io", "jobs.lever.co"];
  const candidates: BoardCandidate[] = [];

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(
          `"${q}"`
        )}&tags=comment&hitsPerPage=1000`,
        { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) }
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        hits: { comment_text?: string; story_text?: string; url?: string }[];
      };
      for (const hit of data.hits) {
        const text = decodeHnText(
          [hit.comment_text, hit.story_text, hit.url].filter(Boolean).join("\n")
        );
        candidates.push(...extractCandidates(text, "hackernews"));
      }
    } catch {
      // source unavailable this run; others still contribute
    }
  }

  return candidates;
}

/**
 * Queries the Common Crawl URL index (no key needed) for pages crawled on the
 * ATS job board domains.
 */
export async function harvestCommonCrawl(): Promise<BoardCandidate[]> {
  const candidates: BoardCandidate[] = [];

  let crawlId: string | null = null;
  try {
    const res = await fetch("https://index.commoncrawl.org/collinfo.json", {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) {
      const crawls = (await res.json()) as { id: string }[];
      crawlId = crawls[0]?.id ?? null;
    }
  } catch {
    return candidates;
  }
  if (!crawlId) return candidates;

  const domains = ["jobs.ashbyhq.com", "boards.greenhouse.io", "jobs.lever.co"];
  for (const domain of domains) {
    try {
      const res = await fetch(
        `https://index.commoncrawl.org/${crawlId}-index?url=${encodeURIComponent(
          `${domain}/*`
        )}&output=json&fl=url&limit=5000`,
        { headers: { accept: "application/json" }, signal: AbortSignal.timeout(60_000) }
      );
      if (!res.ok) continue;
      const body = await res.text();
      for (const line of body.split("\n")) {
        if (!line.trim()) continue;
        try {
          const { url } = JSON.parse(line) as { url: string };
          candidates.push(...extractCandidates(url, "commoncrawl"));
        } catch {
          // skip malformed line
        }
      }
    } catch {
      // Common Crawl index is often busy; skip this domain for now
    }
  }

  return candidates;
}

/** All harvest sources, deduplicated by (platform, slug). */
export async function harvestAll(
  sources: ("hackernews" | "commoncrawl")[] = ["hackernews", "commoncrawl"]
): Promise<BoardCandidate[]> {
  const results = await Promise.all([
    sources.includes("hackernews") ? harvestHackerNews() : Promise.resolve([]),
    sources.includes("commoncrawl") ? harvestCommonCrawl() : Promise.resolve([]),
  ]);

  const seen = new Set<string>();
  const deduped: BoardCandidate[] = [];
  for (const c of results.flat()) {
    const key = `${c.platform}:${c.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
  }
  return deduped;
}
