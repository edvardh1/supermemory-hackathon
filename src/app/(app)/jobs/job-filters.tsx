"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Search, Check, X } from "lucide-react";
import { CATEGORIES, WORKPLACE_FILTERS } from "@job-automation/core/categorize";

interface Opt { v: string; l: string }

const SCOPE_OPTS: Opt[] = [
  { v: "title", l: "Title only" },
  { v: "all", l: "Title + description" },
];
const DATE_OPTS: Opt[] = [
  { v: "", l: "Any time" },
  { v: "1", l: "Past 24 hours" },
  { v: "3", l: "Past 3 days" },
  { v: "7", l: "Past week" },
  { v: "30", l: "Past month" },
];
const SALARY_OPTS: Opt[] = [
  { v: "", l: "Any salary" },
  { v: "50000", l: "$50k+" },
  { v: "80000", l: "$80k+" },
  { v: "100000", l: "$100k+" },
  { v: "150000", l: "$150k+" },
  { v: "200000", l: "$200k+" },
];
const EMPLOYMENT_OPTS: Opt[] = [
  { v: "", l: "Any type" },
  { v: "full-time", l: "Full-time" },
  { v: "part-time", l: "Part-time" },
  { v: "contract", l: "Contract" },
  { v: "internship", l: "Internship" },
];
const PROVIDER_OPTS: Opt[] = [
  { v: "", l: "Any provider" },
  { v: "ashby", l: "Ashby" },
  { v: "greenhouse", l: "Greenhouse" },
  { v: "lever", l: "Lever" },
  { v: "workday", l: "Workday" },
];
const ROLE_OPTS: Opt[] = [{ v: "", l: "Any role" }, ...CATEGORIES.map((c) => ({ v: c, l: c }))];
const WORKPLACE_OPTS: Opt[] = [
  { v: "", l: "Anywhere" },
  ...WORKPLACE_FILTERS.map((w) => ({ v: w.value, l: w.label })),
];

const pillBase =
  "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors";
const pillOff = "border-border text-foreground hover:border-foreground";
const pillOn = "border-foreground bg-black/[0.04] text-foreground font-medium";

