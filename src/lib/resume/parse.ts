import Anthropic from "@anthropic-ai/sdk";
import { RESUME_JSON_SCHEMA, type ParsedResume } from "./schema";

// Claude reads the PDF directly (base64 document block) — no separate text
// extractor needed — and returns structured JSON validated against our schema.
const MODEL = "claude-opus-4-8";

const SYSTEM_PROMPT = `You extract structured data from a candidate's resume so it can be used to auto-fill job applications and draft cover letters.

Rules:
- Extract only what is present in the resume. Do not invent facts.
- Use null for anything not stated; use empty arrays when a section is absent.
- Normalize dates to "YYYY-MM" when possible, otherwise keep as written.
- "highlights" are the bullet points under each role, cleaned up but not embellished.
- "summary" is a concise 2-3 sentence professional summary you may compose from the resume if none exists.`;

export async function parseResumePdf(pdfBytes: Buffer): Promise<ParsedResume> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: RESUME_JSON_SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBytes.toString("base64"),
            },
          },
          { type: "text", text: "Extract this resume into the required JSON structure." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Resume parsing was refused by the model");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No structured output returned");
  }

  return JSON.parse(textBlock.text) as ParsedResume;
}
