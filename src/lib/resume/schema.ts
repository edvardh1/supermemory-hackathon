// JSON schema + TS types for a parsed resume. The schema is used with Claude's
// structured outputs (output_config.format) so the response validates against
// it. Structured-output constraints: every object sets additionalProperties:
// false and lists all keys in `required`; optional values use nullable unions.

export interface ParsedExperience {
  title: string;
  company: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  current: boolean;
  highlights: string[];
}

export interface ParsedEducation {
  institution: string;
  degree: string | null;
  field: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface ParsedCertification {
  name: string;
  issuer: string | null;
  date: string | null;
}

export interface ParsedProject {
  name: string;
  description: string | null;
  url: string | null;
}

export interface ParsedResume {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  headline: string | null;
  summary: string | null;
  years_experience: number | null;
  skills: string[];
  experience: ParsedExperience[];
  education: ParsedEducation[];
  certifications: ParsedCertification[];
  projects: ParsedProject[];
  languages: string[];
  links: {
    linkedin: string | null;
    github: string | null;
    portfolio: string | null;
  };
}

// Structured outputs cap union-typed ("string"|"null") params at 16, so string
// fields are plain strings — the model returns "" when a value is absent, which
// the app treats as missing. Only years_experience keeps a null union.
const nullableString = { type: "string" } as const;

export const RESUME_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    full_name: nullableString,
    email: nullableString,
    phone: nullableString,
    location: nullableString,
    headline: { ...nullableString, description: "Current role / professional headline" },
    summary: { ...nullableString, description: "2-3 sentence professional summary" },
    years_experience: {
      type: ["number", "null"],
      description: "Approximate total years of professional experience",
    },
    skills: { type: "array", items: { type: "string" } },
    experience: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          company: { type: "string" },
          location: nullableString,
          start_date: { ...nullableString, description: "e.g. '2021-03' or 'Mar 2021'" },
          end_date: { ...nullableString, description: "null if current role" },
          current: { type: "boolean" },
          highlights: { type: "array", items: { type: "string" } },
        },
        required: ["title", "company", "location", "start_date", "end_date", "current", "highlights"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          institution: { type: "string" },
          degree: nullableString,
          field: nullableString,
          start_date: nullableString,
          end_date: nullableString,
        },
        required: ["institution", "degree", "field", "start_date", "end_date"],
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          issuer: nullableString,
          date: nullableString,
        },
        required: ["name", "issuer", "date"],
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          description: nullableString,
          url: nullableString,
        },
        required: ["name", "description", "url"],
      },
    },
    languages: { type: "array", items: { type: "string" } },
    links: {
      type: "object",
      additionalProperties: false,
      properties: {
        linkedin: nullableString,
        github: nullableString,
        portfolio: nullableString,
      },
      required: ["linkedin", "github", "portfolio"],
    },
  },
  required: [
    "full_name", "email", "phone", "location", "headline", "summary",
    "years_experience", "skills", "experience", "education",
    "certifications", "projects", "languages", "links",
  ],
} as const;
