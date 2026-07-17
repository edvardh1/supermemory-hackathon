"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthState } from "./actions";

const initialState: AuthState = {};

const inputClass =
  "min-h-[45px] rounded-full border border-border bg-transparent px-5 py-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-foreground";

export function LoginForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState(signIn, initialState);

  return (
    <form action={action} className="mt-8 flex flex-col gap-3.5">
      {next && <input type="hidden" name="next" value={next} />}
      <input
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className={inputClass}
      />
      <input
        type="password"
        name="password"
        required
        autoComplete="current-password"
        placeholder="Password"
        className={inputClass}
      />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-[45px] rounded-full bg-[#19191a] px-5 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="mt-2 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-foreground underline">
          Create account
        </Link>
      </p>
    </form>
  );
}
