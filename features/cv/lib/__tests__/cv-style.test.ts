import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { cvRootStyle } from "@/features/cv/lib/cv-style";
import { colorsSchema, typographySchema } from "@/features/cv/schemas/cv";

const content = {
  typography: typographySchema.parse({}),
  colors: colorsSchema.parse({}),
};

describe("cvRootStyle", () => {
  it("maps colors to the --cv-color-* vars", () => {
    const s = cvRootStyle(content) as Record<string, string>;
    assert.equal(s["--cv-color-bg"], content.colors.background);
    assert.equal(s["--cv-color-accent"], content.colors.accent);
  });

  it("derives an on-accent readable color", () => {
    const s = cvRootStyle(content) as Record<string, string>;
    assert.ok(s["--cv-color-on-accent"]);
  });

  it("scales font-size by typography.scale", () => {
    const s = cvRootStyle(content) as Record<string, string>;
    assert.equal(s.fontSize, `${13 * content.typography.scale}px`);
  });
});
