"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Mark one notification read, then navigate to where the action is needed. */
export async function openNotification(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const hrefRaw = String(formData.get("href") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (id) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("profile_id", user.id)
      .is("read_at", null);
  }

  // Only allow internal paths (guard against open redirects).
  const href = hrefRaw.startsWith("/") ? hrefRaw : "/applications";
  revalidatePath("/", "layout");
  redirect(href);
}

/** Mark every unread notification read. */
export async function markAllRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", user.id)
    .is("read_at", null);

  revalidatePath("/", "layout");
}
