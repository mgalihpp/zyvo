# Zyvo AI Features — Design Spec

**Date:** 2026-07-30  
**Status:** Approved  
**Stack constraint:** OpenRouter (OpenAI-compatible SDK), tRPC v11, Upstash Redis (rate limiting)

---

## 1. Overview

Zyvo akan menambahkan 7 fitur AI yang diintegrasikan ke dalam alur pembuatan CV yang sudah ada. Arsitektur berbasis tRPC AI Router baru (`features/ai/`) yang konsisten dengan pola existing. UX hybrid: inline toolbar untuk quick actions, chat sidebar untuk analisis kompleks.

---

## 2. Fitur AI — Lengkap

### Tier 1 — Quick Win

**F1: AI Content Improver** *(inline)*  
Tombol ✨ muncul di setiap textarea (headline, experience description, summary, dll). Aksi tersedia: `improve`, `shorten`, `expand`, `formalize`. Output di-stream langsung ke field. Nilai lama disimpan di local state untuk undo.  
- Model: `openai/gpt-4o-mini`  
- Kompleksitas: Rendah | Estimasi: 1–2 minggu  
- Risiko: Hasil terlalu generik → mitigasi: system prompt menyertakan konteks field type + industri user

**F2: AI CV Chat Assistant** *(sidebar)*  
Panel chat di sisi kanan builder. CV snapshot dikirim otomatis sebagai system context. User bisa tanya strategi, minta review naratif, atau paste JD untuk analisis cepat.  
- Model: `openai/gpt-4o`  
- Kompleksitas: Sedang | Estimasi: 2–3 minggu  
- Risiko: Halusinasi fakta → mitigasi: prompt eksplisit "hanya beri saran berdasarkan CV yang diberikan"

### Tier 2 — Core Value

**F3: Job Description Analyzer**  
User paste teks JD ke chat atau modal khusus. AI ekstrak required skills, keywords ATS, dan highlight gap antara CV vs JD. Output: skor kesesuaian (0–100) + rekomendasi spesifik per section.  
- Model: `openai/gpt-4o`  
- Kompleksitas: Sedang | Estimasi: 2–3 minggu  
- Risiko: JD terlalu panjang → mitigasi: truncate ke 3000 token, fokus pada requirements section

**F4: AI CV Score & Feedback**  
Tab "CV Score" di sidebar. Analisis otomatis saat CV disimpan (hook ke autosave). Skor per kategori: ATS Compatibility, Completeness, Impact Language, Section Balance. Render sebagai progress ring + actionable tips.  
- Model: `openai/gpt-4o-mini`  
- Kompleksitas: Rendah-Sedang | Estimasi: 1–2 minggu  
- Risiko: Skor berubah-ubah tiap refresh → mitigasi: cache hasil di Upstash Redis per CV revision hash

### Tier 3 — Differentiator

**F5: Smart CV Generator dari Prompt**  
Modal saat user buat CV baru — pilihan "Generate dengan AI". Form 3 field: nama/bidang/ringkasan pengalaman. AI generate draft CV lengkap, populate Zustand store, redirect ke editor.  
- Model: `openai/gpt-4o`  
- Kompleksitas: Sedang | Estimasi: 2–3 minggu  
- Risiko: Output tidak match schema Zod → mitigasi: structured output / JSON mode, validate dengan Zod sebelum ke store

**F6: Cover Letter Generator**  
Tombol "📝 Cover Letter" di toolbar builder. Input: CV snapshot + JD (opsional) + pilihan tone (formal/casual/creative). Output streaming di modal, bisa copy atau download sebagai .txt/.pdf.  
- Model: `openai/gpt-4o`  
- Kompleksitas: Rendah | Estimasi: 1 minggu  
- Risiko: Cover letter terlalu template-ish → mitigasi: prompt minta AI reference detail spesifik dari CV

**F7: AI Interview Prep**  
Tombol "🎯 Interview Prep" di toolbar builder. Generate 10 pertanyaan interview yang relevan dengan CV + JD, beserta tips menjawab. Output di modal, bisa di-export.  
- Model: `openai/gpt-4o-mini`  
- Kompleksitas: Rendah | Estimasi: 1 minggu  
- Risiko: Pertanyaan terlalu generik → mitigasi: prompt minta pertanyaan spesifik ke role + pengalaman di CV

