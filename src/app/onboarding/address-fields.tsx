"use client";

import { useEffect, useRef, useState } from "react";
import type { AddressSuggestion } from "@/app/api/geocode/route";

const inputClass =
  "min-h-[45px] w-full rounded-full border border-border bg-transparent px-5 py-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-foreground";

export function AddressFields({
  defaultAddress,
  defaultCity,
  defaultPostalCode,
  defaultCountry,
}: {
  defaultAddress: string;
  defaultCity: string;
  defaultPostalCode: string;
  defaultCountry: string;
}) {
  const [address, setAddress] = useState(defaultAddress);
  const [city, setCity] = useState(defaultCity);
  const [postalCode, setPostalCode] = useState(defaultPostalCode);
  const [country, setCountry] = useState(defaultCountry);

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLLabelElement>(null);
  const skipNextFetch = useRef(false);

  // Debounced fetch as the user types in the address field.
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const q = address.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { suggestions: AddressSuggestion[] };
        setSuggestions(data.suggestions);
        setOpen(data.suggestions.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [address]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function choose(s: AddressSuggestion) {
    skipNextFetch.current = true; // don't re-query for the value we just set
    setAddress(s.address || s.label);
    if (s.city) setCity(s.city);
    if (s.postalCode) setPostalCode(s.postalCode);
    if (s.country) setCountry(s.country);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="relative flex flex-col gap-1.5" ref={boxRef}>
        <span className="text-sm font-medium text-foreground">Address</span>
        <input
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          autoComplete="off"
          placeholder="Start typing your address…"
          className={inputClass}
        />
        {open && (
          <ul className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-2xl border border-border bg-background shadow-card">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => choose(s)}
                  className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-black/[0.04]"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {loading && address.trim().length >= 3 && (
          <span className="absolute right-4 top-9 text-xs text-muted">…</span>
        )}
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">City</span>
          <input
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Postal code</span>
          <input
            name="postal_code"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="Postal code"
            className={inputClass}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Country</span>
        <input
          name="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder="Country"
          className={inputClass}
        />
      </label>
    </div>
  );
}
