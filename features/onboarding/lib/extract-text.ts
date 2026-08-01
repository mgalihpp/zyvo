/**
 * Browser-side text extraction for CV import. pdfjs-dist and mammoth are
 * heavy, so both are loaded via dynamic import only when actually used.
 */

export const MAX_IMPORT_CHARS = 15000;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

/** User-facing extraction failure — `message` is safe to show directly. */
export class ExtractError extends Error {}

const PDF_TYPE = "application/pdf";
const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
    );
  }
  return pages.join("\n\n");
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ExtractError("Ukuran file maksimal 5MB.");
  }

  const isPdf = file.type === PDF_TYPE || file.name.endsWith(".pdf");
  const isDocx = file.type === DOCX_TYPE || file.name.endsWith(".docx");
  if (!isPdf && !isDocx) {
    throw new ExtractError("Format tidak didukung. Gunakan file PDF atau DOCX.");
  }

  const buffer = await file.arrayBuffer();
  const text = isPdf ? await extractPdf(buffer) : await extractDocx(buffer);
  const cleaned = text.replace(/[ \t]+/g, " ").trim();

  if (cleaned.length < 50) {
    throw new ExtractError(
      "Tidak bisa membaca teks dari file ini. Coba paste teks CV kamu langsung.",
    );
  }

  return cleaned.slice(0, MAX_IMPORT_CHARS);
}
