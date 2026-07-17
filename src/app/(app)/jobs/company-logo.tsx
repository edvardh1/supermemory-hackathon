"use client";

import { useState } from "react";

interface CompanyLogoProps {
  name: string;
  logoUrl?: string | null;
  size?: number;
}

/**
 * Company logo with a graceful fallback. Renders the cached logo URL (a
 * favicon); if it fails to load — or none exists — it shows a letter avatar
 * built from the company's initial instead of a broken image.
 */
export function CompanyLogo({ name, logoUrl, size = 44 }: CompanyLogoProps) {
  const [broken, setBroken] = useState(false);
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {logoUrl && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- external favicon host, not worth next/image config
        <img
          src={logoUrl}
          alt={`${name} logo`}
          width={size}
          height={size}
          loading="lazy"
          className="h-full w-full object-contain p-1.5"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="text-base font-medium text-muted">{initial}</span>
      )}
    </span>
  );
}
