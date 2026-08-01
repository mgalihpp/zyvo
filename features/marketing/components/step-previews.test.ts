import { describe, expect, test } from "bun:test";
import { exportPreviewState } from "./step-previews";

describe("exportPreviewState", () => {
  test("progresses from a selected format through preparation to completion", () => {
    expect(exportPreviewState(0, 2)).toEqual({
      selected: 0,
      status: "selecting",
    });
    expect(exportPreviewState(1, 2)).toEqual({
      selected: 0,
      status: "preparing",
    });
    expect(exportPreviewState(2, 2)).toEqual({
      selected: 0,
      status: "complete",
    });
  });
});
