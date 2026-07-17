import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseAndStoreResume } from "@/lib/resume/store";

export const maxDuration = 300;

/**
 * Parses the signed-in user's uploaded resume into structured data.
 * Idempotent — safe to re-run to re-parse after a new upload.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("resume_path")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.resume_path) {
    return NextResponse.json({ error: "No resume on file" }, { status: 400 });
  }

  const result = await parseAndStoreResume(supabase, user.id, profile.resume_path);
  const status = result.status === "failed" ? 502 : 200;
  return NextResponse.json(result, { status });
}
