import Anthropic from "@anthropic-ai/sdk";
import type { Tables } from "@job-automation/core/database.types";
import type { ApplicationPlan, PlannedField } from "./plan";
import { recallCandidateContext } from "@/lib/supermemory/memory";

// "Aggressive" mode: draft answers for the application questions the planner
// couldn't resolve deterministically (needs_user / needs_generation /
// needs_selection), grounded ONLY in the candidate's profile + resume and the
// job description. Mirrors the resume parser's structured-output pattern.
const MODEL = "claude-opus-4-8";

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          path: { type: "string", description: "The field's path, copied verbatim" },
          value: {
            type: "string",
            description:
              "The answer. For yes/no questions return 'true' or 'false'. For a selection, return exactly one of the given options.",
          },
        },
        required: ["path", "value"],
      },
    },
  },
  required: ["answers"],
} as const;

const SYSTEM_PROMPT = `You help a job candidate answer application questions, so the answers can be submitted on their behalf.

Rules:
- Use ONLY the candidate's profile and resume. Never invent employers, titles, degrees, dates, numbers, or any credential not present.
- Write in the first person and sound like a real person, not AI: plain, specific, natural. Contractions are fine; vary sentence length. Avoid corporate/AI clichés and generic enthusiasm — no "passionate about", "excited to", "align with", "leverage", "proven track record", "team player", and don't overuse em-dashes.
- Free-text answers: 2-5 sentences unless the question implies otherwise; tailor them to the job when the description is relevant.
- Yes/No questions: return exactly "true" or "false".
- Selection questions: return exactly one of the provided options, copied verbatim.
- If the profile genuinely lacks the basis to answer, give an honest, reasonable answer in the candidate's voice rather than fabricating specifics.
- Copy each field's "path" back exactly so answers can be matched.`;

function candidateContext(
  profile: Tables<"profiles"> | null,
  resume: Tables<"resume_data"> | null
): string {
  const lines: string[] = [];
  if (profile?.full_name) lines.push(`Name: ${profile.full_name}`);
  if (profile?.location) lines.push(`Location: ${profile.location}`);
  if (resume?.headline) lines.push(`Headline: ${resume.headline}`);
  if (resume?.years_experience != null) lines.push(`Years of experience: ${resume.years_experience}`);
  if (resume?.summary) lines.push(`Summary: ${resume.summary}`);

  const skills = (resume?.skills as string[] | null) ?? [];
  if (skills.length) lines.push(`Skills: ${skills.join(", ")}`);

  const experience = (resume?.experience as { title?: string; company?: string; highlights?: string[] }[] | null) ?? [];
  if (experience.length) {
    lines.push("Experience:");
    for (const e of experience.slice(0, 6)) {
      lines.push(`- ${[e.title, e.company].filter(Boolean).join(" @ ")}`);
      for (const h of (e.highlights ?? []).slice(0, 4)) lines.push(`    • ${h}`);
    }
  }

  const education = (resume?.education as { degree?: string; field?: string; institution?: string }[] | null) ?? [];
  if (education.length) {
    lines.push("Education:");
    for (const ed of education.slice(0, 4)) {
      lines.push(`- ${[ed.degree, ed.field, ed.institution].filter(Boolean).join(", ")}`);
    }
  }
  return lines.join("\n") || "(no profile details available)";
}

/**
 * Draft answers for the given fields. Returns a map of field path → answer
 * string (yes/no as "true"/"false"; selects as one of the field's options).
 * Fields the model declined are simply absent from the map.
 */
export async function generateFieldAnswers(input: {
  fields: PlannedField[];
  profile: Tables<"profiles"> | null;
  resume: Tables<"resume_data"> | null;
  job: { title: string | null; description: string | null };
  /** When set, recall this user's Supermemory to enrich the answers. */
  userId?: string;
}): Promise<Record<string, string>> {
  if (input.fields.length === 0) return {};

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const client = new Anthropic({ apiKey });

  const questions = input.fields.map((f) => ({
    path: f.path,
    question: f.title,
    type: f.type,
    ...(f.options?.length ? { options: f.options } : {}),
  }));

  const memory = input.userId
    ? await recallCandidateContext(
        input.userId,
        `${input.job.title ?? ""} ${(input.job.description ?? "").slice(0, 400)}`
      )
    : "";

  const userText = [
    `CANDIDATE PROFILE:\n${candidateContext(input.profile, input.resume)}`,
    ...(memory ? [memory] : []),
    `JOB: ${input.job.title ?? "(untitled)"}\n${(input.job.description ?? "").slice(0, 4000)}`,
    `QUESTIONS (answer each; return an object per question keyed by its path):\n${JSON.stringify(questions, null, 2)}`,
  ].join("\n\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    messages: [{ role: "user", content: [{ type: "text", text: userText }] }],
  });

  if (response.stop_reason === "refusal") throw new Error("Answer generation was refused by the model");

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return {};

  const parsed = JSON.parse(textBlock.text) as { answers?: { path: string; value: string }[] };
  const map: Record<string, string> = {};
  for (const a of parsed.answers ?? []) {
    if (a?.path && typeof a.value === "string" && a.value.trim()) map[a.path] = a.value.trim();
  }
  return map;
}

