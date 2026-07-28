import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/features/auth/lib/auth";
import { renderCvDocument } from "@/features/cv/lib/pdf";

export const runtime = "nodejs";

const formatSchema = z.enum(["pdf", "png"]).catch("pdf");

/** Sanitize a CV title into a safe filename stem; fall back to "cv". */
function safeName(title: string): string {
  const s = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return s || "cv";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ cvId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { cvId } = await params;
  const { prisma } = await import("@/lib/db");
  const cv = await prisma.cV.findUnique({
    where: { id: cvId },
    select: { userId: true, title: true },
  });
  if (!cv || cv.userId !== session.user.id) {
    return new Response("Not found", { status: 404 });
  }

  const format = formatSchema.parse(
    new URL(req.url).searchParams.get("format"),
  );
  const origin = new URL(req.url).origin;
  const printUrl = `${origin}/builder/${cvId}/print`;
  const cookie = req.headers.get("cookie") ?? "";

  try {
    const bytes = await renderCvDocument({ url: printUrl, format, cookie });
    const ext = format === "pdf" ? "pdf" : "png";
    const type = format === "pdf" ? "application/pdf" : "image/png";
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${safeName(cv.title)}.${ext}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return new Response(message, { status: 500 });
  }
}
