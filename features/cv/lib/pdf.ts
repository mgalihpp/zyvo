import "server-only";
import { existsSync } from "node:fs";
import chromium from "@sparticuz/chromium-min";
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

// chromium-min ships no binary; download the matching pack tar at runtime.
// Must match the installed @sparticuz/chromium-min version (149). Override via
// env if you self-host the tar closer to the function region.
const REMOTE_CHROMIUM_PACK =
  process.env.CHROMIUM_PACK_URL ??
  "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar";

async function launchOptions(): Promise<LaunchOptions> {
  if (process.env.NODE_ENV === "production") {
    // Downloads + extracts to /tmp on cold start; reuses it on warm starts.
    const executablePath = await chromium.executablePath(REMOTE_CHROMIUM_PACK);
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
 * Production downloads @sparticuz/chromium-min's remote pack tar; local dev falls back
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

    // Tunggu CvPaginator selesai mengukur & membelah halaman (client-side).
    await page.waitForSelector('[data-paginated="true"]', { timeout: 15_000 });

    if (format === "png") {
      // A4 width at 96dpi ≈ 794px; full page height captures the whole CV.
      await page.setViewport({ width: 794, height: 1123 });
      const buf = await page.screenshot({ type: "png", fullPage: true });
      return new Uint8Array(buf);
    }

    // Setiap halaman sudah berupa kotak 794x1123px dari CvPaginator dengan
    // break-after page. Ukuran pdf pakai px yang sama persis (bukan mm) agar
    // tidak ada selisih pembulatan 210mm≈794.6px yang menggeser break.
    const buf = await page.pdf({
      width: "794px",
      height: "1123px",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return new Uint8Array(buf);
  } finally {
    await browser.close();
  }
}