---

## 3. Prioritas Implementasi

| Urutan | Fitur | Impact | Effort | Alasan |
|--------|-------|--------|--------|--------|
| 1 | F1 AI Content Improver | Tinggi | Rendah | Langsung terasa di semua user, effort minimal |
| 2 | F4 CV Score | Tinggi | Rendah | Nilai jual visual yang kuat, gamification |
| 3 | F2 AI Chat Assistant | Tinggi | Sedang | Engagement tinggi, retensi user |
| 4 | F3 JD Analyzer | Tinggi | Sedang | Diferensiasi dari kompetitor |
| 5 | F6 Cover Letter | Sedang | Rendah | Cross-sell natural dari CV yang sudah ada |
| 6 | F5 Smart Generator | Sedang | Sedang | Akuisisi user baru |
| 7 | F7 Interview Prep | Sedang | Rendah | Upsell / fitur premium kandidat |

---

## 4. Arsitektur Teknis

### Struktur File

```
features/ai/
  server/
    ai-router.ts
    prompts/
      improver.ts
      chat.ts
      analyzer.ts
      score.ts
      generator.ts
      cover-letter.ts
      interview-prep.ts
  hooks/
    use-ai-stream.ts
  components/
    ai-chat-sidebar.tsx
    ai-inline-toolbar.tsx
    ai-score-panel.tsx
    ai-cover-letter-modal.tsx
    ai-interview-modal.tsx
    ai-generator-modal.tsx
  lib/
    openrouter.ts
    cv-snapshot.ts      # serialize Zustand store → string ringkas untuk prompt
```

### OpenRouter Client

```ts
// features/ai/lib/openrouter.ts
import OpenAI from "openai";

export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});
```

### tRPC Procedures

```ts
// features/ai/server/ai-router.ts
ai.improve       // { text, action, fieldType } → streaming string
ai.chat          // { messages[], cvSnapshot } → streaming string
ai.analyzeJD     // { jdText, cvSnapshot } → { score, gaps, recommendations }
ai.score         // { cvSnapshot } → { ats, completeness, impact, balance, tips }
ai.generate      // { prompt } → CvContent (Zod-validated JSON)
ai.coverLetter   // { cvSnapshot, jdText?, tone } → streaming string
ai.interviewPrep // { cvSnapshot, jdText? } → { questions[], tips[] }
```

### Rate Limiting

Wrap setiap prosedur dengan Upstash Redis sliding window:
- Free tier: 20 AI requests / user / jam
- Prosedur mahal (chat, generate): 5 req / user / jam

### CV Snapshot

```ts
// features/ai/lib/cv-snapshot.ts
// Serialize store ke string ringkas, hindari kirim seluruh Prisma object
export function buildSnapshot(cv: CvContent): string { ... }
```

---

## 5. Integrasi ke Komponen Existing

| Komponen | Perubahan |
|----------|-----------|
| `builder-sidebar.tsx` | Tambah tab toggle "AI Chat" |
| `panels/*.tsx` | Wrap `<textarea>` dengan `<AiInlineToolbar>` |
| `dashboard/` | Tambah `<AiGeneratorModal>` saat create new CV |
| `server/trpc/routers/_app.ts` | Mount `aiRouter` |
| `app/(auth)/builder/[cvId]/` | Render `<AiChatSidebar>` + toolbar buttons |
| `.env` | Tambah `OPENROUTER_API_KEY` |

---

## 6. Catatan Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Biaya API tak terduga | Rate limit per user via Upstash, model gpt-4o-mini untuk fitur high-frequency |
| Data CV user terkirim ke pihak ketiga | Jelaskan di Privacy Policy; jangan kirim data sensitif di luar cvSnapshot |
| Streaming gagal di tengah jalan | Tambah error boundary + tombol "Coba lagi" di setiap komponen AI |
| Output AI tidak sesuai schema (F5) | JSON mode + Zod parse, retry otomatis 1x jika gagal |
| Latency tinggi (model besar) | Loading state yang jelas, streaming so user lihat output segera |
