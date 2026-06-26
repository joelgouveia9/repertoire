import type {
  Artist,
  ArtistAudit,
  Issue,
  Party,
  RoyaltyStream,
  Song,
  SongAudit,
} from "./types";
import { registriesFor, registry, requiredRegistries } from "./registries";

// ─────────────────────────────────────────────────────────────────────────────
// The audit engine.
//
// For each song we compare the artist's ground truth against every relevant
// registry and surface concrete, money-quantified problems. This is the logic
// that turns "the royalty black box" into a checklist.
//
// Money-at-risk model: each song has an estimated annual royalty, split across
// the four streams by typical industry weighting. A fully-broken registration on
// a stream risks that stream's whole share; a softer issue (e.g. wrong split)
// risks a fraction.
// ─────────────────────────────────────────────────────────────────────────────

/** Rough share of a song's total royalties by stream. */
const STREAM_WEIGHT: Record<RoyaltyStream, number> = {
  performance: 0.45,
  mechanical: 0.2,
  neighbouring: 0.3,
  sync: 0.05,
};

/** Streams we actively check registration for (sync is direct-licensed, not collected). */
const CHECKED_STREAMS: RoyaltyStream[] = ["performance", "mechanical", "neighbouring"];

const round = (n: number) => Math.round(n);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function sharePctTotal(parties: Party[]): number {
  return sum(parties.map((p) => p.sharePct ?? 0));
}

/** Do the parties an org has on file match what the artist expects? */
function partiesMatch(expected: Party[], onFile: Party[]): boolean {
  if (onFile.length === 0) return false;
  const expectedNames = new Set(expected.map((p) => p.name.toLowerCase()));
  // A mismatch = the org lists a controlling party the artist never named.
  return onFile.every((p) => expectedNames.has(p.name.toLowerCase()));
}

type Coverage = "ok" | "partial" | "missing" | "unknown" | "na";

