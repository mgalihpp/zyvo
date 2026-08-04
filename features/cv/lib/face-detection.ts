import type { BoundingBox } from "@mediapipe/tasks-vision";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
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
  if (
    naturalW <= 0 ||
    naturalH <= 0 ||
    renderedW <= 0 ||
    renderedH <= 0 ||
    bbox.width <= 0 ||
    bbox.height <= 0
  ) {
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

  return {
    x: (renderedX / renderedW) * 100,
    y: (renderedY / renderedH) * 100,
  };
}

type Detector = {
  detect(image: HTMLImageElement): {
    detections: {
      boundingBox?: Pick<
        BoundingBox,
        "originX" | "originY" | "width" | "height"
      >;
    }[];
  };
};

let faceDetectorPromise: Promise<Detector> | null = null;

function getFaceDetector(): Promise<Detector> {
  faceDetectorPromise ??= (async () => {
    const { FaceDetector, FilesetResolver } = await import(
      "@mediapipe/tasks-vision"
    );
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
    const faceDetector = await getFaceDetector();
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
