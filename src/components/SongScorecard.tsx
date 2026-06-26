"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  Info,
  ArrowRight,
} from "lucide-react";
import type { RoyaltyStream, SongAudit } from "@/lib/types";
import { STREAM_LABELS } from "@/lib/registries";
import { cn, money, moneyFull } from "@/lib/format";
import { scoreColor } from "./HealthRing";

const STREAM_ORDER: RoyaltyStream[] = ["performance", "mechanical", "neighbouring"];

const COVERAGE_STYLE = {
  ok: { icon: CircleCheck, cls: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/20", word: "Registered" },
  partial: { icon: CircleDashed, cls: "text-amber-300 bg-amber-500/10 ring-amber-500/20", word: "Partial" },
  missing: { icon: CircleAlert, cls: "text-rose-300 bg-rose-500/10 ring-rose-500/20", word: "Missing" },
  unknown: { icon: CircleHelp, cls: "text-violet-300 bg-violet-500/10 ring-violet-500/20", word: "Unverified" },
  na: { icon: CircleDashed, cls: "text-neutral-500 bg-white/5 ring-white/10", word: "—" },
} as const;

const SEVERITY_STYLE = {
  critical: { icon: CircleAlert, cls: "text-rose-300", ring: "ring-rose-500/20 bg-rose-500/5" },
  warning: { icon: AlertTriangle, cls: "text-amber-300", ring: "ring-amber-500/20 bg-amber-500/5" },
  info: { icon: Info, cls: "text-sky-300", ring: "ring-sky-500/20 bg-sky-500/5" },
} as const;

export function SongScorecard({ audit }: { audit: SongAudit }) {
  const [open, setOpen] = useState(audit.issues.some((i) => i.severity === "critical"));
  const c = scoreColor(audit.score);
  const { song } = audit;

  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-semibold tabular-nums ring-1 ring-inset",
            c.text,
            c.bg,
            "ring-white/10"
          )}
        >
          {audit.score}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-medium text-white">{song.title}</span>
            {!song.iswc && (
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                no ISWC
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-neutral-500">
            <span className="font-mono">{song.isrc}</span>
            <span>·</span>
            <span>{moneyFull(song.estAnnualRoyalty)}/yr est.</span>
          </div>
        </div>

        {/* Coverage chips */}
        <div className="hidden items-center gap-1.5 sm:flex">
          {STREAM_ORDER.map((s) => {
            const state = audit.coverage[s];
            const st = COVERAGE_STYLE[state];
            const Icon = st.icon;
            return (
              <span
                key={s}
                title={`${STREAM_LABELS[s]}: ${st.word}`}
                className={cn("flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium ring-1 ring-inset", st.cls)}
              >
                <Icon className="h-3 w-3" />
                {STREAM_LABELS[s].split(" ")[0]}
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-3 pl-1">
          {audit.moneyAtRisk > 0 && (
            <span className="text-right text-[13px]">
              <span className="block font-semibold text-rose-300">{money(audit.moneyAtRisk)}</span>
              <span className="block text-[10px] uppercase tracking-wide text-neutral-600">at risk</span>
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-neutral-500 transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3">
          {audit.issues.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-300 ring-1 ring-emerald-500/15">
              <CircleCheck className="h-4 w-4" />
              Fully registered across all required organizations — no issues found.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {audit.issues.map((issue) => {
                const sv = SEVERITY_STYLE[issue.severity];
                const Icon = sv.icon;
                return (
                  <li key={issue.id} className={cn("rounded-lg p-3 ring-1 ring-inset", sv.ring)}>
                    <div className="flex items-start gap-2.5">
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", sv.cls)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-white">{issue.title}</span>
                          {issue.moneyAtRisk > 0 && (
                            <span className="shrink-0 text-[13px] font-semibold text-rose-300">
                              {money(issue.moneyAtRisk)}/yr
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-neutral-400">{issue.detail}</p>
                        <div className="mt-2 flex items-start gap-1.5 text-[13px] text-emerald-300/90">
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{issue.recommendation}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Who's on file — the trace */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TraceBlock title="Songwriters" parties={song.expectedWriters} />
            <TraceBlock title="Publishers" parties={song.expectedPublishers} />
          </div>
        </div>
      )}
    </div>
  );
}

function TraceBlock({
  title,
  parties,
}: {
  title: string;
  parties: { name: string; sharePct?: number; ipi?: string }[];
}) {
  // Only show a percentage total when splits are actually known (demo/statement
  // data has them; MusicBrainz-resolved writers don't carry percentages).
  const hasPct = parties.some((p) => p.sharePct != null);
  const total = parties.reduce((s, p) => s + (p.sharePct ?? 0), 0);
  const off = hasPct && Math.abs(total - 100) > 0.01;
  return (
    <div className="rounded-lg bg-black/30 p-3 ring-1 ring-white/5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{title}</span>
        {hasPct && (
          <span className={cn("text-[11px] font-semibold tabular-nums", off ? "text-rose-300" : "text-neutral-500")}>
            {total}%
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-1">
        {parties.map((p, i) => (
          <li key={i} className="flex items-center justify-between text-[13px]">
            <span className="truncate text-neutral-200">{p.name}</span>
            {p.sharePct != null && <span className="ml-2 tabular-nums text-neutral-500">{p.sharePct}%</span>}
          </li>
        ))}
        {parties.length === 0 && <li className="text-[13px] text-neutral-600">—</li>}
      </ul>
    </div>
  );
}