/* Close-on-outside-click popover wrapper. */
function Popover({
  label, active, children, width = "min-w-52",
}: {
  label: ReactNode;
  active: boolean;
  children: (close: () => void) => ReactNode;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={`${pillBase} ${active ? pillOn : pillOff}`}>
        {label}
        <ChevronDown size={14} className="text-muted" />
      </button>
      {open && (
        <div className={`absolute left-0 z-30 mt-1.5 ${width} rounded-2xl border border-border bg-background p-1.5 shadow-card`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function OptionRow({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-black/[0.04]"
    >
      <span className="truncate">{children}</span>
      {selected && <Check size={15} className="shrink-0 text-foreground" />}
    </button>
  );
}

export function JobFilters({
  companies,
}: {
  companies: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const get = (k: string) => params.get(k) ?? "";

  const setParams = (patch: Record<string, string>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    p.delete("page"); // any filter change resets to page 1
    router.push(`${pathname}?${p.toString()}`);
  };

  // Local state for the free-text inputs (committed on submit).
  const [text, setText] = useState(get("q"));
  const [scope, setScope] = useState(get("scope") || "title");
  useEffect(() => setText(get("q")), [params]); // keep in sync on back/forward

  const labelFor = (opts: Opt[], key: string, fallback: string) => {
    const v = get(key);
    return v ? opts.find((o) => o.v === v)?.l ?? fallback : fallback;
  };
  const companyLabel = () => {
    const id = get("company");
    return id ? companies.find((c) => c.id === id)?.name ?? "Company" : "Company";
  };

  const anyActive = ["q", "date", "role", "provider", "workplace", "employment", "salary", "company", "location"]
    .some((k) => get(k));

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar with scope selector */}
      <form
        onSubmit={(e) => { e.preventDefault(); setParams({ q: text.trim(), scope: scope === "title" ? "" : scope }); }}
        className="flex items-center gap-2 rounded-full border border-border bg-background py-1.5 pl-2 pr-1.5 shadow-card focus-within:border-foreground"
      >
        <Popover
          active={scope === "all"}
          label={<span className="text-muted">{scope === "all" ? "Title + description" : "Title only"}</span>}
        >
          {(close) => (
            <>
              {SCOPE_OPTS.map((o) => (
                <OptionRow key={o.v} selected={scope === o.v} onClick={() => { setScope(o.v); close(); }}>
                  {o.l}
                </OptionRow>
              ))}
            </>
          )}
        </Popover>
        <span className="h-5 w-px bg-border" />
        <Search size={17} className="ml-1 shrink-0 text-muted" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search by title or keyword…"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
        />
        <button type="submit" className="rounded-full bg-[#19191a] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90">
          Search
        </button>
      </form>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <SelectPill name="Date" paramKey="date" opts={DATE_OPTS} get={get} setParams={setParams} labelFor={labelFor} />
        <SelectPill name="Role" paramKey="role" opts={ROLE_OPTS} get={get} setParams={setParams} labelFor={labelFor} />
        <SelectPill name="Provider" paramKey="provider" opts={PROVIDER_OPTS} get={get} setParams={setParams} labelFor={labelFor} />
        <SelectPill name="Workplace" paramKey="workplace" opts={WORKPLACE_OPTS} get={get} setParams={setParams} labelFor={labelFor} />
        <SelectPill name="Employment" paramKey="employment" opts={EMPLOYMENT_OPTS} get={get} setParams={setParams} labelFor={labelFor} />
        <SelectPill name="Salary" paramKey="salary" opts={SALARY_OPTS} get={get} setParams={setParams} labelFor={labelFor} />

        {/* Company — searchable */}
        <Popover active={!!get("company")} label={<span>{companyLabel()}</span>} width="min-w-64">
          {(close) => <CompanyMenu companies={companies} current={get("company")} onPick={(id) => { setParams({ company: id }); close(); }} />}
        </Popover>

        {/* Location — free text */}
        <Popover active={!!get("location")} label={<span>{get("location") || "Location"}</span>} width="min-w-64">
          {(close) => (
            <LocationMenu
              current={get("location")}
              onApply={(loc) => { setParams({ location: loc }); close(); }}
            />
          )}
        </Popover>

        {anyActive && (
          <button
            onClick={() => router.push(pathname)}
            className="flex items-center gap-1 rounded-full px-3 py-2 text-sm text-muted hover:text-foreground"
          >
            <X size={14} /> Clear all
          </button>
        )}
      </div>
    </div>
  );
}

function SelectPill({
  name, paramKey, opts, get, setParams, labelFor,
}: {
  name: string;
  paramKey: string;
  opts: Opt[];
  get: (k: string) => string;
  setParams: (p: Record<string, string>) => void;
  labelFor: (opts: Opt[], key: string, fallback: string) => string;
}) {
  const active = !!get(paramKey);
  return (
    <Popover active={active} label={<span>{labelFor(opts, paramKey, name)}</span>}>
      {(close) => (
        <>
          {opts.map((o) => (
            <OptionRow key={o.v} selected={get(paramKey) === o.v} onClick={() => { setParams({ [paramKey]: o.v }); close(); }}>
              {o.l}
            </OptionRow>
          ))}
        </>
      )}
    </Popover>
  );
}

function CompanyMenu({
  companies, current, onPick,
}: {
  companies: { id: string; name: string }[];
  current: string;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = companies.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  return (
    <div>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search companies…"
        className="mb-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-foreground"
      />
      <div className="max-h-64 overflow-y-auto">
        <OptionRow selected={!current} onClick={() => onPick("")}>All companies</OptionRow>
        {filtered.map((c) => (
          <OptionRow key={c.id} selected={current === c.id} onClick={() => onPick(c.id)}>{c.name}</OptionRow>
        ))}
        {filtered.length === 0 && <p className="px-3 py-2 text-sm text-muted">No matches</p>}
      </div>
    </div>
  );
}

function LocationMenu({ current, onApply }: { current: string; onApply: (loc: string) => void }) {
  const [v, setV] = useState(current);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onApply(v.trim()); }} className="flex flex-col gap-2 p-1">
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="City, country, or “remote”…"
        className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-foreground"
      />
      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-lg bg-[#19191a] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">Apply</button>
        {current && (
          <button type="button" onClick={() => onApply("")} className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground">Clear</button>
        )}
      </div>
    </form>
  );
}
