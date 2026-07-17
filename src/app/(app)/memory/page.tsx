import { redirect } from "next/navigation";
import { Brain, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupermemoryEnabled, recallMemories } from "@/lib/supermemory/memory";

export const dynamic = "force-dynamic";

// A broad default query surfaces the user's stored memories on first load;
// Supermemory search always needs a query string.
const DEFAULT_QUERY = "career background, skills, job preferences, roles and companies applied to";

export default async function MemoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/memory");

  const enabled = isSupermemoryEnabled();
  const results = enabled
    ? await recallMemories({ userId: user.id, query: query || DEFAULT_QUERY, limit: 25 })
    : [];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
          <Brain size={20} strokeWidth={2.25} />
        </span>
        <div>
          <h1 className="text-[26px] font-semibold leading-8 tracking-[-0.4px] text-foreground">
            Memory
          </h1>
          <p className="text-sm text-muted">
            What we remember about you — used to personalize your applications.{" "}
            <span className="text-foreground/70">Powered by Supermemory</span>
          </p>
        </div>
      </div>

      {!enabled ? (
        <div className="mt-8 rounded-xl border border-border bg-background p-6 text-sm text-muted shadow-card">
          Memory is off — set <code className="rounded bg-black/[0.05] px-1">SUPERMEMORY_API_KEY</code> to
          enable it.
        </div>
      ) : (
        <>
          <form method="GET" className="mt-6 flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2.5 focus-within:border-foreground">
              <Search size={16} className="shrink-0 text-muted" />
              <input
                name="q"
                defaultValue={query}
                placeholder="Ask your memory… e.g. “what backend roles have I applied to?”"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              />
            </div>
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-[#19191a] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Search
            </button>
          </form>

          <p className="mt-4 text-xs text-muted">
            {results.length} {results.length === 1 ? "memory" : "memories"}
            {query ? ` for “${query}”` : ""}
          </p>

          {results.length === 0 ? (
            <div className="mt-4 rounded-xl border border-border bg-background p-8 text-center text-sm text-muted shadow-card">
              Nothing here yet. Apply to a few roles and your background + history will show up here.
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2.5">
              {results.map((r, i) => {
                const kind = typeof r.metadata?.kind === "string" ? r.metadata.kind : null;
                return (
                  <li
                    key={r.id ?? i}
                    className="rounded-xl border border-border bg-background p-4 shadow-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm leading-6 text-foreground">{r.content}</p>
                      {typeof r.score === "number" && (
                        <span className="shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-medium text-muted">
                          {(r.score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    {kind && (
                      <span className="mt-2 inline-block rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                        {kind}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
