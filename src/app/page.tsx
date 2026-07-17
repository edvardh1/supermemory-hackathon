import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeroNotifications } from "./hero-notifications";

export const dynamic = "force-dynamic";

// Recognizable employers we pull live openings from — shown as a grayscale
// wordmark cloud (Specter-style).
const EMPLOYERS = [
  "NVIDIA",
  "OpenAI",
  "Anthropic",
  "Stripe",
  "Databricks",
  "Datadog",
  "Palantir",
  "Cloudflare",
  "MongoDB",
  "DoorDash",
  "Okta",
  "Brex",
];

// The four ATS platforms we scrape + auto-apply on, with their badge colors
// (matched to the in-app ProviderBadge).
const PLATFORMS = [
  { label: "Ashby", className: "bg-violet-50 text-violet-700" },
  { label: "Greenhouse", className: "bg-green-50 text-green-700" },
  { label: "Lever", className: "bg-amber-50 text-amber-700" },
  { label: "Workday", className: "bg-blue-50 text-blue-700" },
];

// Old-way vs Employable comparison rows.
const COMPARISON = [
  {
    label: "Finding jobs",
    old: "20 browser tabs across every career site",
    ours: "One feed, every major ATS",
  },
  {
    label: "Each application",
    old: "~20 minutes of copy-paste",
    ours: "Auto-filled & submitted for you",
  },
  {
    label: "Screening questions",
    old: "Retype the same answers, forever",
    ours: "Answered from your profile + AI",
  },
  {
    label: "Keeping track",
    old: "A spreadsheet you stop updating",
    ours: "Every application tracked & retryable",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Build your profile once",
    body: "Upload your resume. We parse your skills, experience, education, and work authorization into a profile you never fill out again.",
  },
  {
    n: "02",
    title: "We surface the right roles",
    body: "Fresh openings from Ashby, Greenhouse, Lever, and Workday — in one searchable feed, filtered down to what actually fits you.",
  },
  {
    n: "03",
    title: "We apply for you",
    body: "Forms filled, screening questions answered, resume attached, submitted. You get a confirmation and a screenshot of every application.",
  },
];

