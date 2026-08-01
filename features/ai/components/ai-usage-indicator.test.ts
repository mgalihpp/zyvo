import { describe, expect, it } from "bun:test";
import { getAiUsageState } from "./ai-usage-indicator-state";

describe("getAiUsageState", () => {
  it("uses indeterminate progress for unlimited quota", () => {
    expect(getAiUsageState({ used: 0, limit: null })).toEqual({
      kind: "unlimited",
      progressValue: null,
    });
  });
});
