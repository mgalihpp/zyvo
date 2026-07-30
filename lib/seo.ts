import type { Metadata } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const siteConfig = {
  name: "Zyvo",
  url: baseUrl,
  description:
    "Buat CV profesional dan ramah ATS dengan bantuan AI. Gratis, cepat, dan mudah digunakan.",
  ogImage: `${baseUrl}/hero.png`,
  twitterHandle: "@zyvo_id",
} as const;

export function constructMetadata(overrides: Partial<Metadata> = {}): Metadata {
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.name} — CV Impian, dalam Hitungan Menit`,
      template: `%s · ${siteConfig.name}`,
    },
    description: siteConfig.description,
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: `${siteConfig.name} — CV Impian, dalam Hitungan Menit`,
      description: siteConfig.description,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: "Zyvo — Pembuat CV AI",
        },
      ],
      url: siteConfig.url,
      locale: "id_ID",
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteConfig.name} — CV Impian, dalam Hitungan Menit`,
      description: siteConfig.description,
      images: [siteConfig.ogImage],
      creator: siteConfig.twitterHandle,
    },
    robots: { index: true, follow: true },
    alternates: { canonical: siteConfig.url },
    ...overrides,
  };
}
