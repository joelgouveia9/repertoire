"use client";

import { Download } from "lucide-react";

export interface EarningRow {
  title: string;
  isrc: string;
  iswc?: string;
  releaseDate?: string;
  estAnnualRoyalty: number;
  writers: string;
  moneyAtRisk: number;
}

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ExportEarnings({ artist, rows }: { artist: string; rows: EarningRow[] }) {
  function download() {
    const header = [
      "Song",
      "ISRC",
      "ISWC",
      "Release Date",
      "Est. Annual Royalty (USD, 100% ownership)",
      "Songwriters",
      "Est. Annual At Risk (USD)",
    ];
    const sorted = [...rows].sort((a, b) => b.estAnnualRoyalty - a.estAnnualRoyalty);
    const lines = [
      header.map(csvCell).join(","),
      ...sorted.map((r) =>
        [r.title, r.isrc, r.iswc ?? "", r.releaseDate ?? "", r.estAnnualRoyalty, r.writers, r.moneyAtRisk]
          .map(csvCell)
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artist.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-earnings.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-[13px] font-medium text-neutral-200 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
    >
      <Download className="h-3.5 w-3.5" />
      Download earnings (CSV)
    </button>
  );
}
