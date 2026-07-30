import { CtaSection } from "@/features/marketing/components/cta-section";
import { Faq } from "@/features/marketing/components/faq";
import { FeaturesGrid } from "@/features/marketing/components/features-grid";
import { Footer } from "@/features/marketing/components/footer";
import { Hero } from "@/features/marketing/components/hero";
import { HowItWorks } from "@/features/marketing/components/how-it-works";
import { Navbar } from "@/features/marketing/components/navbar";
import { Pricing } from "@/features/marketing/components/pricing";
import { TemplatesShowcase } from "@/features/marketing/components/templates-showcase";

export default function Home() {
  return (
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
  );
}
