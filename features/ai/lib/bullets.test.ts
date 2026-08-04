import { describe, expect, it } from "bun:test";
import { toBulletHtml } from "./bullets";

describe("toBulletHtml", () => {
  it("wraps each line as a bullet, stripping markers", () => {
    expect(
      toBulletHtml("- Rintis fitur A\n• Kelola tim\n* Optimalkan biaya"),
    ).toBe(
      "<ul><li>Rintis fitur A</li><li>Kelola tim</li><li>Optimalkan biaya</li></ul>",
    );
  });

  it("returns input unchanged when there is nothing to wrap", () => {
    expect(toBulletHtml("   ")).toBe("   ");
  });
});
