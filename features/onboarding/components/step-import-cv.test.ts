import { describe, expect, test } from "bun:test";
import {
  getImportStageState,
  type ImportPhase,
  shouldWarnBeforeUnload,
} from "./step-import-cv";

const stages = ["reading", "analyzing", "creating"] as const;

describe("getImportStageState", () => {
  test.each([
    ["reading", ["active", "upcoming", "upcoming"]],
    ["analyzing", ["complete", "active", "upcoming"]],
    ["creating", ["complete", "complete", "active"]],
  ] as const)("maps %s to ordered stage states", (phase, expected) => {
    const actual = stages.map((stage) => getImportStageState(phase, stage));
    expect(actual).toEqual([...expected]);
  });

  test("accepts every busy import phase", () => {
    const phase: Exclude<ImportPhase, "idle"> = "reading";
    expect(getImportStageState(phase, "reading")).toBe("active");
  });
});

describe("shouldWarnBeforeUnload", () => {
  test("warns during every active import phase", () => {
    expect(shouldWarnBeforeUnload("reading")).toBe(true);
    expect(shouldWarnBeforeUnload("analyzing")).toBe(true);
    expect(shouldWarnBeforeUnload("creating")).toBe(true);
  });

  test("does not warn while idle", () => {
    expect(shouldWarnBeforeUnload("idle")).toBe(false);
  });
});
