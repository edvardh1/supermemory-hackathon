import type { Tables } from "@job-automation/core/database.types";
import type { AshbyApplicationForm, AshbyFormField } from "./ashby-form";

type Profile = Tables<"profiles">;

/**
 * How confident we are we can answer a field without the user:
 * - filled:         mapped deterministically from profile data
 * - needs_generation: free-text question, requires an LLM draft from the JD + profile
 * - needs_selection:  select field, requires semantic match to an option
 * - needs_user:       we have no basis to answer; a human must decide
 * - missing_data:     required, maps to a known profile field that is empty
 */
export type FieldResolution =
  | "filled"
  | "needs_generation"
  | "needs_selection"
  | "needs_user"
  | "missing_data";

export interface PlannedField {
  path: string;
  title: string;
  type: string;
  isRequired: boolean;
  resolution: FieldResolution;
  /** The value we intend to submit (when resolution === "filled"). */
  value?: string | boolean | string[];
  /** Where the value came from, or why it needs review. */
  note: string;
  /** For select fields, the options we'd choose among. */
  options?: string[];
}

export interface ApplicationPlan {
  jobPostingId: string;
  title: string;
  fields: PlannedField[];
  /** AI-drafted cover letter for this application (editable on review). */
  coverLetter?: string;
  /** True when every required field is either filled or acknowledgement-ready. */
  readyToSubmit: boolean;
  summary: {
    total: number;
    filled: number;
    needsReview: number;
    missingRequired: number;
  };
}

const includesAny = (haystack: string, needles: string[]) => {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n));
};

/** True when the ATS form has a cover-letter field (so we only spend an LLM
 *  call drafting one when the board actually accepts it). */
export function planHasCoverLetter(plan: ApplicationPlan): boolean {
  return plan.fields.some(
    (f) => /cover\s*_?letter/i.test(f.title ?? "") || /cover\s*_?letter/i.test(f.path ?? "")
  );
}

/** Reads a stored answer for this field from profile.default_answers, keyed by path or title. */
function storedAnswer(profile: Profile, field: AshbyFormField): string | undefined {
  const answers = (profile.default_answers ?? {}) as Record<string, unknown>;
  const byPath = answers[field.path];
  if (typeof byPath === "string" && byPath.trim()) return byPath;
  const byTitle = answers[field.title];
  if (typeof byTitle === "string" && byTitle.trim()) return byTitle;
  return undefined;
}

function workAuth(profile: Profile): Record<string, unknown> {
  return (profile.work_authorization ?? {}) as Record<string, unknown>;
}

/**
 * Answers the common eligibility / age / acknowledgement Yes-No questions from
 * the profile, for a "fully automated" apply. Returns true (Yes) / false (No),
 * or null when the question isn't one of these (so the caller falls back).
 *
 * Note: the profile only tracks US authorization + sponsorship, so a generic
 * "authorized to work in <country>" question is assumed Yes unless the profile
 * explicitly says otherwise. Legal acknowledgements are auto-affirmed per the
 * product's auto-apply setting.
 */
function eligibilityAnswer(profile: Profile, title: string): boolean | null {
  const wa = workAuth(profile);
  if (
    includesAny(title, [
      "certify", "acknowledge", "i agree", "i confirm", "i consent",
      "read the above", "read and understood", "terms", "privacy policy",
    ])
  ) {
    return true; // auto-affirmed acknowledgement
  }
  if (includesAny(title, ["age of 18", "18 years", "over 18", "at least 18", "18 or older"])) {
    return true;
  }
  if (includesAny(title, ["sponsor", "visa"])) {
    return wa["needs_sponsorship"] === true;
  }
  if (
    includesAny(title, [
      "authorized to work", "authorised to work", "eligible to work",
      "legally authorized", "legally allowed", "right to work",
      "work authorization", "permitted to work",
    ])
  ) {
    // The profile only records US authorization, so only trust it for
    // US-specific questions. A generic "authorized to work in <the job's
    // country>" is assumed Yes for auto-apply (answering No is disqualifying).
    if (includesAny(title, ["u.s", "united states", "in the us", "america"])) {
      return typeof wa["us"] === "boolean" ? (wa["us"] as boolean) : true;
    }
    return true;
  }
  return null;
}