/** Resolutions the planner couldn't answer on its own. */
const NEEDS_ANSWER = new Set(["needs_user", "needs_generation", "needs_selection"]);
const ANSWERABLE_TYPES = new Set([
  "String", "LongText", "Boolean", "ValueSelect", "MultiValueSelect", "Number",
]);
function isPlanFieldEmpty(f: PlannedField): boolean {
  return f.value === undefined || f.value === null || String(f.value).trim() === "";
}

/**
 * Draft AI answers IN PLACE for the plan's still-unanswered, answerable fields
 * (mutates each filled field's value/resolution/note) and returns how many were
 * filled. Shared by the review "Answer with AI" action and the auto-fill that
 * runs on apply, so both flows pre-fill identically.
 */
export async function draftPlanAnswers(
  plan: ApplicationPlan,
  ctx: {
    profile: Tables<"profiles"> | null;
    resume: Tables<"resume_data"> | null;
    job: { title: string | null; description: string | null };
    userId?: string;
  }
): Promise<number> {
  const toAnswer = plan.fields.filter(
    (f) => NEEDS_ANSWER.has(f.resolution) && ANSWERABLE_TYPES.has(f.type) && isPlanFieldEmpty(f)
  );
  if (toAnswer.length === 0) return 0;

  const answers = await generateFieldAnswers({
    fields: toAnswer,
    profile: ctx.profile,
    resume: ctx.resume,
    job: ctx.job,
    userId: ctx.userId,
  });

  let generated = 0;
  for (const field of toAnswer) {
    const value = answers[field.path];
    if (!value) continue;
    // Only accept a selection that is actually one of the options.
    if (
      (field.type === "ValueSelect" || field.type === "MultiValueSelect") &&
      field.options?.length &&
      !field.options.includes(value)
    ) {
      continue;
    }
    field.value = field.type === "Boolean" ? (/^(yes|true)$/i.test(value) ? "true" : "false") : value;
    field.resolution = "filled";
    field.note = "AI-generated";
    generated++;
  }
  return generated;
}

const COVER_LETTER_SYSTEM = `You are the job candidate, writing your own cover letter in your own words. It will be submitted as-is, so it must read like a real person wrote it — not like AI.

Ground rules:
- Use ONLY the candidate's profile and resume. Never invent employers, titles, degrees, dates, numbers, or achievements not present.
- First person. About 3 short paragraphs, 200-300 words: why this role/company caught your interest, one or two concrete things you've actually done (from the resume) that fit it, and a short sign-off.
- Tailor it to the job when the description gives you something specific to react to.

Sound human, not generated:
- Write plainly and specifically, the way a thoughtful person emails a hiring manager. Use contractions. Vary sentence length — mix short punchy sentences with longer ones. It's fine to start a sentence with "And" or "But".
- Lead with something concrete and specific, not "I am writing to apply for" or "I am excited to apply".
- BANNED words/phrases (do not use any): "excited to apply", "thrilled", "passionate about", "I am confident that", "align with", "leverage", "utilize", "spearhead", "synergy", "robust", "seamless", "delve", "tapestry", "in today's fast-paced world", "proven track record", "I believe my skills and experience make me", "team player", "hit the ground running", "wealth of experience", "cutting-edge", "detail-oriented", "results-driven". Avoid em-dashes; use commas or periods.
- Don't be perfectly balanced or list-like. Don't over-explain. A little personality and a plain-spoken tone are good. Don't flatter the company excessively.
- No markdown, no bullet points, no placeholders or [brackets], no subject line. Use the real role and company names. If no hiring manager name is known, open the body directly or with "Hi,".

Output only the letter text — no preamble, no notes.`;

/** Draft a cover letter tailored to the job, grounded in the candidate's
 *  profile + resume. Returns plain text (may be empty if generation fails). */
export async function generateCoverLetter(input: {
  profile: Tables<"profiles"> | null;
  resume: Tables<"resume_data"> | null;
  job: { title: string | null; company: string | null; description: string | null };
  /** When set, recall this user's Supermemory to personalize the letter. */
  userId?: string;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const client = new Anthropic({ apiKey });

  const memory = input.userId
    ? await recallCandidateContext(
        input.userId,
        `${input.job.title ?? ""} at ${input.job.company ?? ""} ${(input.job.description ?? "").slice(0, 400)}`
      )
    : "";

  const userText = [
    `CANDIDATE:\n${candidateContext(input.profile, input.resume)}`,
    ...(memory ? [memory] : []),
    `ROLE: ${input.job.title ?? "the role"}${input.job.company ? ` at ${input.job.company}` : ""}`,
    `JOB DESCRIPTION:\n${(input.job.description ?? "").slice(0, 4000)}`,
  ].join("\n\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 900,
    system: COVER_LETTER_SYSTEM,
    messages: [{ role: "user", content: [{ type: "text", text: userText }] }],
  });

  if (response.stop_reason === "refusal") return "";
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
}
