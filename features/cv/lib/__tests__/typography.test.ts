import { strict as assert } from "node:assert";
import { test } from "node:test";
import { FONT_REGISTRY } from "@/features/cv/lib/fonts";
import {
  cvContentSchema,
  emptyTypography,
  FONT_IDS,
  typographySchema,
} from "@/features/cv/schemas/cv";

test("emptyTypography parses and matches defaults", () => {
  const parsed = typographySchema.parse(emptyTypography);
  assert.deepEqual(parsed, emptyTypography);
  assert.equal(parsed.fontHeading, "geist");
  assert.equal(parsed.fontBody, "geist");
  assert.equal(parsed.scale, 1);
  assert.equal(parsed.lineHeight, 1.5);
  assert.equal(parsed.letterSpacing, 0);
});

test("typography defaults applied on empty object", () => {
  const parsed = typographySchema.parse({});
  assert.deepEqual(parsed, emptyTypography);
});

test("scale is clamped by range", () => {
  assert.throws(() => typographySchema.parse({ scale: 2 }));
  assert.throws(() => typographySchema.parse({ scale: 0.5 }));
});

test("cvContent gets typography defaults when omitted", () => {
  const cv = cvContentSchema.parse({ title: "X", personal: {} });
  assert.deepEqual(cv.typography, emptyTypography);
});

test("every FONT_ID has a registry entry with a matching cssVar", () => {
  for (const id of FONT_IDS) {
    const entry = FONT_REGISTRY[id];
    assert.ok(entry, `missing registry entry for ${id}`);
    assert.equal(entry.cssVar, `--font-${id}`);
    assert.ok(["sans", "serif", "mono"].includes(entry.category));
  }
});
