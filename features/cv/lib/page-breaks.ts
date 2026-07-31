export const A4_PAGE_HEIGHT_PX = 1123;

export interface PageBlock {
  /** Jarak dari top artikel ke top blok (px). */
  top: number;
  /** Tinggi blok (px). */
  height: number;
}

export interface PageHeights {
  /** Tinggi konten yang muat di halaman 1 (px). */
  first: number;
  /** Tinggi konten yang muat di halaman 2+ (px). */
  rest: number;
}

/**
 * Guillotine pagination: memilih posisi cut horizontal yang aman untuk SEMUA
 * blok sekaligus (blok boleh tumpang tindih vertikal — template dua kolom).
 * Kandidat cut di batas halaman digeser NAIK melewati setiap interior blok
 * yang akan terpotong. Blok lebih tinggi dari satu halaman -> hard cut di
 * batas halaman. Mengembalikan posisi y (koordinat konten) awal tiap halaman
 * 2..N.
 */
export function computePageBreaks(
  blocks: PageBlock[],
  heights: number | PageHeights = A4_PAGE_HEIGHT_PX,
): number[] {
  const h: PageHeights =
    typeof heights === "number" ? { first: heights, rest: heights } : heights;
  const end = blocks.reduce((m, b) => Math.max(m, b.top + b.height), 0);
  const breaks: number[] = [];
  let pageStart = 0;
  let usable = h.first;
  while (pageStart + usable < end) {
    const limit = pageStart + usable;
    // Geser cut naik sampai tidak memotong interior blok mana pun.
    let cut = limit;
    let moved = true;
    while (moved) {
      moved = false;
      for (const b of blocks) {
        if (b.top < cut && cut < b.top + b.height && b.top > pageStart) {
          cut = b.top;
          moved = true;
        }
      }
    }
    // Tidak ada cut aman (blok lebih tinggi dari halaman): hard cut di limit.
    if (cut <= pageStart) cut = limit;
    breaks.push(cut);
    pageStart = cut;
    usable = h.rest;
  }
  return breaks;
}
