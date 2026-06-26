import Link from "next/link";
import { ArrowRight, Globe2, Search, ShieldAlert, Sparkles } from "lucide-react";
import { listArtists } from "@/lib/seed";
import { auditArtist } from "@/lib/audit";
import { REGISTRIES, territoryCount } from "@/lib/registries";
import { listeners, money } from "@/lib/format";
import { scoreColor } from "@/components/HealthRing";

export default function Home() {
  const artists = listArtists().map((a) => auditArtist(a));
  const territories = territoryCount();

  return (
    <main className="mx-auto max-w-6xl px-6 pb-24">
      {/* Hero */}
      <section className="pt-16 sm:pt-24">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[12px] font-medium text-emerald-300 ring-1 ring-white/10">
          <Sparkles className="h-3.5 w-3.5" />
          Cracking open the music royalty black box
        </div>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl">
          Every song you release is{" "}
          <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">
            leaking money
          </span>{" "}
          somewhere.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-400">
          Repertoire cross-references the world&apos;s royalty organizations — PROs, mechanical
          collectives, and master-rights societies — to check that every track is registered
          correctly, trace it back to the real creators, and flag where the money is flowing to the
          wrong place.
        </p>

        <form action="/find" method="get" className="mt-8 flex max-w-xl gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 focus-within:border-emerald-500/50">
            <Search className="h-4 w-4 text-neutral-500" />
            <input
              name="q"
              placeholder="Search an artist or paste a Spotify link…"
              className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-neutral-600"
            />
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-400">
            Audit <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
          <span>
            Tracking <span className="font-semibold text-neutral-300">{REGISTRIES.length}</span>{" "}
            organizations across <span className="font-semibold text-neutral-300">{territories}</span>{" "}
            territories
          </span>
          <span className="text-neutral-700">·</span>
          <Link href="#artists" className="text-emerald-300 transition-colors hover:text-emerald-200">
            or try a demo catalog
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mt-20 grid gap-4 sm:grid-cols-3">
        <HowCard
          icon={<Search className="h-5 w-5" />}
          step="01"
          title="Pull the catalog"
          body="We take an artist's recordings and their ISRCs straight from streaming, then resolve each to its underlying composition (ISWC)."
        />
        <HowCard
          icon={<Globe2 className="h-5 w-5" />}
          step="02"
          title="Cross-reference the world"
          body="Each song is checked against every relevant PRO, mechanical collective and master-rights society — by work number, IPI and ISWC."
        />
        <HowCard
          icon={<ShieldAlert className="h-5 w-5" />}
          step="03"
          title="Flag the leaks"
          body="Missing registrations, broken splits, duplicates and wrong rightsholders — each quantified by the money it's costing you."
        />
      </section>

      {/* Artists */}
      <section id="artists" className="mt-20 scroll-mt-20">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">Run an audit</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Pick a demo catalog to see the registration health report.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {artists.map((a) => {
            const c = scoreColor(a.score);
            return (
              <Link
                key={a.artist.slug}
                href={`/audit/${a.artist.slug}`}
                className="group flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition-all hover:border-white/15 hover:bg-white/[0.04]"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/5 text-3xl ring-1 ring-white/10">
                  {a.artist.image}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-white">{a.artist.name}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-neutral-400">
                      {a.artist.homeTerritory}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[13px] text-neutral-500">
                    {a.counts.songs} songs · {listeners(a.artist.monthlyListeners ?? 0)} monthly
                    listeners
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[13px]">
                    <span className={`font-semibold ${c.text}`}>{a.score}/100 health</span>
                    {a.totalMoneyAtRisk > 0 && (
                      <span className="text-rose-300">{money(a.totalMoneyAtRisk)}/yr at risk</span>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-300" />
              </Link>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[13px] text-neutral-600">
          Demo catalogs use representative data. Live PRO / DSP connections plug into the same engine.
        </p>
      </section>
    </main>
  );
}

function HowCard({
  icon,
  step,
  title,
  body,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
          {icon}
        </span>
        <span className="text-xs font-semibold text-neutral-600">{step}</span>
      </div>
      <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-400">{body}</p>
    </div>
  );
}
