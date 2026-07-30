import { headers } from "next/headers";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/features/auth/lib/auth";

const f = createUploadthing();

/** UploadThing file routes. `cvPhoto` backs the CV profile photo field. */
export const ourFileRouter = {
  cvPhoto: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session?.user) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
