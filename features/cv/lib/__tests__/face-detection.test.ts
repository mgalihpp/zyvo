import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  bboxToPercent,
  type FaceCenter,
} from "@/features/cv/lib/face-detection";

function assertNear(actual: FaceCenter | null, expected: FaceCenter) {
  assert.ok(actual, "expected a FaceCenter, got null");
  assert.ok(
    Math.abs(actual.x - expected.x) < 1e-9,
    `x ${actual.x} != ${expected.x}`,
  );
  assert.ok(
    Math.abs(actual.y - expected.y) < 1e-9,
    `y ${actual.y} != ${expected.y}`,
  );
}

describe("bboxToPercent", () => {
  it("maps a face center from natural pixels to rendered percentages when aspect matches", () => {
    // Natural 1000x1000, rendered 500x500 (no letterbox): face box at 200..400
    const out = bboxToPercent(
      { originX: 200, originY: 200, width: 200, height: 200 },
      1000,
      1000,
      500,
      500,
    );
    assertNear(out, { x: 30, y: 30 });
  });

  it("accounts for object-contain letterboxing when aspects differ", () => {
    // Natural 1000x2000, rendered 500x500: scale = min(0.5, 0.25) = 0.25,
    // contentW = 250, contentH = 500, offsetX = 125, offsetY = 0
    const out = bboxToPercent(
      { originX: 500, originY: 500, width: 200, height: 200 },
      1000,
      2000,
      500,
      500,
    );
    // face center natural = (600, 600) -> rendered = (125 + 150, 150) = (275, 150)
    // x% = 275/500*100 = 55, y% = 150/500*100 = 30
    assertNear(out, { x: 55, y: 30 });
  });

  it("handles horizontal letterboxing", () => {
    // Natural 2000x1000, rendered 500x500: scale = 0.25, content W 500, H 250,
    // offsetX = (500 - 500)/2 = 0, offsetY = (500 - 250)/2 = 125
    const out = bboxToPercent(
      { originX: 500, originY: 250, width: 100, height: 100 },
      2000,
      1000,
      500,
      500,
    );
    // face center natural = (550, 300) -> rendered = (137.5, 75 + 125 = 200)
    // x% = 27.5, y% = 40
    assertNear(out, { x: 27.5, y: 40 });
  });

  it("returns null on zero dimensions", () => {
    assert.equal(
      bboxToPercent(
        { originX: 0, originY: 0, width: 0, height: 0 },
        0,
        0,
        0,
        0,
      ),
      null,
    );
  });
});
