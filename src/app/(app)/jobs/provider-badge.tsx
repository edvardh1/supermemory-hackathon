// Small colored pill showing which ATS a job came from, so providers are
// visually distinguishable in listings.
const PROVIDERS: Record<string, { label: string; className: string }> = {
  ashby: { label: "Ashby", className: "bg-violet-50 text-violet-700" },
  greenhouse: { label: "Greenhouse", className: "bg-green-50 text-green-700" },
  lever: { label: "Lever", className: "bg-amber-50 text-amber-700" },
  workday: { label: "Workday", className: "bg-blue-50 text-blue-700" },
};

export function ProviderBadge({ platform }: { platform: string | null }) {
  const p = platform ? PROVIDERS[platform] : undefined;
  if (!p) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${p.className}`}
    >
      {p.label}
    </span>
  );
}
