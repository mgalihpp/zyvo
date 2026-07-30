import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { parseUserAgent } from "@/features/auth/lib/user-agent";

describe("parseUserAgent", () => {
  it("returns a fallback when the UA is missing", () => {
    assert.deepEqual(parseUserAgent(null), {
      os: "Perangkat tidak dikenal",
      browser: "",
    });
  });

  it("detects Chrome on Windows", () => {
    assert.deepEqual(
      parseUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
      ),
      { os: "Windows", browser: "Chrome 150.0.0.0" },
    );
  });

  it("prefers Edge over the Chrome token it also carries", () => {
    assert.equal(
      parseUserAgent(
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0",
      ).browser,
      "Edge 150.0.0.0",
    );
  });

  it("detects Safari on iOS", () => {
    assert.deepEqual(
      parseUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
      ),
      { os: "iOS", browser: "Safari 18.0" },
    );
  });
});
