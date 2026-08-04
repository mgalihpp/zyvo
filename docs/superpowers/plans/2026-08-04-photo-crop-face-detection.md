# Photo Crop Face Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-center the initial crop box on the detected face when a user opens the CV photo crop dialog.

**Architecture:** On image load the dialog shows the default centered crop immediately, then asynchronously runs MediaPipe Face Detection (`@mediapipe/tasks-vision`, WASM) on the loaded image. The detected face center (natural pixels) is converted to rendered-element percentages (accounting for `object-contain` letterboxing) and the existing 80%-wide crop box is repositioned so its center aligns with the face. Detection failure or "no face" silently falls back to the centered crop.

**Tech Stack:** `@mediapipe/tasks-vision` (client-side WASM, CDN-loaded model), `react-image-crop` (already installed), `node:test` via `bun test`, existing Base UI Dialog + `photo-crop-dialog.tsx`.

## Global Constraints

- `@mediapipe/tasks-vision` version pinned to `1.0.1`; wasm loaded from `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm`, model from `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`.
- Client-only code: never import MediaPipe in a server component; use `"use client"` files and lazy `import()`.
- Crop box keeps its default 80% width — only its position shifts. No zoom/rotate changes, no new UI strings.
- All new strings in Indonesian.
- Follow existing patterns: `"use client"`, `cn()` util, `node:test` (`bun test`), biome formatting.
- Bun for installs: `bun add`.
- `detectFaceCenter` and `bboxToPercent` must never throw — every failure path returns `null`.

---

### Task 1: Install @mediapipe/tasks-vision

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependency**

```bash
bun add @mediapipe/tasks-vision@1.0.1
```

- [ ] **Step 2: Verify install**

```bash
bun pm ls | grep tasks-vision
```

