"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle2, BarChart3, AlertTriangle, Info } from "lucide-react";

/**
 * Honest, in-product disclosure of what the audit actually verifies, what it
 * estimates, and what it does NOT (yet) check — so nothing is mistaken for a
 * confirmed fact.
 */
export function Methodology() {
  const [open, setOpen] = useState(false);

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      >
        <Info className="h-4 w-4 text-sky-300" />
        <span className="flex-1 text-[14px] font-medium text-white">
          How to read this audit — what&apos;s verified, estimated, and not yet checked
        </span>
        <ChevronDown className={`h-4 w-4 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="grid gap-3 border-t border-white/5 px-4 py-4 sm:grid-cols-3">
          <div className="rounded-lg bg-emerald-500/[0.04] p-3 ring-1 ring-inset ring-emerald-500/15">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> Verified (real data)
            </div>
            <ul className="mt-2 flex flex-col gap-1.5 text-[12.5px] leading-relaxed text-neutral-300">
              <li>
                <span className="text-white">Recordings &amp; ISRCs</span> — pulled live from Deezer (this
                artist&apos;s actual catalog).
              </li>
              <li>
                <span className="text-white">Compositions, ISWCs &amp; songwriters</span> — cross-referenced
                with MusicBrainz where available (sparse for newer artists).
              </li>
            </ul>
          </div>

          <div className="rounded-lg bg-amber-500/[0.04] p-3 ring-1 ring-inset ring-amber-500/15">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-300">
              <BarChart3 className="h-3.5 w-3.5" /> Estimated (directional)
            </div>
            <ul className="mt-2 flex flex-col gap-1.5 text-[12.5px] leading-relaxed text-neutral-300">
              <li>
                <span className="text-white">Per-song earnings</span> — modeled from Deezer&apos;s popularity{" "}
                <span className="font-mono text-[11px]">rank</span>, not real stream counts:
              </li>
              <li className="rounded bg-black/40 px-2 py-1 font-mono text-[11px] text-neutral-400">
                streams ≈ 1.36e-4 × rank^1.885
                <br />$ ≈ streams × $0.0038 × 1.18
              </li>
              <li>Good for relative ranking and ballpark size — not exact dollars.</li>
            </ul>
          </div>

          <div className="rounded-lg bg-rose-500/[0.04] p-3 ring-1 ring-inset ring-rose-500/15">
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5" /> Not yet verified
            </div>
            <ul className="mt-2 flex flex-col gap-1.5 text-[12.5px] leading-relaxed text-neutral-300">
              <li>
                <span className="text-white">PRO / mechanical / neighbouring registration status.</span> We do
                not query ASCAP, BMI, PRS, The MLC or SoundExchange — their public databases block automated
                access.
              </li>
              <li>
                Items marked &ldquo;not verified&rdquo; are prompts to <span className="text-white">check</span>,
                not confirmed gaps. Real verification needs your royalty statements or licensed data access.
              </li>
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
