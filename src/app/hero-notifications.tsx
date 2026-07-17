"use client";

import { useEffect, useRef, useState } from "react";

// A cycling stack of "you just applied" notifications for the hero, modeled on
// tryspecter.com's animated card deck: new cards rise from the back to the
// front, the front card ages out downward. Company logos come from the same
// icon service the app uses (icons.duckduckgo.com), with a letter fallback.
type Notif = { company: string; domain: string; role: string };

const NOTIFS: Notif[] = [
  { company: "NVIDIA", domain: "nvidia.com", role: "Senior Software Engineer, GPU" },
  { company: "OpenAI", domain: "openai.com", role: "Research Engineer, Alignment" },
  { company: "Anthropic", domain: "anthropic.com", role: "Product Designer" },
  { company: "Stripe", domain: "stripe.com", role: "Backend Engineer, Payments" },
  { company: "Databricks", domain: "databricks.com", role: "Solutions Architect" },
  { company: "Datadog", domain: "datadoghq.com", role: "Site Reliability Engineer" },
  { company: "Cloudflare", domain: "cloudflare.com", role: "Systems Engineer" },
];

const N = NOTIFS.length;
// Relative time shown per depth, so the front card always reads "just applied".
const TIME_BY_DEPTH = ["just now", "1m", "4m"];

/** Card presentation for its position in the stack (0 = front). */
function styleForRel(rel: number): React.CSSProperties {
  // rel 0 front → 1, 2 behind (rising). N-1 is the card that just left (exits down).
  const base: React.CSSProperties = {
    transition:
      "transform 900ms cubic-bezier(0.16,1,0.3,1), opacity 900ms cubic-bezier(0.16,1,0.3,1), filter 900ms ease",
    willChange: "transform, opacity",
  };
  if (rel === 0) return { ...base, transform: "translate(-50%, 0) scale(1)", opacity: 1, filter: "blur(0px)", zIndex: 40 };
  if (rel === 1) return { ...base, transform: "translate(-50%, -12px) scale(0.96)", opacity: 0.85, filter: "blur(0px)", zIndex: 30 };
  if (rel === 2) return { ...base, transform: "translate(-50%, -23px) scale(0.92)", opacity: 0.5, filter: "blur(0.6px)", zIndex: 20 };
  if (rel === 3) return { ...base, transform: "translate(-50%, -32px) scale(0.88)", opacity: 0.22, filter: "blur(1.2px)", zIndex: 10 };
  if (rel === N - 1) return { ...base, transform: "translate(-50%, 20px) scale(1.02)", opacity: 0, filter: "blur(2px)", zIndex: 5 };
  // Everything else is parked, invisible, at the back.
  return { ...base, transform: "translate(-50%, -32px) scale(0.88)", opacity: 0, filter: "blur(1.2px)", zIndex: 0 };
}

function Logo({ domain, company }: { domain: string; company: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="grid h-full w-full place-items-center bg-[#f3f4f6] text-[15px] font-semibold text-muted">
        {company[0]}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
      alt={company}
      width={40}
      height={40}
      className="h-full w-full object-contain p-1.5"
      onError={() => setFailed(true)}
    />
  );
}

export function HeroNotifications() {
  const [head, setHead] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Respect reduced-motion — hold on the first card.
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    timer.current = setInterval(() => setHead((h) => (h + 1) % N), 2600);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  return (
    <div className="mx-auto mb-6 h-[96px] w-full max-w-[360px]" aria-hidden>
      <div className="relative h-full w-full">
        {NOTIFS.map((n, i) => {
          const rel = (i - head + N) % N;
          const time = rel < TIME_BY_DEPTH.length ? TIME_BY_DEPTH[rel] : "";
          return (
            <div
              key={n.company}
              style={styleForRel(rel)}
              className="absolute bottom-0 left-1/2 flex w-[340px] max-w-full items-center gap-3 rounded-2xl border border-border/70 bg-white/80 p-3 shadow-[var(--shadow-card)] backdrop-blur-md"
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-white">
                <Logo domain={n.domain} company={n.company} />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="mb-0.5 flex items-center gap-1.5 text-sm font-medium leading-tight tracking-tight">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Applied
                  </span>
                  <span className="truncate text-foreground">{n.company}</span>
                </p>
                <p className="truncate text-[13px] leading-tight tracking-tight text-muted">{n.role}</p>
              </div>
              <span className="shrink-0 self-start text-[11px] text-muted">{time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
