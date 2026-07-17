import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
});

export function htmlToMarkdown(
  html: string | null | undefined,
  fallback: string | null = null
): string | null {
  if (!html) return fallback;
  try {
    return turndown.turndown(html);
  } catch {
    return fallback;
  }
}

/** Greenhouse returns job content as entity-escaped HTML. */
export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}
