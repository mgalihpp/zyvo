import type { Metadata } from "next";
import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Pelacak Lamaran",
});

export default function JobTrackerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
