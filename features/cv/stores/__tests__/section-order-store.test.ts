import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DEFAULT_SECTION_ORDER } from "@/features/cv/schemas/cv";
import { createCvStore } from "@/features/cv/stores/cv-store";

test("store seeds default section order", () => {
  const store = createCvStore();
  assert.deepEqual(store.getState().sectionOrder, DEFAULT_SECTION_ORDER);
});

test("moveSection reorders, touches, and persists via getContent", () => {
  const store = createCvStore();
  const before = store.getState().revision;

  store.getState().moveSection(1, 3);

  const s = store.getState();
  assert.deepEqual(s.sectionOrder, [
    "summary",
    "education",
    "projects",
    "experience",
    "organizations",
    "custom",
  ]);
  assert.equal(s.revision, before + 1);
  assert.equal(s.saveStatus, "dirty");
  assert.deepEqual(s.getContent().sectionOrder, s.sectionOrder);
});
