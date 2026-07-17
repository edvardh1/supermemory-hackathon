"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationPlan } from "@/lib/appliers/plan";

/**
 * One-click retry from the applications list: put a failed application back in
 * the queue. If any required field is still empty, route the user to the review
 * page to finish it rather than re-queueing something incomplete.
 */
export async function requeueApplication(formData: FormData): Promise<void> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: application } = await supabase
    .from("applications")
    .select("id, answers")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) redirect("/applications");

  const plan = application.answers as unknown as ApplicationPlan | null;
  const missing = (plan?.fields ?? []).filter(
    (f) =>
      f.isRequired &&
      f.type !== "File" &&
      (f.value === undefined || f.value === null || String(f.value).trim() === "")
  );
  if (!plan?.fields || missing.length > 0) redirect(`/applications/${applicationId}`);

  const { error } = await supabase
    .from("applications")
    .update({ status: "queued", error: null })
    .eq("id", applicationId);
  if (error) throw new Error(error.message);

  await supabase
    .from("application_events")
    .insert({ application_id: applicationId, event_type: "queued", detail: { via: "retry" } });

  revalidatePath("/applications");
  redirect("/applications?queued=1");
}
