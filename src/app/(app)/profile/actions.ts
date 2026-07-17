"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@job-automation/core/database.types";
import type {
  ParsedCertification,
  ParsedEducation,
  ParsedExperience,
  ParsedProject,
} from "@/lib/resume/schema";

function str(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");
  return { supabase, user };
}

/** Update the editable `profiles` fields (contact, location, links, eligibility). */
export async function updateProfileDetails(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();

  const address = str(formData.get("address"));
  const city = str(formData.get("city"));
  const postalCode = str(formData.get("postal_code"));
  const country = str(formData.get("country"));
  const location = [address, city, country].filter(Boolean).join(", ") || null;

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
    work_authorization: {
      us: formData.get("authorized_us") === "on",
      needs_sponsorship: formData.get("needs_sponsorship") === "on",
    },
  };

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
}

/** The resume_data fields a user can edit from the profile page. */
export interface ResumePatch {
  headline?: string | null;
  summary?: string | null;
  years_experience?: number | null;
  skills?: string[];
  languages?: string[];
  experience?: ParsedExperience[];
  education?: ParsedEducation[];
  certifications?: ParsedCertification[];
  projects?: ParsedProject[];
}

const ALLOWED_KEYS: (keyof ResumePatch)[] = [
  "headline", "summary", "years_experience",
  "skills", "languages", "experience", "education", "certifications", "projects",
];

/** Merge a patch into the user's resume_data row (creating it if needed). */
export async function saveResumeData(patch: ResumePatch): Promise<void> {
  const { supabase, user } = await requireUser();

  // Only persist known keys — never trust the client to name columns.
  const clean: Record<string, unknown> = {};
  for (const key of ALLOWED_KEYS) {
    if (key in patch) clean[key] = patch[key];
  }

  const { error } = await supabase
    .from("resume_data")
    .upsert({ profile_id: user.id, ...clean }, { onConflict: "profile_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
}
