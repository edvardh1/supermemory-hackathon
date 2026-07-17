import { NextRequest, NextResponse } from "next/server";
import { isScrapablePlatform, SCRAPERS } from "@job-automation/core/scrapers";
import { ingestBoard } from "@job-automation/core/scrapers/ingest";
import { createAdminClient } from "@job-automation/core/supabase/admin";

export const maxDuration = 300;

interface ScrapeRequest {
  board: string; // board slug, e.g. "openai" from jobs.ashbyhq.com/openai
  companyName?: string;
  companyWebsite?: string;
  dryRun?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const apiKey = process.env.SCRAPE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SCRAPE_API_KEY is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { platform } = await params;
  if (!isScrapablePlatform(platform)) {
    return NextResponse.json(
      { error: `Unsupported platform: ${platform}. Supported: ${Object.keys(SCRAPERS).join(", ")}` },
      { status: 400 }
    );
  }

  let body: ScrapeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.board || typeof body.board !== "string") {
    return NextResponse.json({ error: "Missing required field: board" }, { status: 400 });
  }

  try {
    const jobs = await SCRAPERS[platform](body.board);

    if (body.dryRun) {
      return NextResponse.json({
        dryRun: true,
        platform,
        board: body.board,
        jobsFound: jobs.length,
        sample: jobs.slice(0, 2).map((j) => ({
          ...j,
          description_md: j.description_md?.slice(0, 500),
          raw: undefined,
        })),
      });
    }

    const result = await ingestBoard(createAdminClient(), {
      platform,
      boardSlug: body.board,
      companyName: body.companyName ?? body.board,
      companyWebsite: body.companyWebsite ?? null,
      jobs,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
