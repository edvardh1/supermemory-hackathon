import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  const [{ data: profile }, { data: prefs }, { data: resume }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("job_preferences").select("*").eq("profile_id", user.id).maybeSingle(),
    supabase.from("resume_data").select("*").eq("profile_id", user.id).maybeSingle(),
  ]);

  return (
    <OnboardingWizard
      userId={user.id}
      email={user.email ?? ""}
      profile={profile ?? null}
      prefs={prefs ?? null}
      resume={resume ?? null}
    />
  );
}
