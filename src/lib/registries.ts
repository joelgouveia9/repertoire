import type { Registry, RoyaltyStream } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// The world's royalty organizations.
//
// This is the seed of the "cross-reference every PRO" vision. Adding a territory
// = adding rows here, and the audit engine automatically starts requiring and
// checking the `primary` ones for artists who earn there.
//
// Coverage philosophy:
//   • Exactly one society per (territory, stream) is marked `primary` — the one
//     an indie artist there is expected to be registered with. The audit treats
//     primaries as required; everything else is catalogued but optional.
//   • Multi-function societies (e.g. GEMA, JASRAC, APRA AMCOS) appear as separate
//     rows per stream so the engine reasons about each stream independently.
//   • Hubs (ICE, Armonia, Mint) are catalogued with `hub: true` but never primary
//     — they license on behalf of national societies, they aren't the home org.
//
// Names/abbreviations are kept to societies that are well-established; this is the
// index of WHERE to look. The data-source layer (future) does the looking.
// ─────────────────────────────────────────────────────────────────────────────

export const REGISTRIES: Registry[] = [
  // ══ PERFORMANCE RIGHTS ORGANIZATIONS (PROs) ════════════════════════════════
  // North America
  { id: "ascap", name: "American Society of Composers, Authors and Publishers", abbr: "ASCAP", type: "performance", territory: "United States", flag: "🇺🇸", primary: true },
  { id: "bmi", name: "Broadcast Music, Inc.", abbr: "BMI", type: "performance", territory: "United States", flag: "🇺🇸", primary: true },
  { id: "sesac", name: "SESAC", abbr: "SESAC", type: "performance", territory: "United States", flag: "🇺🇸", primary: false, note: "Invitation-only" },
  { id: "gmr", name: "Global Music Rights", abbr: "GMR", type: "performance", territory: "United States", flag: "🇺🇸", primary: false, note: "Invitation-only" },
  { id: "socan", name: "Society of Composers, Authors and Music Publishers of Canada", abbr: "SOCAN", type: "performance", territory: "Canada", flag: "🇨🇦", primary: true },
  { id: "sacm", name: "Sociedad de Autores y Compositores de México", abbr: "SACM", type: "performance", territory: "Mexico", flag: "🇲🇽", primary: true },

  // United Kingdom & Ireland
  { id: "prs", name: "PRS for Music", abbr: "PRS", type: "performance", territory: "United Kingdom", flag: "🇬🇧", primary: true },
  { id: "imro", name: "Irish Music Rights Organisation", abbr: "IMRO", type: "performance", territory: "Ireland", flag: "🇮🇪", primary: true },

  // Western Europe
  { id: "sacem", name: "Société des auteurs, compositeurs et éditeurs de musique", abbr: "SACEM", type: "performance", territory: "France", flag: "🇫🇷", primary: true },
  { id: "gema", name: "Gesellschaft für musikalische Aufführungs- und mechanische Vervielfältigungsrechte", abbr: "GEMA", type: "performance", territory: "Germany", flag: "🇩🇪", primary: true },
  { id: "siae", name: "Società Italiana degli Autori ed Editori", abbr: "SIAE", type: "performance", territory: "Italy", flag: "🇮🇹", primary: true },
  { id: "sgae", name: "Sociedad General de Autores y Editores", abbr: "SGAE", type: "performance", territory: "Spain", flag: "🇪🇸", primary: true },
  { id: "spa", name: "Sociedade Portuguesa de Autores", abbr: "SPA", type: "performance", territory: "Portugal", flag: "🇵🇹", primary: true },
  { id: "buma", name: "Buma", abbr: "BUMA", type: "performance", territory: "Netherlands", flag: "🇳🇱", primary: true },
  { id: "sabam", name: "Société d'Auteurs Belge", abbr: "SABAM", type: "performance", territory: "Belgium", flag: "🇧🇪", primary: true },
  { id: "suisa", name: "SUISA — Cooperative Society of Music Authors and Publishers", abbr: "SUISA", type: "performance", territory: "Switzerland", flag: "🇨🇭", primary: true },
  { id: "akm", name: "Autoren, Komponisten und Musikverleger", abbr: "AKM", type: "performance", territory: "Austria", flag: "🇦🇹", primary: true },

  // Nordics
  { id: "stim", name: "Svenska Tonsättares Internationella Musikbyrå", abbr: "STIM", type: "performance", territory: "Sweden", flag: "🇸🇪", primary: true },
  { id: "koda", name: "KODA", abbr: "KODA", type: "performance", territory: "Denmark", flag: "🇩🇰", primary: true },
  { id: "tono", name: "TONO", abbr: "TONO", type: "performance", territory: "Norway", flag: "🇳🇴", primary: true },
  { id: "teosto", name: "Teosto", abbr: "TEOSTO", type: "performance", territory: "Finland", flag: "🇫🇮", primary: true },

  // Central & Eastern Europe
  { id: "zaiks", name: "Stowarzyszenie Autorów ZAiKS", abbr: "ZAiKS", type: "performance", territory: "Poland", flag: "🇵🇱", primary: true },
  { id: "osa", name: "Ochranný svaz autorský", abbr: "OSA", type: "performance", territory: "Czech Republic", flag: "🇨🇿", primary: true },
  { id: "artisjus", name: "Artisjus", abbr: "Artisjus", type: "performance", territory: "Hungary", flag: "🇭🇺", primary: true },
  { id: "rao", name: "Russian Authors' Society", abbr: "RAO", type: "performance", territory: "Russia", flag: "🇷🇺", primary: true },

  // Latin America
  { id: "ecad", name: "Escritório Central de Arrecadação e Distribuição", abbr: "ECAD", type: "performance", territory: "Brazil", flag: "🇧🇷", primary: true, note: "Central collection office" },
  { id: "sadaic", name: "Sociedad Argentina de Autores y Compositores de Música", abbr: "SADAIC", type: "performance", territory: "Argentina", flag: "🇦🇷", primary: true },
  { id: "scd", name: "Sociedad Chilena del Derecho de Autor", abbr: "SCD", type: "performance", territory: "Chile", flag: "🇨🇱", primary: true },
  { id: "sayco", name: "Sociedad de Autores y Compositores de Colombia", abbr: "SAYCO", type: "performance", territory: "Colombia", flag: "🇨🇴", primary: true },

  // Asia–Pacific
  { id: "jasrac", name: "Japanese Society for Rights of Authors, Composers and Publishers", abbr: "JASRAC", type: "performance", territory: "Japan", flag: "🇯🇵", primary: true },
  { id: "nextone", name: "NexTone", abbr: "NexTone", type: "performance", territory: "Japan", flag: "🇯🇵", primary: false },
  { id: "komca", name: "Korea Music Copyright Association", abbr: "KOMCA", type: "performance", territory: "South Korea", flag: "🇰🇷", primary: true },
  { id: "mcsc", name: "Music Copyright Society of China", abbr: "MCSC", type: "performance", territory: "China", flag: "🇨🇳", primary: true },
  { id: "iprs", name: "Indian Performing Right Society", abbr: "IPRS", type: "performance", territory: "India", flag: "🇮🇳", primary: true },
  { id: "cash", name: "Composers and Authors Society of Hong Kong", abbr: "CASH", type: "performance", territory: "Hong Kong", flag: "🇭🇰", primary: true },
  { id: "compass", name: "Composers and Authors Society of Singapore", abbr: "COMPASS", type: "performance", territory: "Singapore", flag: "🇸🇬", primary: true },
  { id: "macp", name: "Music Authors' Copyright Protection", abbr: "MACP", type: "performance", territory: "Malaysia", flag: "🇲🇾", primary: true },
  { id: "wami", name: "Wahana Musik Indonesia", abbr: "WAMI", type: "performance", territory: "Indonesia", flag: "🇮🇩", primary: true },
  { id: "filscap", name: "Filipino Society of Composers, Authors and Publishers", abbr: "FILSCAP", type: "performance", territory: "Philippines", flag: "🇵🇭", primary: true },
  { id: "must", name: "Music Copyright Society Chinese Taipei", abbr: "MÜST", type: "performance", territory: "Taiwan", flag: "🇹🇼", primary: true },
  { id: "apra", name: "Australasian Performing Right Association", abbr: "APRA", type: "performance", territory: "Australia", flag: "🇦🇺", primary: true, note: "Covers Australia & New Zealand" },

  // Middle East & Africa
  { id: "acum", name: "ACUM — Israeli Music & Copyright Society", abbr: "ACUM", type: "performance", territory: "Israel", flag: "🇮🇱", primary: true },
  { id: "samro", name: "Southern African Music Rights Organisation", abbr: "SAMRO", type: "performance", territory: "South Africa", flag: "🇿🇦", primary: true },

  // ══ MECHANICAL RIGHTS ORGANIZATIONS (MROs) ═════════════════════════════════
  { id: "themlc", name: "The Mechanical Licensing Collective", abbr: "The MLC", type: "mechanical", territory: "United States", flag: "🇺🇸", primary: true },
  { id: "hfa", name: "Harry Fox Agency", abbr: "HFA", type: "mechanical", territory: "United States", flag: "🇺🇸", primary: false },
  { id: "cmrra", name: "Canadian Musical Reproduction Rights Agency", abbr: "CMRRA", type: "mechanical", territory: "Canada", flag: "🇨🇦", primary: true },
  { id: "mcps", name: "Mechanical-Copyright Protection Society", abbr: "MCPS", type: "mechanical", territory: "United Kingdom", flag: "🇬🇧", primary: true },
  { id: "sdrm", name: "Société pour l'administration du droit de reproduction mécanique", abbr: "SDRM", type: "mechanical", territory: "France", flag: "🇫🇷", primary: true, note: "Linked to SACEM" },
  { id: "gema_mech", name: "GEMA (Mechanical)", abbr: "GEMA", type: "mechanical", territory: "Germany", flag: "🇩🇪", primary: true, note: "GEMA collects mechanicals too" },
  { id: "stemra", name: "Stemra", abbr: "STEMRA", type: "mechanical", territory: "Netherlands", flag: "🇳🇱", primary: true },
  { id: "ncb", name: "Nordic Copyright Bureau", abbr: "NCB", type: "mechanical", territory: "Sweden", flag: "🇸🇪", primary: true, note: "Mechanicals for all Nordic territories" },
  { id: "amcos", name: "Australasian Mechanical Copyright Owners Society", abbr: "AMCOS", type: "mechanical", territory: "Australia", flag: "🇦🇺", primary: true },
  { id: "jasrac_mech", name: "JASRAC (Mechanical)", abbr: "JASRAC", type: "mechanical", territory: "Japan", flag: "🇯🇵", primary: true, note: "JASRAC collects mechanicals too" },

  // ══ NEIGHBOURING / MASTER-RECORDING RIGHTS ═════════════════════════════════
  { id: "soundexchange", name: "SoundExchange", abbr: "SoundExchange", type: "neighbouring", territory: "United States", flag: "🇺🇸", primary: true },
  { id: "resound", name: "Re:Sound Music Licensing Company", abbr: "Re:Sound", type: "neighbouring", territory: "Canada", flag: "🇨🇦", primary: true },
  { id: "ppl", name: "Phonographic Performance Limited", abbr: "PPL", type: "neighbouring", territory: "United Kingdom", flag: "🇬🇧", primary: true },
  { id: "ppi", name: "Phonographic Performance Ireland", abbr: "PPI", type: "neighbouring", territory: "Ireland", flag: "🇮🇪", primary: true },
  { id: "spre", name: "Société pour la perception de la rémunération équitable", abbr: "SPRE", type: "neighbouring", territory: "France", flag: "🇫🇷", primary: true },
  { id: "gvl", name: "Gesellschaft zur Verwertung von Leistungsschutzrechten", abbr: "GVL", type: "neighbouring", territory: "Germany", flag: "🇩🇪", primary: true },
  { id: "scf", name: "Società Consortile Fonografici", abbr: "SCF", type: "neighbouring", territory: "Italy", flag: "🇮🇹", primary: true },
  { id: "agedi", name: "Asociación de Gestión de Derechos Intelectuales", abbr: "AGEDI", type: "neighbouring", territory: "Spain", flag: "🇪🇸", primary: true, note: "Producers; AIE collects for performers" },
  { id: "sena", name: "SENA", abbr: "SENA", type: "neighbouring", territory: "Netherlands", flag: "🇳🇱", primary: true },
  { id: "sami", name: "Svenska Artisters och Musikers Intresseorganisation", abbr: "SAMI", type: "neighbouring", territory: "Sweden", flag: "🇸🇪", primary: true },
  { id: "ppca", name: "Phonographic Performance Company of Australia", abbr: "PPCA", type: "neighbouring", territory: "Australia", flag: "🇦🇺", primary: true },
  { id: "riaj", name: "Recording Industry Association of Japan", abbr: "RIAJ", type: "neighbouring", territory: "Japan", flag: "🇯🇵", primary: true },
  { id: "sampra", name: "South African Music Performance Rights Association", abbr: "SAMPRA", type: "neighbouring", territory: "South Africa", flag: "🇿🇦", primary: true },

  // ══ MULTI-TERRITORY LICENSING HUBS ═════════════════════════════════════════
  { id: "ice", name: "ICE Services", abbr: "ICE", type: "performance", territory: "Pan-European", flag: "🇪🇺", primary: false, hub: true, note: "Joint hub: PRS, GEMA, STIM" },
  { id: "armonia", name: "Armonia Online", abbr: "Armonia", type: "performance", territory: "Pan-European", flag: "🇪🇺", primary: false, hub: true, note: "SACEM, SIAE, SGAE & others" },
  { id: "mint", name: "Mint Digital Services", abbr: "Mint", type: "performance", territory: "Pan-European", flag: "🇪🇺", primary: false, hub: true, note: "SUISA & SESAC joint venture" },
];

