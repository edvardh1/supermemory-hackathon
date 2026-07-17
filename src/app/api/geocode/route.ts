import { NextRequest, NextResponse } from "next/server";

// Address autocomplete via Photon (photon.komoot.io) — a free, no-key,
// OpenStreetMap-based geocoder built for as-you-type suggestions. Proxied
// server-side so we set a proper User-Agent and don't expose the user's
// keystrokes cross-origin. Swap for a keyed provider (Mapbox/Geoapify) or a
// self-hosted Photon if you need an SLA at scale.

export interface AddressSuggestion {
  label: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

interface PhotonFeature {
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    type?: string;
  };
}

function normalize(f: PhotonFeature): AddressSuggestion {
  const p = f.properties;
  const street = p.street ?? p.name ?? "";
  const address = p.housenumber ? `${p.housenumber} ${street}`.trim() : street;
  const city = p.city ?? p.town ?? p.village ?? p.county ?? (street ? "" : p.name ?? "");
  const postalCode = p.postcode ?? "";
  const country = p.country ?? "";
  const label = [address, city, p.state, country]
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .join(", ");
  return { label, address, city, postalCode, country };
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`,
      {
        headers: { "User-Agent": "JobAutomation/1.0 (address autocomplete)" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return NextResponse.json({ suggestions: [] });

    const data = (await res.json()) as { features?: PhotonFeature[] };
    const seen = new Set<string>();
    const suggestions: AddressSuggestion[] = [];
    for (const f of data.features ?? []) {
      const s = normalize(f);
      if (!s.label || seen.has(s.label)) continue;
      seen.add(s.label);
      suggestions.push(s);
    }
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
