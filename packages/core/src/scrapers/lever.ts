import { htmlToMarkdown } from "./html";
import { categorizeTitle, normalizeWorkplaceType } from "../categorize";
import type { NormalizedJob } from "./types";

// Lever public postings API:
// GET https://api.lever.co/v0/postings/{site}?mode=json

interface LeverPosting {
  id: string;
  text: string; // title
  hostedUrl: string;
  applyUrl: string;
  createdAt: number; // epoch ms
  country: string | null;
  workplaceType: string | null; // "remote" | "hybrid" | "on-site" | "unspecified"
  categories: {
    commitment?: string;
    department?: string;
    team?: string;
    location?: string;
    allLocations?: string[];
  };
  description: string; // HTML (opening + body)
  descriptionPlain: string;
  lists: { text: string; content: string }[]; // content is <li> HTML
  additional: string; // HTML closing section
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
    interval?: string;
  } | null;
}

export async function fetchLeverBoard(site: string): Promise<LeverPosting[]> {
  const res = await fetch(
    `https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`,
    { headers: { accept: "application/json" }, cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`Lever API returned ${res.status} for site "${site}"`);
  }

  return res.json();
}

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  "Full-time": "full-time",
  "Part-time": "part-time",
  Permanent: "full-time",
  Intern: "internship",
  Internship: "internship",
  Contract: "contract",
  Temporary: "temporary",
};

export function normalizeLeverPosting(posting: LeverPosting): NormalizedJob {
  // Full posting content = description + question lists + closing section
  const fullHtml = [
    posting.description,
    ...posting.lists.map((l) => `<h3>${l.text}</h3><ul>${l.content}</ul>`),
    posting.additional,
  ]
    .filter(Boolean)
    .join("\n");

  const locations =
    posting.categories.allLocations && posting.categories.allLocations.length > 0
      ? posting.categories.allLocations
      : [posting.categories.location].filter((l): l is string => Boolean(l));

  return {
    platform: "lever",
    external_id: posting.id,
    url: posting.hostedUrl,
    title: posting.text,
    description_md: htmlToMarkdown(fullHtml, posting.descriptionPlain || null),
    location: locations.length > 0 ? locations.join("; ") : null,
    is_remote: posting.workplaceType ? posting.workplaceType === "remote" : null,
    workplace_type: normalizeWorkplaceType(
      posting.workplaceType,
      posting.workplaceType ? posting.workplaceType === "remote" : null
    ),
    category: categorizeTitle(posting.text),
    employment_type: posting.categories.commitment
      ? (EMPLOYMENT_TYPE_MAP[posting.categories.commitment] ?? posting.categories.commitment)
      : null,
    department: posting.categories.department ?? null,
    team: posting.categories.team ?? null,
    salary_min: posting.salaryRange?.min ?? null,
    salary_max: posting.salaryRange?.max ?? null,
    salary_currency: posting.salaryRange?.currency ?? null,
    compensation_raw: null,
    status: "open",
    posted_at: posting.createdAt ? new Date(posting.createdAt).toISOString() : null,
    closed_at: null,
    raw: JSON.parse(
      JSON.stringify({
        ...posting,
        description: undefined,
        descriptionPlain: undefined,
        lists: undefined,
        additional: undefined,
      })
    ),
  };
}

export async function scrapeLever(site: string): Promise<NormalizedJob[]> {
  const postings = await fetchLeverBoard(site);
  return postings.map(normalizeLeverPosting);
}
