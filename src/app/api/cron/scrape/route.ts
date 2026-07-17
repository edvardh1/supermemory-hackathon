import { NextRequest, NextResponse } from "next/server";
import { isScrapablePlatform, SCRAPERS } from "@job-automation/core/scrapers";
import { ingestBoard } from "@job-automation/core/scrapers/ingest";
import { mapWithConcurrency } from "@job-automation/core/discovery/validate";
import { createAdminClient } from "@job-automation/core/supabase/admin";

export const maxDuration = 300;

/**
 * Re-scrapes every tracked company board. Invoked on a schedule (see
 * vercel.json) or manually. Accepts either SCRAPE_API_KEY or CRON_SECRET
 * as the bearer token — Vercel cron sends CRON_SECRET automatically.
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

  const db = createAdminClient();

  const { data: companies, error } = await db
    .from("companies")
    .select("id, name, website, ats_platform, ats_identifier")
    .not("ats_identifier", "is", null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const scrapable = companies.filter(
    (c) => c.ats_identifier && isScrapablePlatform(c.ats_platform)
  );

  const results = await mapWithConcurrency(scrapable, 4, async (company) => {
    try {
      const jobs = await SCRAPERS[company.ats_platform as keyof typeof SCRAPERS](
        company.ats_identifier!
      );
      const result = await ingestBoard(db, {
        platform: company.ats_platform,
        boardSlug: company.ats_identifier!,
        companyName: company.name,
        companyWebsite: company.website,
        jobs,
      });
      return { company: company.name, ok: true, ...result };
    } catch (err) {
      return {
        company: company.name,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  return NextResponse.json({
    scraped: results.length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
