import { NextRequest, NextResponse } from "next/server";
import { fetchAshbyApplicationForm } from "@/lib/appliers/ashby-form";
import { planApplication } from "@/lib/appliers/plan";
import { createAdminClient } from "@job-automation/core/supabase/admin";

export const maxDuration = 60;

interface PreviewRequest {
  jobId: string; // internal jobs.id
  profileId: string; // profiles.id
  save?: boolean; // persist an application draft (default true)
}

/**
 * Builds an application plan for an Ashby job: fetches the live form schema,
 * maps the customer's profile onto it, and returns which fields are ready vs.
 * need review. Does NOT submit anything. Optionally saves a draft application.
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.SCRAPE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SCRAPE_API_KEY is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PreviewRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.jobId || !body.profileId) {
    return NextResponse.json({ error: "jobId and profileId are required" }, { status: 400 });
  }

  const db = createAdminClient();

  const { data: job, error: jobError } = await db
    .from("jobs")
    .select("id, platform, external_id, title, companies(ats_identifier)")
    .eq("id", body.jobId)
    .maybeSingle();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.platform !== "ashby") {
    return NextResponse.json(
      { error: `This adapter only handles Ashby jobs (job is ${job.platform})` },
      { status: 400 }
    );
  }
  const board = job.companies?.ats_identifier;
  if (!board) {
    return NextResponse.json({ error: "Company has no Ashby board slug" }, { status: 400 });
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("*")
    .eq("id", body.profileId)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  let plan;
  try {
    const form = await fetchAshbyApplicationForm(board, job.external_id);
    plan = planApplication(form, profile);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }

  if (body.save !== false) {
    const status = plan.readyToSubmit ? "draft" : "needs_review";
    const { data: application, error: appError } = await db
      .from("applications")
      .upsert(
        {
          profile_id: body.profileId,
          job_id: body.jobId,
          status,
          answers: JSON.parse(JSON.stringify(plan)),
        },
        { onConflict: "profile_id,job_id" }
      )
      .select("id")
      .single();
    if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });

    await db.from("application_events").insert({
      application_id: application.id,
      event_type: "planned",
      detail: { summary: plan.summary, readyToSubmit: plan.readyToSubmit },
    });

    return NextResponse.json({ applicationId: application.id, status, plan });
  }

  return NextResponse.json({ plan });
}
