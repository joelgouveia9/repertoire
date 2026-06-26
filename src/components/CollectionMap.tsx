import { ExternalLink, Globe2, Home } from "lucide-react";
import type { ArtistAudit } from "@/lib/types";
import { buildCollectionMap } from "@/lib/markets";
import { money, moneyFull } from "@/lib/format";

const STREAM_TAG: Record<string, string> = {
  performance: "PRO",
  mechanical: "Mechanical",
  neighbouring: "Neighbouring",
  sync: "Sync",
};

export function CollectionMap({ audit }: { audit: ArtistAudit }) {
  const map = buildCollectionMap(audit);
  if (map.markets.length === 0) return null;

  const max = Math.max(...map.markets.map((m) => m.value));
  const top = map.markets.slice(0, 12);

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2">
        <Globe2 className="h-5 w-5 text-emerald-300" />
        <h2 className="text-lg font-semibold text-white">Where you should be collecting</h2>
      </div>
      <p className="mt-1 max-w-3xl text-sm text-neutral-400">
        Your catalog earns in every market it&apos;s played, but each territory&apos;s royalties are only
        collected if you&apos;re registered with its societies. Here&apos;s the estimated value by market —
        and exactly where to register.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <div className="text-[12px] font-medium text-neutral-400">Est. global royalties / yr</div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums text-white">{moneyFull(map.total)}</div>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
          <div className="text-[12px] font-medium text-rose-300">In markets you&apos;re likely not collecting</div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums text-rose-200">{moneyFull(map.gapValue)}</div>
          <div className="mt-0.5 text-[12px] text-neutral-500">{map.gapCount} territories to register in</div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <div className="text-[12px] font-medium text-emerald-300">Home market</div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums text-emerald-200">{moneyFull(map.homeValue)}</div>
          <div className="mt-0.5 text-[12px] text-neutral-500">{audit.artist.homeTerritory}</div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-white/8">
        {top.map((m, i) => (
          <div
            key={m.territory}
            className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center ${
              i > 0 ? "border-t border-white/5" : ""
            } ${m.status === "home" ? "bg-emerald-500/[0.03]" : "bg-white/[0.01]"}`}
          >
            <div className="flex min-w-0 items-center gap-3 sm:w-56">
              <span className="text-xl">{m.flag}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate text-[14px] font-medium text-white">
                  {m.territory}
                  {m.status === "home" && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                      <Home className="h-2.5 w-2.5" /> Home
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-neutral-500">{moneyFull(m.value)}/yr est.</div>
              </div>
            </div>

            {/* value bar */}
            <div className="hidden flex-1 sm:block">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full ${m.status === "home" ? "bg-emerald-400/70" : "bg-rose-400/60"}`}
                  style={{ width: `${(m.value / max) * 100}%` }}
                />
              </div>
            </div>

            {/* register links */}
            <div className="flex flex-wrap gap-1.5 sm:w-auto sm:justify-end">
              {m.orgs.map((o) => (
                <a
                  key={o.id}
                  href={o.link}
                  target="_blank"
                  rel="noreferrer"
                  title={`${STREAM_TAG[o.type]} — register with ${o.abbr}`}
                  className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[12px] font-medium text-neutral-200 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {o.abbr}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-neutral-600">
        Market values are directional estimates from each territory&apos;s share of global recorded-music
        revenue. International performance royalties may partly reach you via your home PRO&apos;s reciprocal
        agreements, but neighbouring-rights and mechanical income usually require registering directly.
      </p>
    </section>
  );
}
