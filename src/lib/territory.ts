// ─────────────────────────────────────────────────────────────────────────────
// Territory inference.
//
// Deezer doesn't expose an artist's country, so we infer a home territory from
// the catalog's ISRCs: the first two characters of an ISRC are the country that
// issued the recording. Special distributor prefixes (QM/QZ/… used by DistroKid,
// CD Baby, TuneCore, etc.) aren't real countries — those map to the US, where
// those distributors are based.
// ─────────────────────────────────────────────────────────────────────────────

export const COUNTRY_TO_TERRITORY: Record<string, string> = {
  US: "United States", CA: "Canada", MX: "Mexico",
  GB: "United Kingdom", IE: "Ireland",
  FR: "France", DE: "Germany", IT: "Italy", ES: "Spain", PT: "Portugal",
  NL: "Netherlands", BE: "Belgium", CH: "Switzerland", AT: "Austria",
  SE: "Sweden", DK: "Denmark", NO: "Norway", FI: "Finland",
  PL: "Poland", CZ: "Czech Republic", HU: "Hungary", RU: "Russia",
  BR: "Brazil", AR: "Argentina", CL: "Chile", CO: "Colombia",
  JP: "Japan", KR: "South Korea", CN: "China", IN: "India",
  HK: "Hong Kong", SG: "Singapore", MY: "Malaysia", ID: "Indonesia",
  PH: "Philippines", TW: "Taiwan", AU: "Australia", NZ: "Australia",
  IL: "Israel", ZA: "South Africa",
};

// Non-country ISRC prefixes assigned to international distributors → treat as US.
const DISTRIBUTOR_PREFIXES = new Set(["QM", "QZ", "QT", "QN", "QO", "CP", "DG", "TC", "ZZ", "GX"]);

export function territoryFor(country?: string | null): string {
  return (country && COUNTRY_TO_TERRITORY[country.toUpperCase()]) || "United States";
}

export function territoryFromIsrc(isrc: string): string {
  const cc = isrc.slice(0, 2).toUpperCase();
  if (DISTRIBUTOR_PREFIXES.has(cc)) return "United States";
  return COUNTRY_TO_TERRITORY[cc] || "United States";
}

/** Most common territory across a set of ISRCs (the catalog's "home"). */
export function inferTerritory(isrcs: string[]): string {
  const counts = new Map<string, number>();
  for (const isrc of isrcs) {
    if (!isrc) continue;
    const t = territoryFromIsrc(isrc);
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  let best = "United States";
  let bestN = 0;
  for (const [t, n] of counts) {
    if (n > bestN) {
      best = t;
      bestN = n;
    }
  }
  return best;
}
