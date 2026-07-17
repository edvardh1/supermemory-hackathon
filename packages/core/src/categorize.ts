// Dependency-free so it can run both in the Next.js app and in one-off backfill
// scripts (via tsx). No imports from generated types or the DB.

export type WorkplaceType = "remote" | "hybrid" | "on_site" | "unspecified";

/** Workplace types offered as filters (excludes "unspecified"). */
export const WORKPLACE_FILTERS: { value: WorkplaceType; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on_site", label: "On-site" },
];

export function normalizeWorkplaceType(
  raw: string | null | undefined,
  isRemote: boolean | null | undefined
): WorkplaceType {
  const w = (raw ?? "").toLowerCase().replace(/[\s_-]/g, "");
  if (w === "remote") return "remote";
  if (w === "hybrid") return "hybrid";
  if (w === "onsite") return "on_site";
  // No explicit workplace type (e.g. Greenhouse) — infer from the remote flag.
  if (isRemote === true) return "remote";
  return "unspecified";
}

export const CATEGORIES = [
  "Engineering",
  "Data & ML",
  "Product",
  "Design",
  "Sales",
  "Marketing",
  "Customer Success",
  "Operations",
  "Finance & Legal",
  "People & Recruiting",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Ordered: earlier, more-specific rules win. "Data engineer" should land in
// Data & ML, so those keywords are checked before generic Engineering.
const RULES: { category: Category; keywords: string[] }[] = [
  {
    category: "Data & ML",
    keywords: [
      "machine learning", " ml ", "ml engineer", "ai engineer", "artificial intelligence",
      "data scientist", "data science", "data engineer", "data analyst", "analytics",
      "research scientist", "research engineer", "deep learning", "nlp", "computer vision",
    ],
  },
  {
    category: "Engineering",
    keywords: [
      "engineer", "developer", "swe", "sre", "devops", "infrastructure", "platform",
      "backend", "back end", "frontend", "front end", "full stack", "fullstack",
      "software", "mobile", "ios", "android", "security", "qa", "architect", "programmer",
    ],
  },
  {
    category: "Design",
    keywords: ["designer", "design ", "ux", "ui ", "user experience", "creative", "brand designer"],
  },
  {
    category: "Product",
    keywords: ["product manager", "product owner", "product lead", "product designer", "head of product", "director of product"],
  },
  {
    category: "Sales",
    keywords: [
      "sales", "account executive", "account manager", "business development",
      "revenue", "partnerships", "sdr", "bdr", "solutions engineer", "sales engineer",
    ],
  },
  {
    category: "Marketing",
    keywords: [
      "marketing", "growth", "content", "seo", "demand gen", "communications",
      "public relations", "social media", "copywriter", "brand ",
    ],
  },
  {
    category: "Customer Success",
    keywords: [
      "customer success", "customer experience", "customer support", "technical support",
      "support engineer", "onboarding", "account specialist", "implementation",
    ],
  },
  {
    category: "Finance & Legal",
    keywords: [
      "finance", "financial", "accounting", "accountant", "controller", "treasury",
      "legal", "counsel", "compliance", "tax ", "audit",
    ],
  },
  {
    category: "People & Recruiting",
    keywords: [
      "recruit", "talent", "people ops", "people team", "human resources", " hr ",
      "hr ", "workplace", "office manager",
    ],
  },
  {
    category: "Operations",
    keywords: [
      "operations", "program manager", "project manager", "supply chain", "logistics",
      "strategy", "business operations", "biz ops", "chief of staff",
    ],
  },
];

export function categorizeTitle(title: string): Category {
  // Pad so word-boundary-ish keywords like " ml " match at string edges.
  const t = ` ${title.toLowerCase()} `;
  for (const rule of RULES) {
    if (rule.keywords.some((k) => t.includes(k))) return rule.category;
  }
  return "Other";
}
