import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next ?? "/jobs");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-14">
      <h1 className="text-[32px] font-semibold leading-[38px] tracking-[-0.4px] text-foreground">
        Welcome back
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        Sign in to continue applying.
      </p>
      <Suspense>
        <LoginForm next={next ?? null} />
      </Suspense>
    </main>
  );
}
