// ─────────────────────────────────────────────────────────────────────────────
// Domain model for Repertoire — the music-royalty registration audit engine.
//
// The whole point of the platform is to reconcile what SHOULD be true about a
// song (who wrote it, who controls it, who should be paid) against what each
// royalty organization in the world ACTUALLY has on file. These types model
// both sides of that comparison.
// ─────────────────────────────────────────────────────────────────────────────

/** The four kinds of money a single song generates, each collected by different orgs. */
export type RoyaltyStream =
  | "performance" // public performance / broadcast / streaming-performance — PROs (ASCAP, PRS, GEMA…)
  | "mechanical" // reproduction of the composition — MROs (The MLC, MCPS, HFA…)
  | "neighbouring" // the master recording's performance — SoundExchange, PPL…
  | "sync"; // placement in film/TV/ads — usually direct, but tracked here

/** A role a person or company plays on a song. */
export type PartyRole =
  | "writer" // songwriter / composer (owns the composition)
  | "publisher" // administers a writer's share
  | "performer" // featured/contracted performer on the master
  | "master_owner"; // label / artist entity that owns the master recording

/** A royalty organization anywhere in the world. */
export interface Registry {
  id: string; // internal slug
  name: string; // full legal-ish name
  abbr: string; // common abbreviation
  type: RoyaltyStream; // which stream it collects
  territory: string; // ISO-ish territory name
  flag: string; // emoji flag for the UI
  /** True when this org is one most indie artists in `territory` are expected to be registered with. */
  primary: boolean;
  /** A short clarifier (e.g. "performers' collective", "online licensing hub"). */
  note?: string;
  /** Multi-territory licensing hub rather than a national society. */
  hub?: boolean;
}

/** Where the "ground truth" about a song's writers/splits comes from. */
export type GroundTruthSource =
  | "distributor" // metadata delivered to DSPs (DistroKid, CD Baby…) — the default
  | "manual" // the artist typed/confirmed splits themselves
  | "statements"; // parsed from PRO/distributor royalty statements (CSV/CWR)

/** A person/company as identified on a song, with their split. */
export interface Party {
  name: string;
  role: PartyRole;
  /** Interested Party Information number — the global ID for writers/publishers. */
  ipi?: string;
  /** Ownership percentage of their share (writers should total 100, publishers too). */
  sharePct?: number;
}

/** What a single registry actually has on file for a song. */
export interface Registration {
  registryId: string;
  /** The org's internal work/registration number (ISWC is global; this is org-local). */
  workNumber?: string;
  status: "registered" | "pending" | "missing" | "conflict";
  /** The parties this org has on file — compared against the song's expected parties. */
  partiesOnFile?: Party[];
  /** When a conflict exists: a competing registration claiming the same work. */
  conflictNote?: string;
}

/** A single song: the ground truth + every org's view of it. */
export interface Song {
  title: string;
  /** Recording identifier — comes from Spotify/DSPs. Identifies the MASTER. */
  isrc: string;
  /** Work identifier — identifies the COMPOSITION. Missing ISWC is itself a red flag. */
  iswc?: string;
  spotifyId?: string;
  releaseDate?: string;
  /** Territories where this song earns money (drives which registries are required). */
  territories: string[];
  /** Ground truth: who the artist says wrote and controls this song. */
  expectedWriters: Party[];
  expectedPublishers: Party[];
  expectedMasterOwner?: Party;
  /** What each org has on file. */
  registrations: Registration[];
  /**
   * False when we have the recording (e.g. from Spotify) but no connected source
   * of registration data yet — so the audit reports "unverified" rather than
   * fabricating a "missing" status it can't actually confirm.
   */
  registrationsKnown?: boolean;
  /** Rough annual royalty the song generates across all streams (for money-at-risk math). */
  estAnnualRoyalty: number;
  /** Spotify popularity 0–100, when sourced live (used by the royalty model). */
  popularity?: number;
}

export interface Artist {
  slug: string;
  name: string;
  image?: string;
  /** Primary territory of residence — their "home" PRO/MRO live here. */
  homeTerritory: string;
  spotifyUrl?: string;
  spotifyId?: string;
  monthlyListeners?: number;
  followers?: number;
  /** Where the song-level "expected" data came from. */
  groundTruth?: GroundTruthSource;
  /** True when the catalog was pulled live from a public source (vs. seeded demo data). */
  live?: boolean;
  /** Name of the live catalog source, e.g. "MusicBrainz". */
  source?: string;
  songs: Song[];
}

// ── Audit output ─────────────────────────────────────────────────────────────

export type IssueSeverity = "critical" | "warning" | "info";

export type IssueType =
  | "unregistered" // song not registered anywhere
  | "missing_stream" // registered for some streams but missing a required one
  | "no_iswc" // composition has no global work ID
  | "split_mismatch" // writer/publisher shares don't total 100%
  | "party_mismatch" // org has a different rightsholder than expected (money to wrong party)
  | "duplicate" // same work registered more than once
  | "conflict" // competing registration claims the work
  | "unverified"; // recording found, but registration not yet verifiable (no source connected)

export interface Issue {
  id: string;
  songTitle: string;
  isrc: string;
  severity: IssueSeverity;
  type: IssueType;
  title: string;
  detail: string;
  recommendation: string;
  /** Estimated annual money exposed by this issue. */
  moneyAtRisk: number;
  /** Registries involved, for the UI. */
  registryIds: string[];
}

export interface SongAudit {
  song: Song;
  /** 0–100 — how completely and correctly this song is registered. */
  score: number;
  issues: Issue[];
  /** Per-stream coverage state, for the scorecard chips. */
  coverage: Record<RoyaltyStream, "ok" | "partial" | "missing" | "unknown" | "na">;
  moneyAtRisk: number;
}

export interface ArtistAudit {
  artist: Artist;
  songAudits: SongAudit[];
  /** Weighted 0–100 catalog health. */
  score: number;
  totalMoneyAtRisk: number;
  /** Total annual royalty across the catalog (for context). */
  totalAnnualRoyalty: number;
  issues: Issue[];
  counts: {
    songs: number;
    critical: number;
    warning: number;
    info: number;
    fullyClean: number;
  };
}
