// Thin, dependency-free wrapper around the Supermemory REST API
// (https://api.supermemory.ai/v3). We use fetch rather than the `supermemory`
// SDK so this whole integration is self-contained and trivial to remove — the
// hackathon feature lives entirely under src/lib/supermemory/ + a few guarded
// call sites. Every function is best-effort: if the key is unset or the API
// errors, memory silently no-ops and the core apply flow is unaffected.
//
// The provided API key is scoped to a single container tag ("job-dashboard"),
// so every memory shares that container and we isolate users via a
// `metadata.userId` tag + a search filter on it.

const BASE_URL = "https://api.supermemory.ai/v3";

function containerTag(): string {
  return process.env.SUPERMEMORY_CONTAINER_TAG || "job-dashboard";
}

/** Memory is active only when an API key is configured, so the feature is fully
 *  inert (and easy to disable) by just removing SUPERMEMORY_API_KEY. */
export function isSupermemoryEnabled(): boolean {
  return Boolean(process.env.SUPERMEMORY_API_KEY);
}

export interface MemoryResult {
  id?: string;
  content: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

interface RawResult {
  documentId?: string;
  id?: string;
  title?: string;
  score?: number;
  metadata?: Record<string, unknown>;
  chunks?: { content?: string }[];
}

/** The Supermemory search response nests text under chunks (and a truncated
 *  title). Flatten to a single best-effort `content` string. */
function normalizeResult(r: RawResult): MemoryResult {
  const chunkText = (r.chunks ?? [])
    .map((c) => c?.content ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();
  return {
    id: r.documentId ?? r.id,
    content: (chunkText || r.title || "").trim(),
    score: r.score,
    metadata: r.metadata,
  };
}

async function smFetch(path: string, body: unknown): Promise<Response | null> {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  if (!apiKey) return null;
  try {
    return await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return null;
  }
}

/** Store a memory tagged to a user (via metadata.userId). Returns the memory
 *  id, or null on any failure. Never throws. */
export async function rememberMemory(input: {
  userId: string;
  content: string;
  customId?: string;
  metadata?: Record<string, string | number | boolean>;
}): Promise<string | null> {
  if (!input.content.trim()) return null;
  const res = await smFetch("/documents", {
    content: input.content,
    containerTag: containerTag(),
    ...(input.customId ? { customId: input.customId } : {}),
    metadata: { ...(input.metadata ?? {}), userId: input.userId },
  });
  if (!res || !res.ok) return null;
  try {
    const data = (await res.json()) as { id?: string };
    return data.id ?? null;
  } catch {
    return null;
  }
}

/** Semantic search over a single user's memories (scoped by metadata.userId).
 *  Returns [] on any failure. */
export async function recallMemories(input: {
  userId: string;
  query: string;
  limit?: number;
}): Promise<MemoryResult[]> {
  if (!input.query.trim()) return [];
  const res = await smFetch("/search", {
    q: input.query,
    containerTag: containerTag(),
    limit: input.limit ?? 6,
    filters: { AND: [{ key: "userId", value: input.userId, negate: false }] },
  });
  if (!res || !res.ok) return [];
  try {
    const data = (await res.json()) as { results?: RawResult[] };
    const raw = Array.isArray(data.results) ? data.results : [];
    return raw.map(normalizeResult).filter((r) => r.content);
  } catch {
    return [];
  }
}
