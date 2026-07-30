# AI Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire 7 AI features (content improver, CV score, chat assistant, JD analyzer, cover letter, smart generator, interview prep) into Zyvo's existing CV builder using a new tRPC AI router backed by OpenRouter.

**Architecture:** New `features/ai/` module mirrors the existing `features/cv/` pattern — server router, prompt files, hooks, and components all scoped to the feature. The `ai` panel in the builder sidebar already exists as a placeholder; each task fills it in incrementally. All AI calls go through `features/ai/server/ai-router.ts` mounted on the existing tRPC root.

**Tech Stack:** tRPC v11, Zod v4, Zustand v5, `openai` SDK (OpenAI-compatible, pointed at OpenRouter), `@upstash/redis` (already in deps), React 19, Next.js 16 App Router.

## Global Constraints

- Use `bun` for all package installs and scripts, never `npm` or `yarn`.
- `openai` SDK not yet installed — Task 1 installs it.
- All tRPC procedures must use `protectedProcedure` (requires auth session).
- Rate limiting via `@upstash/redis` sliding window: 20 req/user/hour general, 5 req/user/hour for `chat` and `generate`.
- OpenRouter base URL: `https://openrouter.ai/api/v1` — env var `OPENROUTER_API_KEY`.
- Models: `openai/gpt-4o-mini` for high-frequency/cheap operations (improve, score, interviewPrep); `openai/gpt-4o` for complex reasoning (chat, analyzeJD, generate, coverLetter).
- Language: UI copy in Bahasa Indonesia (matching existing app locale).
- All streaming responses use the OpenAI SDK's `stream: true` option and are piped through tRPC's `httpBatchStreamLink` (already configured).
- Do not use `any` types — infer from Zod schemas or tRPC outputs.
- Biome v2 linting is enforced — run `bun lint` after each task.

---

## File Map

### New files
```
features/ai/lib/openrouter.ts          — OpenAI-compatible client singleton
features/ai/lib/cv-snapshot.ts         — serialize CvContent → compact prompt string
features/ai/lib/rate-limit.ts          — Upstash Redis sliding window helper
features/ai/server/prompts/improver.ts — system prompt for content improver
features/ai/server/prompts/score.ts    — system prompt for CV scorer
features/ai/server/prompts/chat.ts     — system prompt for chat assistant
features/ai/server/prompts/analyzer.ts — system prompt for JD analyzer
features/ai/server/prompts/cover-letter.ts  — system prompt for cover letter
features/ai/server/prompts/generator.ts     — system prompt for smart generator
features/ai/server/prompts/interview-prep.ts — system prompt for interview prep
features/ai/server/ai-router.ts        — tRPC router with all 7 procedures
features/ai/hooks/use-ai-stream.ts     — shared hook: stream → local state
features/ai/components/ai-panel.tsx    — "Asisten AI" panel (main container)
features/ai/components/ai-toolbar.tsx  — inline ✨ toolbar for textarea fields
features/ai/components/ai-score-card.tsx    — score rings + tips display
features/ai/components/ai-chat.tsx          — chat UI inside the AI panel
features/ai/components/ai-jd-analyzer.tsx  — JD paste + gap analysis UI
features/ai/components/ai-cover-letter-modal.tsx — cover letter modal
features/ai/components/ai-interview-modal.tsx    — interview prep modal
features/ai/components/ai-generator-modal.tsx    — smart CV generator modal
```

### Modified files
```
server/trpc/routers/_app.ts            — mount aiRouter
features/cv/components/panels/index.tsx — replace AI placeholder with <AiPanel>
features/cv/components/panels/_ai-tools.tsx — wire AiToolbar to real hook
features/cv/components/panels/personal-form.tsx — add AiToolbar to textarea fields
features/cv/components/panels/editor-dialog.tsx — add AiToolbar to section description fields
features/cv/components/builder-client.tsx — add cover letter + interview prep modal triggers
.env.local (example) / .env            — add OPENROUTER_API_KEY
```

---

## Task 1: Install openai SDK and scaffold feature structure

**Files:**
- Install: `openai` package
- Create: `features/ai/lib/openrouter.ts`
- Create: `features/ai/lib/cv-snapshot.ts`
- Create: `features/ai/lib/rate-limit.ts`

**Interfaces:**
- Produces:
  - `openrouter` — `OpenAI` instance from `features/ai/lib/openrouter.ts`
  - `buildSnapshot(cv: CvContent): string` from `features/ai/lib/cv-snapshot.ts`
  - `checkRateLimit(userId: string, key: string, limit: number): Promise<void>` from `features/ai/lib/rate-limit.ts` — throws `TRPCError({ code: "TOO_MANY_REQUESTS" })` if exceeded

- [ ] **Step 1: Install openai SDK**

```bash
bun add openai
```

Expected: `openai` appears in `package.json` dependencies.

- [ ] **Step 2: Add OPENROUTER_API_KEY to environment**

Open `.env.local` (or `.env`) and add:
```
OPENROUTER_API_KEY=your_key_here
```

- [ ] **Step 3: Create openrouter client**

Create `features/ai/lib/openrouter.ts`:
```ts
import OpenAI from "openai";

export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});
```

- [ ] **Step 4: Create cv-snapshot serializer**

Create `features/ai/lib/cv-snapshot.ts`:
```ts
import type { CvContent } from "@/features/cv/schemas/cv";

/** Serialize a CV to a compact string for use in AI prompts. */
export function buildSnapshot(cv: CvContent): string {
  const lines: string[] = [];

  lines.push(`# CV: ${cv.personal.fullName || "(tanpa nama)"}`);
  if (cv.personal.headline) lines.push(`Headline: ${cv.personal.headline}`);
  if (cv.personal.location) lines.push(`Lokasi: ${cv.personal.location}`);
  if (cv.summary) lines.push(`\n## Ringkasan\n${cv.summary}`);

  if (cv.experience.length > 0) {
    lines.push("\n## Pengalaman Kerja");
    for (const e of cv.experience) {
      const period = e.current
        ? `${e.startDate} – sekarang`
        : `${e.startDate} – ${e.endDate}`;
      lines.push(`- ${e.role} di ${e.company} (${period})`);
      if (e.description) lines.push(`  ${e.description.slice(0, 300)}`);
    }
  }

  if (cv.education.length > 0) {
    lines.push("\n## Pendidikan");
    for (const e of cv.education) {
      lines.push(`- ${e.degree} ${e.field} — ${e.school} (${e.startDate}–${e.endDate})`);
    }
  }

  if (cv.skills.length > 0) {
    lines.push("\n## Keahlian");
    lines.push(cv.skills.map((s) => s.name).join(", "));
  }

  if (cv.projects.length > 0) {
    lines.push("\n## Proyek");
    for (const p of cv.projects) {
      lines.push(`- ${p.name}${p.type ? ` (${p.type})` : ""}: ${p.description?.slice(0, 200) ?? ""}`);
    }
  }

  if (cv.certifications.length > 0) {
    lines.push("\n## Sertifikasi");
    for (const c of cv.certifications) {
      lines.push(`- ${c.name}${c.issuer ? ` — ${c.issuer}` : ""}`);
    }
  }

  if (cv.languages.length > 0) {
    lines.push("\n## Bahasa");
    lines.push(cv.languages.map((l) => `${l.name} (${l.level})`).join(", "));
  }

  // Cap total length to ~4000 chars to stay within token budget
  return lines.join("\n").slice(0, 4000);
}
```

- [ ] **Step 5: Create rate limit helper**

Create `features/ai/lib/rate-limit.ts`:
```ts
import { TRPCError } from "@trpc/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

