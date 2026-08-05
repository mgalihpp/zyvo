import { describe, expect, it } from "bun:test";
import { missingRequiredFields } from "./required-fields";

describe("missingRequiredFields", () => {
  it("returns blank required fields, including whitespace-only values", () => {
    expect(
      missingRequiredFields({ company: " ", role: "Frontend Engineer" }, [
        "company",
        "role",
      ]),
    ).toEqual(["company"]);
  });

  it("returns no fields when all required values are filled", () => {
    expect(
      missingRequiredFields({ company: "Acme", role: "Frontend Engineer" }, [
        "company",
        "role",
      ]),
    ).toEqual([]);
  });
});
