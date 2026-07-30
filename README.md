# Zyvo

AI-assisted CV/resume builder. Craft, edit, and export professional CVs with a live preview editor and PDF export.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19.2** (React Compiler enabled)
- **Tailwind CSS v4** + **shadcn/ui**
- **tRPC v11** — end-to-end typesafe API
- **Better Auth** — authentication
- **MongoDB** via **Prisma** (CV sections as embedded composite types)
- **Zustand** — CV builder state with 800ms debounced autosave
- **Zod** — shared validation (tRPC input + react-hook-form)
- **Puppeteer-core + @sparticuz/chromium** — PDF export
- **PostHog** (analytics), **Upstash Redis** (caching), **Biome v2** (lint/format)

## Getting Started

Requires [Bun](https://bun.sh) and a MongoDB connection string.

```bash
bun install
```

Create a `.env` with at least:

```bash
DATABASE_URL="mongodb://..."
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"
```

Push the Prisma schema and start the dev server:

```bash
bun db:push
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Action |
|---------|--------|
| `bun dev` | Dev server (port 3000) |
| `bun build` | Production build |
| `bun lint` | Biome check |
| `bun format` | Biome format --write |
| `bun db:push` | Push Prisma schema to MongoDB |
| `bun db:generate` | Regenerate Prisma Client |
| `bun db:studio` | Open Prisma Studio |

`postinstall` auto-runs `prisma generate`.

## Architecture

- **`app/(auth)/`** — protected route group (server-side session check)
- **`app/(auth)/builder/`** — CV dashboard; **`builder/[cvId]/`** — editor
- **`app/api/auth/[...all]/route.ts`** — Better Auth handler
- **`app/api/trpc/[trpc]/route.ts`** — tRPC fetch handler
- **`features/`** — feature-based modules, each owning its `components/`, `hooks/`, `schemas/`, `stores/`, `server/`, `lib/`
  - **`features/cv/`** — CV builder (Zustand store, Zod schemas, autosave hook, tRPC router, templates)
  - **`features/auth/`** — Better Auth config + route guards
- **`server/trpc/`** — tRPC core + root router (`routers/_app.ts`)
- **`proxy.ts`** — Next.js 16 proxy (replaces `middleware.ts`); optimistic auth check via session cookie

## Conventions

- All DB access goes through the tRPC backend — no direct client-to-MongoDB
- CV ownership enforced via `userId` matching the Better Auth user ID
- `@/*` path alias maps to the project root
- Validate with Zod on both tRPC input (server) and react-hook-form (client)