Expected: `@mediapipe/tasks-vision` listed with version `1.0.1`.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add @mediapipe/tasks-vision"
```

---

### Task 2: Build face detection utility with pure mapping helper

**Files:**
- Create: `features/cv/lib/face-detection.ts`
- Test: `features/cv/lib/__tests__/face-detection.test.ts`

**Interfaces:**
- Consumes: `@mediapipe/tasks-vision` (lazy `import()`), the bounding box type from its `DetectionResult`.
- Produces:
  - `bboxToPercent(bbox, naturalW, naturalH, renderedW, renderedH): { x: number; y: number } | null` — pure sync helper; maps face center from natural pixels to rendered-element percentages accounting for `object-contain` letterboxing; `null` on any zero dimension.
  - `detectFaceCenter(img, renderedW, renderedH): Promise<{ x: number; y: number } | null>` — async; returns face center as rendered-element % or `null`; never throws.
  - Module-level singleton `faceDetectorPromise: Promise<FaceDetector> | null` — lazily created, cached for reuse across dialog opens.

- [ ] **Step 1: Write the failing test**

Create `features/cv/lib/__tests__/face-detection.test.ts`:

```ts
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { bboxToPercent } from "@/features/cv/lib/face-detection";

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
    assert.deepEqual(out, { x: 30, y: 30 });
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
    assert.deepEqual(out, { x: 55, y: 30 });
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
    assert.deepEqual(out, { x: 27.5, y: 40 });
  });

  it("returns null on zero dimensions", () => {
    assert.equal(bboxToPercent({ originX: 0, originY: 0, width: 0, height: 0 }, 0, 0, 0, 0), null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test features/cv/lib/__tests__/face-detection.test.ts`
Expected: FAIL with module/`bboxToPercent` not found.

- [ ] **Step 3: Write minimal implementation**

Create `features/cv/lib/face-detection.ts`:

```ts
import type { BoundingBox } from "@mediapipe/tasks-vision";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

export type FaceCenter = { x: number; y: number };

export function bboxToPercent(
  bbox: Pick<BoundingBox, "originX" | "originY" | "width" | "height">,
  naturalW: number,
  naturalH: number,
  renderedW: number,
  renderedH: number,
): FaceCenter | null {
  if (naturalW <= 0 || naturalH <= 0 || renderedW <= 0 || renderedH <= 0 || bbox.width <= 0 || bbox.height <= 0) {
    return null;
  }
  const scale = Math.min(renderedW / naturalW, renderedH / naturalH);
  const contentW = naturalW * scale;
  const contentH = naturalH * scale;
  const offsetX = (renderedW - contentW) / 2;
  const offsetY = (renderedH - contentH) / 2;

  const faceCenterX = bbox.originX + bbox.width / 2;
  const faceCenterY = bbox.originY + bbox.height / 2;
  const renderedX = offsetX + faceCenterX * scale;
  const renderedY = offsetY + faceCenterY * scale;

  return { x: (renderedX / renderedW) * 100, y: (renderedY / renderedH) * 100 };
}

let faceDetectorPromise: Promise<unknown> | null = null;

function getFaceDetector(): Promise<unknown> {
  faceDetectorPromise ??= (async () => {
    const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    return FaceDetector.createFromModelPath(fileset, MODEL_URL);
  })();
  return faceDetectorPromise;
}

export async function detectFaceCenter(
  img: HTMLImageElement,
  renderedW: number,
  renderedH: number,
): Promise<FaceCenter | null> {
  try {
    const faceDetector = (await getFaceDetector()) as {
      detect(image: HTMLImageElement): { detections: { boundingBox?: Pick<BoundingBox, "originX" | "originY" | "width" | "height"> }[] };
    };
    const { detections } = faceDetector.detect(img);
    const first = detections[0];
    if (!first?.boundingBox) return null;
    return bboxToPercent(
      first.boundingBox,
      img.naturalWidth,
      img.naturalHeight,
      renderedW,
      renderedH,
    );
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test features/cv/lib/__tests__/face-detection.test.ts`
Expected: 4 pass.

- [ ] **Step 5: Lint**

Run: `bun lint`
Expected: no errors on changed files.

- [ ] **Step 6: Commit**

```bash
git add features/cv/lib/face-detection.ts features/cv/lib/__tests__/face-detection.test.ts
git commit -m "feat: face detection utility for crop centering"
```

---

### Task 3: Auto-center crop on detected face

**Files:**
- Modify: `features/cv/components/panels/photo-crop-dialog.tsx`

**Interfaces:**
- Consumes: `detectFaceCenter(img, renderedW, renderedH): Promise<FaceCenter | null>` from Task 2.
- Produces: on image load, after detection, `crop` state positioned so the 80%-wide crop box is centered on the face. No prop/API changes to `PhotoCropDialog` (`src`, `onCancel`, `onCrop`).

- [ ] **Step 1: Modify onImageLoad to run face detection**

In `features/cv/components/panels/photo-crop-dialog.tsx`:

1. Add import:

```ts
import { detectFaceCenter } from "@/features/cv/lib/face-detection";
```

2. Add a ref guard next to `imgRef`:

```ts
const detectionDoneRef = useRef(false);
```

3. Replace `onImageLoad` with:

```tsx
const onImageLoad = useCallback(
  (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const { width, height } = img;
    setCrop(centerCrop({ unit: "%", width: 80 }, width, height));
    if (detectionDoneRef.current) return;
    detectionDoneRef.current = true;
    const renderedW = img.clientWidth || width;
    const renderedH = img.clientHeight || height;
    void (async () => {
      const center = await detectFaceCenter(img, renderedW, renderedH);
      if (!center) return;
      setCrop((prev) => {
        if (!prev) return prev;
        const halfW = prev.width / 2;
        const halfH = prev.height / 2;
        const x = Math.min(100 - prev.width, Math.max(0, center.x - halfW));
        const y = Math.min(100 - prev.height, Math.max(0, center.y - halfH));
        return { ...prev, x, y };
      });
    })();
  },
  [],
);
```

- [ ] **Step 2: Lint**

Run: `bun lint`
Expected: no errors.

- [ ] **Step 3: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 4: Manual test with `bun dev`**

1. Builder → personal panel → "Unggah foto".
2. Pick a portrait photo with a visible face → dialog opens, crop box appears centered, then glides to center on the face (network fetch of wasm + model first time).
3. Pick a non-face image (landscape/scenery) → crop box stays at image center.
4. Drag/zoom/rotate still work normally; save still uploads and shows round avatar.
5. Pick an image while offline (devtools offline) → dialog behaves as before, crop stays centered, no error UI, no crash.

Expected: all behaviors above.

- [ ] **Step 5: Commit**

```bash
git add features/cv/components/panels/photo-crop-dialog.tsx
git commit -m "feat: auto-center photo crop on detected face"
```

---

### Task 4: Full verification

**Files:**
- No code changes.

- [ ] **Step 1: Run full test suite**

Run: `bun test`
Expected: all existing tests pass (118+ plus the 4 new).

- [ ] **Step 2: Full lint + format check**

Run: `bun lint`
Expected: no errors (pre-existing repo lint issues in unrelated files are out of scope).

- [ ] **Step 3: Production build**

Run: `bun run build`
Expected: builds successfully; MediaPipe must not break the server bundle (it is only `import()`-ed lazily in a client component).

- [ ] **Step 4: Create PR**

```bash
git checkout -b feat/cv-photo-face-detect
git push -u origin feat/cv-photo-face-detect
```

Then open a PR against `main` and squash-merge after Vercel preview passes.
