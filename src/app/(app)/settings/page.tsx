import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("application_mode")
    .eq("id", user.id)
    .maybeSingle();

  const mode = profile?.application_mode === "auto" ? "auto" : "review";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-[26px] font-semibold leading-8 tracking-[-0.4px] text-foreground">
        Settings
      </h1>
      <p className="mt-1 text-sm text-muted">
        Application preferences and account.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">Application mode</h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Both modes let the AI draft your answers — the difference is whether you
          review them before they&apos;re sent.
        </p>
        <SettingsClient initialMode={mode} />
      </section>

      <section className="mt-10 border-t border-border pt-8">
        <h2 className="text-sm font-semibold text-foreground">Account</h2>
        <p className="mt-1 text-sm text-muted">
          Signed in as{" "}
          <span className="text-foreground">{user.email ?? "your account"}</span>
        </p>
        <form action="/auth/signout" method="post" className="mt-4">
          <button
            type="submit"
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-black/[0.03]"
          >
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
