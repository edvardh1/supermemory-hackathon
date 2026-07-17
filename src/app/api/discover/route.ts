import { NextRequest, NextResponse } from "next/server";
import { harvestAll } from "@job-automation/core/discovery/harvest";
import { mapWithConcurrency, probeBoard, slugToName } from "@job-automation/core/discovery/validate";
import { createAdminClient } from "@job-automation/core/supabase/admin";

export const maxDuration = 300;

const DEFAULT_REGISTER_LIMIT = 50;
const MAX_VALIDATIONS_PER_RUN = 300;

/**
 * Discovers new company boards by harvesting ATS links from the web
 * (Hacker News, Common Crawl), validates them against the platform APIs,
 * and registers companies we don't track yet. Jobs are pulled in by the
 * next cron scrape. Runs on a schedule (see vercel.json) or manually:
 *
 *   GET /api/discover?limit=50&sources=hackernews,commoncrawl
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const validTokens = [process.env.SCRAPE_API_KEY, process.env.CRON_SECRET]
    .filter(Boolean)
    .map((t) => `Bearer ${t}`);
  if (validTokens.length === 0) {
    return NextResponse.json({ error: "No API key configured" }, { status: 500 });
  }
  if (!auth || !validTokens.includes(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const limit = Math.max(1, Number(searchParams.get("limit")) || DEFAULT_REGISTER_LIMIT);
  const sources = (searchParams.get("sources")?.split(",") ?? [
    "hackernews",
    "commoncrawl",
  ]).filter((s): s is "hackernews" | "commoncrawl" =>
    ["hackernews", "commoncrawl"].includes(s)
  );

  const db = createAdminClient();

  const candidates = await harvestAll(sources);

  // Skip boards we already track
  const { data: existing, error: existingError } = await db
    .from("companies")
    .select("ats_platform, ats_identifier");
  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }
  const known = new Set(existing.map((c) => `${c.ats_platform}:${c.ats_identifier}`));
  const fresh = candidates
    .filter((c) => !known.has(`${c.platform}:${c.slug}`))
    .slice(0, MAX_VALIDATIONS_PER_RUN);

  const probes = await mapWithConcurrency(fresh, 8, (c) =>
    probeBoard(c.platform, c.slug)
  );
  const valid = probes.filter((p) => p.valid && p.jobCount > 0).slice(0, limit);

  let registered = 0;
  const errors: string[] = [];
  for (const p of valid) {
    const { error } = await db.from("companies").upsert(
      {
        name: p.name ?? slugToName(p.slug),
        ats_platform: p.platform,
        ats_identifier: p.slug,
      },
      { onConflict: "ats_platform,ats_identifier" }
    );
    if (error) errors.push(`${p.platform}/${p.slug}: ${error.message}`);
    else registered++;
  }

  return NextResponse.json({
    sources,
    candidatesFound: candidates.length,
    newCandidates: fresh.length,
    validBoards: valid.length,
    registered,
    errors,
    companies: valid.map((p) => ({
      platform: p.platform,
      board: p.slug,
      name: p.name ?? slugToName(p.slug),
      jobCount: p.jobCount,
    })),
  });
}