export function auditSong(song: Song): SongAudit {
  // Live recordings with no connected registration source: we can SEE the song
  // but can't yet confirm how it's registered. Report honest uncertainty.
  if (song.registrationsKnown === false) return auditUnverifiedSong(song);

  const issues: Issue[] = [];
  const coverage: Record<RoyaltyStream, Coverage> = {
    performance: "na",
    mechanical: "na",
    neighbouring: "na",
    sync: "na",
  };

  const regOf = (id: string) => song.registrations.find((r) => r.registryId === id);
  const annual = song.estAnnualRoyalty;
  const mk = (s: Omit<Issue, "songTitle" | "isrc">): Issue => ({
    ...s,
    songTitle: song.title,
    isrc: song.isrc,
  });

  // ── 1. No global work ID (ISWC) — the song can't be reliably matched anywhere.
  if (!song.iswc) {
    issues.push(
      mk({
        id: `${song.isrc}-no-iswc`,
        severity: "warning",
        type: "no_iswc",
        title: "No ISWC assigned",
        detail:
          "This composition has no ISWC (the global work identifier). Without it, societies in different territories can't reliably match the same song, which causes mismatched and missed payments.",
        recommendation:
          "Register the work with your home PRO to have an ISWC issued, then propagate it to all other registrations.",
        moneyAtRisk: round(annual * 0.1),
        registryIds: [],
      })
    );
  }

  // ── 2. Split integrity — writer & publisher shares must each total 100%.
  const writerTotal = sharePctTotal(song.expectedWriters);
  if (song.expectedWriters.length > 0 && Math.abs(writerTotal - 100) > 0.01) {
    issues.push(
      mk({
        id: `${song.isrc}-writer-split`,
        severity: "critical",
        type: "split_mismatch",
        title: `Writer splits total ${writerTotal}%, not 100%`,
        detail: `The writers on file add up to ${writerTotal}%. Societies will hold (or refuse to pay) royalties on a work whose shares don't reconcile to 100%.`,
        recommendation:
          "Reconcile the writer splits with all co-writers and correct the registration so shares total exactly 100%.",
        moneyAtRisk: round(annual * STREAM_WEIGHT.performance * 0.5),
        registryIds: [],
      })
    );
  }

  // ── 3. Per-stream registration coverage across required registries.
  for (const stream of CHECKED_STREAMS) {
    const orgs = registriesFor(song.territories[0], stream).filter((r) => r.primary);
    if (orgs.length === 0) {
      coverage[stream] = "na";
      continue;
    }
    const states = orgs.map((o) => regOf(o.id)?.status ?? "missing");
    const registered = states.filter((s) => s === "registered").length;

    if (registered === 0) coverage[stream] = "missing";
    else if (registered < orgs.length) coverage[stream] = "partial";
    else coverage[stream] = "ok";

    // A missing required stream registration risks that whole stream.
    if (coverage[stream] === "missing") {
      const exposure = round(annual * STREAM_WEIGHT[stream]);
      issues.push(
        mk({
          id: `${song.isrc}-missing-${stream}`,
          severity: stream === "performance" ? "critical" : "warning",
          type: "missing_stream",
          title: `Not registered for ${streamWord(stream)} royalties`,
          detail: `No ${streamWord(stream)} registration found with ${orgs
            .map((o) => o.abbr)
            .join(" or ")}. That income stream is currently uncollected.`,
          recommendation: `Register this work for ${streamWord(stream)} royalties with ${orgs[0].abbr}${
            orgs[1] ? ` (or ${orgs[1].abbr})` : ""
          }.`,
          moneyAtRisk: exposure,
          registryIds: orgs.map((o) => o.id),
        })
      );
    }
  }

  // ── 4. Conflicts, duplicates, and wrong-rightsholder on existing registrations.
  for (const reg of song.registrations) {
    const org = registry(reg.registryId);
    if (!org) continue;

    if (reg.status === "conflict") {
      issues.push(
        mk({
          id: `${song.isrc}-conflict-${reg.registryId}`,
          severity: "critical",
          type: "conflict",
          title: `Conflicting registration at ${org.abbr}`,
          detail:
            reg.conflictNote ??
            `${org.abbr} shows a competing claim on this work. Conflicting registrations freeze payments until resolved.`,
          recommendation: `Open a dispute with ${org.abbr} to resolve the competing claim and release held royalties.`,
          moneyAtRisk: round(annual * STREAM_WEIGHT[org.type]),
          registryIds: [org.id],
        })
      );
      continue;
    }

    // Wrong rightsholder — org is paying someone the artist never named.
    if (
      reg.status === "registered" &&
      reg.partiesOnFile &&
      reg.partiesOnFile.length > 0 &&
      !partiesMatch([...song.expectedWriters, ...song.expectedPublishers], reg.partiesOnFile)
    ) {
      const stranger = reg.partiesOnFile.find(
        (p) =>
          ![...song.expectedWriters, ...song.expectedPublishers]
            .map((e) => e.name.toLowerCase())
            .includes(p.name.toLowerCase())
      );
      issues.push(
        mk({
          id: `${song.isrc}-party-${reg.registryId}`,
          severity: "critical",
          type: "party_mismatch",
          title: `${org.abbr} is paying the wrong party`,
          detail: `${org.abbr} lists "${stranger?.name ?? "an unknown party"}" as a rightsholder on this work — not someone you've named. Money is flowing to the wrong place.`,
          recommendation: `Challenge the registration at ${org.abbr} with proof of authorship to redirect the share to the correct rightsholder.`,
          moneyAtRisk: round(annual * STREAM_WEIGHT[org.type] * (stranger?.sharePct ?? 50) / 100),
          registryIds: [org.id],
        })
      );
    }
  }

  // ── 5. Duplicate registrations of the same work at the same org.
  const counts = new Map<string, number>();
  for (const reg of song.registrations) counts.set(reg.registryId, (counts.get(reg.registryId) ?? 0) + 1);
  for (const [regId, n] of counts) {
    if (n > 1) {
      const org = registry(regId);
      issues.push(
        mk({
          id: `${song.isrc}-dup-${regId}`,
          severity: "warning",
          type: "duplicate",
          title: `Duplicate registration at ${org?.abbr ?? regId}`,
          detail: `This work is registered ${n} times at ${org?.abbr ?? regId}. Duplicates split and delay royalty matching.`,
          recommendation: `Ask ${org?.abbr ?? regId} to merge the duplicate work registrations under a single work number.`,
          moneyAtRisk: round(annual * 0.05),
          registryIds: [regId],
        })
      );
    }
  }

  // ── 6. Completely unregistered everywhere — the worst case.
  if (song.registrations.filter((r) => r.status === "registered").length === 0) {
    issues.unshift(
      mk({
        id: `${song.isrc}-unregistered`,
        severity: "critical",
        type: "unregistered",
        title: "Song is not registered anywhere",
        detail:
          "We found no active registration for this song with any royalty organization. Every stream of income is currently uncollected.",
        recommendation:
          "Register the work immediately with your home PRO and MRO, then expand to the territories where it earns.",
        moneyAtRisk: annual,
        registryIds: [],
      })
    );
  }

  const moneyAtRisk = Math.min(annual, sum(issues.map((i) => i.moneyAtRisk)));
  const score = scoreFromMoney(annual, moneyAtRisk, issues);

  return { song, score, issues, coverage, moneyAtRisk };
}

