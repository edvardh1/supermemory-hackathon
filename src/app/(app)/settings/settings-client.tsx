"use client";

import { useActionState, useState } from "react";
import { Zap, ClipboardCheck } from "lucide-react";
import { updateApplicationMode, type SettingsState } from "./actions";

type Mode = "review" | "auto";

const OPTIONS: {
  value: Mode;
  title: string;
  icon: typeof Zap;
  blurb: string;
  points: string[];
}[] = [
  {
    value: "review",
    title: "Review before submit",
    icon: ClipboardCheck,
    blurb: "The AI pre-fills every answer, then you review and edit before it's sent.",
    points: [
      "AI drafts all answers automatically",
      "You can change anything on the form",
      "Nothing is submitted until you click Submit",
    ],
  },
  {
    value: "auto",
    title: "Full-automatic",
    icon: Zap,
    blurb: "The AI fills and submits the application for you. You only step in for a one-time code.",
    points: [
      "Fills and submits with no review step",
      "Live status while it applies",
      "Prompts you only if the site needs an email/OTP code",
    ],
  },
];

export function SettingsClient({ initialMode }: { initialMode: Mode }) {
  const [selected, setSelected] = useState<Mode>(initialMode);
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    updateApplicationMode,
    {}
  );

  const dirty = selected !== initialMode;

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="application_mode" value={selected} />

      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = selected === opt.value;
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              aria-pressed={active}
              className={`flex flex-col gap-3 rounded-xl border p-5 text-left transition-colors ${
                active
                  ? "border-foreground bg-background shadow-card"
                  : "border-border bg-background/60 hover:border-black/20"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    active ? "bg-foreground text-background" : "bg-black/[0.05] text-muted"
                  }`}
                >
                  <Icon size={16} strokeWidth={2.25} />
                </span>
                <span className="text-sm font-semibold text-foreground">{opt.title}</span>
                <span
                  className={`ml-auto h-4 w-4 rounded-full border ${
                    active ? "border-[5px] border-foreground" : "border-black/25"
                  }`}
                  aria-hidden
                />
              </div>
              <p className="text-sm text-muted">{opt.blurb}</p>
              <ul className="mt-1 flex flex-col gap-1.5">
                {opt.points.map((p) => (
                  <li key={p} className="flex gap-2 text-xs text-muted">
                    <span aria-hidden className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-muted" />
                    {p}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !dirty}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {state.saved && !dirty && (
          <span className="text-sm text-green-600">Saved.</span>
        )}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
