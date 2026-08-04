# Photo crop auto face detection — design

## Goal
When a user opens the crop dialog for their CV photo, auto-center the initial crop box on the detected face instead of the image center. Face detection is a progressive enhancement: if detection fails or no face is found, the crop box stays centered as today.

## Approach
Client-side face detection with **MediaPipe Face Detection** (`@mediapipe/tasks-vision`, WASM). On image load the dialog first shows the default centered crop (current behavior, stays responsive), then asynchronously detects the face and shifts the still-80%-wide crop box so its center aligns with the face center.

- Library: `@mediapipe/tasks-vision` — WASM, runs fully in browser, no API key/server cost. Model `blaze_face_short_range.tflite` (~250KB) from Google storage, WASM runtime from jsDelivr CDN.
- No changes to schema, UploadThing route, CV store, or `react-image-crop` usage.

## Decisions (confirmed with user)
- Crop box keeps its default size (80% width) — only its **position** shifts to center the face. No zoom change.
- If no face detected → crop stays at image center. No UI warning.
- Model + WASM loaded from CDN (jsDelivr for wasm, Google storage for the .tflite model).
- Timing: show centered crop immediately, then glide to face center when detection completes.

## Components
**New: `features/cv/lib/face-detection.ts`** (client-only utility)
- Lazy-loads and caches a singleton `FaceDetector` so opening the dialog repeatedly doesn't re-initialize.
  - `FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm")`
  - `FaceDetector.createFromModelPath(..., "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite")`
- Exports `detectFaceCenter(img: HTMLImageElement): Promise<{ x: number; y: number } | null>`:
  - Runs `faceDetector.detect(img)`, reads `detections[0].boundingBox`.
  - Converts the face center from natural-image pixels to **rendered-element percentages** via the pure helper below (accounts for `object-contain` letterboxing), returns `{ x, y }` in ReactCrop coordinate space.
  - Returns `null` on no detections, init failure, network error, or `detect()` throwing — never throws.
- Exports pure helper `bboxToPercent(bbox, naturalW, naturalH, renderedW, renderedH): { x: number; y: number } | null`:
  - Computes the rendered content rect within the element (letterboxed `object-contain` box: scale = min(renderedW/naturalW, renderedH/naturalH)), then maps the face center to % of the rendered element.
  - `null` when any dimension is 0.

**Modified: `features/cv/components/panels/photo-crop-dialog.tsx`**
- `onImageLoad`: set the default centered crop (unchanged), then asynchronously:
  - `const center = await detectFaceCenter(img)`, passing the element's `clientWidth`/`clientHeight` as rendered dims.
  - If `center`: reposition the current 80%-wide crop so its center lands on `center` — `x = center.x - 40` (half of 80%), `y = center.y - halfCropHeight%` (half of the crop's current height in %).
  - If `null`: leave the crop as-is.
- Run detection at most once per image (guard with a ref) so manual user adjustments are never overwritten.
- Zoom/rotate sliders, save flow, and preview are unchanged.

## Error handling
- CDN unreachable, WASM/model load failure, or `detect()` throwing → `detectFaceCenter` returns `null` silently; dialog behaves exactly as before (centered crop). No new UI states, no crash.
- This is strictly additive progressive enhancement.

## Testing
Repo uses `node:test` (no component test framework; see existing `features/cv/lib/__tests__/*`).
- Extract the bbox → rendered-% center math as the pure helper `bboxToPercent` in `face-detection.ts` and unit-test it (`features/cv/lib/__tests__/face-detection.test.ts`): given a bounding box and natural+rendered dims, assert the returned center %, including a letterboxed (aspect-mismatched) case and zero-dimension (→ null) case.
- Manual: open crop with a portrait photo → crop box centers on face; open with a non-face image → crop stays centered.

## Unchanged
- `features/cv/schemas/cv.ts`
- `app/api/uploadthing/core.ts`
- `features/cv/stores/cv-store.ts`
- `features/cv/components/panels/photo-field.tsx`
