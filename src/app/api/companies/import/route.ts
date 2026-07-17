import { NextRequest, NextResponse } from "next/server";
import { isScrapablePlatform } from "@job-automation/core/scrapers";
import { mapWithConcurrency, probeBoard, slugToName } from "@job-automation/core/discovery/validate";
import { createAdminClient } from "@job-automation/core/supabase/admin";

export const maxDuration = 300;

interface ImportCompany {
  platform: string;
  board: string;
  name?: string;
  website?: string;
}

/**
 * Bulk-registers companies from a curated list. Each board is validated
 * against the platform API before being saved; jobs are pulled in by the
 * next cron scrape (or a manual /api/cron/scrape call).
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.SCRAPE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SCRAPE_API_KEY is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { companies?: ImportCompany[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(body.companies) || body.companies.length === 0) {
    return NextResponse.json(
      { error: "Body must contain a non-empty companies array" },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  const results = await mapWithConcurrency(body.companies, 8, async (c) => {
    if (!isScrapablePlatform(c.platform)) {
      return { platform: c.platform, board: c.board, ok: false, error: "unsupported platform" };
    }
    const probe = await probeBoard(c.platform, c.board);
    if (!probe.valid) {
      return { platform: c.platform, board: c.board, ok: false, error: "board not found" };
    }

    const { error } = await db.from("companies").upsert(
      {
        name: c.name ?? probe.name ?? slugToName(c.board),
        website: c.website ?? null,
        ats_platform: c.platform,
        ats_identifier: c.board,
      },
      { onConflict: "ats_platform,ats_identifier" }
    );
    if (error) {
      return { platform: c.platform, board: c.board, ok: false, error: error.message };
    }
    return { platform: c.platform, board: c.board, ok: true, jobCount: probe.jobCount };
  });

  return NextResponse.json({
    imported: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
