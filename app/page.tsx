import type { Metadata } from "next";
import { CtaSection } from "@/features/marketing/components/cta-section";
import { Faq } from "@/features/marketing/components/faq";
import { FeaturesGrid } from "@/features/marketing/components/features-grid";
import { Footer } from "@/features/marketing/components/footer";
import { Hero } from "@/features/marketing/components/hero";
import { HowItWorks } from "@/features/marketing/components/how-it-works";
import { Navbar } from "@/features/marketing/components/navbar";
import { Pricing } from "@/features/marketing/components/pricing";
import { TemplatesShowcase } from "@/features/marketing/components/templates-showcase";
import { FAQS } from "@/features/marketing/lib/faq-data";
import { constructMetadata, siteConfig } from "@/lib/seo";

export const metadata: Metadata = constructMetadata({
  title: "Zyvo — CV Impian, dalam Hitungan Menit",
  alternates: { canonical: `${siteConfig.url}/` },
});

const jsonLdWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
};

const jsonLdApp = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: siteConfig.description,
  offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD, no user input
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      <div className="flex flex-1 flex-col bg-background font-sans">
        <Navbar />
        <main className="flex flex-1 flex-col">
          <Hero />
          <FeaturesGrid />
          <HowItWorks />
          <TemplatesShowcase />
          <Pricing />
          <Faq />
          <CtaSection />
        </main>
        <Footer />
      </div>
    </>
  );
}
