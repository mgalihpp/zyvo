import assert from "node:assert/strict";
import { computePageBreaks } from "../features/cv/lib/page-breaks";

// Konten pendek: tidak ada break.
assert.deepEqual(computePageBreaks([{ top: 0, height: 1000 }]), []);

// Pas satu halaman penuh: tidak ada break.
assert.deepEqual(computePageBreaks([{ top: 0, height: 1123 }]), []);

// Blok kedua nyangkut di tepi halaman -> dipindah utuh ke halaman berikut.
assert.deepEqual(
  computePageBreaks([
    { top: 0, height: 1100 },
    { top: 1100, height: 100 },
  ]),
  [1100],
);

// Blok mengisi dua halaman persis.
assert.deepEqual(
  computePageBreaks([
    { top: 0, height: 1123 },
    { top: 1123, height: 1123 },
  ]),
  [1123],
);

// Blok lebih tinggi dari satu halaman -> potong di kelipatan 1123.
assert.deepEqual(computePageBreaks([{ top: 0, height: 2400 }]), [1123, 2246]);

// Section dipindah utuh ke halaman 2, section berikut mengisi sisa halaman 2.
assert.deepEqual(
  computePageBreaks([
    { top: 0, height: 1050 },
    { top: 1050, height: 200 },
    { top: 1250, height: 900 },
  ]),
  [1050],
);

// --- Guillotine (blok dua kolom yang tumpang tindih vertikal) ---

// Blok sidebar (kiri) dan main (kanan) tumpang tindih: cut harus aman
// untuk KEDUA kolom -> naik ke 1000 (top blok sidebar), bukan 1100.
assert.deepEqual(
  computePageBreaks([
    { top: 0, height: 900 }, // main #1
    { top: 1000, height: 400 }, // sidebar #1 (menghalangi cut 1123)
    { top: 1100, height: 400 }, // main #2 (menghalangi cut 1123 juga)
  ]),
  [1000],
);

// Per-page heights: halaman 1 muat 1083, halaman lanjutan 1043.
assert.deepEqual(
  computePageBreaks(
    [
      { top: 0, height: 1000 },
      { top: 1000, height: 1000 },
      { top: 2000, height: 1000 },
    ],
    { first: 1083, rest: 1043 },
  ),
  [1000, 2000],
);

// Cut yang mundur melewati rantai blok overlapping berantai.
assert.deepEqual(
  computePageBreaks([
    { top: 0, height: 700 },
    { top: 600, height: 500 }, // overlap dengan blok pertama
    { top: 1050, height: 200 }, // overlap dengan blok kedua
  ]),
  [600],
);

console.log("page-breaks: ok");