/**
 * Audit a recording we can see (e.g. from Spotify) but whose registrations we
 * can't yet verify. We don't claim it's unregistered — we flag the exposure that
 * is unverifiable until a PRO/statement source is connected.
 */
function auditUnverifiedSong(song: Song): SongAudit {
  const issues: Issue[] = [];
  const coverage: Record<RoyaltyStream, Coverage> = {
    performance: "unknown",
    mechanical: "unknown",
    neighbouring: "unknown",
    sync: "na",
  };
  const annual = song.estAnnualRoyalty;
  const mk = (s: Omit<Issue, "songTitle" | "isrc">): Issue => ({
    ...s,
    songTitle: song.title,
    isrc: song.isrc,
  });

  // Real mis-registration red flag from public metadata (MusicBrainz).
  if (song.metadataIssue) {
    issues.push(
      mk({
        id: `${song.isrc}-misreg`,
        severity: "warning",
        type: "conflict",
        title: "Possible incorrect or duplicate registration",
        detail: song.metadataIssue,
        recommendation:
          "Verify the work's registration with your PRO/MRO and consolidate or correct any duplicate or conflicting entries.",
        moneyAtRisk: round(annual * 0.15),
        registryIds: [],
      })
    );
  }

  // No resolved composition ID — common for recording-only data.
  if (!song.iswc) {
    issues.push(
      mk({
        id: `${song.isrc}-no-iswc`,
        severity: "warning",
        type: "no_iswc",
        title: "No work ID (ISWC) resolved",
        detail:
          "We have the recording (ISRC) but no linked composition (ISWC). Until the work is matched, no society can reliably pay the songwriter side.",
        recommendation:
          "Register the work with your home PRO to have an ISWC assigned (or add it on MusicBrainz so we can resolve it).",
        moneyAtRisk: round(annual * 0.1),
        registryIds: [],
      })
    );
  }

  // One "unverified" finding per required stream in the home territory.
  for (const stream of CHECKED_STREAMS) {
    const orgs = registriesFor(song.territories[0], stream).filter((r) => r.primary);
    if (orgs.length === 0) {
      coverage[stream] = "na";
      continue;
    }
    issues.push(
      mk({
        id: `${song.isrc}-unverified-${stream}`,
        severity: "warning",
        type: "unverified",
        title: `${streamWord(stream)} registration not verified`,
        detail: `We haven't confirmed whether this work is registered for ${streamWord(
          stream
        )} royalties with ${orgs
          .map((o) => o.abbr)
          .join(" / ")}. We don't query PROs directly yet, so this needs checking — if it isn't registered, the income isn't being collected.`,
        recommendation: `Check your ${orgs[0].abbr} account${
          orgs[1] ? ` (or ${orgs[1].abbr})` : ""
        }, and register the work if it's missing, to collect ${streamWord(stream)} royalties.`,
        moneyAtRisk: round(annual * STREAM_WEIGHT[stream] * 0.6),
        registryIds: orgs.map((o) => o.id),
      })
    );
  }

  // Positive signal: we traced the recording to its composition from public data.
  if (song.iswc || song.expectedWriters.length > 0) {
    const names = song.expectedWriters.map((w) => w.name);
    const writerPart =
      names.length > 0 ? ` to ${names.length} songwriter${names.length > 1 ? "s" : ""}` : "";
    issues.push(
      mk({
        id: `${song.isrc}-resolved`,
        severity: "info",
        type: "unverified",
        title: `Composition traced${writerPart}`,
        detail: `Resolved this recording to its composition${
          song.iswc ? ` (ISWC ${song.iswc})` : ""
        }${names.length ? `, written by ${names.join(", ")}` : ""} — from public data, no PRO access needed. Registration still needs verifying.`,
        recommendation: "Confirm these writers and their splits, then verify each PRO registration.",
        moneyAtRisk: 0,
        registryIds: [],
      })
    );
  }

  const moneyAtRisk = Math.min(annual, sum(issues.map((i) => i.moneyAtRisk)));
  // Unverified ≠ broken. Tracing the composition lifts the score above bare "unknown".
  const unverifiedCount = issues.filter((i) => i.type === "unverified" && i.severity !== "info").length;
  const traced = song.iswc || song.expectedWriters.length > 0 ? 12 : 0;
  const score = Math.max(35, 60 - unverifiedCount * 4 + traced);
  return { song, score, issues, coverage, moneyAtRisk };
}

