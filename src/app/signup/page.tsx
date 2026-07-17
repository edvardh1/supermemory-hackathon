import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next ?? "/dashboard");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-14">
      <h1 className="text-[32px] font-semibold leading-[38px] tracking-[-0.4px] text-foreground">
        Create your account
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        Set up your profile once, then apply with a click.
      </p>
      <Suspense>
        <SignupForm next={next ?? null} />
      </Suspense>
    </main>
  );
}
