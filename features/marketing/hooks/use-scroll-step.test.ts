import { describe, expect, test } from "bun:test";
import { stepIndexForProgress } from "./use-scroll-step";

describe("stepIndexForProgress", () => {
  test("clamps out-of-range progress", () => {
    expect(stepIndexForProgress(-1, 3)).toBe(0);
    expect(stepIndexForProgress(2, 3)).toBe(2);
  });

  test("maps progress to step boundaries", () => {
    expect(stepIndexForProgress(0, 3)).toBe(0);
    expect(stepIndexForProgress(0.3333, 3)).toBe(0);
    expect(stepIndexForProgress(0.3334, 3)).toBe(1);
    expect(stepIndexForProgress(0.6666, 3)).toBe(1);
    expect(stepIndexForProgress(0.6667, 3)).toBe(2);
    expect(stepIndexForProgress(1, 3)).toBe(2);
  });

  test("works for two steps", () => {
    expect(stepIndexForProgress(0.5, 2)).toBe(1);
    expect(stepIndexForProgress(0.49, 2)).toBe(0);
  });
});