function scoreFromMoney(annual: number, atRisk: number, issues: Issue[]): number {
  if (annual <= 0) return issues.length === 0 ? 100 : 70;
  const exposure = atRisk / annual; // 0..1
  let score = 100 - exposure * 85;
  // Critical issues carry extra weight beyond pure money.
  score -= issues.filter((i) => i.severity === "critical").length * 3;
  return Math.max(0, Math.min(100, round(score)));
}

export function auditArtist(artist: Artist): ArtistAudit {
  const songAudits = artist.songs.map(auditSong);
  const issues = songAudits.flatMap((s) => s.issues).sort((a, b) => b.moneyAtRisk - a.moneyAtRisk);

  const totalAnnualRoyalty = sum(artist.songs.map((s) => s.estAnnualRoyalty));
  const totalMoneyAtRisk = sum(songAudits.map((s) => s.moneyAtRisk));

  // Catalog score = royalty-weighted average of song scores.
  const weightedScore =
    totalAnnualRoyalty > 0
      ? sum(songAudits.map((s) => s.score * s.song.estAnnualRoyalty)) / totalAnnualRoyalty
      : sum(songAudits.map((s) => s.score)) / Math.max(1, songAudits.length);

  return {
    artist,
    songAudits,
    score: round(weightedScore),
    totalMoneyAtRisk: round(totalMoneyAtRisk),
    totalAnnualRoyalty: round(totalAnnualRoyalty),
    issues,
    counts: {
      songs: artist.songs.length,
      critical: issues.filter((i) => i.severity === "critical").length,
      warning: issues.filter((i) => i.severity === "warning").length,
      info: issues.filter((i) => i.severity === "info").length,
      fullyClean: songAudits.filter((s) => s.issues.length === 0).length,
    },
  };
}

function streamWord(s: RoyaltyStream): string {
  return s === "performance"
    ? "performance"
    : s === "mechanical"
    ? "mechanical"
    : s === "neighbouring"
    ? "neighbouring-rights"
    : "sync";
}

export { requiredRegistries };
