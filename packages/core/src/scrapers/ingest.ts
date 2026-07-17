import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Enums } from "../supabase/database.types";
import type { NormalizedJob } from "./types";

const UPSERT_CHUNK_SIZE = 100;

export interface IngestParams {
  platform: Enums<"ats_platform">;
  boardSlug: string;
  companyName: string;
  companyWebsite?: string | null;
  jobs: NormalizedJob[];
}

export interface IngestResult {
  scrapeRunId: string;
  companyId: string;
  jobsFound: number;
  jobsCreated: number;
  jobsUpdated: number;
  jobsClosed: number;
}

/**
 * Upserts a company and its scraped jobs, marks listings that disappeared
 * from the board as closed, and records the run in scrape_runs.
 */
export async function ingestBoard(
  db: SupabaseClient<Database>,
  params: IngestParams
): Promise<IngestResult> {
  const { data: run, error: runError } = await db
    .from("scrape_runs")
    .insert({ platform: params.platform, jobs_found: params.jobs.length })
    .select("id, started_at")
    .single();
  if (runError) throw new Error(`Failed to create scrape run: ${runError.message}`);

  try {
    const { data: company, error: companyError } = await db
      .from("companies")
      .upsert(
        {
          name: params.companyName,
          website: params.companyWebsite ?? null,
          ats_platform: params.platform,
          ats_identifier: params.boardSlug,
        },
        { onConflict: "ats_platform,ats_identifier" }
      )
      .select("id")
      .single();
    if (companyError) throw new Error(`Failed to upsert company: ${companyError.message}`);

    const { data: existing, error: existingError } = await db
      .from("jobs")
      .select("external_id")
      .eq("company_id", company.id)
      .eq("platform", params.platform)
      .range(0, 99999);
    if (existingError) throw new Error(`Failed to read existing jobs: ${existingError.message}`);

    const existingIds = new Set(existing.map((j) => j.external_id));
    const jobsCreated = params.jobs.filter((j) => !existingIds.has(j.external_id)).length;
    const jobsUpdated = params.jobs.length - jobsCreated;

    const now = new Date().toISOString();
    const rows = params.jobs.map((j) => ({
      ...j,
      company_id: company.id,
      last_seen_at: now,
    }));

    for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
      const { error: upsertError } = await db
        .from("jobs")
        .upsert(rows.slice(i, i + UPSERT_CHUNK_SIZE), {
          onConflict: "platform,external_id",
        });
      if (upsertError) throw new Error(`Failed to upsert jobs: ${upsertError.message}`);
    }

    // Open jobs not refreshed by this run are gone from the board → closed
    const { data: closed, error: closeError } = await db
      .from("jobs")
      .update({ status: "closed", closed_at: now })
      .eq("company_id", company.id)
      .eq("platform", params.platform)
      .eq("status", "open")
      .lt("last_seen_at", run.started_at)
      .select("id");
    if (closeError) throw new Error(`Failed to close stale jobs: ${closeError.message}`);

    await db
      .from("scrape_runs")
      .update({
        status: "succeeded",
        finished_at: new Date().toISOString(),
        company_id: company.id,
        jobs_created: jobsCreated,
        jobs_updated: jobsUpdated,
        jobs_closed: closed.length,
      })
      .eq("id", run.id);

    return {
      scrapeRunId: run.id,
      companyId: company.id,
      jobsFound: params.jobs.length,
      jobsCreated,
      jobsUpdated,
      jobsClosed: closed.length,
    };
  } catch (err) {
    await db
      .from("scrape_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      })
      .eq("id", run.id);
    throw err;
  }
}
