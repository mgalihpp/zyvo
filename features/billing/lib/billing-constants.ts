export const BILLING_PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "gratis selamanya",
    monthly: 0,
    yearly: 0,
    cta: "Mulai gratis",
    ctaVariant: "outline" as const,
    ctaNote: "buat CV pertamamu",
    popular: false,
  },
  {
    id: "basic",
    name: "Basic",
    tagline: "untuk pencari kerja aktif",
    monthly: 15000,
    yearly: 150000,
    cta: "Tingkatkan",
    ctaVariant: "default" as const,
    ctaNote: "Batalkan kapan saja",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "untuk pencari kerja serius",
    monthly: 75000,
    yearly: 750000,
    cta: "Tingkatkan",
    ctaVariant: "default" as const,
    ctaNote: "Garansi uang kembali 7 hari",
    popular: true,
  },
] as const;

export type BillingPlanItem = (typeof BILLING_PLANS)[number];
export type BillingPlanItemId = BillingPlanItem["id"];
export type FeatureValue = string | boolean | null;

export const FEATURES: {
  label: string;
  values: Record<BillingPlanItemId, FeatureValue>;
}[] = [
  {
    label: "Unduh PDF",
    values: {
      free: "Tak terbatas",
      basic: "Tak terbatas",
      pro: "Tak terbatas",
    },
  },
  { label: "CV", values: { free: "1", basic: "3", pro: "Tak terbatas" } },
  { label: "Template Premium", values: { free: null, basic: true, pro: true } },
  { label: "Pelacak Lamaran", values: { free: null, basic: true, pro: true } },
  {
    label: "Fitur AI",
    values: { free: "5/bulan", basic: "50/bulan", pro: "Tak terbatas" },
  },
];

export const FAQS = [
  {
    q: "Apakah Zyvo benar-benar gratis?",
    a: "Ya. Paket Gratis kami tidak memerlukan kartu kredit dan gratis selamanya.",
  },
  {
    q: "Apa saja yang termasuk dalam paket Gratis?",
    a: "1 CV, unduhan PDF tak terbatas, dan 5 panggilan AI per bulan.",
  },
  {
    q: "Apa fitur tambahan di paket Basic?",
    a: "Hingga 3 CV, Template Premium, akses ke Pelacak Lamaran, dan 50 panggilan AI per bulan.",
  },
  {
    q: "Apa fitur tambahan di paket Pro?",
    a: "CV tak terbatas, Template Premium, Pelacak Lamaran, dan Fitur AI tanpa batas bulanan.",
  },
  {
    q: "Bisakah saya membatalkan langganan kapan saja?",
    a: "Tentu. Batalkan dari pengaturan akun kapan saja — tanpa pertanyaan.",
  },
  {
    q: "Apa yang terjadi jika paket berbayar saya berakhir atau saya turunkan?",
    a: "Kamu tetap punya akses hingga akhir periode tagihan, lalu kembali ke paket Gratis.",
  },
  {
    q: "Apakah ada garansi uang kembali?",
    a: "Kami menawarkan garansi uang kembali 7 hari untuk semua paket berbayar.",
  },
  {
    q: "Metode pembayaran apa yang didukung?",
    a: "Kami menerima GoPay, QRIS, kartu kredit, dan transfer bank (Virtual Account BCA, Mandiri, BNI, BRI).",
  },
];

const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatPrice(amount: number) {
  if (amount === 0) return "Rp0";
  return IDR.format(amount);
}
