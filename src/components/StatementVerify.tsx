"use client";

import { useMemo, useState } from "react";
import { Upload, CheckCircle2, CircleAlert, FileText, Info } from "lucide-react";
import { parseStatement, type ParsedStatement, type StatementWork } from "@/lib/statement";
import { normalizeTitle, similarity } from "@/lib/matching";
import { cn, moneyFull } from "@/lib/format";

export interface CatalogSong {
  title: string;
  isrc: string;
  iswc?: string;
  estAnnualRoyalty: number;
}

interface Reconciled {
  song: CatalogSong;
  match?: StatementWork;
  via?: "isrc" | "title";
}

const normIsrc = (s?: string) => (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export function StatementVerify({
  artistName,
  songs,
}: {
  artistName: string;
  artistId: string;
  songs: CatalogSong[];
}) {
  const [parsed, setParsed] = useState<ParsedStatement | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const result = parseStatement(text);
      if (result.works.length === 0) {
        setError("We couldn't find any works in that file. Make sure it's a CSV with a title or ISRC column.");
        setParsed(null);
      } else {
        setParsed(result);
        setFileName(file.name);
      }
    } catch {
      setError("Couldn't read that file. Please upload a CSV.");
    }
  }

  const { reconciled, matchedCount, extra } = useMemo(() => {
    if (!parsed) return { reconciled: [] as Reconciled[], matchedCount: 0, extra: [] as StatementWork[] };

    const byIsrc = new Map<string, StatementWork>();
    const titleIndex = parsed.works.map((w) => ({ w, n: normalizeTitle(w.title) }));
    for (const w of parsed.works) if (w.isrc) byIsrc.set(normIsrc(w.isrc), w);

    const usedStatementRows = new Set<StatementWork>();
    const reconciled: Reconciled[] = songs.map((song) => {
      const byI = byIsrc.get(normIsrc(song.isrc));
      if (byI) {
        usedStatementRows.add(byI);
        return { song, match: byI, via: "isrc" as const };
      }
      const target = normalizeTitle(song.title);
      let best: { w: StatementWork; score: number } | null = null;
      for (const { w, n } of titleIndex) {
        const score = similarity(target, n);
        if (score > 0.85 && (!best || score > best.score)) best = { w, score };
      }
      if (best) {
        usedStatementRows.add(best.w);
        return { song, match: best.w, via: "title" as const };
      }
      return { song };
    });

    const matchedCount = reconciled.filter((r) => r.match).length;
    const extra = parsed.works.filter((w) => !usedStatementRows.has(w));
    return { reconciled, matchedCount, extra };
  }, [parsed, songs]);

  return (
    <div className="mt-6">
      {/* Dropzone */}
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center transition-colors hover:border-emerald-500/40 hover:bg-white/[0.03]"
      >
        <Upload className="h-6 w-6 text-neutral-500" />
        <span className="text-[15px] font-medium text-white">Drop a statement CSV here, or click to choose</span>
        <span className="text-[12px] text-neutral-500">
          Distributor or PRO export with title / ISRC / ISWC columns. Parsed in your browser — nothing is uploaded.
        </span>
        <input
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </label>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-300">
          <CircleAlert className="h-4 w-4" /> {error}
        </p>
      )}

      {parsed && (
        <>
          {/* Summary */}
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <Stat label="In your statement" value={`${parsed.rowCount}`} sub="works found" />
            <Stat
              label="Catalog verified"
              value={`${matchedCount} / ${songs.length}`}
              sub="registered & collecting"
              tone="emerald"
            />
            <Stat label="Not in statement" value={`${songs.length - matchedCount}`} sub="needs checking" tone="amber" />
            <Stat label="Statement total" value={parsed.totalAmount ? moneyFull(parsed.totalAmount) : "—"} sub="royalties listed" />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-neutral-500">
            <FileText className="h-3.5 w-3.5" /> {fileName}
            <span>·</span>
            <span>columns detected: {parsed.detected.join(", ") || "none"}</span>
            {parsed.societies.length > 0 && (
              <>
                <span>·</span>
                <span>societies: {parsed.societies.slice(0, 5).join(", ")}</span>
              </>
            )}
          </div>

          {/* Reconciliation table */}
          <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {artistName} — catalog vs your statement
          </h2>
          <div className="overflow-hidden rounded-xl border border-white/8">
            {reconciled
              .slice()
              .sort((a, b) => Number(!!b.match) - Number(!!a.match) || b.song.estAnnualRoyalty - a.song.estAnnualRoyalty)
              .map((r, i) => (
                <div
                  key={r.song.isrc}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5",
                    i > 0 && "border-t border-white/5",
                    r.match ? "bg-emerald-500/[0.03]" : "bg-rose-500/[0.02]"
                  )}
                >
                  {r.match ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                  ) : (
                    <CircleAlert className="h-4 w-4 shrink-0 text-rose-300" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] text-white">{r.song.title}</div>
                    <div className="font-mono text-[11px] text-neutral-600">{r.song.isrc}</div>
                  </div>
                  <div className="shrink-0 text-right text-[12px]">
                    {r.match ? (
                      <span className="text-emerald-300">
                        Verified{r.match.society ? ` · ${r.match.society}` : ""}
                        {r.via === "title" ? " (title match)" : ""}
                      </span>
                    ) : (
                      <span className="text-rose-300">Not in statement</span>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {extra.length > 0 && (
            <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-sky-300">
                <Info className="h-4 w-4" /> {extra.length} works in your statement aren&apos;t in this catalog
              </div>
              <p className="mt-1 text-[12px] text-neutral-500">
                These could be other releases, alternate titles, or collaborations — worth a look.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "emerald" | "amber";
}) {
  const tcls = tone === "emerald" ? "text-emerald-200" : tone === "amber" ? "text-amber-200" : "text-white";
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <div className="text-[12px] font-medium text-neutral-400">{label}</div>
      <div className={cn("mt-1.5 text-xl font-semibold tabular-nums", tcls)}>{value}</div>
      <div className="mt-0.5 text-[12px] text-neutral-500">{sub}</div>
    </div>
  );
}