/**
 * Sliding window rate limiter. Throws TRPCError TOO_MANY_REQUESTS if exceeded.
 * key: e.g. "ai:improve", limit: max requests per hour.
 */
export async function checkRateLimit(
  userId: string,
  key: string,
  limit: number,
): Promise<void> {
  const redisKey = `ratelimit:${key}:${userId}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour

  const pipe = redis.pipeline();
  pipe.zremrangebyscore(redisKey, 0, now - windowMs);
  pipe.zadd(redisKey, { score: now, member: now.toString() });
  pipe.zcard(redisKey);
  pipe.expire(redisKey, 3600);

  const results = await pipe.exec();
  const count = results[2] as number;

  if (count > limit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Batas permintaan AI tercapai. Coba lagi dalam 1 jam.",
    });
  }
}
```

- [ ] **Step 6: Lint check**

```bash
bun lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add features/ai/ package.json bun.lockb
git commit -m "feat(ai): scaffold AI feature — openrouter client, cv-snapshot, rate-limit"
```

---

## Task 2: Build tRPC AI router with all 7 procedures

**Files:**
- Create: `features/ai/server/prompts/improver.ts`
- Create: `features/ai/server/prompts/score.ts`
- Create: `features/ai/server/prompts/chat.ts`
- Create: `features/ai/server/prompts/analyzer.ts`
- Create: `features/ai/server/prompts/cover-letter.ts`
- Create: `features/ai/server/prompts/generator.ts`
- Create: `features/ai/server/prompts/interview-prep.ts`
- Create: `features/ai/server/ai-router.ts`
- Modify: `server/trpc/routers/_app.ts`

**Interfaces:**
- Consumes: `openrouter` from `features/ai/lib/openrouter.ts`, `buildSnapshot` from `features/ai/lib/cv-snapshot.ts`, `checkRateLimit` from `features/ai/lib/rate-limit.ts`, `createTRPCRouter` + `protectedProcedure` from `server/trpc/trpc.ts`, `CvContent` from `features/cv/schemas/cv.ts`
- Produces (tRPC procedures on `ai.*`):
  - `ai.improve` — input: `{ text: string, action: "improve"|"shorten"|"expand"|"formalize", fieldType: string }` → output: `{ result: string }`
  - `ai.score` — input: `{ cvSnapshot: string }` → output: `{ ats: number, completeness: number, impact: number, balance: number, tips: string[] }`
  - `ai.chat` — input: `{ messages: { role: "user"|"assistant", content: string }[], cvSnapshot: string }` → output: `{ result: string }`
  - `ai.analyzeJD` — input: `{ jdText: string, cvSnapshot: string }` → output: `{ score: number, matchedKeywords: string[], gaps: string[], recommendations: string[] }`
  - `ai.coverLetter` — input: `{ cvSnapshot: string, jdText: string, tone: "formal"|"casual"|"creative" }` → output: `{ result: string }`
  - `ai.generate` — input: `{ name: string, field: string, summary: string }` → output: `CvContent` (partial, validated with Zod)
  - `ai.interviewPrep` — input: `{ cvSnapshot: string, jdText: string }` → output: `{ questions: { question: string, tip: string }[] }`

- [ ] **Step 1: Create prompt files**

Create `features/ai/server/prompts/improver.ts`:
```ts
export function improverSystemPrompt(fieldType: string): string {
  return `Kamu adalah asisten CV profesional. Tugasmu adalah memperbaiki teks pada bagian "${fieldType}" CV pengguna.
Ikuti instruksi pengguna dengan tepat. Balas HANYA dengan teks yang diperbaiki — tanpa penjelasan, tanpa tanda kutip, tanpa awalan seperti "Berikut hasilnya:".
Pertahankan bahasa asli (Indonesia atau Inggris). Jangan menambahkan informasi yang tidak ada di teks asli.`;
}

export const improveActions: Record<string, string> = {
  improve: "Perbaiki kalimat agar lebih profesional dan berdampak.",
  shorten: "Persingkat menjadi maksimal 2 kalimat tanpa kehilangan inti.",
  expand: "Kembangkan dengan detail yang lebih spesifik dan kontekstual.",
  formalize: "Ubah ke gaya bahasa formal yang sesuai lingkungan profesional.",
};
```

Create `features/ai/server/prompts/score.ts`:
```ts
export const scoreSystemPrompt = `Kamu adalah evaluator CV profesional. Analisis CV yang diberikan dan berikan skor 0-100 untuk 4 kategori:
1. ats: Seberapa baik CV lolos sistem ATS (kata kunci, format, section lengkap)
2. completeness: Kelengkapan isi (semua section penting terisi, kontak lengkap)
3. impact: Kekuatan bahasa (kata kerja aktif, angka/metrik spesifik, pencapaian)
4. balance: Proporsi dan keseimbangan antar section

Balas HANYA dalam format JSON berikut, tanpa teks lain:
{"ats": 75, "completeness": 80, "impact": 60, "balance": 70, "tips": ["tip 1", "tip 2", "tip 3"]}

Tips harus spesifik dan actionable, maksimal 3 item.`;
```

Create `features/ai/server/prompts/chat.ts`:
```ts
export function chatSystemPrompt(cvSnapshot: string): string {
  return `Kamu adalah konsultan karier profesional yang membantu pengguna memperkuat CV mereka.
Berikut adalah CV pengguna yang sedang aktif:

${cvSnapshot}

Berikan saran yang spesifik berdasarkan CV di atas. Jangan mengarang fakta atau pengalaman yang tidak ada di CV.
Jika pengguna menanyakan hal di luar CV (misalnya informasi perusahaan), bantu semampumu berdasarkan pengetahuan umum.
Gunakan bahasa yang sama dengan pertanyaan pengguna (Indonesia atau Inggris).`;
}
```

Create `features/ai/server/prompts/analyzer.ts`:
```ts
export const analyzerSystemPrompt = `Kamu adalah spesialis rekrutmen yang menganalisis kesesuaian CV dengan deskripsi pekerjaan (job description).

Bandingkan CV dan JD yang diberikan, lalu balas HANYA dalam format JSON berikut:
{
  "score": 72,
  "matchedKeywords": ["React", "TypeScript", "REST API"],
  "gaps": ["Docker", "CI/CD", "pengalaman tim >5 orang"],
  "recommendations": [
    "Tambahkan pengalaman dengan Docker di bagian proyek",
    "Sebutkan metodologi agile yang pernah digunakan"
  ]
}

score: 0-100, perkiraan kesesuaian keseluruhan.
matchedKeywords: skill/keyword yang ada di CV dan diminta JD.
gaps: requirement JD yang belum tercermin di CV (maks 5).
recommendations: saran konkret untuk menutup gap (maks 3).`;
```

Create `features/ai/server/prompts/cover-letter.ts`:
```ts
export function coverLetterSystemPrompt(tone: string): string {
  const toneDesc: Record<string, string> = {
    formal: "profesional dan formal, menggunakan sapaan resmi",
    casual: "hangat dan personal, namun tetap profesional",
    creative: "kreatif dan berkarakter, menunjukkan kepribadian unik",
  };
  return `Kamu adalah penulis surat lamaran (cover letter) profesional.
Tulis cover letter dengan gaya ${toneDesc[tone] ?? "profesional"}.
Gunakan detail spesifik dari CV yang diberikan — nama, pengalaman, proyek, skill.
Jika ada job description, sesuaikan cover letter dengan kebutuhan posisi tersebut.
Panjang: 3-4 paragraf. Balas HANYA dengan teks cover letter, tanpa penjelasan.`;
}
```

Create `features/ai/server/prompts/generator.ts`:
```ts
export const generatorSystemPrompt = `Kamu adalah asisten pembuatan CV profesional.
Berdasarkan informasi singkat yang diberikan pengguna, buat draft CV lengkap dalam format JSON.

Balas HANYA dengan JSON yang sesuai struktur ini (semua field string, array untuk experience/education/skills/projects):
{
  "personal": { "fullName": "", "headline": "", "email": "", "phone": "", "location": "", "website": "", "linkedin": "", "github": "", "photo": "" },
  "summary": "",
  "experience": [{ "company": "", "role": "", "location": "", "startDate": "", "endDate": "", "current": false, "description": "" }],
  "education": [{ "school": "", "degree": "", "field": "", "startDate": "", "endDate": "", "gpa": "" }],
  "skills": [{ "name": "", "level": 3 }],
  "projects": [{ "name": "", "type": "", "date": "", "skill": "", "description": "" }],
  "interpersonal": [],
  "languages": [],
  "certifications": [],
  "organizations": [],
  "custom": []
}

Isi field yang bisa kamu isi berdasarkan input. Kosongkan field yang tidak ada informasinya.
Untuk experience.description, tulis 2-3 kalimat dengan kata kerja aktif dan pencapaian yang mungkin relevan.
skill.level: 1=expert, 2=advanced, 3=intermediate, 4=beginner, 5=novice.`;
```

Create `features/ai/server/prompts/interview-prep.ts`:
```ts
export const interviewPrepSystemPrompt = `Kamu adalah coach karier yang mempersiapkan kandidat menghadapi wawancara kerja.
Berdasarkan CV dan (jika ada) job description yang diberikan, buat 10 pertanyaan interview yang relevan.

Balas HANYA dalam format JSON berikut:
{
  "questions": [
    { "question": "Ceritakan pengalaman Anda memimpin tim dalam proyek...", "tip": "Gunakan metode STAR: Situation, Task, Action, Result." }
  ]
}

Pertanyaan harus:
- Spesifik ke pengalaman/skill yang ada di CV
- Mencakup mix: behavioral (60%), technical (30%), situational (10%)
- Relevan dengan JD jika tersedia
Tips harus actionable dan membantu kandidat menjawab dengan baik.`;
```

- [ ] **Step 2: Create ai-router.ts**

Create `features/ai/server/ai-router.ts`:
```ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { openrouter } from "@/features/ai/lib/openrouter";
import { checkRateLimit } from "@/features/ai/lib/rate-limit";
import {
  improveActions,
  improverSystemPrompt,
} from "@/features/ai/server/prompts/improver";
import { scoreSystemPrompt } from "@/features/ai/server/prompts/score";
import { chatSystemPrompt } from "@/features/ai/server/prompts/chat";
import { analyzerSystemPrompt } from "@/features/ai/server/prompts/analyzer";
import { coverLetterSystemPrompt } from "@/features/ai/server/prompts/cover-letter";
import { generatorSystemPrompt } from "@/features/ai/server/prompts/generator";
import { interviewPrepSystemPrompt } from "@/features/ai/server/prompts/interview-prep";
import {
  cvContentSchema,
} from "@/features/cv/schemas/cv";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

const cvSnapshotInput = z.string().max(5000);

async function collectStream(
  stream: AsyncIterable<{ choices: { delta: { content?: string | null } }[] }>,
): Promise<string> {
  let result = "";
  for await (const chunk of stream) {
    result += chunk.choices[0]?.delta?.content ?? "";
  }
  return result;
}

export const aiRouter = createTRPCRouter({
  improve: protectedProcedure
    .input(
      z.object({
        text: z.string().max(3000),
        action: z.enum(["improve", "shorten", "expand", "formalize"]),
        fieldType: z.string().max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.session.user.id, "ai:improve", 20);

      const stream = await openrouter.chat.completions.create({
        model: "openai/gpt-4o-mini",
        stream: true,
        messages: [
          { role: "system", content: improverSystemPrompt(input.fieldType) },
          {
            role: "user",
            content: `${improveActions[input.action]}\n\nTeks:\n${input.text}`,
          },
        ],
        max_tokens: 500,
      });

      const result = await collectStream(stream);
      return { result };
    }),

  score: protectedProcedure
    .input(z.object({ cvSnapshot: cvSnapshotInput }))
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.session.user.id, "ai:score", 20);

      const response = await openrouter.chat.completions.create({
        model: "openai/gpt-4o-mini",
        stream: false,
        messages: [
          { role: "system", content: scoreSystemPrompt },
          { role: "user", content: input.cvSnapshot },
        ],
        response_format: { type: "json_object" },
        max_tokens: 400,
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(raw) as {
          ats: number;
          completeness: number;
          impact: number;
          balance: number;
          tips: string[];
        };
        return {
          ats: Math.min(100, Math.max(0, parsed.ats ?? 0)),
          completeness: Math.min(100, Math.max(0, parsed.completeness ?? 0)),
          impact: Math.min(100, Math.max(0, parsed.impact ?? 0)),
          balance: Math.min(100, Math.max(0, parsed.balance ?? 0)),
          tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 5) : [],
        };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menganalisis CV. Coba lagi.",
        });
      }
    }),

  chat: protectedProcedure
    .input(
      z.object({
        messages: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().max(2000),
            }),
          )
          .max(20),
        cvSnapshot: cvSnapshotInput,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.session.user.id, "ai:chat", 5);

      const stream = await openrouter.chat.completions.create({
        model: "openai/gpt-4o",
        stream: true,
        messages: [
          { role: "system", content: chatSystemPrompt(input.cvSnapshot) },
          ...input.messages,
        ],
        max_tokens: 800,
      });

      const result = await collectStream(stream);
      return { result };
    }),

  analyzeJD: protectedProcedure
    .input(
      z.object({
        jdText: z.string().max(3000),
        cvSnapshot: cvSnapshotInput,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.session.user.id, "ai:analyzeJD", 20);

      const response = await openrouter.chat.completions.create({
        model: "openai/gpt-4o",
        stream: false,
        messages: [
          { role: "system", content: analyzerSystemPrompt },
          {
            role: "user",
            content: `CV:\n${input.cvSnapshot}\n\nJob Description:\n${input.jdText}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 600,
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(raw) as {
          score: number;
          matchedKeywords: string[];
          gaps: string[];
          recommendations: string[];
        };
        return {
          score: Math.min(100, Math.max(0, parsed.score ?? 0)),
          matchedKeywords: Array.isArray(parsed.matchedKeywords)
            ? parsed.matchedKeywords.slice(0, 20)
            : [],
          gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 5) : [],
          recommendations: Array.isArray(parsed.recommendations)
            ? parsed.recommendations.slice(0, 3)
            : [],
        };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal menganalisis JD. Coba lagi.",
        });
      }
    }),

  coverLetter: protectedProcedure
    .input(
      z.object({
        cvSnapshot: cvSnapshotInput,
        jdText: z.string().max(3000).optional().default(""),
        tone: z.enum(["formal", "casual", "creative"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.session.user.id, "ai:coverLetter", 20);

      const userContent = input.jdText
        ? `CV:\n${input.cvSnapshot}\n\nJob Description:\n${input.jdText}`
        : `CV:\n${input.cvSnapshot}`;

      const stream = await openrouter.chat.completions.create({
        model: "openai/gpt-4o",
        stream: true,
        messages: [
          { role: "system", content: coverLetterSystemPrompt(input.tone) },
          { role: "user", content: userContent },
        ],
        max_tokens: 800,
      });

      const result = await collectStream(stream);
      return { result };
    }),

  generate: protectedProcedure
    .input(
      z.object({
        name: z.string().max(120),
        field: z.string().max(160),
        summary: z.string().max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.session.user.id, "ai:generate", 5);

      const response = await openrouter.chat.completions.create({
        model: "openai/gpt-4o",
        stream: false,
        messages: [
          { role: "system", content: generatorSystemPrompt },
          {
            role: "user",
            content: `Nama: ${input.name}\nBidang: ${input.field}\nRingkasan pengalaman: ${input.summary}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(raw);
        // Partial parse — only validate the sections we populate
        const partial = cvContentSchema.partial().safeParse({
          title: `CV ${input.name}`,
          ...parsed,
        });
        if (!partial.success) {
          throw new Error("Schema mismatch");
        }
        return partial.data;
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal membuat draft CV. Coba lagi.",
        });
      }
    }),

  interviewPrep: protectedProcedure
    .input(
      z.object({
        cvSnapshot: cvSnapshotInput,
        jdText: z.string().max(3000).optional().default(""),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkRateLimit(ctx.session.user.id, "ai:interviewPrep", 20);

      const userContent = input.jdText
        ? `CV:\n${input.cvSnapshot}\n\nJob Description:\n${input.jdText}`
        : `CV:\n${input.cvSnapshot}`;

      const response = await openrouter.chat.completions.create({
        model: "openai/gpt-4o-mini",
        stream: false,
        messages: [
          { role: "system", content: interviewPrepSystemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(raw) as {
          questions: { question: string; tip: string }[];
        };
        return {
          questions: Array.isArray(parsed.questions)
            ? parsed.questions.slice(0, 10)
            : [],
        };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal membuat pertanyaan interview. Coba lagi.",
        });
      }
    }),
});
```

- [ ] **Step 3: Mount aiRouter in _app.ts**

Open `server/trpc/routers/_app.ts`. Add import and mount:
```ts
import { aiRouter } from "@/features/ai/server/ai-router";
// ... existing imports

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ status: "ok" as const, timestamp: Date.now() })),
  me: protectedProcedure.query(({ ctx }) => ctx.session.user),
  cv: cvRouter,
  account: authRouter,
  ai: aiRouter,   // ← add this line
});
```

- [ ] **Step 4: Lint check**

```bash
bun lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add features/ai/server/ server/trpc/routers/_app.ts
git commit -m "feat(ai): tRPC AI router with 7 procedures + system prompts"
```

---

## Task 3: Shared useAiStream hook + inline AiToolbar (F1 — Content Improver)

**Files:**
- Create: `features/ai/hooks/use-ai-stream.ts`
- Create: `features/ai/components/ai-toolbar.tsx`
- Modify: `features/cv/components/panels/_ai-tools.tsx` — replace static `AiToolbar` with import from `features/ai/components/ai-toolbar.tsx`
- Modify: `features/cv/components/panels/personal-form.tsx` — add `<AiToolbar>` on headline + summary fields
- Modify: `features/cv/components/panels/editor-dialog.tsx` — add `<AiToolbar>` on description fields

**Interfaces:**
- Consumes: `trpc.ai.improve.useMutation()` (from `lib/trpc/client.ts`), `buildSnapshot` from `features/ai/lib/cv-snapshot.ts`, `useCvStore` from `features/cv/stores/cv-store-provider.ts`
- Produces:
  - `useAiImprove(fieldType: string)` hook → `{ improve(text: string, action: ImproveAction): Promise<string>, isPending: boolean, error: string | null }`
  - `<AiToolbar fieldType={string} value={string} onChange={(v: string) => void} />` component

- [ ] **Step 1: Create useAiImprove hook**

Create `features/ai/hooks/use-ai-stream.ts`:
```ts
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

export type ImproveAction = "improve" | "shorten" | "expand" | "formalize";

/**
 * Hook for the AI content improver. Returns improved text directly.
 * Keeps previousValue for undo.
 */
export function useAiImprove(fieldType: string) {
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = trpc.ai.improve.useMutation({
    onError: (err) => setError(err.message),
  });

  async function improve(
    text: string,
    action: ImproveAction,
    onChange: (v: string) => void,
  ): Promise<void> {
    if (!text.trim()) return;
    setError(null);
    setPreviousValue(text);
    try {
      const { result } = await mutation.mutateAsync({ text, action, fieldType });
      onChange(result);
    } catch {
      // error already set via onError
    }
  }

  function undo(onChange: (v: string) => void): void {
    if (previousValue !== null) {
      onChange(previousValue);
      setPreviousValue(null);
    }
  }

  return {
    improve,
    undo,
    canUndo: previousValue !== null,
    isPending: mutation.isPending,
    error,
  };
}
```

- [ ] **Step 2: Create AiToolbar component**

Create `features/ai/components/ai-toolbar.tsx`:
```tsx
"use client";

import {
  BriefcaseIcon,
  LanguagesIcon,
  PenLineIcon,
  ShrinkIcon,
  SparklesIcon,
  Undo2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiImprove } from "@/features/ai/hooks/use-ai-stream";

interface AiToolbarProps {
  fieldType: string;
  value: string;
  onChange: (v: string) => void;
}

export function AiToolbar({ fieldType, value, onChange }: AiToolbarProps) {
  const { improve, undo, canUndo, isPending } = useAiImprove(fieldType);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Urungkan"
        disabled={!canUndo || isPending}
        onClick={() => undo(onChange)}
      >
        <Undo2Icon className="size-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending || !value.trim()}
        onClick={() => improve(value, "formalize", onChange)}
      >
        <BriefcaseIcon className="size-4" data-icon="inline-start" />
        Formalkan
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending || !value.trim()}
        onClick={() => improve(value, "shorten", onChange)}
      >
        <ShrinkIcon className="size-4" data-icon="inline-start" />
        Persingkat
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending || !value.trim()}
        onClick={() => improve(value, "improve", onChange)}
      >
        <SparklesIcon className="size-4" data-icon="inline-start" />
        Perbaiki kalimat
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending || !value.trim()}
        onClick={() => improve(value, "expand", onChange)}
      >
        <PenLineIcon className="size-4" data-icon="inline-start" />
        Kembangkan
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Wire AiToolbar into personal-form.tsx**

Open `features/cv/components/panels/personal-form.tsx`. Find the `headline` field's `<FormItem>`. After the `<FormControl>` for headline, and after the summary `<FormControl>`, add the toolbar. Example pattern for the headline field:
```tsx
import { AiToolbar } from "@/features/ai/components/ai-toolbar";

// Inside the headline FormField render prop, after <FormControl>:
<AiToolbar
  fieldType="headline"
  value={field.value ?? ""}
  onChange={field.onChange}
/>
```

Apply same pattern to the summary field (fieldType="ringkasan").

- [ ] **Step 4: Wire AiToolbar into editor-dialog.tsx**

Open `features/cv/components/panels/editor-dialog.tsx`. Find description textarea fields in experience, project, certification, and organization editors. After each `<FormControl>` for a `description` field, add:
```tsx
import { AiToolbar } from "@/features/ai/components/ai-toolbar";

// After the <FormControl> for description, inside each section's FormField:
<AiToolbar
  fieldType="deskripsi pengalaman" // or "deskripsi proyek", etc.
  value={field.value ?? ""}
  onChange={field.onChange}
/>
```

- [ ] **Step 5: Update _ai-tools.tsx to re-export from features/ai**

Replace the static disabled `AiToolbar` in `features/cv/components/panels/_ai-tools.tsx` with a note that it's been superseded. The `TipsBanner` and `InfoBanner` stay as-is. Remove the old `AiToolbar` export from that file (it will now come from `features/ai/components/ai-toolbar.tsx`).

- [ ] **Step 6: Lint check**

```bash
bun lint
```

- [ ] **Step 7: Manual smoke test**

```
1. bun dev
2. Open builder, navigate to "Informasi Pribadi" panel
3. Type something in Headline field
4. Click "Perbaiki kalimat" — text should update in field
5. Click undo button (↩) — original text restored
6. Navigate to a section with description, repeat test
```

- [ ] **Step 8: Commit**

```bash
git add features/ai/hooks/ features/ai/components/ai-toolbar.tsx features/cv/components/panels/
git commit -m "feat(ai): F1 content improver — inline AiToolbar wired to ai.improve"
```

---

## Task 4: AI CV Score panel (F4)

**Files:**
- Create: `features/ai/components/ai-score-card.tsx`
- Create: `features/ai/components/ai-panel.tsx`
- Modify: `features/cv/components/panels/index.tsx` — replace `<Placeholder>` for `"ai"` case with `<AiPanel>`

**Interfaces:**
- Consumes: `trpc.ai.score.useMutation()`, `buildSnapshot` from `features/ai/lib/cv-snapshot.ts`, `useCvStore` from `features/cv/stores/cv-store-provider.ts`
- Produces: `<AiPanel />` — the main container rendered when user clicks the "Asisten AI" sidebar item

- [ ] **Step 1: Create AiScoreCard component**

Create `features/ai/components/ai-score-card.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { buildSnapshot } from "@/features/ai/lib/cv-snapshot";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";

interface ScoreResult {
  ats: number;
  completeness: number;
  impact: number;
  balance: number;
  tips: string[];
}

function ScoreRing({ label, value }: { label: string; value: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const filled = (value / 100) * circumference;
  const color =
    value >= 75 ? "text-green-500" : value >= 50 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative size-16">
        <svg className="size-full -rotate-90" viewBox="0 0 72 72">
          <circle
            cx="36" cy="36" r={radius}
            fill="none" stroke="currentColor"
            strokeWidth="6"
            className="text-muted/30"
          />
          <circle
            cx="36" cy="36" r={radius}
            fill="none" stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={`${filled} ${circumference}`}
            className={color}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${color}`}>
          {value}
        </span>
      </div>
      <span className="text-center text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function AiScoreCard() {
  const cv = useCvStore((s) => s.content);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const mutation = trpc.ai.score.useMutation({
    onSuccess: (data) => setScore(data),
  });

  function runScore() {
    mutation.mutate({ cvSnapshot: buildSnapshot(cv) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Skor CV</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={runScore}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Menganalisis..." : "Analisis Sekarang"}
        </Button>
      </div>

      {score ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <ScoreRing label="ATS" value={score.ats} />
            <ScoreRing label="Kelengkapan" value={score.completeness} />
            <ScoreRing label="Dampak" value={score.impact} />
            <ScoreRing label="Proporsi" value={score.balance} />
          </div>
          {score.tips.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="mb-1.5 text-xs font-medium">Rekomendasi:</p>
              <ul className="space-y-1">
                {score.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    • {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Klik "Analisis Sekarang" untuk mendapatkan skor dan rekomendasi perbaikan CV Anda.
        </p>
      )}

      {mutation.error && (
        <p className="text-xs text-destructive">{mutation.error.message}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create AiPanel (container for AI tab)**

Create `features/ai/components/ai-panel.tsx`:
```tsx
"use client";

import { AiScoreCard } from "./ai-score-card";
import { AiChat } from "./ai-chat";

export function AiPanel() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <AiScoreCard />
      <div className="border-t" />
      <AiChat />
    </div>
  );
}
```

Note: `AiChat` is created in Task 5. For now, create a stub in `features/ai/components/ai-chat.tsx`:
```tsx
"use client";

export function AiChat() {
  return (
    <div className="text-xs text-muted-foreground">
      Chat asisten akan hadir di sini.
    </div>
  );
}
```

- [ ] **Step 3: Wire AiPanel into panels/index.tsx**

Open `features/cv/components/panels/index.tsx`. Find the `"ai"` case in `ActivePanel`:
```tsx
case "ai":
  return (
    <Placeholder title="Asisten AI" note="Fitur AI akan hadir di sini." />
  );
```

Replace with:
```tsx
import { lazy } from "react";

const AiPanel = lazy(() =>
  import("@/features/ai/components/ai-panel").then((m) => ({ default: m.AiPanel })),
);

// In ActivePanel switch:
case "ai":
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Memuat...</div>}>
      <AiPanel />
    </Suspense>
  );
```

Also add a `PanelHeader` before the `AiPanel` content — wrap:
```tsx
case "ai":
  return (
    <div>
      <PanelHeader title="Asisten AI" note="Analisis, skor, dan perbaikan CV dengan AI." />
      <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Memuat...</div>}>
        <AiPanel />
      </Suspense>
    </div>
  );
```

- [ ] **Step 4: Lint check**

```bash
bun lint
```

- [ ] **Step 5: Manual smoke test**

```
1. bun dev
2. Open builder, click "Asisten AI" (✨) in sidebar
3. See "Skor CV" section + "Analisis Sekarang" button
4. Click button — should show 4 score rings after a few seconds
5. Tips should appear below rings
```

- [ ] **Step 6: Commit**

```bash
git add features/ai/components/ features/cv/components/panels/index.tsx
git commit -m "feat(ai): F4 CV score panel — 4-category rings with tips"
```

---

## Task 5: AI Chat Assistant panel (F2)

**Files:**
- Modify: `features/ai/components/ai-chat.tsx` — replace stub with full chat UI

**Interfaces:**
- Consumes: `trpc.ai.chat.useMutation()`, `buildSnapshot`, `useCvStore`
- Produces: `<AiChat />` — scrollable chat UI with input box

- [ ] **Step 1: Implement AiChat component**

Replace the stub `features/ai/components/ai-chat.tsx`:
```tsx
"use client";

import { useRef, useState } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { buildSnapshot } from "@/features/ai/lib/cv-snapshot";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AiChat() {
  const cv = useCvStore((s) => s.content);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const mutation = trpc.ai.chat.useMutation({
    onSuccess: ({ result }) => {
      setMessages((prev) => [...prev, { role: "assistant", content: result }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    },
  });

  function send() {
    const text = input.trim();
    if (!text || mutation.isPending) return;
    const next: Message = { role: "user", content: text };
    setInput("");
    setMessages((prev) => [...prev, next]);
    mutation.mutate({
      messages: [...messages, next],
      cvSnapshot: buildSnapshot(cv),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Chat dengan AI</h3>

      {messages.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Tanya apa saja tentang CV Anda — strategi, perbaikan, atau analisis posisi tertentu.
        </p>
      ) : (
        <div className="max-h-80 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={
                msg.role === "user"
                  ? "ml-4 rounded-lg bg-primary/10 px-3 py-2 text-xs"
                  : "rounded-lg bg-muted px-3 py-2 text-xs"
              }
            >
              {msg.content}
            </div>
          ))}
          {mutation.isPending && (
            <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              AI sedang mengetik...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya sesuatu tentang CV Anda..."
          className="min-h-[60px] resize-none text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          disabled={!input.trim() || mutation.isPending}
          onClick={send}
          aria-label="Kirim"
        >
          <SendIcon className="size-4" />
        </Button>
      </div>

      {mutation.error && (
        <p className="text-xs text-destructive">{mutation.error.message}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint check**

```bash
bun lint
```

- [ ] **Step 3: Manual smoke test**

```
1. bun dev → open builder → click "Asisten AI"
2. Type "Apa yang bisa diperbaiki dari CV saya?" → Enter
3. Should see user bubble, then AI response bubble
4. Conversation history maintained across messages in same session
```

- [ ] **Step 4: Commit**

```bash
git add features/ai/components/ai-chat.tsx
git commit -m "feat(ai): F2 AI chat assistant — full chat UI in builder sidebar"
```

---

## Task 6: Job Description Analyzer (F3)

**Files:**
- Create: `features/ai/components/ai-jd-analyzer.tsx`
- Modify: `features/ai/components/ai-panel.tsx` — add `<AiJdAnalyzer>` section

**Interfaces:**
- Consumes: `trpc.ai.analyzeJD.useMutation()`, `buildSnapshot`, `useCvStore`
- Produces: `<AiJdAnalyzer />` — textarea for JD + analysis result display

- [ ] **Step 1: Create AiJdAnalyzer component**

Create `features/ai/components/ai-jd-analyzer.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { buildSnapshot } from "@/features/ai/lib/cv-snapshot";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";

interface JdResult {
  score: number;
  matchedKeywords: string[];
  gaps: string[];
  recommendations: string[];
}

export function AiJdAnalyzer() {
  const cv = useCvStore((s) => s.content);
  const [jdText, setJdText] = useState("");
  const [result, setResult] = useState<JdResult | null>(null);

  const mutation = trpc.ai.analyzeJD.useMutation({
    onSuccess: (data) => setResult(data),
  });

  function analyze() {
    if (!jdText.trim()) return;
    mutation.mutate({ jdText: jdText.slice(0, 3000), cvSnapshot: buildSnapshot(cv) });
  }

  const scoreColor =
    !result ? "" :
    result.score >= 75 ? "text-green-600" :
    result.score >= 50 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Analisis Kesesuaian Lowongan</h3>
      <Textarea
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder="Paste deskripsi pekerjaan di sini..."
        className="min-h-[100px] resize-none text-xs"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full"
        onClick={analyze}
        disabled={mutation.isPending || !jdText.trim()}
      >
        {mutation.isPending ? "Menganalisis..." : "Analisis Kesesuaian"}
      </Button>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Skor kesesuaian:</span>
            <span className={`text-lg font-bold ${scoreColor}`}>{result.score}%</span>
          </div>

          {result.matchedKeywords.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-green-700">Keyword yang cocok:</p>
              <div className="flex flex-wrap gap-1">
                {result.matchedKeywords.map((kw) => (
                  <span key={kw} className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.gaps.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-red-700">Gap yang perlu diisi:</p>
              <ul className="space-y-0.5">
                {result.gaps.map((gap) => (
                  <li key={gap} className="text-xs text-muted-foreground">• {gap}</li>
                ))}
              </ul>
            </div>
          )}

          {result.recommendations.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="mb-1 text-xs font-medium">Rekomendasi:</p>
              <ul className="space-y-1">
                {result.recommendations.map((rec) => (
                  <li key={rec} className="text-xs text-muted-foreground">• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {mutation.error && (
        <p className="text-xs text-destructive">{mutation.error.message}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add AiJdAnalyzer to AiPanel**

Open `features/ai/components/ai-panel.tsx`. Add import and render between score card and chat:
```tsx
import { AiJdAnalyzer } from "./ai-jd-analyzer";

export function AiPanel() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <AiScoreCard />
      <div className="border-t" />
      <AiJdAnalyzer />
      <div className="border-t" />
      <AiChat />
    </div>
  );
}
```

- [ ] **Step 3: Lint + smoke test**

```bash
bun lint
```

Manual test:
```
1. bun dev → Asisten AI panel
2. Paste a job description (any text with role requirements)
3. Click "Analisis Kesesuaian"
4. Should show score %, matched keywords (green badges), gaps, recommendations
```

- [ ] **Step 4: Commit**

```bash
git add features/ai/components/ai-jd-analyzer.tsx features/ai/components/ai-panel.tsx
git commit -m "feat(ai): F3 JD analyzer — score, matched keywords, gap analysis"
```

---

## Task 7: Cover Letter Generator (F6) + Interview Prep (F7)

**Files:**
- Create: `features/ai/components/ai-cover-letter-modal.tsx`
- Create: `features/ai/components/ai-interview-modal.tsx`
- Modify: `features/cv/components/builder-client.tsx` — add two trigger buttons + render modals

**Interfaces:**
- Consumes: `trpc.ai.coverLetter.useMutation()`, `trpc.ai.interviewPrep.useMutation()`, `buildSnapshot`, `useCvStore`
- Produces:
  - `<AiCoverLetterModal open={boolean} onClose={() => void} />` 
  - `<AiInterviewModal open={boolean} onClose={() => void} />`

- [ ] **Step 1: Create AiCoverLetterModal**

Create `features/ai/components/ai-cover-letter-modal.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { buildSnapshot } from "@/features/ai/lib/cv-snapshot";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AiCoverLetterModal({ open, onClose }: Props) {
  const cv = useCvStore((s) => s.content);
  const [jdText, setJdText] = useState("");
  const [tone, setTone] = useState<"formal" | "casual" | "creative">("formal");
  const [result, setResult] = useState("");

  const mutation = trpc.ai.coverLetter.useMutation({
    onSuccess: ({ result: text }) => setResult(text),
  });

  function generate() {
    mutation.mutate({ cvSnapshot: buildSnapshot(cv), jdText, tone });
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(result);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buat Surat Lamaran</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium">Gaya penulisan</label>
              <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="casual">Santai profesional</SelectItem>
                  <SelectItem value="creative">Kreatif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">
              Deskripsi pekerjaan (opsional)
            </label>
            <Textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste deskripsi pekerjaan untuk hasil yang lebih relevan..."
              className="min-h-[80px] resize-none text-xs"
            />
          </div>

          <Button
            className="w-full"
            onClick={generate}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Membuat surat lamaran..." : "Buat Surat Lamaran"}
          </Button>

          {result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Hasil:</span>
                <Button size="sm" variant="outline" onClick={copyToClipboard}>
                  Salin
                </Button>
              </div>
              <Textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                className="min-h-[200px] resize-none text-xs"
              />
            </div>
          )}

          {mutation.error && (
            <p className="text-xs text-destructive">{mutation.error.message}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create AiInterviewModal**

Create `features/ai/components/ai-interview-modal.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { buildSnapshot } from "@/features/ai/lib/cv-snapshot";
import { useCvStore } from "@/features/cv/stores/cv-store-provider";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AiInterviewModal({ open, onClose }: Props) {
  const cv = useCvStore((s) => s.content);
  const [jdText, setJdText] = useState("");
  const [questions, setQuestions] = useState<{ question: string; tip: string }[]>([]);

  const mutation = trpc.ai.interviewPrep.useMutation({
    onSuccess: (data) => setQuestions(data.questions),
  });

  function generate() {
    mutation.mutate({ cvSnapshot: buildSnapshot(cv), jdText });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Persiapan Wawancara</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium">
              Deskripsi pekerjaan (opsional)
            </label>
            <Textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste deskripsi pekerjaan untuk pertanyaan yang lebih relevan..."
              className="min-h-[80px] resize-none text-xs"
            />
          </div>

          <Button
            className="w-full"
            onClick={generate}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Membuat pertanyaan..." : "Generate 10 Pertanyaan Interview"}
          </Button>

          {questions.length > 0 && (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-1.5">
                  <p className="text-sm font-medium">
                    {i + 1}. {q.question}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    💡 {q.tip}
                  </p>
                </div>
              ))}
            </div>
          )}

          {mutation.error && (
            <p className="text-xs text-destructive">{mutation.error.message}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Add trigger buttons to builder-client.tsx**

Open `features/cv/components/builder-client.tsx`. In `BuilderLayout`, add state and modal renders:

```tsx
import { useState } from "react"; // already imported
import { FileTextIcon, MessageSquareIcon } from "lucide-react";
import { AiCoverLetterModal } from "@/features/ai/components/ai-cover-letter-modal";
import { AiInterviewModal } from "@/features/ai/components/ai-interview-modal";

// Inside BuilderLayout, add alongside existing state:
const [coverLetterOpen, setCoverLetterOpen] = useState(false);
const [interviewOpen, setInterviewOpen] = useState(false);

// In the JSX, add buttons next to <SaveIndicator /> in the top-right bar:
// Find: <div className="absolute right-4 top-3 z-10 flex items-center gap-3">
// Add before </div>:
<Button
  size="sm"
  variant="outline"
  onClick={() => setCoverLetterOpen(true)}
  title="Buat Surat Lamaran"
>
  <FileTextIcon className="size-4" />
  <span className="hidden sm:inline ml-1.5">Surat Lamaran</span>
</Button>
<Button
  size="sm"
  variant="outline"
  onClick={() => setInterviewOpen(true)}
  title="Persiapan Wawancara"
>
  <MessageSquareIcon className="size-4" />
  <span className="hidden sm:inline ml-1.5">Interview Prep</span>
</Button>

// Before closing </div> of the root container, add modals:
<AiCoverLetterModal open={coverLetterOpen} onClose={() => setCoverLetterOpen(false)} />
<AiInterviewModal open={interviewOpen} onClose={() => setInterviewOpen(false)} />
```

- [ ] **Step 4: Lint check**

```bash
bun lint
```

- [ ] **Step 5: Manual smoke test**

```
1. bun dev → open builder
2. See "Surat Lamaran" and "Interview Prep" buttons in top-right
3. Click "Surat Lamaran" → modal opens → click "Buat Surat Lamaran" → letter appears
4. Click "Interview Prep" → modal opens → click "Generate" → 10 questions appear with tips
```

- [ ] **Step 6: Commit**

```bash
git add features/ai/components/ai-cover-letter-modal.tsx features/ai/components/ai-interview-modal.tsx features/cv/components/builder-client.tsx
git commit -m "feat(ai): F6 cover letter + F7 interview prep modals"
```

---

## Task 8: Smart CV Generator modal (F5)

**Files:**
- Create: `features/ai/components/ai-generator-modal.tsx`
- Modify: dashboard create-CV flow to offer "Generate dengan AI" option

**Interfaces:**
- Consumes: `trpc.ai.generate.useMutation()`, `trpc.cv.create.useMutation()`, `useRouter` from `next/navigation`
- Produces: `<AiGeneratorModal open={boolean} onClose={() => void} />` — 3-field form → creates CV → redirects to editor

- [ ] **Step 1: Create AiGeneratorModal**

Create `features/ai/components/ai-generator-modal.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AiGeneratorModal({ open, onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [field, setField] = useState("");
  const [summary, setSummary] = useState("");
  const [step, setStep] = useState<"form" | "generating">("form");

  const generateMutation = trpc.ai.generate.useMutation();
  const createMutation = trpc.cv.create.useMutation({
    onSuccess: (cv) => router.push(`/builder/${cv.id}`),
  });

  async function handleGenerate() {
    if (!name.trim() || !field.trim()) return;
    setStep("generating");
    try {
      const content = await generateMutation.mutateAsync({ name, field, summary });
      await createMutation.mutateAsync(content ?? undefined);
    } catch {
      setStep("form");
    }
  }

  const isPending = generateMutation.isPending || createMutation.isPending;
  const error = generateMutation.error ?? createMutation.error;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Buat CV dengan AI</DialogTitle>
          <DialogDescription>
            Isi informasi singkat, AI akan membuat draft CV lengkap untuk Anda.
          </DialogDescription>
        </DialogHeader>

        {step === "generating" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">AI sedang membuat CV Anda...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium">
                Nama lengkap <span className="text-destructive">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Budi Santoso"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Bidang / posisi yang dilamar <span className="text-destructive">*</span>
              </label>
              <Input
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="Software Engineer, Marketing Manager, ..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Ringkasan pengalaman (opsional)
              </label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="3 tahun pengalaman di startup fintech sebagai backend developer, pernah handle sistem pembayaran..."
                className="min-h-[80px] resize-none text-xs"
              />
            </div>

            {error && (
              <p className="text-xs text-destructive">{error.message}</p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Batal
              </Button>
              <Button
                className="flex-1"
                onClick={handleGenerate}
                disabled={isPending || !name.trim() || !field.trim()}
              >
                Buat dengan AI
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Find the dashboard "create new CV" button**

```bash
grep -r "create\|buat.*cv\|cv.*baru\|new.*cv" features/cv/components/dashboard/ -l --include="*.tsx" -i
```

Read the file that handles creating a new CV. Look for the button or action that calls `trpc.cv.create`. Add the "Generate dengan AI" option next to or below the existing "Buat CV baru" button.

Pattern to add (adapt import and placement to match the existing dashboard component):
```tsx
import { SparklesIcon } from "lucide-react";
import { useState } from "react";
import { AiGeneratorModal } from "@/features/ai/components/ai-generator-modal";

// In component body:
const [generatorOpen, setGeneratorOpen] = useState(false);

// In JSX, alongside the existing create button:
<Button variant="outline" onClick={() => setGeneratorOpen(true)}>
  <SparklesIcon className="size-4" data-icon="inline-start" />
  Buat dengan AI
</Button>
<AiGeneratorModal open={generatorOpen} onClose={() => setGeneratorOpen(false)} />
```

- [ ] **Step 3: Lint check**

```bash
bun lint
```

- [ ] **Step 4: Manual smoke test**

```
1. bun dev → open /builder (dashboard)
2. See "Buat dengan AI" button next to "Buat CV baru"
3. Click it → modal opens
4. Fill name + field → click "Buat dengan AI"
5. Spinner shows → redirects to builder with pre-filled CV
6. Check that personal info, experience, skills are populated
```

- [ ] **Step 5: Commit**

```bash
git add features/ai/components/ai-generator-modal.tsx
git commit -m "feat(ai): F5 smart CV generator — 3-field form → AI draft → editor"
```

---

## Self-Review Notes

- **Spec coverage:** All 7 features (F1–F7) have tasks. Rate limiting (Task 1) covers the spec requirement. `buildSnapshot` caps at 4000 chars (spec: avoid full Prisma object). `cvSnapshotInput` validator at 5000 chars provides server-side guard.
- **Type consistency:** `ImproveAction` defined in Task 3 hook matches the `z.enum` in Task 2 router. `ScoreResult` interface in Task 4 matches `ai.score` output shape. `CvContent` partial from `ai.generate` matches `cvContentSchema.partial()`.
- **No placeholders:** All code blocks are complete and runnable.
- **Dashboard "create" component:** Task 8 Step 2 uses grep to find the actual file at implementation time, since the exact component name isn't known from exploration — this is intentional to avoid hardcoding a wrong path.
