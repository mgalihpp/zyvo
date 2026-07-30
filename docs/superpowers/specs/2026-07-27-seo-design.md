# SEO Design — Zyvo CV Maker AI
_Date: 2026-07-27_

## Scope

Add production-grade SEO to Zyvo (Next.js 15 App Router). Public pages get full metadata + JSON-LD. Auth-gated pages (dashboard, builder) get `noindex, nofollow`.

---

## 1. Environment & Base URL

Add to `.env` (and `.env.example`):

```
NEXT_PUBLIC_APP_URL=https://zyvo.id
```

All SEO code reads from this variable. Fallback: `http://localhost:3000`.

---

## 2. `lib/seo.ts` — Site Config & Helper

Single source of truth. Exports:

- `siteConfig` — name, url, description, ogImage path, social handles
- `constructMetadata(overrides?)` — merges page-level overrides into base `Metadata` object (OG, Twitter card, canonical, robots)

Used by every `page.tsx` to avoid repetition.

---

## 3. Root Layout (`app/layout.tsx`)

Expand existing minimal `metadata` to include:

- `metadataBase` — required for absolute OG image URLs
- `openGraph` — type `website`, title, description, image (`public/hero.png`)
- `twitter` — card `summary_large_image`, title, description, image
- `robots` — default `index, follow`
- `verification` — placeholder for Google Search Console & Bing (filled via env vars)
- `alternates.canonical` — base URL

---

## 4. Landing Page (`app/page.tsx`)

Add `export const metadata: Metadata` with:
- Full OG + Twitter
- Canonical: `${NEXT_PUBLIC_APP_URL}/`

Add two JSON-LD blocks via `<script type="application/ld+json">` in the page return:

**WebSite schema:**
```json
{
  "@type": "WebSite",
  "name": "Zyvo",
  "url": "https://zyvo.id",
  "description": "...",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://zyvo.id/search?q={search_term_string}"
  }
}
```

**FAQPage schema** — generated from the existing `FAQS` array in `features/marketing/components/faq.tsx`. Import the array (extracted to a shared constant) and map to `mainEntity` items.

**SoftwareApplication schema:**
```json
{
  "@type": "SoftwareApplication",
  "name": "Zyvo",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "IDR" }
}
```

---

## 5. Public Pages Metadata

Each page gets explicit `metadata` export:

| Page | Title | Description | Robots |
|------|-------|-------------|--------|
| `/` | "Zyvo — Pembuat CV AI" | Landing description | index, follow |
| `/signin` | "Masuk — Zyvo" | Login page | noindex, nofollow |
| `/signup` | "Daftar — Zyvo" | Register page | noindex, nofollow |
| `/terms` | "Syarat & Ketentuan — Zyvo" | (existing) + canonical | index, follow |
| `/privacy` | "Kebijakan Privasi — Zyvo" | (existing) + canonical | index, follow |

---

## 6. Dashboard & Builder Pages (`noindex`)

All pages under `app/(dashboard)/` get:

```ts
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
```

Builder page (`/builder/[cvId]`) — same noindex, plus title dynamically from CV name if feasible via `generateMetadata`.

---

## 7. `app/sitemap.ts`

Next.js native sitemap. Includes:

- `/` — priority 1.0, changeFrequency `weekly`
- `/terms`, `/privacy` — priority 0.3, changeFrequency `yearly`

Excludes all `/dashboard/*` and `/builder/*` paths. Returns `MetadataRoute.Sitemap`.

---

## 8. `app/robots.ts`

Next.js native robots. Rules:

```
User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /builder/
Sitemap: https://zyvo.id/sitemap.xml
```

---

## Architecture Notes

- No new dependencies needed — all Next.js 15 built-ins.
- JSON-LD injected via `<script>` tag in RSC (not `next/head` — that's Pages Router).
- `FAQS` array moved to `features/marketing/lib/faq-data.ts` so both the UI component and the JSON-LD generator can import it without circular deps.
- OG image: use static `public/hero.png` — no `@vercel/og` needed for now.

```
ponytail: dynamic OG image per CV template — add when deploying to Vercel Edge with @vercel/og
```
