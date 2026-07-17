// Reads a Greenhouse job's application form via the public boards API and
// normalizes it into the same AshbyApplicationForm shape the planner consumes,
// so one planner works for both platforms.
//
//   GET https://boards-api.greenhouse.io/v1/boards/{board}/jobs/{id}?questions=true
//
// Each "question" has a human label, a required flag, and one or more `fields`
// (e.g. resume has a file field + a paste-text field). We pick the field that
// best represents the question and map its Greenhouse type to our field types.

import type {
  AshbyApplicationForm,
  AshbyFieldType,
  AshbyFormField,
  AshbySelectableValue,
} from "./ashby-form";

interface GreenhouseField {
  name: string;
  type: string; // input_text | input_file | textarea | multi_value_single_select | multi_value_multi_select
  values?: { value: number | string; label: string }[];
}

interface GreenhouseQuestion {
  label: string;
  required: boolean;
  fields: GreenhouseField[];
}

const API = "https://boards-api.greenhouse.io/v1/boards";

function mapType(field: GreenhouseField): AshbyFieldType {
  switch (field.type) {
    case "input_file":
      return "File";
    case "textarea":
      return "LongText";
    case "multi_value_single_select":
      return "ValueSelect";
    case "multi_value_multi_select":
      return "MultiValueSelect";
    default:
      // input_text and anything unknown — infer from the standard field name.
      if (field.name === "email") return "Email";
      if (field.name === "phone") return "Phone";
      return "String";
  }
}

/** The field that best represents a question: a file, else a select, else the first. */
function primaryField(q: GreenhouseQuestion): GreenhouseField | undefined {
  return (
    q.fields.find((f) => f.type === "input_file") ??
    q.fields.find((f) => f.type.startsWith("multi_value")) ??
    q.fields[0]
  );
}

export async function fetchGreenhouseApplicationForm(
  board: string,
  jobId: string
): Promise<AshbyApplicationForm> {
  const res = await fetch(
    `${API}/${encodeURIComponent(board)}/jobs/${encodeURIComponent(jobId)}?questions=true`,
    { headers: { accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(20_000) }
  );
  if (!res.ok) throw new Error(`Greenhouse API returned ${res.status} for ${board}/${jobId}`);

  const body = (await res.json()) as { id: number; title: string; questions?: GreenhouseQuestion[] };

  const fields: AshbyFormField[] = [];
  for (const q of body.questions ?? []) {
    const field = primaryField(q);
    if (!field) continue;

    const type = mapType(field);
    // Give the resume field the path the planner recognizes for file uploads.
    const isResume = field.name === "resume" || (type === "File" && /resume|cv/i.test(q.label));
    const path = isResume ? "_systemfield_resume" : field.name;

    // Use the label as the value: the browser applier and the review dropdown
    // both select options by their visible text, and the browser maps that to
    // Greenhouse's numeric option id on submit.
    const selectableValues: AshbySelectableValue[] | undefined = field.values?.length
      ? field.values.map((v) => ({ label: v.label, value: v.label }))
      : undefined;

    fields.push({ path, title: q.label.trim(), type, isRequired: q.required, selectableValues });
  }

  return { jobPostingId: String(body.id), title: body.title, fields };
}
