"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAshbyApplicationForm } from "@/lib/appliers/ashby-form";
import { fetchGreenhouseApplicationForm } from "@/lib/appliers/greenhouse-form";
import { fetchLeverApplicationForm } from "@/lib/appliers/lever-form";
import { planApplication, planHasCoverLetter } from "@/lib/appliers/plan";
import { draftPlanAnswers, generateCoverLetter } from "@/lib/appliers/generate";
import { rememberProfile, rememberApplication } from "@/lib/supermemory/memory";

/**
 * "Apply automatically" — fetches the job's live application form, maps the
 * user's profile onto it (the planner), saves a draft application, and sends
 * the user to the review-and-submit screen. Nothing is sent to the employer
 * here; submission happens only after the user reviews and confirms.
 */
export async function prepareApplication(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/jobs/${jobId}`);

  const { data: job } = await supabase
    .from("jobs")
    .select("id, platform, external_id, title, description_md, companies(ats_identifier, name)")
    .eq("id", jobId)
    .maybeSingle();

  const board = job?.companies?.ats_identifier;
  const supported =
    job?.platform === "ashby" || job?.platform === "greenhouse" || job?.platform === "lever";
  if (!job || !supported || !board) {
    redirect(`/jobs/${jobId}?apply_error=unsupported`);
  }

  const [{ data: profile }, { data: resume }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("resume_data").select("*").eq("profile_id", user.id).maybeSingle(),
  ]);
  if (!profile) redirect("/onboarding");

  // Per-user application mode: 'auto' fills + submits without review; 'review'
  // (default) pre-fills and lets the user edit before submitting.
  const mode = profile.application_mode === "auto" ? "auto" : "review";

  let applicationId: string | null = null;
  let queued = false;
  try {
    const form =
      job.platform === "greenhouse"
        ? await fetchGreenhouseApplicationForm(board, job.external_id)
        : job.platform === "lever"
          ? await fetchLeverApplicationForm(board, job.external_id)
          : await fetchAshbyApplicationForm(board, job.external_id);
    const plan = planApplication(form, profile);

    // Supermemory (hackathon): remember this candidate's background so future
    // applications can recall it. Best-effort, fire in the background.
    rememberProfile(user.id, profile, resume).catch(() => {});

    // Auto-draft AI answers, and (only when the board actually has a
    // cover-letter field) a tailored cover letter — in parallel so the form
    // arrives fully prepared. Both recall the user's Supermemory (via userId)
    // to personalize. Best-effort: either failing still lets the user
    // review/edit.
    const tasks: Promise<unknown>[] = [
      draftPlanAnswers(plan, {
        profile,
        resume,
        job: { title: job.title ?? null, description: job.description_md ?? null },
        userId: user.id,
      }).catch(() => {}),
    ];
    if (planHasCoverLetter(plan)) {
      tasks.push(
        generateCoverLetter({
          profile,
          resume,
          job: {
            title: job.title ?? null,
            company: job.companies?.name ?? null,
            description: job.description_md ?? null,
          },
          userId: user.id,
        })
          .then((letter) => {
            if (letter) plan.coverLetter = letter;
          })
          .catch(() => {})
      );
    }
    await Promise.all(tasks);

    // Record the application into memory (builds the candidate's search history).
    rememberApplication(user.id, {
      jobTitle: job.title ?? null,
      company: job.companies?.name ?? null,
      summary: plan.summary ? `${plan.summary.filled}/${plan.summary.total} fields auto-filled` : null,
    }).catch(() => {});

    // Auto mode queues straight to the worker — but only when the form is
    // actually complete. If a required field is still empty (e.g. no resume /
    // an unanswerable question), fall back to review so we never submit a
    // partial application on the user's behalf.
    const requiredMissing = plan.fields.some(
      (f) =>
        f.isRequired &&
        f.type !== "File" &&
        (f.value === undefined || f.value === null || String(f.value).trim() === "")
    );
    const status = mode === "auto" && !requiredMissing ? "queued" : "needs_review";
    queued = status === "queued";

    const { data: app, error } = await supabase
      .from("applications")
      .upsert(
        {
          profile_id: user.id,
          job_id: jobId,
          status,
          answers: JSON.parse(JSON.stringify(plan)),
        },
        { onConflict: "profile_id,job_id" }
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    applicationId = app.id;

    // Best-effort audit event (ignore if events aren't user-insertable).
    await supabase.from("application_events").insert({
      application_id: app.id,
      event_type: status === "queued" ? "queued" : "planned",
      detail: { summary: plan.summary, mode },
    });

    // Persistent "queued" status notification (the worker emits the rest —
    // submitted / failed / needs-review — as the application progresses).
    if (queued) {
      await supabase.from("notifications").insert({
        profile_id: user.id,
        application_id: app.id,
        type: "queued",
        title: "Application queued",
        body: "We're submitting it now — we'll update you here as it progresses.",
        action_url: `/applications/${app.id}`,
      });
    }
  } catch {
    applicationId = null;
  }

  if (!applicationId) redirect(`/jobs/${jobId}?apply_error=prepare`);
  redirect(`/applications/${applicationId}?toast=${queued ? "queued" : "ready"}`);
}
