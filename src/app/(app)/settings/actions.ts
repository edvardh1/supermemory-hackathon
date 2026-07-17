"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface SettingsState {
  saved?: boolean;
  error?: string;
}

/** Persist the user's application mode (auto vs review) on their profile. */
export async function updateApplicationMode(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  const raw = String(formData.get("application_mode") ?? "");
  const mode = raw === "auto" ? "auto" : raw === "review" ? "review" : null;
  if (!mode) return { error: "Pick a valid mode." };

  const { error } = await supabase
    .from("profiles")
    .update({ application_mode: mode })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { saved: true };
}
