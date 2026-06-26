import type { ArtistAudit, RoyaltyStream } from "./types";
import { requiredRegistries } from "./registries";
import { registerLink } from "./registry-links";

// ─────────────────────────────────────────────────────────────────────────────
// Global collection map.
//
// Music earns money in every territory it's streamed/played, but each territory's
// royalties are only collected if the rightsholder is registered with that
// territory's societies. This module estimates how much of an artist's income
// flows through each market (using each market's share of global recorded-music
// revenue) and flags the societies they should register with to collect it.
//
// The per-market shares are directional (IFPI-style global market sizing), not
// per-artist play data — labeled as estimates in the UI.
// ─────────────────────────────────────────────────────────────────────────────

/** Approx share of global recorded-music revenue, by territory. Directional. */
export const MARKET_SHARE: Record<string, number> = {
  "United States": 0.41, Japan: 0.10, "United Kingdom": 0.066, Germany: 0.055,
  China: 0.043, France: 0.041, "South Korea": 0.033, Canada: 0.021, Brazil: 0.018,
  Australia: 0.017, Italy: 0.013, Netherlands: 0.012, Spain: 0.011, Sweden: 0.011,
  Mexico: 0.010, India: 0.009, Russia: 0.006, Switzerland: 0.006, Belgium: 0.006,
  Poland: 0.006, Austria: 0.005, Denmark: 0.005, Norway: 0.005, "South Africa": 0.004,
  Finland: 0.004, Ireland: 0.004, Argentina: 0.004, Indonesia: 0.004, Taiwan: 0.003,
  Portugal: 0.003, "Hong Kong": 0.003, Colombia: 0.002, Chile: 0.002, Israel: 0.002,
  Singapore: 0.002, Malaysia: 0.002, Philippines: 0.002, "Czech Republic": 0.002,
  Hungary: 0.002,
};

export type MarketStatus = "home" | "gap";

export interface GapOrg {
  id: string;
  abbr: string;
  flag: string;
  type: RoyaltyStream;
  link: string;
}

export interface GapMarket {
  territory: string;
  flag: string;
  value: number; // estimated annual royalty flowing through this market
  status: MarketStatus;
  orgs: GapOrg[];
}

export interface CollectionMap {
  markets: GapMarket[];
  total: number; // total estimated annual royalty (all markets we model)
  homeValue: number; // value in the artist's home market
  gapValue: number; // value in markets where they likely aren't registered
  gapCount: number; // number of gap markets
}

export function buildCollectionMap(audit: ArtistAudit): CollectionMap {
  const total = audit.totalAnnualRoyalty;
  const home = audit.artist.homeTerritory;

  const markets: GapMarket[] = Object.keys(MARKET_SHARE)
    .map((territory) => {
      // One chip per society — some (e.g. GEMA, JASRAC) collect multiple streams.
      const seen = new Set<string>();
      const orgs = requiredRegistries(territory)
        .filter((r) => !seen.has(r.abbr) && seen.add(r.abbr))
        .map((r) => ({
          id: r.id,
          abbr: r.abbr,
          flag: r.flag,
          type: r.type,
          link: registerLink(r),
        }));
      return {
        territory,
        flag: orgs[0]?.flag ?? "🌐",
        value: Math.round(total * MARKET_SHARE[territory]),
        status: (territory === home ? "home" : "gap") as MarketStatus,
        orgs,
      };
    })
    .filter((m) => m.orgs.length > 0 && m.value > 0)
    .sort((a, b) => b.value - a.value);

  const homeValue = markets.filter((m) => m.status === "home").reduce((s, m) => s + m.value, 0);
  const gapMarkets = markets.filter((m) => m.status === "gap");

  return {
    markets,
    total: markets.reduce((s, m) => s + m.value, 0),
    homeValue,
    gapValue: gapMarkets.reduce((s, m) => s + m.value, 0),
    gapCount: gapMarkets.length,
  };
}
