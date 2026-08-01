export type CsvApp = {
  company: string;
  position: string;
  columnName: string;
  jobUrl: string | null;
  location: string | null;
  workType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  appliedAt: Date;
  followUpDate: Date | null;
};

const HEADER =
  "Perusahaan,Posisi,Status,URL,Lokasi,Tipe Kerja,Gaji Min,Gaji Max,Tanggal Lamar,Follow-up";

function cell(value: string | number | null): string {
  if (value === null) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function dateCell(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function applicationsToCsv(apps: CsvApp[]): string {
  const rows = apps.map((a) =>
    [
      cell(a.company),
      cell(a.position),
      cell(a.columnName),
      cell(a.jobUrl),
      cell(a.location),
      cell(a.workType),
      cell(a.salaryMin),
      cell(a.salaryMax),
      dateCell(a.appliedAt),
      dateCell(a.followUpDate),
    ].join(","),
  );
  return [HEADER, ...rows].join("\n");
}
