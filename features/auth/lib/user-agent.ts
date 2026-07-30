/**
 * Minimal user-agent parsing for the "Perangkat Aktif" list.
 * ponytail: regex table covers mainstream desktop/mobile UAs only — swap in
 * `ua-parser-js` if we ever need exact device models or niche browsers.
 */
const OS: [RegExp, string][] = [
  [/Windows NT/, "Windows"],
  [/Android/, "Android"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Mac OS X/, "macOS"],
  [/Linux/, "Linux"],
];

// Ordered: Edge/Opera also match Chrome, Chrome also matches Safari.
const BROWSERS: [RegExp, string][] = [
  [/Edg\/([\d.]+)/, "Edge"],
  [/OPR\/([\d.]+)/, "Opera"],
  [/Firefox\/([\d.]+)/, "Firefox"],
  [/Chrome\/([\d.]+)/, "Chrome"],
  [/Version\/([\d.]+).*Safari/, "Safari"],
];

export function parseUserAgent(ua: string | null | undefined) {
  const unknown = "Perangkat tidak dikenal";
  if (!ua) return { os: unknown, browser: "" };

  const os = OS.find(([re]) => re.test(ua))?.[1] ?? unknown;

  for (const [re, name] of BROWSERS) {
    const m = re.exec(ua);
    if (m) return { os, browser: `${name} ${m[1]}` };
  }
  return { os, browser: "" };
}
