import { HelpCircleIcon, MailIcon, SendIcon } from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUPPORT_CONTACT } from "@/features/help/lib/contact";
import { HELP_FAQS } from "@/features/help/lib/faq-data";

export function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Butuh bantuan?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Temukan jawaban pertanyaan umum atau hubungi tim dukungan kami.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Hubungi dukungan</CardTitle>
          <p className="text-sm text-muted-foreground">
            Belum menemukan jawaban? Tim kami siap membantu.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={<Link href={SUPPORT_CONTACT.telegramUrl} target="_blank" />}
          >
            <SendIcon className="size-4" />
            Telegram
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`mailto:${SUPPORT_CONTACT.email}`} />}
          >
            <MailIcon className="size-4" />
            {SUPPORT_CONTACT.email}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Pertanyaan umum</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion>
            {HELP_FAQS.map((faq, i) => (
              <AccordionItem key={faq.q} value={`item-${i}`}>
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <HelpCircleIcon className="size-4" />
        Tips: banyak pertanyaan umum sudah terjawab di FAQ di atas.
      </p>
    </div>
  );
}
