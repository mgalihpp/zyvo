# CV Export (PDF + PNG) — Design

**Date:** 2026-07-28
**Status:** Approved, ready for planning

## Goal

Let users download their CV as a **PDF** and **PNG** from the builder's existing
"Unduh" (export) panel. Output must match the live preview exactly — same
template, fonts, colors, typography.

DOCX and JSON are explicitly **out of scope** (DOCX can't reproduce the template
layout without a separate generator; JSON is data-only, not a finished document).

## Runtime target

Serverless only (Vercel) via `@sparticuz/chromium` + `puppeteer-core` (both
already installed, currently unused). Local `bun dev` export is **not a
requirement**; the export lib throws a clear error if no Chromium binary is
resolvable rather than crashing.

## Architecture

```
[Export panel]  →  GET /api/cv/[cvId]/export?format=pdf|png  →  blob download
  (client)             (Route Handler, runtime="nodejs")
                            │ auth + ownership check
                            │ launch chromium
                            │ page.goto(`{origin}/builder/[cvId]/print`)  (forward session cookie)
                            ▼
                   [/builder/[cvId]/print]  ← server component, auth+ownership checked
                      full-page template render, no editor UI, same CSS-var setup as preview
                            │
                     PDF: page.pdf({ format:'A4', printBackground:true })
                     PNG: page.screenshot(full page, A4-width viewport)
```

## Components

### 1. Shared CV mapping helper — `features/cv/lib/cv-content.ts`

The `cv → CvContent` mapping (with `toLevel` coercion and all `?? ""` defaults)
currently lives inline in `app/(dashboard)/builder/[cvId]/page.tsx` (~lines
14–118). Extract it to `toCvContent(cv)` so both the builder page and the new
print route use one source of truth. Refactor the builder page to call it.

**Interface:** `toCvContent(cv: CV): CvContent` — pure, no side effects.

### 2. Print route — `app/(dashboard)/builder/[cvId]/print/page.tsx`

Server component. Auth + ownership check (same pattern as builder `page.tsx`:
`getSession`, `notFound()` on mismatch). Loads the CV, maps via `toCvContent`,
renders the selected template full-page.

- Reuses the exact CSS-var wrapper from `cv-preview.tsx:67-84` (font vars, color
  vars, `readableOn(accent)`, font-size/line-height/letter-spacing). Extract that
  inline-style object into a small shared helper (`cvRootStyle(content)` in
  `features/cv/lib/cv-style.ts`) so preview and print can't drift. `cv-preview.tsx`
  is refactored to consume it.
- Renders the template **eagerly** (not the lazy `Suspense` version) so Chromium
  captures a fully-painted page with no loading fallback. Use the eager renderer
  registry (`templates/eager.ts`).
- No editor chrome: no sidebar, no topbar, no `SaveIndicator`. Page background
  white, template centered at A4 width.
- Sets `<title>` / uses the CV title so the print doc is named sensibly (the
  attachment filename is set by the API, but a clean page title is good hygiene).

**Font note:** Next.js font `--font-*` vars are declared on root `<html>` in
`app/layout.tsx`, which the print route inherits automatically — no extra font
wiring needed.

### 3. Export lib — `features/cv/lib/pdf.ts`

Server-only. One exported function:

```
renderCvDocument({ url, format, cookie }): Promise<Uint8Array>
```

- Launches Chromium: `puppeteer.launch({ args, executablePath: await chromium.executablePath(), headless: chromium.headless })`.
- If `executablePath()` resolves nothing (local dev without a binary), throw a
  clear `Error("Chromium binary not available in this environment")` — caught by
  the route and returned as a 500 with a readable message.
- New page, set the session cookie (forwarded from the incoming request) so the
  print route's auth check passes, `page.goto(url, { waitUntil: "networkidle0" })`.
- `format === "pdf"`: `page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: false })`.
- `format === "png"`: set an A4-proportioned viewport width, `page.screenshot({ fullPage: true, type: "png" })`.
- Always `browser.close()` in a `finally`.

**Cookie forwarding:** the print route is auth-gated. The API reads the incoming
request's session cookie (`better-auth.session_token` or whatever Better Auth
sets) and injects it into the Puppeteer page for the same origin so the headless
request authenticates as the same user. Ownership is still enforced by the print
route itself.

### 4. Export API route — `app/api/cv/[cvId]/export/route.ts`

Route Handler, `export const runtime = "nodejs"` (Chromium needs Node, not Edge).
Chosen over tRPC because tRPC is a poor fit for binary responses.

- `GET`, query `?format=pdf|png` (validate with a small Zod enum; default `pdf`).
- Auth via `getSession`; ownership check on the CV (`userId` match) — do **not**
  rely solely on the print route; fail fast here with 401/404.
- Build the print URL from the request origin + `cvId`.
- Call `renderCvDocument`, return a `Response(bytes)` with:
  - `Content-Type: application/pdf` or `image/png`
  - `Content-Disposition: attachment; filename="<sanitized-title>.<ext>"`
    (sanitize the CV title; fall back to `cv`).
- On error: 500 with a JSON message; the panel surfaces it as a toast.

### 5. Export panel — `features/cv/components/panels/export-panel.tsx`

Replace the placeholder in `panels/index.tsx:203-206` with a real lazy-loaded
panel (match the existing lazy-panel pattern).

- Two buttons: **Unduh PDF**, **Unduh PNG**, each with its own loading state.
- On click: `fetch(/api/cv/{cvId}/export?format=...)`, read blob, trigger download
  via an object-URL `<a download>` (revoke after). Independent loading per format.
- Error → toast (existing `toast` component) with the server message.
- `cvId` comes from the store (`useCvStore((s) => s.cvId)`).
- Note: export downloads the **last saved** CV (autosave debounces 800ms). Show a
  small note so a user who exports immediately after an edit understands why. No
  need to block on save in v1.

## Data flow

1. User clicks "Unduh PDF" in the export panel.
2. Browser `GET`s the export API with the session cookie (same-origin, automatic).
3. API authenticates + checks ownership, launches Chromium, navigates it to the
   print route with the forwarded cookie.
4. Print route re-checks auth/ownership, renders the template full-page.
5. Chromium produces PDF/PNG bytes; API streams them back as an attachment.
6. Browser downloads the file.

## Error handling

- No Chromium binary → lib throws → API 500 with readable message → panel toast.
- Unauthenticated / not owner → API 401/404 before launching Chromium.
- Print route render failure (bad data) → Chromium still captures whatever
  rendered; template components already guard empty content (`isEmptyCv`).
- Browser always closed in `finally` to avoid leaked processes on serverless.

## Testing

- `toCvContent` — unit test: legacy/missing fields coerce to the documented
  defaults (mirrors existing `contrast.test.ts` / `typography.test.ts` style,
  assert-based, no framework beyond what's there).
- `cvRootStyle` — unit test: returns the expected CSS-var map for a given content
  (guards preview/print drift).
- Manual: export each of the 5 templates as PDF + PNG on Vercel preview; verify
  fonts, colors, and layout match the live preview.

## Out of scope (v1)

- DOCX / JSON export.
- Multi-page pagination tuning beyond Chromium's default A4 page breaks.
- Local-dev Chromium support (documented limitation; add when needed).
- "Export in progress" queueing / caching of generated files.
