export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null
): string | null {
  if (min == null && max == null) return null;

  const fmt = (n: number) =>
    n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
  const cur = currency ? `${currency} ` : "";

  if (min != null && max != null) return `${cur}${fmt(min)} – ${fmt(max)}`;
  return `${cur}${fmt((min ?? max)!)}`;
}

export function formatPostedAt(postedAt: string | null): string | null {
  if (!postedAt) return null;

  const days = Math.floor((Date.now() - new Date(postedAt).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
