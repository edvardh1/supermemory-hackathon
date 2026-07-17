"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@job-automation/core/database.types";
import { parseAndStoreResume } from "@/lib/resume/store";

export interface OnboardingState {
  error?: string;
}

const ALLOWED_RESUME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function str(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : null;
}

export async function saveOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  // Resume upload (optional on re-save if one already exists)
  let resumePath: string | null = null;
  const resume = formData.get("resume");
  if (resume instanceof File && resume.size > 0) {
    if (!ALLOWED_RESUME_TYPES.has(resume.type)) {
      return { error: "Resume must be a PDF or Word document." };
    }
    if (resume.size > 10 * 1024 * 1024) {
      return { error: "Resume must be under 10 MB." };
    }
    const ext = resume.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const path = `${user.id}/resume.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(path, resume, { upsert: true, contentType: resume.type });
    if (uploadError) return { error: `Resume upload failed: ${uploadError.message}` };
    resumePath = path;
  }

  const needsSponsorship = formData.get("needs_sponsorship") === "on";
  const authorizedUs = formData.get("authorized_us") === "on";

  const address = str(formData.get("address"));
  const city = str(formData.get("city"));
  const postalCode = str(formData.get("postal_code"));
  const country = str(formData.get("country"));
  // Keep the flat `location` string in sync for consumers that read it
  // (resume backfill, application planner, job cards).
  const location =
    [address, city, country].filter(Boolean).join(", ") || null;

  const update: TablesUpdate<"profiles"> = {
    full_name: str(formData.get("full_name")),
    phone: str(formData.get("phone")),
    address,
    city,
    postal_code: postalCode,
    country,
    location,
    linkedin_url: str(formData.get("linkedin_url")),
    github_url: str(formData.get("github_url")),
    portfolio_url: str(formData.get("portfolio_url")),
    work_authorization: { us: authorizedUs, needs_sponsorship: needsSponsorship },
  };
  if (resumePath) update.resume_path = resumePath;

  const { error: profileError } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);
  if (profileError) return { error: profileError.message };

  // Parse a newly-uploaded resume into structured data. Best-effort: a parse
  // failure (e.g. no ANTHROPIC_API_KEY yet) is recorded on the resume_data row
  // and must not block onboarding.
  if (resumePath) {
    try {
      await parseAndStoreResume(supabase, user.id, resumePath);
    } catch {
      // parseAndStoreResume already records failures; never block the save.
    }
  }

  // Basic job preferences that feed suggestions
  const titles = str(formData.get("titles"));
  const minSalary = str(formData.get("min_salary"));
  const remoteOnly = formData.get("remote_only") === "on";

  const { error: prefError } = await supabase.from("job_preferences").upsert(
    {
      profile_id: user.id,
      titles: titles ? titles.split(",").map((t) => t.trim()).filter(Boolean) : null,
      min_salary: minSalary ? Number(minSalary) : null,
      remote_only: remoteOnly,
      is_active: true,
    },
    { onConflict: "profile_id" }
  );
  if (prefError) return { error: prefError.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
