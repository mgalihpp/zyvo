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

console.log("page-breaks: ok");
