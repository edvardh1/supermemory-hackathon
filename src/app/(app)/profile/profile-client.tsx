"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  Pencil, Plus, X, Check, Briefcase, GraduationCap, Award,
  FolderGit2, FileText, Tags, Languages as LanguagesIcon, User2,
} from "lucide-react";
import { AddressFields } from "@/app/onboarding/address-fields";
import {
  updateProfileDetails, saveResumeData, type ResumePatch,
} from "./actions";
import type {
  ParsedCertification, ParsedEducation, ParsedExperience, ParsedProject,
} from "@/lib/resume/schema";

const input =
  "min-h-[42px] w-full rounded-full border border-border bg-transparent px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-foreground";
const textarea =
  "w-full rounded-2xl border border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-foreground";
const primaryBtn =
  "rounded-full bg-[#19191a] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";
const ghostBtn =
  "rounded-full border border-border px-3.5 py-1.5 text-sm text-muted hover:border-foreground hover:text-foreground";
const label = "text-xs font-medium text-muted";

function fmtRange(start: string | null, end: string | null, current?: boolean) {
  const e = current ? "Present" : end;
  if (start && e) return `${start} — ${e}`;
  return start || e || "";
}

/* ------------------------------------------------------------------ shell */

function Card({
  title, icon, count, editing, onEdit, children,
}: {
  title: string;
  icon: ReactNode;
  count?: string;
  editing?: boolean;
  onEdit?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-background p-6 shadow-card">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.05] text-foreground">
            {icon}
          </span>
          <div className="leading-tight">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {count && <p className="mt-0.5 text-xs text-muted">{count}</p>}
          </div>
        </div>
        {onEdit && !editing && (
          <button
            onClick={onEdit}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-foreground hover:text-foreground"
          >
            <Pencil size={13} /> Edit
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

/** Rounded-square initial avatar (company / institution). */
function ItemAvatar({ name }: { name: string | null | undefined }) {
  const initials =
    (name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.05] text-xs font-semibold text-foreground">
      {initials}
    </span>
  );
}

/** Clean bullet list (small dots) for role/project highlights. */
function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1">
      {items.map((h, i) => (
        <li key={i} className="flex gap-2 text-sm text-foreground/80">
          <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted" />
          <span>{h}</span>
        </li>
      ))}
    </ul>
  );
}

/** LinkedIn-style duration, e.g. "2 yrs 11 mos" (endpoint-inclusive). */
function durationLabel(start: string | null, end: string | null, current?: boolean): string {
  const parse = (s: string | null) => {
    if (!s) return null;
    const m = String(s).match(/(\d{4})(?:[-/](\d{1,2}))?/);
    return m ? { y: Number(m[1]), mo: m[2] ? Number(m[2]) - 1 : 0 } : null;
  };
  const a = parse(start);
  if (!a) return "";
  const now = new Date();
  const b = current ? { y: now.getFullYear(), mo: now.getMonth() } : parse(end);
  if (!b) return "";
  const months = (b.y - a.y) * 12 + (b.mo - a.mo) + 1;
  if (months <= 0) return "";
  const yrs = Math.floor(months / 12);
  const mos = months % 12;
  return [yrs && `${yrs} yr${yrs > 1 ? "s" : ""}`, mos && `${mos} mo${mos > 1 ? "s" : ""}`]
    .filter(Boolean)
    .join(" ");
}

function plural(n: number, singular: string): string {
  const word = n === 1 ? singular : singular === "entry" ? "entries" : `${singular}s`;
  return `${n} ${word}`;
}

function EditActions({ pending, onCancel }: { pending: boolean; onCancel: () => void }) {
  return (
    <div className="mt-5 flex gap-2">
      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? "Saving…" : "Save changes"}
      </button>
      <button type="button" onClick={onCancel} className={ghostBtn}>
        Cancel
      </button>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

/* ------------------------------------------------------------------ about */

export function AboutSection({
  headline, summary, years,
}: {
  headline: string | null;
  summary: string | null;
  years: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <Card title="About" icon={<FileText size={16} />} editing>
        <form
          action={(fd) =>
            start(async () => {
              await saveResumeData({
                headline: (fd.get("headline") as string)?.trim() || null,
                summary: (fd.get("summary") as string)?.trim() || null,
                years_experience: fd.get("years") ? Number(fd.get("years")) : null,
              });
              setEditing(false);
            })
          }
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={label}>Headline</span>
              <input name="headline" defaultValue={headline ?? ""} placeholder="e.g. Senior Product Engineer" className={input} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Years of experience</span>
              <input name="years" type="number" min="0" defaultValue={years ?? ""} className={`${input} max-w-40`} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={label}>Summary</span>
              <textarea name="summary" defaultValue={summary ?? ""} rows={4} placeholder="A short professional summary" className={textarea} />
            </label>
          </div>
          <EditActions pending={pending} onCancel={() => setEditing(false)} />
        </form>
      </Card>
    );
  }

  return (
    <Card title="About" icon={<FileText size={16} />} onEdit={() => setEditing(true)}>
      {headline && <p className="text-base font-medium text-foreground">{headline}</p>}
      {years != null && <p className="mt-0.5 text-sm text-muted">{years} years of experience</p>}
      {summary ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">{summary}</p>
      ) : (
        !headline && <Empty>No summary yet — add a headline and short bio.</Empty>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- details */

interface DetailsProps {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  authorizedUs: boolean;
  needsSponsorship: boolean;
}

function Row({ label: l, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-2 text-sm">
      <span className="w-28 shrink-0 text-muted">{l}</span>
      <span className="min-w-0 flex-1 break-words text-foreground">{children}</span>
    </div>
  );
}

export function DetailsSection(p: DetailsProps) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <Card title="Contact & eligibility" icon={<User2 size={16} />} editing>
        <form
          action={(fd) =>
            start(async () => {
              await updateProfileDetails(fd);
              setEditing(false);
            })
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className={label}>Full name</span>
                <input name="full_name" defaultValue={p.fullName ?? ""} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Phone</span>
                <input name="phone" defaultValue={p.phone ?? ""} className={input} />
              </label>
            </div>

            <AddressFields
              defaultAddress={p.address ?? ""}
              defaultCity={p.city ?? ""}
              defaultPostalCode={p.postalCode ?? ""}
              defaultCountry={p.country ?? ""}
            />

            <div className="grid grid-cols-1 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className={label}>LinkedIn</span>
                <input name="linkedin_url" defaultValue={p.linkedin ?? ""} placeholder="https://linkedin.com/in/…" className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>GitHub</span>
                <input name="github_url" defaultValue={p.github ?? ""} placeholder="https://github.com/…" className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={label}>Portfolio</span>
                <input name="portfolio_url" defaultValue={p.portfolio ?? ""} placeholder="https://…" className={input} />
              </label>
            </div>

            <div className="flex flex-col gap-2.5 rounded-2xl border border-border p-4">
              <span className={label}>Work eligibility</span>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" name="authorized_us" defaultChecked={p.authorizedUs} className="accent-accent" />
                Authorized to work in the US
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" name="needs_sponsorship" defaultChecked={p.needsSponsorship} className="accent-accent" />
                I require visa sponsorship
              </label>
            </div>
          </div>
          <EditActions pending={pending} onCancel={() => setEditing(false)} />
        </form>
      </Card>
    );
  }

  const link = (url: string | null) =>
    url ? (
      <a href={url} target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-2 hover:text-muted">
        {url.replace(/^https?:\/\/(www\.)?/, "")}
      </a>
    ) : (
      <span className="text-muted">—</span>
    );

  return (
    <Card title="Contact & eligibility" icon={<User2 size={16} />} onEdit={() => setEditing(true)}>
      <div className="divide-y divide-border">
        <Row label="Name">{p.fullName ?? <span className="text-muted">—</span>}</Row>
        <Row label="Email">{p.email ?? <span className="text-muted">—</span>}</Row>
        <Row label="Phone">{p.phone ?? <span className="text-muted">—</span>}</Row>
        <Row label="Location">{p.location ?? <span className="text-muted">—</span>}</Row>
        <Row label="LinkedIn">{link(p.linkedin)}</Row>
        <Row label="GitHub">{link(p.github)}</Row>
        <Row label="Portfolio">{link(p.portfolio)}</Row>
        <Row label="Eligibility">
          <span className="flex flex-wrap gap-1.5">
            <Tag>{p.authorizedUs ? "US authorized" : "Not US authorized"}</Tag>
            <Tag>{p.needsSponsorship ? "Needs sponsorship" : "No sponsorship needed"}</Tag>
          </span>
        </Row>
      </div>
    </Card>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-black/[0.04] px-2.5 py-0.5 text-xs text-foreground">
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- chips */

export function ChipsSection({
  title, icon, field, items,
}: {
  title: string;
  icon: ReactNode;
  field: "skills" | "languages";
  items: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<string[]>(items);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();

  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) setValues([...values, v]);
    setDraft("");
  };

  if (editing) {
    return (
      <Card title={title} icon={icon} editing>
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-black/[0.05] py-1 pl-3 pr-1.5 text-sm text-foreground">
              {v}
              <button type="button" onClick={() => setValues(values.filter((x) => x !== v))} className="rounded-full p-0.5 text-muted hover:text-foreground" aria-label={`Remove ${v}`}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder={`Add ${title.toLowerCase()}…`}
            className={input}
          />
          <button type="button" onClick={add} className={ghostBtn}><Plus size={16} /></button>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            disabled={pending}
            onClick={() => start(async () => { await saveResumeData({ [field]: values } as ResumePatch); setEditing(false); })}
            className={primaryBtn}
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button type="button" onClick={() => { setValues(items); setEditing(false); }} className={ghostBtn}>Cancel</button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={title}
      icon={icon}
      count={values.length ? plural(values.length, title.replace(/s$/, "").toLowerCase()) : undefined}
      onEdit={() => setEditing(true)}
    >
      {values.length ? (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <span key={v} className="rounded-full bg-black/[0.04] px-3 py-1 text-sm text-foreground">{v}</span>
          ))}
        </div>
      ) : (
        <Empty>No {title.toLowerCase()} added yet.</Empty>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------ list editor */

type FieldType = "text" | "textarea" | "date" | "checkbox" | "lines";
interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  half?: boolean;
}

function ListSection<T extends Record<string, unknown>>({
  title, icon, field, items, fields, blank, renderView, unit,
}: {
  title: string;
  icon: ReactNode;
  field: keyof ResumePatch;
  items: T[];
  fields: FieldDef[];
  blank: () => T;
  renderView: (item: T) => ReactNode;
  unit?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<T[]>(items);
  const [pending, start] = useTransition();

  const setField = (i: number, key: string, value: unknown) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  if (editing) {
    return (
      <Card title={title} icon={icon} editing>
        <div className="flex flex-col gap-4">
          {rows.map((row, i) => (
            <div key={i} className="rounded-2xl border border-border p-4">
              <div className="mb-3 flex justify-end">
                <button type="button" onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="text-muted hover:text-foreground" aria-label="Remove entry">
                  <X size={15} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {fields.map((f) => {
                  const val = row[f.key];
                  const cls = f.half ? "" : "col-span-2";
                  if (f.type === "checkbox") {
                    return (
                      <label key={f.key} className={`${cls} flex items-center gap-2 text-sm text-foreground`}>
                        <input type="checkbox" checked={Boolean(val)} onChange={(e) => setField(i, f.key, e.target.checked)} className="accent-accent" />
                        {f.label}
                      </label>
                    );
                  }
                  if (f.type === "lines") {
                    return (
                      <label key={f.key} className={`${cls} flex flex-col gap-1.5`}>
                        <span className={label}>{f.label}</span>
                        <textarea
                          rows={3}
                          value={Array.isArray(val) ? (val as string[]).join("\n") : ""}
                          onChange={(e) => setField(i, f.key, e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
                          placeholder={f.placeholder}
                          className={textarea}
                        />
                      </label>
                    );
                  }
                  if (f.type === "textarea") {
                    return (
                      <label key={f.key} className={`${cls} flex flex-col gap-1.5`}>
                        <span className={label}>{f.label}</span>
                        <textarea rows={2} value={(val as string) ?? ""} onChange={(e) => setField(i, f.key, e.target.value)} placeholder={f.placeholder} className={textarea} />
                      </label>
                    );
                  }
                  return (
                    <label key={f.key} className={`${cls} flex flex-col gap-1.5`}>
                      <span className={label}>{f.label}</span>
                      <input value={(val as string) ?? ""} onChange={(e) => setField(i, f.key, e.target.value)} placeholder={f.placeholder} className={input} />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setRows([...rows, blank()])} className={`${ghostBtn} flex items-center justify-center gap-1.5`}>
            <Plus size={15} /> Add {title.replace(/s$/, "").toLowerCase()}
          </button>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            disabled={pending}
            onClick={() => start(async () => { await saveResumeData({ [field]: rows } as ResumePatch); setEditing(false); })}
            className={primaryBtn}
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button type="button" onClick={() => { setRows(items); setEditing(false); }} className={ghostBtn}>Cancel</button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={title}
      icon={icon}
      count={rows.length && unit ? plural(rows.length, unit) : undefined}
      onEdit={() => setEditing(true)}
    >
      {rows.length ? (
        <div className="flex flex-col gap-6">{rows.map((r, i) => <div key={i}>{renderView(r)}</div>)}</div>
      ) : (
        <Empty>No {title.toLowerCase()} added yet.</Empty>
      )}
    </Card>
  );
}

/* ----------------------------------------------------------- list wrappers */

export function ExperienceSection({ items }: { items: ParsedExperience[] }) {
  return (
    <ListSection<ParsedExperience & Record<string, unknown>>
      title="Experience"
      icon={<Briefcase size={16} />}
      unit="role"
      field="experience"
      items={items as (ParsedExperience & Record<string, unknown>)[]}
      blank={() => ({ title: "", company: "", location: null, start_date: null, end_date: null, current: false, highlights: [] })}
      fields={[
        { key: "title", label: "Title", half: true },
        { key: "company", label: "Company", half: true },
        { key: "location", label: "Location", half: true },
        { key: "start_date", label: "Start", type: "date", half: true, placeholder: "2022-01" },
        { key: "end_date", label: "End", type: "date", half: true, placeholder: "2024-06" },
        { key: "current", label: "I currently work here", type: "checkbox", half: true },
        { key: "highlights", label: "Highlights (one per line)", type: "lines" },
      ]}
      renderView={(e) => {
        const dur = durationLabel(e.start_date, e.end_date, e.current);
        const range = fmtRange(e.start_date, e.end_date, e.current);
        return (
          <div className="flex gap-3.5">
            <ItemAvatar name={e.company || e.title} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{e.title || "Untitled role"}</p>
              {(e.company || e.location) && (
                <p className="text-sm text-muted">
                  {[e.company, e.location].filter(Boolean).join(" · ")}
                </p>
              )}
              {(range || dur) && (
                <p className="mt-0.5 text-xs text-muted">{[range, dur].filter(Boolean).join(" · ")}</p>
              )}
              {e.highlights?.length > 0 && <Bullets items={e.highlights} />}
            </div>
          </div>
        );
      }}
    />
  );
}

export function EducationSection({ items }: { items: ParsedEducation[] }) {
  return (
    <ListSection<ParsedEducation & Record<string, unknown>>
      title="Education"
      icon={<GraduationCap size={16} />}
      unit="entry"
      field="education"
      items={items as (ParsedEducation & Record<string, unknown>)[]}
      blank={() => ({ institution: "", degree: null, field: null, start_date: null, end_date: null })}
      fields={[
        { key: "institution", label: "Institution" },
        { key: "degree", label: "Degree", half: true },
        { key: "field", label: "Field of study", half: true },
        { key: "start_date", label: "Start", type: "date", half: true, placeholder: "2016" },
        { key: "end_date", label: "End", type: "date", half: true, placeholder: "2020" },
      ]}
      renderView={(ed) => (
        <div className="flex gap-3.5">
          <ItemAvatar name={ed.institution} />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{ed.institution || "Institution"}</p>
            {(ed.degree || ed.field) && (
              <p className="text-sm text-muted">{[ed.degree, ed.field].filter(Boolean).join(", ")}</p>
            )}
            {fmtRange(ed.start_date, ed.end_date) && (
              <p className="mt-0.5 text-xs text-muted">{fmtRange(ed.start_date, ed.end_date)}</p>
            )}
          </div>
        </div>
      )}
    />
  );
}

export function CertificationsSection({ items }: { items: ParsedCertification[] }) {
  return (
    <ListSection<ParsedCertification & Record<string, unknown>>
      title="Certifications"
      icon={<Award size={16} />}
      unit="certification"
      field="certifications"
      items={items as (ParsedCertification & Record<string, unknown>)[]}
      blank={() => ({ name: "", issuer: null, date: null })}
      fields={[
        { key: "name", label: "Name" },
        { key: "issuer", label: "Issuer", half: true },
        { key: "date", label: "Date", type: "date", half: true, placeholder: "2023" },
      ]}
      renderView={(c) => (
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-medium text-foreground">{c.name}{c.issuer ? <span className="font-normal text-muted"> · {c.issuer}</span> : null}</p>
          {c.date && <span className="shrink-0 text-xs text-muted">{c.date}</span>}
        </div>
      )}
    />
  );
}

export function ProjectsSection({ items }: { items: ParsedProject[] }) {
  return (
    <ListSection<ParsedProject & Record<string, unknown>>
      title="Projects"
      icon={<FolderGit2 size={16} />}
      unit="project"
      field="projects"
      items={items as (ParsedProject & Record<string, unknown>)[]}
      blank={() => ({ name: "", description: null, url: null })}
      fields={[
        { key: "name", label: "Name", half: true },
        { key: "url", label: "URL", half: true, placeholder: "https://…" },
        { key: "description", label: "Description", type: "textarea" },
      ]}
      renderView={(pr) => (
        <div>
          <p className="font-medium text-foreground">
            {pr.url ? (
              <a href={pr.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-muted">{pr.name}</a>
            ) : pr.name}
          </p>
          {pr.description && <p className="mt-0.5 text-sm text-foreground/80">{pr.description}</p>}
        </div>
      )}
    />
  );
}

export { ChipsSection as SkillsOrLanguages };
export const skillsIcon = <Tags size={16} />;
export const langIcon = <LanguagesIcon size={16} />;
export const checkIcon = <Check size={16} />;
