import type { Metadata } from "next";
import type { ReactNode } from "react";
import { constructMetadata } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({ title: "Paket & Harga" });

export default function BillingLayout({ children }: { children: ReactNode }) {
  return children;
}
