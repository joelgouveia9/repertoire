"use client";

import { useState } from "react";
import {
  Ban,
  Layers,
  Fingerprint,
  Percent,
  UserX,
  Copy,
  AlertOctagon,
  CircleHelp,
  ChevronDown,
  Wrench,
  Droplets,
} from "lucide-react";
import type { ArtistAudit, IssueType } from "@/lib/types";
import { LEAK_GUIDE, ISSUE_TYPE_LABEL } from "@/lib/leak-guide";
import { cn, money, moneyFull } from "@/lib/format";

const ICON: Record<IssueType, typeof Ban> = {
  unregistered: Ban,
  missing_stream: Layers,
  no_iswc: Fingerprint,
  split_mismatch: Percent,
  party_mismatch: UserX,
  duplicate: Copy,
  conflict: AlertOctagon,
  unverified: CircleHelp,
};

// Color by how damaging the leak typically is.
const TONE: Record<IssueType, string> = {
  unregistered: "text-rose-300 bg-rose-500/10 ring-rose-500/20",
  party_mismatch: "text-rose-300 bg-rose-500/10 ring-rose-500/20",
  conflict: "text-rose-300 bg-rose-500/10 ring-rose-500/20",
  split_mismatch: "text-rose-300 bg-rose-500/10 ring-rose-500/20",
  missing_stream: "text-amber-300 bg-amber-500/10 ring-amber-500/20",
  no_iswc: "text-amber-300 bg-amber-500/10 ring-amber-500/20",
  duplicate: "text-amber-300 bg-amber-500/10 ring-amber-500/20",
  unverified: "text-violet-300 bg-violet-500/10 ring-violet-500/20",
};

interface LeakRow {
  type: IssueType;
  money: number;
  songs: number;
}

export function LeakExplainers({ audit }: { audit: ArtistAudit }) {
  // Aggregate issues by type: money at risk + distinct songs affected.
  const byType = new Map<IssueType, { money: number; songs: Set<string> }>();
  for (const issue of audit.issues) {
    const e = byType.get(issue.type) ?? { money: 0, songs: new Set<string>() };
    e.money += issue.moneyAtRisk;
    e.songs.add(issue.isrc);
    byType.set(issue.type, e);
  }
  const rows: LeakRow[] = [...byType.entries()]
    .map(([type, e]) => ({ type, money: e.money, songs: e.songs.size }))
    // Informational-only types with no money and no real problem drop to the bottom.
    .sort((a, b) => b.money - a.money || b.songs - a.songs);

  if (rows.length === 0) return null;

  return (
    <section id="leaks" className="mt-10 scroll-mt-20">
      <div className="flex items-center gap-2">
        <Droplets className="h-5 w-5 text-rose-300" />
        <h2 className="text-lg font-semibold text-white">Where the money leaks — and how to fix it</h2>
      </div>
      <p className="mt-1 max-w-3xl text-sm text-neutral-400">
        Every problem we found in this catalog, explained in plain English — what it is, why it costs you
        money, and the exact steps to plug it.
      </p>

      <div className="mt-4 flex flex-col gap-2.5">
        {rows.map((row, i) => (
          <LeakCard key={row.type} row={row} defaultOpen={i === 0} />
        ))}
      </div>
    </section>
  );
}

function LeakCard({ row, defaultOpen }: { row: LeakRow; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const g = LEAK_GUIDE[row.type];
  const Icon = ICON[row.type];
  const tone = TONE[row.type];

  return (
    <div id={`leak-${row.type}`} className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02] scroll-mt-20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", tone)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium text-white">{ISSUE_TYPE_LABEL[row.type]}</div>
          <div className="mt-0.5 truncate text-[12px] text-neutral-500">
            {row.songs} {row.songs === 1 ? "song" : "songs"} affected
          </div>
        </div>
        {row.money > 0 && (
          <span className="text-right text-[13px]">
            <span className="block font-semibold text-rose-300">{money(row.money)}/yr</span>
            <span className="block text-[10px] uppercase tracking-wide text-neutral-600">at risk</span>
          </span>
        )}
        <ChevronDown className={cn("h-4 w-4 text-neutral-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3.5">
          <p className="text-[14px] leading-relaxed text-neutral-300">{g.what}</p>

          <div className="mt-3 rounded-lg bg-rose-500/[0.05] px-3 py-2.5 ring-1 ring-inset ring-rose-500/15">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-300">Why it costs you</div>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-300">{g.why}</p>
          </div>

          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
              <Wrench className="h-3.5 w-3.5" /> How to fix it
            </div>
            <ol className="mt-2 flex flex-col gap-1.5">
              {g.how.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-neutral-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-300">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {row.money > 0 && (
            <p className="mt-3 text-[12px] text-neutral-500">
              Estimated <span className="font-semibold text-rose-300">{moneyFull(row.money)}/yr</span> at risk across{" "}
              {row.songs} {row.songs === 1 ? "song" : "songs"} from this issue.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
