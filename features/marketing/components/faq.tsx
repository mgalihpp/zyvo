import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQS } from "@/features/marketing/lib/faq-data";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

export function Faq() {
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-6 py-28">
      <Reveal>
        <SectionHeading eyebrow="FAQ" title="Pertanyaan yang sering diajukan" />
      </Reveal>

      <Reveal delay={80}>
        <Accordion className="mt-12 rounded-xl border bg-card/50 shadow-sm">
          {FAQS.map((faq, i) => (
            <AccordionItem key={faq.q} value={`item-${i}`}>
              <AccordionTrigger className="p-5 text-base font-medium hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="px-5 text-sm/relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}
