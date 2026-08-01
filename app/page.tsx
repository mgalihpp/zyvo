import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Footer } from "@/features/marketing/components/footer";
import { Hero } from "@/features/marketing/components/hero";
import { Navbar } from "@/features/marketing/components/navbar";
import { FAQS } from "@/features/marketing/lib/faq-data";
import { constructMetadata, siteConfig } from "@/lib/seo";

const CtaSection = dynamic(() =>
  import("@/features/marketing/components/cta-section").then(
    (m) => m.CtaSection,
  ),
);
const Faq = dynamic(() =>
  import("@/features/marketing/components/faq").then((m) => m.Faq),
);
const FeaturesGrid = dynamic(() =>
  import("@/features/marketing/components/features-grid").then(
    (m) => m.FeaturesGrid,
  ),
);
const HowItWorks = dynamic(() =>
  import("@/features/marketing/components/how-it-works").then(
    (m) => m.HowItWorks,
  ),
);
const JobTrackerShowcase = dynamic(() =>
  import("@/features/marketing/components/job-tracker-showcase").then(
    (m) => m.JobTrackerShowcase,
  ),
);
const Pricing = dynamic(() =>
  import("@/features/marketing/components/pricing").then((m) => m.Pricing),
);
const TemplatesShowcase = dynamic(() =>
  import("@/features/marketing/components/templates-showcase").then(
    (m) => m.TemplatesShowcase,
  ),
);

export const metadata: Metadata = constructMetadata({
  title: "Zyvo | Buat CV profesional dalam hitungan menit",
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
          <JobTrackerShowcase />
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
