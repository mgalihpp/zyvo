import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { toCvContent } from "@/features/cv/lib/cv-content";

// Minimal CV doc with legacy/missing fields to prove coercion + defaults.
const baseCv = {
  id: "1",
  userId: "u1",
  title: "My CV",
  templateId: "classic",
  createdAt: new Date(),
  updatedAt: new Date(),
  typography: null,
  colors: null,
  personal: null,
  summary: null,
  experience: [],
  education: [],
  skills: [{ name: "TS", level: "9" }], // legacy out-of-range string level
  interpersonal: [],
  languages: [],
  certifications: [],
  organizations: [],
  projects: [],
  custom: [],
  // biome-ignore lint/suspicious/noExplicitAny: test fixture
} as any;

describe("toCvContent", () => {
  it("passes through title and templateId", () => {
    const c = toCvContent(baseCv);
    assert.equal(c.title, "My CV");
    assert.equal(c.templateId, "classic");
  });

  it("clamps an out-of-range skill level to 5", () => {
    const c = toCvContent(baseCv);
    assert.equal(c.skills[0].level, 5);
  });

  it("defaults a null level to 3", () => {
    const c = toCvContent({ ...baseCv, skills: [{ name: "TS", level: null }] });
    assert.equal(c.skills[0].level, 3);
  });

  it("defaults missing personal fields to empty strings", () => {
    const c = toCvContent(baseCv);
    assert.equal(c.personal.fullName, "");
    assert.equal(c.personal.email, "");
    assert.equal(c.personal.photo, "");
  });

  it("maps a stored photo url through", () => {
    const c = toCvContent({
      ...baseCv,
      personal: { photo: "https://x.ufs.sh/f/abc" },
    });
    assert.equal(c.personal.photo, "https://x.ufs.sh/f/abc");
  });

  it("falls back to schema defaults for null typography/colors", () => {
    const c = toCvContent(baseCv);
    assert.ok(c.typography);
    assert.ok(c.colors.background);
  });
});
