# Employable — Supermemory Hackathon

An AI job-application assistant. It maps your profile onto real ATS application
forms, drafts your answers and cover letters with Claude, and lets you review
before anything is submitted.

This repo is the **web app + the Supermemory integration** built for the
Supermemory hackathon. (The background browser-automation worker that submits
applications is deployed separately and is intentionally not part of this
public repo.)

## What Supermemory powers here

Supermemory gives the app a durable, per-user memory so applications get more
personal the more you use it.

- **Remembers** — when you prepare an application, we store your candidate
  background (deduped) and each role you apply to, tagged with your user id.
- **Recalls** — the cover-letter and application-answer generators pull your
  most relevant memories and fold them into the prompt, so the writing reflects
  who you are and what you've applied to before.
- **Memory page** (`/memory`) — a searchable view of everything Supermemory
  knows about you, with relevance scores.

### Where to look

| Area | Path |
|------|------|
| Supermemory client (REST wrapper) | `src/lib/supermemory/client.ts` |
| Store / recall helpers | `src/lib/supermemory/memory.ts` |
| Recall wired into AI generation | `src/lib/appliers/generate.ts` |
| Store on apply | `src/app/(app)/jobs/[id]/actions.ts` |
| Memory page (UI) | `src/app/(app)/memory/page.tsx` |

Notes on the integration:
- The whole feature is **best-effort and guarded** — with no `SUPERMEMORY_API_KEY`
  set, every call is a no-op and the app runs unchanged.
- Users are **isolated via `metadata.userId`** (the API key is scoped to one
  container tag), and search is filtered to the current user.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · Tailwind v4 · Supabase
(Postgres/Auth/RLS) · Anthropic Claude · Supermemory.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

Then open http://localhost:3000. You'll need Supabase, Anthropic, and (for the
memory features) Supermemory keys — see `.env.example`.
