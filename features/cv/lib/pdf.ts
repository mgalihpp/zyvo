import "server-only";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export type ExportFormat = "pdf" | "png";

/**
 * Render the print route at `url` to PDF or PNG bytes using headless Chromium.
 * `cookie` is the caller's raw Cookie header, forwarded so the print route's
 * auth check passes as the same user.
 *
 * Serverless-only: relies on @sparticuz/chromium's bundled binary. Throws a
 * readable error when no executable resolves (e.g. plain local dev).
 */
export async function renderCvDocument({
  url,
  format,
  cookie,
}: {
  url: string;
  format: ExportFormat;
  cookie: string;
}): Promise<Uint8Array> {
  const executablePath = await chromium.executablePath();
  if (!executablePath) {
    throw new Error("Chromium binary not available in this environment");
  }

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: "shell",
  });

  try {
    const page = await browser.newPage();
    // Forward the session cookie so the auth-gated print route authenticates.
    await page.setExtraHTTPHeaders({ cookie });
    await page.goto(url, { waitUntil: "networkidle0" });

    if (format === "png") {
      // A4 width at 96dpi ≈ 794px; full page height captures the whole CV.
      await page.setViewport({ width: 794, height: 1123 });
      const buf = await page.screenshot({ type: "png", fullPage: true });
      return new Uint8Array(buf);
    }

    const buf = await page.pdf({
      format: "a4",
      printBackground: true,
      preferCSSPageSize: false,
    });
    return new Uint8Array(buf);
  } finally {
    await browser.close();
  }
}
