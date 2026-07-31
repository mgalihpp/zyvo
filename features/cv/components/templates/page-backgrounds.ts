/**
 * Background full-bleed per halaman untuk template sidebar. Dipakai DUA
 * tempat: inline style template (halaman 1 / konten) dan descriptor
 * `pagination.pageBackground` di registry (kotak halaman 2+). Satu konstanta
 * supaya keduanya tidak pernah drift.
 */
export const MODERN_PAGE_BACKGROUND =
  "linear-gradient(to right, var(--cv-color-accent) 34%, var(--cv-color-bg) 34%)";

export const CREATIVE_PAGE_BACKGROUND =
  "linear-gradient(to right, var(--cv-color-accent) 40%, var(--cv-color-bg) 40%)";
