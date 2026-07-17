// Reads an Ashby hosted application form via the job board's GraphQL endpoint.
// The endpoint is the same one the public apply page uses; each field comes
// back as a JSON blob with a stable `path` (either "_systemfield_*" for
// standard fields, or a UUID for custom questions), a `type`, and — for
// select fields — `selectableValues`.

const GRAPHQL_URL = "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPostingForm";

const FORM_QUERY = `query ApiJobPostingForm($jobPostingId: String!, $organizationHostedJobsPageName: String!) {
  jobPosting(jobPostingId: $jobPostingId, organizationHostedJobsPageName: $organizationHostedJobsPageName) {
    id
    title
    applicationForm {
      sections {
        title
        fieldEntries {
          field
          isRequired
        }
      }
    }
  }
}`;

export type AshbyFieldType =
  | "String"
  | "Email"
  | "Phone"
  | "File"
  | "Location"
  | "Date"
  | "Boolean"
  | "LongText"
  | "Number"
  | "ValueSelect"
  | "MultiValueSelect"
  | "SocialProfileUrls"
  | (string & {});

export interface AshbySelectableValue {
  label: string;
  value: string;
}

export interface AshbyFormField {
  /** Field id used when submitting (the `path`). */
  path: string;
  title: string;
  type: AshbyFieldType;
  isRequired: boolean;
  /** Present for ValueSelect / MultiValueSelect. */
  selectableValues?: AshbySelectableValue[];
  /** Present for Location fields. */
  locationTypes?: string[];
}

export interface AshbyApplicationForm {
  jobPostingId: string;
  title: string;
  fields: AshbyFormField[];
}

interface RawFieldEntry {
  field: {
    path: string;
    title: string;
    type: string;
    selectableValues?: AshbySelectableValue[];
    locationTypes?: string[];
    isDeactivated?: boolean;
  };
  isRequired: boolean;
}

export async function fetchAshbyApplicationForm(
  board: string,
  jobPostingId: string
): Promise<AshbyApplicationForm> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      operationName: "ApiJobPostingForm",
      variables: {
        jobPostingId,
        organizationHostedJobsPageName: board,
      },
      query: FORM_QUERY,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ashby form API returned ${res.status}`);
  }

  const body = (await res.json()) as {
    data?: {
      jobPosting?: {
        id: string;
        title: string;
        applicationForm?: {
          sections: { fieldEntries: RawFieldEntry[] }[];
        };
      };
    };
    errors?: { message: string }[];
  };

  if (body.errors?.length) {
    throw new Error(`Ashby form API error: ${body.errors[0].message}`);
  }

  const posting = body.data?.jobPosting;
  if (!posting?.applicationForm) {
    throw new Error(`No application form found for job ${jobPostingId}`);
  }

  const fields: AshbyFormField[] = [];
  for (const section of posting.applicationForm.sections) {
    for (const entry of section.fieldEntries) {
      const f = entry.field;
      if (f.isDeactivated) continue;
      fields.push({
        path: f.path,
        title: f.title,
        type: f.type,
        isRequired: entry.isRequired,
        selectableValues: f.selectableValues,
        locationTypes: f.locationTypes,
      });
    }
  }

  return { jobPostingId: posting.id, title: posting.title, fields };
}
