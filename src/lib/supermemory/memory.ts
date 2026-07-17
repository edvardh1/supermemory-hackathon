import type { Tables } from "@job-automation/core/database.types";
import { isSupermemoryEnabled, recallMemories, rememberMemory } from "./client";

export { isSupermemoryEnabled, recallMemories } from "./client";
export type { MemoryResult } from "./client";

/**
 * Recall the user's most relevant memories and format them as a context block
 * to prepend to an AI generation prompt. Returns "" when memory is disabled or
 * nothing relevant is found (so callers can just concatenate unconditionally).
 */
export async function recallCandidateContext(userId: string, query: string): Promise<string> {
  if (!isSupermemoryEnabled()) return "";
  const results = await recallMemories({ userId, query, limit: 6 });
  const lines = results
    .map((r) => r.content?.replace(/\s+/g, " ").trim().slice(0, 300))
    .filter((c): c is string => Boolean(c))
    .map((c) => `- ${c}`);
  if (!lines.length) return "";
  return (
    "WHAT WE REMEMBER ABOUT THIS CANDIDATE (from their past applications and sessions — " +
    "use only where consistent with the profile above; never contradict it):\n" +
    lines.join("\n")
  );
}

/**
 * Persist the candidate's profile/resume as a durable memory, deduped per user
 * via a stable customId so repeated calls update rather than duplicate.
 */
export async function rememberProfile(
  userId: string,
  profile: Tables<"profiles"> | null,
  resume: Tables<"resume_data"> | null
): Promise<void> {
  if (!isSupermemoryEnabled()) return;
  const parts: string[] = [];
  if (profile?.full_name) parts.push(profile.full_name);
  if (resume?.headline) parts.push(resume.headline);
  if (resume?.years_experience != null) parts.push(`${resume.years_experience} years of experience`);
  if (profile?.location) parts.push(`based in ${profile.location}`);
  if (resume?.summary) parts.push(resume.summary);
  const skills = (resume?.skills as string[] | null) ?? [];
  if (skills.length) parts.push(`Skills: ${skills.slice(0, 30).join(", ")}`);

  const content = parts.filter(Boolean).join(". ");
  if (!content) return;
  await rememberMemory({
    userId,
    content: `Candidate background: ${content}`,
    customId: `profile:${userId}`,
    metadata: { kind: "profile" },
  });
}

/**
 * Record that the candidate applied to a role — over time this builds up a
 * searchable history of the kinds of jobs and companies they target, which
 * recallCandidateContext can surface back into future cover letters/answers.
 */
export async function rememberApplication(
  userId: string,
  input: {
    jobTitle: string | null;
    company: string | null;
    location?: string | null;
    summary?: string | null;
  }
): Promise<void> {
  if (!isSupermemoryEnabled()) return;
  const content = [
    `Applied to ${input.jobTitle ?? "a role"}${input.company ? ` at ${input.company}` : ""}`,
    input.location ? `(${input.location})` : "",
    input.summary ? `— ${input.summary}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const metadata: Record<string, string> = { kind: "application" };
  if (input.company) metadata.company = input.company;
  if (input.jobTitle) metadata.role = input.jobTitle;
  await rememberMemory({ userId, content, metadata });
}
