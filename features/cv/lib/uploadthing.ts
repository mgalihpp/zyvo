import { generateUploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

/** Type-safe UploadThing button bound to `ourFileRouter`. */
export const UploadButton = generateUploadButton<OurFileRouter>();
