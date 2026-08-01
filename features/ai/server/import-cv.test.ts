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

  it("drops array items missing required fields instead of failing", () => {
    // experience items missing required company/role
    const raw = JSON.stringify({ experience: [{ location: "Jakarta" }] });
    const result = parseImportedCv(raw);
    expect(result.experience).toEqual([]);
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

  it("recovers from string skill level", () => {
    const result = parseImportedCv(
      JSON.stringify({ skills: [{ name: "Go", level: "4" }] }),
    );
    expect(result.skills?.[0].level).toBe(4);
  });

  it("recovers from text or out-of-range skill level", () => {
    const text = parseImportedCv(
      JSON.stringify({ skills: [{ name: "Go", level: "Expert" }] }),
    );
    const zero = parseImportedCv(
      JSON.stringify({ skills: [{ name: "Go", level: 0 }] }),
    );
    expect(text.skills?.[0].level).toBe(3);
    expect(zero.skills?.[0].level).toBe(3);
  });

  it("recovers from string current", () => {
    const result = parseImportedCv(
      JSON.stringify({
        experience: [{ company: "X", role: "Y", current: "true" }],
      }),
    );
    expect(result.experience?.[0].current).toBe(true);
  });

  it("recovers from null fields and null arrays", () => {
    const personal = parseImportedCv(
      JSON.stringify({ personal: { fullName: null, email: "budi@mail.com" } }),
    );
    const exp = parseImportedCv(JSON.stringify({ experience: null }));
    const item = parseImportedCv(
      JSON.stringify({
        experience: [{ company: "X", role: "Y", location: null }],
      }),
    );
    expect(personal.personal?.email).toBe("budi@mail.com");
    expect(exp.experience).toEqual([]);
    expect(item.experience?.[0].company).toBe("X");
  });

  it("recovers from invalid email", () => {
    const result = parseImportedCv(
      JSON.stringify({ personal: { email: "budi santoso" } }),
    );
    expect(result.personal?.email).toBe("");
  });

  it("drops array items that fail per-item validation", () => {
    const raw = JSON.stringify({
      experience: [
        { company: "", role: "" },
        { company: "PT Maju", role: "Backend", description: "x".repeat(2001) },
        { company: "PT Naik", role: "Engineer" },
      ],
    });
    const result = parseImportedCv(raw);
    expect(result.experience).toHaveLength(1);
    expect(result.experience?.[0].company).toBe("PT Naik");
  });
});
