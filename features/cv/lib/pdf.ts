import "server-only";
import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer, { type LaunchOptions } from "puppeteer-core";

export type ExportFormat = "pdf" | "png";

// Local dev has no @sparticuz binary (it ships a Linux/serverless build), so
// fall back to a Chrome/Edge already installed on the machine.
const LOCAL_CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

async function launchOptions(): Promise<LaunchOptions> {
  if (process.env.NODE_ENV === "production") {
    const executablePath = await chromium.executablePath();
    if (!executablePath) {
      throw new Error("Chromium binary not available in this environment");
    }
    return { args: chromium.args, executablePath, headless: "shell" };
  }

  const executablePath =
    process.env.CHROME_PATH ?? LOCAL_CHROME_PATHS.find((p) => existsSync(p));
  if (!executablePath) {
    throw new Error(
      "No local Chrome/Edge found. Install Chrome or set CHROME_PATH.",
    );
  }
  return { executablePath, headless: true };
}

/**
 * Render the print route at `url` to PDF or PNG bytes using headless Chromium.
 * `cookie` is the caller's raw Cookie header, forwarded so the print route's
 * auth check passes as the same user.
 *
 * Production uses @sparticuz/chromium's bundled binary; local dev falls back
 * to an installed Chrome/Edge (override with CHROME_PATH).
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
  const browser = await puppeteer.launch(await launchOptions());

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

    // Single continuous page: A4 width, height = actual content height, so the
    // whole CV lands on one long page instead of being split across A4 sheets.
    // Measure at A4 pixel width (210mm ≈ 794px @96dpi) so wrapping matches the
    // PDF layout and the height is accurate.
    await page.setViewport({ width: 794, height: 1123 });
    const heightPx = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>("[data-print-root]");
      return Math.ceil((el ?? document.body).getBoundingClientRect().height);
    });
    const buf = await page.pdf({
      width: "210mm",
      // 96dpi: 1px = 1/96in; +2px guards against sub-pixel rounding overflow.
      height: `${(heightPx + 2) / 96}in`,
      printBackground: true,
      preferCSSPageSize: false,
      pageRanges: "1",
    });
    return new Uint8Array(buf);
  } finally {
    await browser.close();
  }
}
