import { describe, expect, it } from "bun:test";
import { templateDefaultColors } from "./../components/templates/template-colors";
import { cvCreateSchema } from "../schemas/cv";
import { toCvContent } from "./cv-content";

function mockCv(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    userId: "u1",
    title: "CV",
    templateId: "modern",
    typography: null,
    colors: null,
    personal: { fullName: "Budi" },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    interpersonal: [],
    languages: [],
    certifications: [],
    organizations: [],
    projects: [],
    custom: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as never;
}

describe("toCvContent", () => {
  it("falls back to the template default palette when colors are null", () => {
    const content = toCvContent(mockCv());
    expect(content.colors).toEqual(templateDefaultColors("modern"));
  });

  it("preserves explicit stored colors when present", () => {
    const colors = {
      presetId: "custom" as const,
      background: "#ffffff",
      heading: "#000000",
      text: "#333333",
      link: "#111111",
      accent: "#ff0000",
    };
    const content = toCvContent(mockCv({ colors }));
    expect(content.colors.accent).toBe("#ff0000");
  });

  it("falls back to the template default typography when null", () => {
    const content = toCvContent(mockCv());
    expect(content.typography.fontHeading).toBe("inter");
    expect(content.typography.fontBody).toBe("inter");
  });
});

describe("cv create input", () => {
  it("does not inject neutral palette or fonts when only a template is selected", () => {
    const input = cvCreateSchema.parse({ templateId: "modern" });

    expect(input.colors).toBeUndefined();
    expect(input.typography).toBeUndefined();
  });
});
