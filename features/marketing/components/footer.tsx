import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const FOOTER_LINKS: {
  heading: string;
  links: { label: string; href: string }[];
}[] = [
  {
    heading: "Produk",
    links: [
      { label: "Fitur", href: "#fitur" },
      { label: "Template", href: "#template" },
      { label: "Harga", href: "#harga" },
    ],
  },
  {
    heading: "Perusahaan",
    links: [
      { label: "Masuk", href: "/signin" },
      { label: "Daftar", href: "/signup" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Kebijakan Privasi", href: "/privacy" },
      { label: "Syarat & Ketentuan", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <BrandLogo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Buat CV profesional dan ramah ATS dengan bantuan AI.
            </p>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.heading}>
              <h3 className="text-sm font-semibold text-foreground">
                {group.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t pt-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Zyvo. Semua hak dilindungi.
        </div>
      </div>
    </footer>
  );
}
