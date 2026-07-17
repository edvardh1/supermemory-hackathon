"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthState } from "../login/actions";

const initialState: AuthState = {};

const inputClass =
  "min-h-[45px] rounded-full border border-border bg-transparent px-5 py-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-foreground";

export function SignupForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState(signUp, initialState);

  return (
    <form action={action} className="mt-8 flex flex-col gap-3.5">
      {next && <input type="hidden" name="next" value={next} />}
      <input
        type="text"
        name="full_name"
        autoComplete="name"
        placeholder="Full name"
        className={inputClass}
      />
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
        autoComplete="new-password"
        placeholder="Password (8+ characters)"
        className={inputClass}
      />
      <input
        type="password"
        name="confirm_password"
        required
        autoComplete="new-password"
        placeholder="Confirm password"
        className={inputClass}
      />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="text-sm text-foreground">{state.message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-[45px] rounded-full bg-[#19191a] px-5 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="mt-2 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
