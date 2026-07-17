// Reads a Lever hosted application form and normalizes it into the same
// AshbyApplicationForm shape the planner consumes, so one planner works across
// Ashby, Greenhouse, and Lever.
//
// Unlike Ashby/Greenhouse, Lever has no JSON questions API — the custom
// questions ("cards") only exist in the server-rendered apply page. So we fetch
//   https://jobs.lever.co/{site}/{postingId}/apply
// and parse its HTML. The markup is stable: every field (standard or custom) is
// a `<div class="application-label">` followed by one control, so we walk label
// by label and read the control that follows each.

import type {
  AshbyApplicationForm,
  AshbyFieldType,
  AshbyFormField,
  AshbySelectableValue,
} from "./ashby-form";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** Strip tags + decode the handful of entities Lever emits. */
function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/[✱*]\s*$/, "") // trailing required marker
    .replace(/\s+/g, " ")
    .trim();
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
}

/** Path + type for Lever's standard (non-"cards") fields; null for custom ones. */
function standardField(name: string): { path: string; type: AshbyFieldType } | null {
  if (name === "resume") return { path: "_systemfield_resume", type: "File" };
  if (name === "name") return { path: "_systemfield_name", type: "String" };
  if (name === "email") return { path: "email", type: "Email" };
  if (name === "phone") return { path: "phone", type: "Phone" };
  if (name === "location") return { path: "location", type: "Location" };
  if (name === "org") return { path: "org", type: "String" };
  if (name === "comments") return { path: "comments", type: "LongText" };
  if (name.startsWith("urls[")) return { path: name, type: "String" };
  return null;
}

interface ParsedControl {
  name: string;
  type: AshbyFieldType;
  required: boolean;
  selectableValues?: AshbySelectableValue[];
}

/** Read the first form control that appears in a label's segment of HTML. */
function parseControl(segment: string): ParsedControl | null {
  // Textarea → long free-text.
  const textarea = segment.match(/<textarea\b[^>]*>/i);
  if (textarea) {
    const name = attr(textarea[0], "name");
    if (name) return { name, type: "LongText", required: /required/i.test(textarea[0]) };
  }

  // Native <select> dropdown.
  const select = segment.match(/<select\b[^>]*>/i);
  if (select) {
    const name = attr(select[0], "name");
    if (name) {
      const multiple = /\bmultiple\b/i.test(select[0]);
      const options: AshbySelectableValue[] = [];
      for (const o of segment.matchAll(/<option\b[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi)) {
        const label = decode(o[2]);
        if (!o[1] || !label) continue; // skip the empty "Select…" placeholder
        options.push({ label, value: label });
      }
      return {
        name,
        type: multiple ? "MultiValueSelect" : "ValueSelect",
        required: /required/i.test(select[0]),
        selectableValues: options,
      };
    }
  }

  // Radio / checkbox groups — Lever renders the option text as the `value`.
  const radios = [...segment.matchAll(/<input\b[^>]*type="radio"[^>]*>/gi)];
  const checks = [...segment.matchAll(/<input\b[^>]*type="checkbox"[^>]*>/gi)];
  const choice = radios.length ? radios : checks;
  if (choice.length) {
    const name = attr(choice[0][0], "name");
    if (name) {
      const seen = new Set<string>();
      const options: AshbySelectableValue[] = [];
      for (const c of choice) {
        const v = attr(c[0], "value");
        if (!v || seen.has(v)) continue;
        seen.add(v);
        options.push({ label: decode(v), value: v });
      }
      const required = choice.some((c) => /required/i.test(c[0]));
      // A lone checkbox is an acknowledgement (I agree / I certify …).
      if (checks.length && !radios.length && options.length <= 1) {
        return { name, type: "Boolean", required };
      }
      return {
        name,
        type: radios.length ? "ValueSelect" : "MultiValueSelect",
        required,
        selectableValues: options,
      };
    }
  }

  // Plain text/email/tel/number input.
  const input = segment.match(/<input\b[^>]*>/i);
  if (input) {
    const inputType = (attr(input[0], "type") ?? "text").toLowerCase();
    if (inputType === "hidden" || inputType === "submit" || inputType === "button") return null;
    const name = attr(input[0], "name");
    if (name) {
      const type: AshbyFieldType =
        inputType === "email" ? "Email" : inputType === "file" ? "File" : "String";
      return { name, type, required: /required/i.test(input[0]) };
    }
  }

  return null;
}

export async function fetchLeverApplicationForm(
  board: string,
  postingId: string
): Promise<AshbyApplicationForm> {
  const applyUrl = `https://jobs.lever.co/${encodeURIComponent(board)}/${encodeURIComponent(
    postingId
  )}/apply`;
  const res = await fetch(applyUrl, {
    headers: { "user-agent": UA, accept: "text/html" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Lever apply page returned ${res.status} for ${board}/${postingId}`);
  const html = await res.text();

  const title = decode(html.match(/<meta property="og:title" content="([^"]*)"/i)?.[1] ?? "");

  // Every field is a "<div class=application-label>…</div>" followed by its
  // control. Walk label to label; the control between two labels is this one's.
  const labelRe = /<div class="application-label[^"]*">([\s\S]*?)<\/div>/gi;
  const labels: { text: string; from: number }[] = [];
  for (let m = labelRe.exec(html); m; m = labelRe.exec(html)) {
    labels.push({ text: m[1], from: m.index + m[0].length });
  }

  const fields: AshbyFormField[] = [];
  const seenPaths = new Set<string>();
  for (let i = 0; i < labels.length; i++) {
    const rawLabel = labels[i].text;
    const segment = html.slice(labels[i].from, labels[i + 1]?.from ?? labels[i].from + 4000);
    const control = parseControl(segment);
    if (!control) continue;
    if (control.name.startsWith("eeo[") || control.name === "selectedLocation") continue;

    const std = standardField(control.name);
    const path = std?.path ?? control.name;
    if (seenPaths.has(path)) continue;
    seenPaths.add(path);

    const labelText = decode(rawLabel);
    // Lever's required marker is always ✱; the control's `required` attribute is
    // the authoritative signal. Avoid a bare "*" so labels like "C++/C*" don't
    // read as required.
    const requiredMark = rawLabel.includes("✱");
    fields.push({
      path,
      title: labelText || control.name,
      type: std?.type ?? control.type,
      isRequired: requiredMark || control.required,
      selectableValues: control.selectableValues,
    });
  }

  return { jobPostingId: postingId, title, fields };
}