function planField(profile: Profile, field: AshbyFormField): PlannedField {
  const base = {
    path: field.path,
    title: field.title,
    type: field.type,
    isRequired: field.isRequired,
    options: field.selectableValues?.map((v) => v.label),
  };

  const fill = (value: string | boolean | string[], note: string): PlannedField => ({
    ...base,
    resolution: "filled",
    value,
    note,
  });
  const review = (resolution: FieldResolution, note: string): PlannedField => ({
    ...base,
    resolution,
    note,
  });

  const title = field.title;

  // Standard system fields and well-known contact fields
  switch (field.type) {
    case "String":
      if (field.path === "_systemfield_name") {
        return profile.full_name
          ? fill(profile.full_name, "profile.full_name")
          : review("missing_data", "Required name is empty on the profile");
      }
      // Greenhouse splits the name into first/last fields.
      if (includesAny(title, ["first name", "given name"]) && !includesAny(title, ["preferred"])) {
        const first = profile.full_name?.trim().split(/\s+/)[0] ?? "";
        return first
          ? fill(first, "profile.full_name (first)")
          : review(field.isRequired ? "missing_data" : "needs_user", "No name on profile");
      }
      if (includesAny(title, ["last name", "surname", "family name"])) {
        const parts = profile.full_name?.trim().split(/\s+/).filter(Boolean) ?? [];
        const last = parts.length > 1 ? parts.slice(1).join(" ") : "";
        return last
          ? fill(last, "profile.full_name (last)")
          : review(field.isRequired ? "missing_data" : "needs_user", "No last name on profile");
      }
      if (includesAny(title, ["linkedin"])) {
        return profile.linkedin_url
          ? fill(profile.linkedin_url, "profile.linkedin_url")
          : review(field.isRequired ? "missing_data" : "needs_user", "No LinkedIn URL on profile");
      }
      if (includesAny(title, ["github"])) {
        return profile.github_url
          ? fill(profile.github_url, "profile.github_url")
          : review(field.isRequired ? "missing_data" : "needs_user", "No GitHub URL on profile");
      }
      if (includesAny(title, ["portfolio", "website", "personal site"])) {
        return profile.portfolio_url
          ? fill(profile.portfolio_url, "profile.portfolio_url")
          : review("needs_user", "No portfolio URL on profile");
      }
      break;

    case "Email":
      return profile.email
        ? fill(profile.email, "profile.email")
        : review("missing_data", "Required email is empty on the profile");

    case "Phone":
      return profile.phone
        ? fill(profile.phone, "profile.phone")
        : review(field.isRequired ? "missing_data" : "needs_user", "No phone on profile");

    case "Location":
      return profile.location
        ? fill(profile.location, "profile.location")
        : review(field.isRequired ? "missing_data" : "needs_user", "No location on profile");

    case "File":
      if (field.path === "_systemfield_resume" || includesAny(title, ["resume", "cv"])) {
        return profile.resume_path
          ? fill(profile.resume_path, "profile.resume_path (uploaded at submit time)")
          : review("missing_data", "No resume on file");
      }
      return review("needs_user", "Unrecognized file upload");

    case "Boolean": {
      const decided = eligibilityAnswer(profile, title);
      if (decided !== null) return fill(decided, "eligibility/acknowledgement from profile");
      const stored = storedAnswer(profile, field);
      if (stored) return fill(/^(yes|true)$/i.test(stored.trim()), "profile.default_answers");
      return review("needs_user", `Yes/No question: "${title}"`);
    }

    case "MultiValueSelect":
    case "ValueSelect": {
      const opts = field.selectableValues ?? [];
      const asValue = (v: string) => (field.type === "MultiValueSelect" ? [v] : v);
      // Single-option acknowledgements (arbitration, certifications) —
      // auto-affirmed per the product's auto-apply setting.
      if (opts.length === 1 && includesAny(title, ["acknowledge", "certify", "confirm", "agree", "read", "consent", "terms"])) {
        return fill(asValue(opts[0].value), "auto-affirmed acknowledgement");
      }
      // Yes/No style selects for eligibility, age, sponsorship, acknowledgements.
      const decided = eligibilityAnswer(profile, title);
      if (decided !== null) {
        const want = decided ? "yes" : "no";
        const match = opts.find((o) => o.label.trim().toLowerCase() === want);
        if (match) return fill(asValue(match.value), "eligibility from profile");
      }
      const stored = storedAnswer(profile, field);
      if (stored) {
        const match = opts.find((o) => o.label.toLowerCase() === stored.toLowerCase());
        if (match) {
          return fill(
            field.type === "MultiValueSelect" ? [match.value] : match.value,
            "profile.default_answers exact match"
          );
        }
      }
      return review("needs_selection", "Choose the best-matching option");
    }

    case "LongText":
    case "Number":
    case "Date": {
      const stored = storedAnswer(profile, field);
      if (stored) return fill(stored, "profile.default_answers");
      if (!field.isRequired) return review("needs_user", "Optional free-text — skip or generate");
      return review(field.type === "LongText" ? "needs_generation" : "needs_user", `Answer required for "${title}"`);
    }
  }

  // Fallback: try a stored answer, else flag for a human
  const stored = storedAnswer(profile, field);
  if (stored) return fill(stored, "profile.default_answers");
  return review(field.isRequired ? "needs_user" : "needs_user", `Unmapped ${field.type} field`);
}

export function planApplication(
  form: AshbyApplicationForm,
  profile: Profile
): ApplicationPlan {
  const fields = form.fields.map((f) => planField(profile, f));

  const filled = fields.filter((f) => f.resolution === "filled").length;
  const missingRequired = fields.filter(
    (f) => f.isRequired && f.resolution === "missing_data"
  ).length;
  const needsReview = fields.filter(
    (f) => f.resolution !== "filled" && f.resolution !== "missing_data"
  ).length;
  const requiredUnfilled = fields.filter(
    (f) => f.isRequired && f.resolution !== "filled"
  ).length;

  return {
    jobPostingId: form.jobPostingId,
    title: form.title,
    fields,
    readyToSubmit: requiredUnfilled === 0,
    summary: { total: fields.length, filled, needsReview, missingRequired },
  };
}
