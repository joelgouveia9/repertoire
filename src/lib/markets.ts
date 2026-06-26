import type { ArtistAudit, RoyaltyStream } from "./types";
import { registriesFor, registry } from "./registries";
import { registerLink } from "./registry-links";

// ─────────────────────────────────────────────────────────────────────────────
// Global collection plan (reciprocity-aware).
//
// A common myth is that you must register with a PRO in every country to collect
// abroad. You don't. Royalty streams behave very differently across borders:
//
//   • PERFORMANCE — collected worldwide through your home PRO's reciprocal
//     agreements (the CISAC network). Register with ONE home PRO and a play in
//     London/Berlin/Tokyo is collected locally and remitted to you. NOT a
//     per-country gap.
//   • MECHANICAL — largely flows via your home society + publisher, BUT US
//     streaming mechanicals must be claimed directly in The MLC (a notorious
//     indie leak), and you need your home mechanical society.
//   • NEIGHBOURING / MASTER — does NOT fully flow through reciprocal agreements.
//     The US doesn't pay foreign artists for terrestrial radio, digital-only
//     reciprocity is incomplete, and direct registration in major markets
//     captures money that otherwise leaks. This is the real geographic gap.
//
// So we model the plan by STREAM, not by 38 separate countries — which is what
// caused the old map to massively overestimate "missing" money.
// ─────────────────────────────────────────────────────────────────────────────

/** Share of a song's royalties by stream (matches the audit's money model). */
const STREAM_SHARE: Record<RoyaltyStream, number> = {
  performance: 0.45,
  mechanical: 0.2,
  neighbouring: 0.3,
  sync: 0.05,
};

export type Coverage = "reciprocal" | "direct" | "partial";

export interface PlanOrg {
  id: string;
  abbr: string;
  flag: string;
  link: string;
  hint?: string;
}

export interface PlanStream {
  key: RoyaltyStream;
  title: string;
  value: number;
  coverage: Coverage;
  /** Plain-English explanation of how this stream is collected across borders. */
  note: string;
  /** Where to register to capture this stream. */
  orgs: PlanOrg[];
}

export interface CollectionPlan {
  total: number;
  /** Performance value — collected globally via reciprocal once you're in a PRO. */
  reciprocalValue: number;
  /** Mechanical + neighbouring — needs direct registration to fully collect. */
  directActionValue: number;
  streams: PlanStream[];
}

// Major neighbouring-rights societies worth registering with directly (big markets).
const KEY_NEIGHBOURING = ["soundexchange", "ppl", "gvl", "sena", "scf", "ppca"];

function orgsFrom(ids: string[]): PlanOrg[] {
  const seen = new Set<string>();
  const out: PlanOrg[] = [];
  for (const id of ids) {
    const r = registry(id);
    if (!r || seen.has(r.abbr)) continue;
    seen.add(r.abbr);
    out.push({ id: r.id, abbr: r.abbr, flag: r.flag, link: registerLink(r) });
  }
  return out;
}

export function buildCollectionPlan(audit: ArtistAudit): CollectionPlan {
  const total = audit.totalAnnualRoyalty;
  const home = audit.artist.homeTerritory;
  const val = (s: RoyaltyStream) => Math.round(total * STREAM_SHARE[s]);

  // Home-territory primary societies per stream.
  const homePerf = registriesFor(home, "performance").filter((r) => r.primary).map((r) => r.id);
  const homeMech = registriesFor(home, "mechanical").filter((r) => r.primary).map((r) => r.id);
  const homeNeigh = registriesFor(home, "neighbouring").filter((r) => r.primary).map((r) => r.id);

  const streams: PlanStream[] = [
    {
      key: "performance",
      title: "Performance royalties",
      value: val("performance"),
      coverage: "reciprocal",
      note:
        "Collected worldwide through your home PRO's reciprocal agreements — once you're registered with one PRO, plays in every other country are collected locally and paid back to you. You do NOT need to join a PRO in each country.",
      orgs: orgsFrom(homePerf),
    },
    {
      key: "mechanical",
      title: "Mechanical royalties",
      value: val("mechanical"),
      coverage: "direct",
      note:
        "Mostly flows via your home society and publisher, but US streaming mechanicals must be claimed directly in The MLC — one of the most commonly missed sources for independent artists.",
      orgs: orgsFrom([...homeMech, "themlc"]),
    },
    {
      key: "neighbouring",
      title: "Neighbouring & master-recording rights",
      value: val("neighbouring"),
      coverage: "partial",
      note:
        "These don't fully flow through reciprocal agreements — the US doesn't pay foreign artists for terrestrial radio, and digital reciprocity is incomplete. Register with SoundExchange and your home society, and consider direct registration in major markets (UK, Germany, France, Japan) to capture the rest.",
      orgs: orgsFrom([...homeNeigh, ...KEY_NEIGHBOURING]),
    },
  ];

  return {
    total,
    reciprocalValue: val("performance"),
    directActionValue: val("mechanical") + val("neighbouring"),
    streams,
  };
}
