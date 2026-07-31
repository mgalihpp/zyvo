export const A4_PAGE_HEIGHT_PX = 1123;

export interface PageBlock {
  /** Jarak dari top artikel ke top blok (px). */
  top: number;
  /** Tinggi blok (px). */
  height: number;
}

/**
 * Greedy pagination yang memirror aturan break PDF. `blocks` adalah unit
 * atomik (entri, lead section, container multi-kolom) dalam urutan dokumen,
 * diukur dari top artikel. Blok yang akan melewati batas halaman dipindah
 * utuh ke halaman berikutnya; blok yang lebih tinggi dari satu halaman
 * dipotong di kelipatan tinggi halaman. Mengembalikan posisi y tiap page
 * break. Blok kosong / urutan tidak monoton diabaikan.
 */
export function computePageBreaks(
  blocks: PageBlock[],
  pageHeight = A4_PAGE_HEIGHT_PX,
): number[] {
  const breaks: number[] = [];
  let pageStart = 0;
  for (const b of blocks) {
    const bottom = b.top + b.height;
    if (bottom <= pageStart + pageHeight) continue;
    if (b.height > pageHeight) {
      // Blok lebih tinggi dari satu halaman: potong di SETIAP kelipatan tinggi
      // halaman sampai sisanya muat dalam satu halaman.
      let next = pageStart + pageHeight;
      while (next < bottom) {
        breaks.push(next);
        pageStart = next;
        next = pageStart + pageHeight;
      }
      continue;
    }
    const next = Math.max(b.top, pageStart);
    if (next <= pageStart) continue;
    breaks.push(next);
    pageStart = next;
  }
  return breaks;
}
