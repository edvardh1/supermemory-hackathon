import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesUpdate } from "@job-automation/core/database.types";
import { parseResumePdf } from "./parse";

export interface StoreResult {
  status: "parsed" | "failed" | "skipped";
  error?: string;
}

/**
 * Downloads a user's resume from storage, parses it into structured data with
 * Claude, saves it to resume_data, and backfills any empty profile contact
 * fields from the parsed resume. Best-effort: parse failures are recorded on
 * the resume_data row rather than thrown.
 */
export async function parseAndStoreResume(
  db: SupabaseClient<Database>,
  profileId: string,
  resumePath: string
): Promise<StoreResult> {
  // Mark as pending so there's always a row, even if parsing dies mid-flight.
  await db.from("resume_data").upsert(
    { profile_id: profileId, source_resume_path: resumePath, parse_status: "pending" },
    { onConflict: "profile_id" }
  );

  // Only PDFs can be parsed by the model today.
  if (!resumePath.toLowerCase().endsWith(".pdf")) {
    await db
      .from("resume_data")
      .update({ parse_status: "failed", parse_error: "Only PDF resumes can be parsed" })
      .eq("profile_id", profileId);
    return { status: "skipped", error: "Only PDF resumes can be parsed" };
  }

  try {
    const { data: blob, error: dlError } = await db.storage
      .from("resumes")
      .download(resumePath);
    if (dlError || !blob) {
      throw new Error(`Could not download resume: ${dlError?.message ?? "not found"}`);
    }

    const pdfBytes = Buffer.from(await blob.arrayBuffer());
    const parsed = await parseResumePdf(pdfBytes);
    // Round-trip the typed structs into plain JSON for the jsonb columns.
    const asJson = JSON.parse(JSON.stringify(parsed));

    const { error: saveError } = await db
      .from("resume_data")
      .update({
        parse_status: "parsed",
        parse_error: null,
        parsed_at: new Date().toISOString(),
        summary: parsed.summary,
        headline: parsed.headline,
        years_experience: parsed.years_experience,
        skills: asJson.skills,
        experience: asJson.experience,
        education: asJson.education,
        certifications: asJson.certifications,
        projects: asJson.projects,
        languages: asJson.languages,
        links: asJson.links,
        raw: asJson,
      })
      .eq("profile_id", profileId);
    if (saveError) throw new Error(saveError.message);

    // Backfill empty profile contact fields from the resume.
    const { data: profile } = await db
      .from("profiles")
      .select("full_name, phone, location, linkedin_url, github_url, portfolio_url")
      .eq("id", profileId)
      .maybeSingle();
    if (profile) {
      const backfill: TablesUpdate<"profiles"> = {};
      if (!profile.full_name && parsed.full_name) backfill.full_name = parsed.full_name;
      if (!profile.phone && parsed.phone) backfill.phone = parsed.phone;
      if (!profile.location && parsed.location) backfill.location = parsed.location;
      if (!profile.linkedin_url && parsed.links.linkedin) backfill.linkedin_url = parsed.links.linkedin;
      if (!profile.github_url && parsed.links.github) backfill.github_url = parsed.links.github;
      if (!profile.portfolio_url && parsed.links.portfolio) backfill.portfolio_url = parsed.links.portfolio;
      if (Object.keys(backfill).length > 0) {
        await db.from("profiles").update(backfill).eq("id", profileId);
      }
    }

    return { status: "parsed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .from("resume_data")
      .update({ parse_status: "failed", parse_error: message })
      .eq("profile_id", profileId);
    return { status: "failed", error: message };
  }
}