const byId = new Map(REGISTRIES.map((r) => [r.id, r]));
export const registry = (id: string): Registry | undefined => byId.get(id);

/** Primary registries an artist in a territory is expected to be registered with, per stream. */
export function requiredRegistries(territory: string): Registry[] {
  return REGISTRIES.filter((r) => r.territory === territory && r.primary);
}

/** All registries that collect a given stream in a given territory. */
export function registriesFor(territory: string, stream: RoyaltyStream): Registry[] {
  return REGISTRIES.filter((r) => r.territory === territory && r.type === stream);
}

/** Distinct territories represented (excludes pan-territory hubs). */
export function territoryCount(): number {
  return new Set(REGISTRIES.filter((r) => !r.hub).map((r) => r.territory)).size;
}

export const STREAM_LABELS: Record<RoyaltyStream, string> = {
  performance: "Performance",
  mechanical: "Mechanical",
  neighbouring: "Neighbouring (Master)",
  sync: "Sync",
};

export const STREAM_BLURB: Record<RoyaltyStream, string> = {
  performance: "Radio, streaming, venues, TV — collected by PROs.",
  mechanical: "Reproductions & streaming of the composition — collected by MROs.",
  neighbouring: "The recording's public performance — collected by SoundExchange/PPL.",
  sync: "Film, TV & ad placements — usually licensed directly.",
};
