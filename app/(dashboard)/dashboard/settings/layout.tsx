import type { Metadata } from "next";
import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({ title: "Pengaturan" });

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
