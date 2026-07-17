import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

// Company branding: resolve a name → domain → logo so the jobs list can show a
// logo per company. The ATS board APIs (Ashby/Greenhouse/Lever) return only
// jobs, no org logo or domain, so we resolve it separately and cache it on the
// company row. Both services used here are free and need no auth.

/** Extract a bare domain (no protocol, no www, no path) from a website string. */
export function domainFromWebsite(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = website.includes("://") ? website : `https://${website}`;
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

/** Strip corporate suffixes/punctuation that trip up domain lookup, e.g.
 *  "Gusto, Inc." → "Gusto", "DoorDash USA" → "DoorDash", "Scribdinc" → "Scribd". */
function cleanCompanyName(name: string): string {
  return name
    .replace(/[,.]/g, " ")
    .replace(/\b(inc|llc|ltd|co|corp|corporation|company|holdings|group|usa|gmbh)\b/gi, " ")
    .replace(/([a-z]{3,})inc$/i, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const secondLevel = (domain: string | null) => squash((domain ?? "").split(".")[0] ?? "");

async function suggestDomain(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`,
      { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return null;
    const hits = (await res.json()) as { name: string; domain: string | null }[];
    if (!Array.isArray(hits) || hits.length === 0) return null;
    const key = squash(query);
    // Strongest signal: the domain's second-level name equals the query
    // (cohere.com for "Cohere", not coherentmarketinsights.com).
    const byDomain = hits.find((h) => h.domain && secondLevel(h.domain) === key);
    if (byDomain) return byDomain.domain;
    // Next: an exact company-name match.
    const byName = hits.find((h) => h.name && squash(h.name) === key);
    if (byName) return byName.domain ?? null;
    // Fall back to the top suggestion only when its domain closely resembles the
    // query — starts with it and isn't much longer (so "Cohere" doesn't match
    // "coherentmarketinsights.com"). Otherwise leave it unresolved (the UI shows
    // a letter avatar), which beats a confidently-wrong logo.
    const first = hits[0];
    const sld = secondLevel(first.domain);
    if (first.domain && sld.startsWith(key) && sld.length <= key.length + 3) return first.domain;
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve a company name to its primary domain via Clearbit's free
 * autocomplete endpoint (no auth). Tries the raw name first, then a cleaned
 * variant (suffixes stripped). Returns null when nothing matches.
 */
export async function resolveCompanyDomain(name: string): Promise<string | null> {
  const direct = await suggestDomain(name);
  if (direct) return direct;
  const cleaned = cleanCompanyName(name);
  if (cleaned && cleaned.toLowerCase() !== name.toLowerCase()) {
    return suggestDomain(cleaned);
  }
  return null;
}

/** A logo URL for a domain — DuckDuckGo's favicon service (free, no auth). */
export function logoUrlForDomain(domain: string): string {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

export interface EnrichResult {
  scanned: number;
  updated: number;
  unresolved: string[];
}

/**
 * Fill website + logo_url for companies that don't have a logo yet. Uses an
 * existing website when present, otherwise resolves the domain from the name.
 * Idempotent and incremental: only touches rows where logo_url is null, so it's
 * cheap to run after every scrape. Throttled to stay friendly to the resolver.
 */
export async function enrichCompanyBrands(
  db: SupabaseClient<Database>,
  opts: { limit?: number; delayMs?: number } = {}
): Promise<EnrichResult> {
  const { limit = 500, delayMs = 250 } = opts;

  const { data: companies, error } = await db
    .from("companies")
    .select("id, name, website")
    .is("logo_url", null)
    .limit(limit);
  if (error) throw new Error(`Failed to read companies: ${error.message}`);

  let updated = 0;
  const unresolved: string[] = [];

  for (const c of companies ?? []) {
    const fromSite = domainFromWebsite(c.website);
    const domain = fromSite ?? (await resolveCompanyDomain(c.name));
    if (!domain) {
      unresolved.push(c.name);
      continue;
    }
    const { error: upErr } = await db
      .from("companies")
      .update({ website: `https://${domain}`, logo_url: logoUrlForDomain(domain) })
      .eq("id", c.id);
    if (!upErr) updated++;
    // Only pause when we actually hit the network resolver.
    if (!fromSite && delayMs) await new Promise((r) => setTimeout(r, delayMs));
  }

  return { scanned: companies?.length ?? 0, updated, unresolved };
}
