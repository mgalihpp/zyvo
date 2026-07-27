import { strict as assert } from "node:assert";
import { test } from "node:test";
import { emptyTypography } from "@/features/cv/schemas/cv";
import { createCvStore } from "@/features/cv/stores/cv-store";

test("store seeds typography default and setTypography merges + touches", () => {
  const store = createCvStore();
  assert.deepEqual(store.getState().typography, emptyTypography);

  const before = store.getState().revision;
  store.getState().setTypography({ fontHeading: "lora", scale: 1.1 });
  const s = store.getState();

  assert.equal(s.typography.fontHeading, "lora");
  assert.equal(s.typography.scale, 1.1);
  assert.equal(s.typography.fontBody, "geist");
  assert.equal(s.revision, before + 1);
  assert.equal(s.saveStatus, "dirty");
});

test("getContent includes typography", () => {
  const store = createCvStore();
  store.getState().setTypography({ letterSpacing: 0.02 });
  assert.equal(store.getState().getContent().typography.letterSpacing, 0.02);
});
