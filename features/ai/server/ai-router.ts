import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { openrouter } from "@/features/ai/lib/openrouter";
import { checkRateLimit } from "@/features/ai/lib/rate-limit";
import { analyzerSystemPrompt } from "@/features/ai/server/prompts/analyzer";
import { chatSystemPrompt } from "@/features/ai/server/prompts/chat";
import { coverLetterSystemPrompt } from "@/features/ai/server/prompts/cover-letter";
import { generatorSystemPrompt } from "@/features/ai/server/prompts/generator";
import {
  improveActions,
  improverSystemPrompt,
} from "@/features/ai/server/prompts/improver";
import { interviewPrepSystemPrompt } from "@/features/ai/server/prompts/interview-prep";
import { scoreSystemPrompt } from "@/features/ai/server/prompts/score";
import { cvContentSchema } from "@/features/cv/schemas/cv";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

const DEFAULT_MODEL = process.env.DEFAULT_MODEL ?? "openai/gpt-4o";
const DEFAULT_MODEL_MINI =
  process.env.DEFAULT_MODEL_MINI ?? "openai/gpt-4o-mini";

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
        model: DEFAULT_MODEL_MINI,
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
        model: DEFAULT_MODEL_MINI,
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
        model: DEFAULT_MODEL,
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
        model: DEFAULT_MODEL,
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
        model: DEFAULT_MODEL,
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
        model: DEFAULT_MODEL,
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
        model: DEFAULT_MODEL_MINI,
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
