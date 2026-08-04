import { describe, expect, it } from "bun:test";
import { orderedMainSections } from "../shared";

function baseCv(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sectionOrder: undefined,
    summary: "",
    experience: [],
    education: [],
    projects: [],
    organizations: [],
    custom: [],
    ...overrides,
  } as never;
}

describe("orderedMainSections", () => {
  it("defaults to DEFAULT_SECTION_ORDER when sectionOrder is missing", () => {
    const cv = baseCv({ summary: "x" });
    expect(orderedMainSections(cv)).toEqual(["summary"]);
  });

  it("defaults to DEFAULT_SECTION_ORDER when sectionOrder is an empty array", () => {
    const cv = baseCv({ sectionOrder: [], summary: "x" });
    expect(orderedMainSections(cv)).toEqual(["summary"]);
  });

  it("follows user order", () => {
    const cv = baseCv({
      sectionOrder: ["projects", "summary"],
      summary: "x",
      projects: [{ name: "A" }],
    });
    expect(orderedMainSections(cv)).toEqual(["projects", "summary"]);
  });

  it("drops sections with no content", () => {
    const cv = baseCv({
      sectionOrder: ["education", "summary", "custom"],
      summary: "x",
      education: [{ school: "S" }],
    });
    expect(orderedMainSections(cv)).toEqual(["education", "summary"]);
  });

  it("ignores unknown ids in a stored order", () => {
    const cv = baseCv({
      sectionOrder: ["projects", "bogus", "summary"],
      summary: "x",
      projects: [{ name: "A" }],
    });
    expect(orderedMainSections(cv)).toEqual(["projects", "summary"]);
  });
});
