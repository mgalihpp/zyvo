export function improverSystemPrompt(fieldType: string): string {
  return `Kamu adalah asisten CV profesional. Tugasmu adalah memperbaiki teks pada bagian "${fieldType}" CV pengguna.
Ikuti instruksi pengguna dengan tepat. Balas HANYA dengan teks yang diperbaiki — tanpa penjelasan, tanpa tanda kutip, tanpa awalan seperti "Berikut hasilnya:".
Pertahankan bahasa asli (Indonesia atau Inggris). Jangan menambahkan informasi yang tidak ada di teks asli.`;
}

export const improveActions: Record<string, string> = {
  improve: "Perbaiki kalimat agar lebih profesional dan berdampak.",
  shorten: "Persingkat menjadi maksimal 2 kalimat tanpa kehilangan inti.",
  expand: "Kembangkan dengan detail yang lebih spesifik dan kontekstual.",
  formalize: "Ubah ke gaya bahasa formal yang sesuai lingkungan profesional.",
  bulletify:
    "Tulis ulang menjadi daftar poin-poin (bullet) yang ringkas dan berdampak. Satu poin per baris.",
};
