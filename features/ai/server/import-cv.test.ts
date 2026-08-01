import { describe, expect, it } from "bun:test";
import { parseImportedCv } from "./import-cv";

describe("parseImportedCv", () => {
  it("parses a valid AI response and keeps all sections", () => {
    const raw = JSON.stringify({
      personal: { fullName: "Budi Santoso", email: "budi@mail.com" },
      summary: "Backend engineer 5 tahun.",
      experience: [
        {
          company: "PT Maju",
          role: "Backend Engineer",
          startDate: "2020",
          endDate: "2023",
          description: "Membangun API pembayaran.",
        },
      ],
      education: [{ school: "UI", degree: "S1", field: "Ilmu Komputer" }],
      skills: [{ name: "Go", level: 4 }],
      languages: [{ name: "Inggris", level: "Fluent" }],
      certifications: [{ name: "AWS SAA", issuer: "Amazon" }],
      organizations: [{ name: "HMIF", role: "Ketua" }],
      projects: [{ name: "Zyvo", description: "CV builder" }],
      interpersonal: [{ name: "Komunikasi" }],
      custom: [{ title: "Penghargaan", description: "Juara 1 hackathon" }],
    });
    const result = parseImportedCv(raw);
    expect(result.personal?.fullName).toBe("Budi Santoso");
    expect(result.experience).toHaveLength(1);
    expect(result.languages).toHaveLength(1);
    expect(result.certifications).toHaveLength(1);
    expect(result.organizations).toHaveLength(1);
    expect(result.interpersonal).toHaveLength(1);
    expect(result.custom).toHaveLength(1);
  });

  it("derives title from fullName", () => {
    const raw = JSON.stringify({ personal: { fullName: "Budi Santoso" } });
    expect(parseImportedCv(raw).title).toBe("CV Budi Santoso");
  });

  it("falls back to default title when no name detected", () => {
    const raw = JSON.stringify({ summary: "Seorang engineer." });
    expect(parseImportedCv(raw).title).toBe("CV Hasil Import");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseImportedCv("not json")).toThrow();
  });

  it("throws on schema mismatch", () => {
    // experience items missing required company/role
    const raw = JSON.stringify({ experience: [{ location: "Jakarta" }] });
    expect(() => parseImportedCv(raw)).toThrow();
  });

  it("drops unknown fields instead of failing", () => {
    const raw = JSON.stringify({
      summary: "ok",
      hallucinatedSection: [{ foo: "bar" }],
    });
    const result = parseImportedCv(raw);
    expect(result.summary).toBe("ok");
    expect("hallucinatedSection" in result).toBe(false);
  });
});