const FEATURES = [
  {
    title: "One unified feed",
    body: "Every job from every supported ATS, deduplicated and refreshed automatically — no more tab juggling.",
  },
  {
    title: "Autonomous apply",
    body: "Real browser workers submit your application the way you would — resume, links, and all.",
  },
  {
    title: "AI-drafted answers",
    body: "“Why do you want to work here?” drafted from your profile and the job description, ready for you to approve.",
  },
  {
    title: "Smart form mapping",
    body: "We map your profile onto each platform's fields — dropdowns, radios, work authorization, and custom questions.",
  },
  {
    title: "Tracking & retries",
    body: "See every submission's status, review a screenshot, and re-queue anything that needs a second pass in one click.",
  },
  {
    title: "Verification handoff",
    body: "When an employer emails a code, enter it once and the worker picks the application right back up.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
      {children}
    </p>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const [{ count: jobCount }, { data: { user } }] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.auth.getUser(),
  ]);

  const jobs = (jobCount ?? 0).toLocaleString();
  const primaryHref = user ? "/dashboard" : "/signup";
  const primaryLabel = user ? "Go to dashboard" : "Get started — it's free";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Announcement bar */}
      <div className="bg-[#19191a] text-white">
        <Link
          href="/jobs"
          className="mx-auto flex w-full max-w-6xl items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium"
        >
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Auto-apply now supports Ashby, Greenhouse, Lever &amp; Workday
          <span className="text-white/60">· Browse {jobs} jobs →</span>
        </Link>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.3px]">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-[#19191a] text-[13px] font-bold text-white">
              e
            </span>
            Employable
          </Link>
          <nav className="hidden items-center gap-7 text-[13px] font-medium text-muted md:flex">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#coverage" className="hover:text-foreground">Coverage</a>
            <a href="#features" className="hover:text-foreground">Features</a>
            <Link href="/jobs" className="hover:text-foreground">Browse jobs</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-[13px] font-medium text-muted hover:text-foreground sm:block">
              Log in
            </Link>
            <Link
              href={primaryHref}
              className="inline-flex h-9 items-center rounded-full bg-[#19191a] px-4 text-[13px] font-medium text-white hover:opacity-90"
            >
              {user ? "Dashboard" : "Get started"}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-5 pt-12 pb-16 text-center sm:pt-16">
          <HeroNotifications />
          <h1 className="mx-auto max-w-4xl text-[40px] font-semibold leading-[1.04] tracking-[-1.4px] sm:text-6xl lg:text-[72px] lg:tracking-[-1.8px]">
            The last job application{" "}
            <br className="hidden sm:block" />
            you&apos;ll ever fill out.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-[23px] text-muted">
            Employable pulls every opening from Ashby, Greenhouse, Lever, and Workday
            into a single feed — then applies on your behalf. Set up your profile once.
            We handle the rest.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={primaryHref}
              className="inline-flex h-[46px] min-w-[220px] items-center justify-center rounded-full bg-[#19191a] px-6 text-sm font-medium text-white hover:opacity-90"
            >
              {primaryLabel}
            </Link>
            <Link
              href="/jobs"
              className="inline-flex h-[46px] min-w-[220px] items-center justify-center rounded-full border border-border bg-white px-6 text-sm font-medium text-foreground hover:bg-black/[0.02]"
            >
              Browse the job feed
            </Link>
          </div>
          <p className="mt-4 text-[12px] text-muted">Free to start · No credit card required</p>

          {/* Product mockup */}
          <JobFeedMockup jobCount={jobs} />
        </section>

        {/* Logo cloud */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-20">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Pulling live roles from the companies you actually want
          </p>
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 md:grid-cols-6">
            {EMPLOYERS.map((name) => (
              <div
                key={name}
                className="flex items-center justify-center text-[17px] font-semibold tracking-[-0.4px] text-muted/60 grayscale transition hover:text-muted"
              >
                {name}
              </div>
            ))}
          </div>
        </section>

        {/* Comparison */}
        <section className="border-y border-border bg-[#fafafa]">
          <div className="mx-auto w-full max-w-6xl px-5 py-20">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <h2 className="max-w-lg text-[32px] font-semibold leading-[1.1] tracking-[-0.6px] sm:text-[44px]">
                One feed for every job board.
                <span className="block text-muted">Zero forms for you.</span>
              </h2>
              <div className="rounded-xl border border-border bg-white px-5 py-4 text-sm shadow-[var(--shadow-card)]">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-emerald-600">4</span>
                  <span className="text-muted">ATS platforms, one login</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-emerald-600">{jobs}</span>
                  <span className="text-muted">jobs refreshed automatically</span>
                </div>
              </div>
            </div>

            <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-card)]">
              <div className="grid grid-cols-[1.1fr_1fr_1.2fr] border-b border-border bg-[#fafafa] text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                <div className="px-5 py-3.5" />
                <div className="px-5 py-3.5">The old way</div>
                <div className="px-5 py-3.5 text-foreground">With Employable</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-[1.1fr_1fr_1.2fr] items-center text-sm ${
                    i < COMPARISON.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="px-5 py-4 font-medium text-foreground">{row.label}</div>
                  <div className="px-5 py-4 text-muted">{row.old}</div>
                  <div className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[13px] font-medium text-emerald-700">
                      <CheckIcon /> {row.ours}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto w-full max-w-6xl px-5 py-24">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-3 max-w-2xl text-[32px] font-semibold leading-[1.1] tracking-[-0.6px] sm:text-[44px]">
            Three steps between you and applied.
          </h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <div className="text-[13px] font-semibold text-muted/70">{s.n}</div>
                <div className="mt-3 h-px w-full bg-border" />
                <h3 className="mt-5 text-[21px] font-semibold tracking-[-0.3px]">{s.title}</h3>
                <p className="mt-3 text-sm leading-[22px] text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Coverage / ATS graphic */}
        <section id="coverage" className="border-y border-border bg-[#fafafa]">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 py-24 md:grid-cols-2">
            <div>
              <SectionLabel>Coverage</SectionLabel>
              <h2 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.6px] sm:text-[44px]">
                Every major application platform, covered.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-[22px] text-muted">
                Most companies hide their jobs behind one of a handful of applicant
                tracking systems. We speak all of them — scraping the listings and
                submitting your application natively, the same way a person would.
              </p>
              <div className="mt-8 flex flex-wrap gap-2.5">
                {PLATFORMS.map((p) => (
                  <span
                    key={p.label}
                    className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-medium ${p.className}`}
                  >
                    {p.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Simple concentric coverage graphic */}
            <div className="relative mx-auto grid aspect-square w-full max-w-sm place-items-center">
              <div className="absolute inset-0 rounded-full border border-border" />
              <div className="absolute inset-[14%] rounded-full border border-border" />
              <div className="absolute inset-[30%] rounded-full border border-dashed border-border" />
              {PLATFORMS.map((p, i) => {
                const pos = [
                  "left-1/2 top-0 -translate-x-1/2",
                  "right-0 top-1/2 -translate-y-1/2",
                  "left-1/2 bottom-0 -translate-x-1/2",
                  "left-0 top-1/2 -translate-y-1/2",
                ][i];
                return (
                  <span
                    key={p.label}
                    className={`absolute ${pos} inline-flex items-center rounded-full border border-border bg-white px-3 py-1.5 text-[13px] font-medium shadow-[var(--shadow-card)] ${p.className}`}
                  >
                    {p.label}
                  </span>
                );
              })}
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-[#19191a] text-2xl font-bold text-white shadow-[var(--shadow-card)]">
                e
              </div>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section id="features" className="mx-auto w-full max-w-6xl px-5 py-24">
          <SectionLabel>Everything you need</SectionLabel>
          <h2 className="mt-3 max-w-2xl text-[32px] font-semibold leading-[1.1] tracking-[-0.6px] sm:text-[44px]">
            A job search that works while you don&apos;t.
          </h2>
          <div className="mt-14 grid gap-x-8 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#19191a] text-white">
                  <DotIcon />
                </div>
                <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.2px]">{f.title}</h3>
                <p className="mt-2 text-sm leading-[22px] text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-24">
          <div className="overflow-hidden rounded-3xl bg-[#19191a] px-6 py-20 text-center text-white">
            <h2 className="mx-auto max-w-2xl text-[32px] font-semibold leading-[1.1] tracking-[-0.6px] sm:text-[48px]">
              Stop applying. Start interviewing.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-[22px] text-white/60">
              Set up your profile once and let Employable work through the openings while
              you get on with your day.
            </p>
            <Link
              href={primaryHref}
              className="mt-9 inline-flex h-[46px] min-w-[240px] items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-[#19191a] hover:opacity-90"
            >
              {primaryLabel}
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-5 py-16">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2 text-[15px] font-semibold">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-[#19191a] text-[13px] font-bold text-white">
                  e
                </span>
                Employable
              </div>
              <p className="mt-4 max-w-xs text-sm leading-[22px] text-muted">
                One feed for every job board — and an autonomous apply worker that fills
                out the forms so you don&apos;t have to.
              </p>
            </div>
            <FooterCol
              title="Product"
              links={[
                { label: "Browse jobs", href: "/jobs" },
                { label: "How it works", href: "#how" },
                { label: "Coverage", href: "#coverage" },
                { label: "Features", href: "#features" },
              ]}
            />
            <FooterCol
              title="Platforms"
              links={PLATFORMS.map((p) => ({ label: p.label, href: "/jobs" }))}
            />
            <FooterCol
              title="Account"
              links={[
                { label: "Get started", href: "/signup" },
                { label: "Log in", href: "/login" },
                { label: "Dashboard", href: "/dashboard" },
              ]}
            />
          </div>

          <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-[12px] text-muted sm:flex-row">
            <span>© {new Date().getFullYear()} Employable. All rights reserved.</span>
            <span>{jobs} open positions and counting.</span>
          </div>
        </div>

        {/* Oversized wordmark, Specter-style */}
        <div className="overflow-hidden px-5 pb-6">
          <div className="select-none text-center text-[18vw] font-semibold leading-none tracking-[-0.04em] text-black/[0.035]">
            employable
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l, i) => (
          <li key={`${l.label}-${i}`}>
            <Link href={l.href} className="text-sm text-muted hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A stylized recreation of the in-app /jobs feed for the hero. */
function JobFeedMockup({ jobCount }: { jobCount: string }) {
  const rows = [
    { title: "Senior Software Engineer, GPU", company: "NVIDIA", loc: "Santa Clara, CA", platform: PLATFORMS[3] },
    { title: "Research Engineer, Alignment", company: "OpenAI", loc: "San Francisco, CA", platform: PLATFORMS[0] },
    { title: "Product Designer", company: "Anthropic", loc: "Remote · US", platform: PLATFORMS[1] },
    { title: "Forward Deployed Engineer", company: "Palantir", loc: "Palo Alto, CA", platform: PLATFORMS[2] },
  ];
  const filters = ["Date", "Role", "Workplace", "Salary", "Location"];

  return (
    <div className="mx-auto mt-16 w-full max-w-3xl text-left">
      <div className="rounded-2xl border border-border bg-white p-4 shadow-[var(--shadow-card)] sm:p-6">
        {/* header */}
        <div className="flex items-baseline justify-between">
          <h3 className="text-xl font-semibold tracking-[-0.4px]">Jobs</h3>
          <span className="text-[13px] text-muted">{jobCount} open positions</span>
        </div>
        {/* search + filters */}
        <div className="mt-4 flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm text-muted">
          <SearchIcon />
          Search by title or keyword
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[13px] font-medium text-foreground"
            >
              {f}
              <ChevronIcon />
            </span>
          ))}
        </div>
        {/* rows */}
        <div className="mt-4 space-y-2.5">
          {rows.map((r) => (
            <div
              key={r.title}
              className="flex items-center gap-3 rounded-xl border border-border/70 px-3.5 py-3"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border text-[13px] font-semibold text-muted">
                {r.company[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{r.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted">
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${r.platform.className}`}
                  >
                    {r.platform.label}
                  </span>
                  <span>
                    {r.company} · {r.loc}
                  </span>
                </div>
              </div>
              <span className="hidden shrink-0 rounded-full bg-[#19191a] px-3.5 py-1.5 text-[12px] font-medium text-white sm:inline-flex">
                Auto-apply
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --- inline icons (no external assets) --- */
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
