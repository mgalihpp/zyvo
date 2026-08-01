import { describe, expect, it } from "bun:test";
import { isPremiumTemplate, PREMIUM_TEMPLATE_IDS } from "./premium-templates";

describe("premium templates", () => {
  it("marks exactly the 4 premium templates", () => {
    expect([...PREMIUM_TEMPLATE_IDS].sort()).toEqual([
      "compact",
      "creative",
      "elegant",
      "executive",
    ]);
  });
  it("free templates and unknown/missing ids are not premium", () => {
    expect(isPremiumTemplate("classic")).toBe(false);
    expect(isPremiumTemplate("minimal")).toBe(false);
    expect(isPremiumTemplate("modern")).toBe(false);
    expect(isPremiumTemplate("fresh-graduate")).toBe(false);
    expect(isPremiumTemplate("professional")).toBe(false);
    expect(isPremiumTemplate("nonexistent")).toBe(false);
    expect(isPremiumTemplate(null)).toBe(false);
    expect(isPremiumTemplate(undefined)).toBe(false);
  });
  it("premium ids are premium", () => {
    expect(isPremiumTemplate("executive")).toBe(true);
  });
});
