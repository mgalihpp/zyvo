import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  passesAA,
  passesAALarge,
  readableOn,
} from "@/features/cv/lib/contrast";
import { PRESETS } from "@/features/cv/lib/color-presets";

describe("hexToRgb", () => {
  it("converts black", () => {
    assert.deepEqual(hexToRgb("#000000"), { r: 0, g: 0, b: 0 });
  });
  it("converts white", () => {
    assert.deepEqual(hexToRgb("#ffffff"), { r: 255, g: 255, b: 255 });
  });
  it("converts a middle color", () => {
    assert.deepEqual(hexToRgb("#1e3a5f"), { r: 30, g: 58, b: 95 });
  });
});

describe("contrastRatio", () => {
  it("black on white = 21", () => {
    assert.ok(Math.abs(contrastRatio("#000000", "#ffffff") - 21) < 1);
  });
  it("white on black = 21", () => {
    assert.ok(Math.abs(contrastRatio("#ffffff", "#000000") - 21) < 1);
  });
  it("same color = 1", () => {
    assert.equal(contrastRatio("#ff0000", "#ff0000"), 1);
  });
});

describe("passesAA", () => {
  it("black on white passes", () => {
    assert.equal(passesAA("#000000", "#ffffff"), true);
  });
  it("light gray on white fails", () => {
    assert.equal(passesAA("#cccccc", "#ffffff"), false);
  });
});

describe("passesAALarge", () => {
  it("black on white passes", () => {
    assert.equal(passesAALarge("#000000", "#ffffff"), true);
  });
  it("moderate gray on white fails", () => {
    assert.equal(passesAALarge("#aaaaaa", "#ffffff"), false);
  });
});

describe("readableOn", () => {
  it("returns white on dark bg", () => {
    assert.equal(readableOn("#000000"), "#ffffff");
  });
  it("returns black on light bg", () => {
    assert.equal(readableOn("#ffffff"), "#000000");
  });
});

describe("all presets pass AA", () => {
  for (const [id, p] of Object.entries(PRESETS)) {
    it(`${id}: text/background passes AA`, () => {
      assert.equal(passesAA(p.text, p.background), true);
    });
    it(`${id}: heading/background passes AA`, () => {
      assert.equal(passesAA(p.heading, p.background), true);
    });
    it(`${id}: link/background passes AA`, () => {
      assert.equal(passesAA(p.link, p.background), true);
    });
  }
});
