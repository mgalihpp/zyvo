# Photo upload with crop — design

## Goal
Let users crop their CV photo before it uploads. Photo field today sends the raw file straight to UploadThing; add a crop step in between.

## Approach
Client-side crop. Selected file becomes an object URL shown inside a Dialog with a free-ratio resizable crop box, zoom slider, and rotate slider. Cropped result is drawn to canvas, converted to a Blob, then uploaded through the existing `cvPhoto` UploadThing route and stored as its URL in the CV store.

- Library: `react-image-crop` — free-ratio resize box, scale, rotation, `cropToCanvas`/`cropToImg` helpers, no extra deps.
- Dialog: existing `components/ui/dialog.tsx`.

## Components
**New: `features/cv/components/panels/photo-crop-dialog.tsx`**
- Props: `src` (object URL), `onCancel`, `onCrop` (receives cropped Blob).
- `ReactCrop` with `aspect={undefined}`, default center crop on image load.
- Zoom slider (scale 0.5–2), rotate slider (0–360).
- Live preview of the cropped result (`cropToImg`).
- "Simpan" button → `cropToCanvas` on a hidden canvas → `canvas.toBlob("image/jpeg")` → `onCrop(blob)`.

**Modified: `features/cv/components/panels/photo-field.tsx`**
- File picked → reject >2MB client-side → create object URL → open crop dialog.
- On crop blob → `startUpload` via existing `useUploadThing("cvPhoto")` → `setPersonal({ photo: url })` (unchanged behavior).
- Cancel/close dialog → revoke object URL, keep old photo.

## Unchanged
- `features/cv/schemas/cv.ts` — `photo` stays a URL string.
- `app/api/uploadthing/core.ts` — `cvPhoto` stays 2MB / 1 file.
- CV store.

## Error handling
- Oversized/non-image file rejected before dialog opens, message shown inline.
- Upload failure shows existing uploading state, keeps previous photo.

## Testing
Manual: crop → preview → upload → round avatar in builder + PDF export. No component test framework in repo.
