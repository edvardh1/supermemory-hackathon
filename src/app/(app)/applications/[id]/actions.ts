"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationPlan } from "@/lib/appliers/plan";
import { draftPlanAnswers } from "@/lib/appliers/generate";

export interface SubmitState {
  error?: string;
}

export interface GenerateState {
  error?: string;
  generated?: number;
}

/**
 * Records the user's reviewed answers and enqueues the application for the
 * browser-automation worker (worker/), which drives the real Ashby apply page.
 * Status goes `queued` → the worker claims it (`in_progress`) → `submitted` /
 * `failed` / `needs_review`.
 */
export async function submitApplication(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: application } = await supabase
    .from("applications")
    .select("id, answers, status")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) redirect("/applications");
  if (application.status === "submitted") redirect("/applications?submitted=1");

  const plan = application.answers as unknown as ApplicationPlan;
  if (!plan?.fields) return { error: "This application is missing its form data." };

  // Merge the user's edits back into the plan.
  for (const field of plan.fields) {
    if (field.type === "File") continue; // resume handled from profile
    const raw = formData.get(field.path);
    if (raw !== null) {
      field.value = String(raw);
      field.resolution = String(raw).trim() ? "filled" : field.resolution;
    }
  }

  // The (edited) cover letter rides along on the plan.
  const cover = formData.get("__cover_letter");
  if (cover !== null) plan.coverLetter = String(cover);

  // Every required non-file field must have a value.
  const missing = plan.fields.filter(
    (f) =>
      f.isRequired &&
      f.type !== "File" &&
      (f.value === undefined || f.value === null || String(f.value).trim() === "")
  );
  if (missing.length > 0) {
    return { error: `Please complete: ${missing.map((m) => m.title).join(", ")}` };
  }

  const { error } = await supabase
    .from("applications")
    .update({
      status: "queued",
      answers: JSON.parse(JSON.stringify(plan)),
    })
    .eq("id", applicationId);
  if (error) return { error: error.message };

  await supabase
    .from("application_events")
    .insert({ application_id: applicationId, event_type: "queued", detail: {} });

  await supabase.from("notifications").insert({
    profile_id: user.id,
    application_id: applicationId,
    type: "queued",
    title: "Application queued",
    body: "We're submitting it now — we'll update you here as it progresses.",
    action_url: `/applications/${applicationId}`,
  });

  revalidatePath("/applications");
  redirect("/applications?toast=queued");
}

/**
 * "Aggressive" mode: draft AI answers for the fields the planner left for the
 * user, grounded in the candidate's profile + resume and the job description.
 * The generated answers are written back into the plan (still editable) so the
 * user reviews them before submitting — nothing is sent here.
 */
export async function generateAnswers(
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: application } = await supabase
    .from("applications")
    .select("id, answers, status, jobs(title, description_md)")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) return { error: "Application not found." };

  const plan = application.answers as unknown as ApplicationPlan;
  if (!plan?.fields) return { error: "This application is missing its form data." };

  // Preserve any answers the user has already typed on the page.
  for (const field of plan.fields) {
    if (field.type === "File") continue;
    const raw = formData.get(field.path);
    if (raw !== null && String(raw).trim()) {
      field.value = String(raw);
      field.resolution = "filled";
    }
  }

  const [{ data: profile }, { data: resume }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("resume_data").select("*").eq("profile_id", user.id).maybeSingle(),
  ]);

  let generated: number;
  try {
    generated = await draftPlanAnswers(plan, {
      profile,
      resume,
      job: { title: application.jobs?.title ?? null, description: application.jobs?.description_md ?? null },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Answer generation failed." };
  }
  if (generated === 0) return { generated: 0 };

  const { error } = await supabase
    .from("applications")
    .update({ answers: JSON.parse(JSON.stringify(plan)) })
    .eq("id", applicationId);
  if (error) return { error: error.message };

  revalidatePath(`/applications/${applicationId}`);
  return { generated };
}

/**
 * The user enters the email verification code the ATS demanded. We store it on
 * the application; the worker (holding the browser session open) is polling for
 * it and will type it in to complete the submission.
 */
export async function submitVerificationCode(formData: FormData): Promise<void> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!code) redirect(`/applications/${applicationId}`);

  const { data: app } = await supabase
    .from("applications")
    .select("verification")
    .eq("id", applicationId)
    .maybeSingle();
  const existing = (app?.verification ?? {}) as Record<string, unknown>;

  const { error } = await supabase
    .from("applications")
    .update({ verification: { ...existing, code } })
    .eq("id", applicationId);
  if (error) throw new Error(error.message);

  revalidatePath(`/applications/${applicationId}`);
}

export async function cancelApplication(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId);
  revalidatePath("/applications");
  redirect("/applications");
}
