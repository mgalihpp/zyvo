# Zyvo — repo guide

## Stack
- **Next.js 16** App Router with Turbopack — do NOT guess APIs from older versions; check `node_modules/next/dist/docs/` first
- **React 19.2** with React Compiler enabled (`reactCompiler: true` in `next.config.ts`)
- **Tailwind CSS v4** — uses `@import "tailwindcss"` + `@theme` directives (NOT v3 `@tailwind`/`@apply` config)
- **shadcn/ui** (`style: "base-mira"`) via `@shadcn/react` package
- **tRPC v11** — router in `server/trpc/routers/`, client in `lib/trpc/`, adapter at `app/api/trpc/[trpc]/route.ts`
- **Better Auth** — handler at `app/api/auth/[...all]/route.ts`, proxy check in `proxy.ts` (Next.js 16's renamed middleware)
- **MongoDB** via **Prisma** (`provider: "mongodb"`) — CV sections are embedded MongoDB composite types, not relational
- **Zustand** for CV builder state + custom 800ms debounced autosave hook
- **Zod** schemas in `features/cv/schemas/cv.ts` — single source of truth for tRPC input validation and react-hook-form
- **Biome v2** for linting/formatting (VCS-aware, respects `.gitignore`)
- **PostHog** for analytics; **Upstash Redis** for caching; **Puppeteer-core + @sparticuz/chromium** for PDF export

## Key commands (use `bun`)
| Command | Action |
|---------|--------|
| `bun dev` | Dev server (port 3000) |
| `bun build` | Production build |
| `bun lint` | Biome check |
| `bun format` | Biome format --write |
| `bun db:push` | Push Prisma schema to MongoDB |
| `bun db:generate` | Regenerate Prisma Client |
| `bun db:studio` | Open Prisma Studio |

`postinstall` hook auto-runs `prisma generate`.

## Architecture
- **`app/(auth)/`** — route group for protected pages (server-side session check in `page.tsx`)
- **`app/(auth)/builder/`** — CV dashboard; **`app/(auth)/builder/[cvId]/`** — editor
- **`app/api/auth/[...all]/route.ts`** — Better Auth handler (captures all auth endpoints)
- **`app/api/trpc/[trpc]/route.ts`** — tRPC fetch handler
- **`features/`** — feature/module-based code. Each feature owns its `components/`, `hooks/`, `schemas/`, `stores/`, `server/`, `lib/`.
- **`features/cv/server/cv-router.ts`** — CRUD for CVs (ownership-enforced via `userId` match, no formal Prisma relation to User); mounted in `server/trpc/routers/_app.ts`
- **`features/cv/stores/cv-store.ts`** — Zustand store holding all CV content + builder UI state
- **`features/cv/schemas/cv.ts`** — Zod schemas + empty defaults for every CV section
- **`features/cv/hooks/use-cv-autosave.ts`** — subscribes to store `revision`, debounces 800ms, calls `trpc.cv.update`
- **`features/cv/components/`** — CV builder/dashboard components + `panels/` + `templates/` (only `classic` currently)
- **`features/auth/lib/`** — Better Auth server/client config + shared route guards (`auth.ts`, `auth-client.ts`, `auth-routes.ts`)
- **`app/(auth)/builder/**/page.tsx`** — thin route entry points; logic lives in `features/cv`
- **`server/trpc/`** — tRPC core (`trpc.ts`, `context.ts`, `server.ts`) + root router `routers/_app.ts` (mounts per-feature routers)
- **`proxy.ts`** — Next.js 16 proxy (replaces `middleware.ts`); optimistic auth check via session cookie

## Conventions
- All DB access through tRPC backend — no direct client-to-MongoDB
- CV ownership: `userId` string matches Better Auth user ID (no formal Prisma relation to avoid coupling)
- `@/*` path alias maps to project root
- CSS: `globals.css` uses `@import "tailwindcss"` + `@theme inline {}` for design tokens + `@utility` for custom utilities
- Validate with Zod on both tRPC input (server) and react-hook-form resolver (client)
- shadcn components in `components/ui/`; feature code lives under `features/<feature>/`
- Dev-only: `<Agentation />` renders in `layout.tsx` when `NODE_ENV === "development"`
