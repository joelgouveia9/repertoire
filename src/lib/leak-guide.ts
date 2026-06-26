import type { IssueType } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Plain-English guide to every way money leaks, and how to plug it.
//
// Each entry explains what the problem is, why it costs the artist money, and the
// concrete steps to fix it. This is the educational layer that turns a flagged
// issue into something an artist or manager can actually act on.
// ─────────────────────────────────────────────────────────────────────────────

export const ISSUE_TYPE_LABEL: Record<IssueType, string> = {
  unregistered: "Unregistered songs",
  missing_stream: "Missing royalty streams",
  no_iswc: "No global work ID (ISWC)",
  split_mismatch: "Broken splits",
  party_mismatch: "Wrong rightsholder paid",
  duplicate: "Duplicate registrations",
  conflict: "Conflicting claims",
  unverified: "Unverified registrations",
};

export interface LeakGuide {
  /** One-line summary of the problem. */
  summary: string;
  /** What's actually happening. */
  what: string;
  /** Why it costs money. */
  why: string;
  /** Concrete steps to fix it. */
  how: string[];
}

export const LEAK_GUIDE: Record<IssueType, LeakGuide> = {
  unregistered: {
    summary: "The song isn't registered with any collection society, so nothing it earns is being collected.",
    what:
      "These songs have no active registration with any PRO, mechanical collective, or neighbouring-rights society. As far as the global royalty system is concerned, they don't exist — so every stream, radio spin, and public play earns $0 in collected royalties.",
    why:
      "Streaming, radio, TV and venue plays all generate royalties, but societies only pay out on registered works and recordings. An unregistered song can rack up millions of plays and still collect nothing — that money is either held indefinitely or redistributed to other rightsholders.",
    how: [
      "Register the composition with your PRO (ASCAP, BMI, PRS, etc.) — this captures performance royalties and gets the work an ISWC.",
      "Register the same work with your territory's mechanical collective (The MLC in the US) to collect streaming & download mechanicals.",
      "Register the master recording with SoundExchange (US) or PPL (UK) for digital & neighbouring-rights royalties.",
      "Confirm your distributor delivered correct metadata (writers, ISRC, splits) to the DSPs.",
    ],
  },
  missing_stream: {
    summary: "Registered for some royalty types but missing others — each gap is income nobody is collecting.",
    what:
      "A song earns four different kinds of royalties (performance, mechanical, neighbouring, and sync), and each is collected by a different organization. These songs are registered for one stream but missing a required other one — most often registered with a PRO but not with the mechanical collective or SoundExchange.",
    why:
      "Being registered with your PRO does NOT register you for mechanicals or neighbouring rights. Indie artists routinely leave US streaming mechanicals (The MLC) and digital-performance royalties (SoundExchange) completely uncollected — often the single biggest leak in a catalog.",
    how: [
      "Check which stream the finding names as missing.",
      "Register the work or recording with that organization (use the Register link on each finding).",
      "US mechanicals: claim your works inside The MLC — there's a large pool of unclaimed indie mechanical money sitting there.",
      "US digital/neighbouring: register your recordings with SoundExchange and link your ISRCs.",
    ],
  },
  no_iswc: {
    summary: "No global work ID, so societies in different countries can't tell it's the same song.",
    what:
      "The composition has no ISWC — the international standard identifier that lets every society worldwide recognize a song as the same work. Without it, your song is effectively anonymous across borders.",
    why:
      "Your song in Germany (GEMA) and the US (ASCAP) can look like two unrelated works. That causes cross-border royalties to be mismatched, held, or paid to the wrong party — international income is the most common casualty.",
    how: [
      "Register the work with your home PRO — they assign the ISWC automatically.",
      "Make sure the ISWC is attached to every other registration and your publishing admin.",
      "Add the ISWC on public databases (e.g. MusicBrainz) so automated matching reconciles correctly.",
    ],
  },
  split_mismatch: {
    summary: "Ownership shares don't add up to 100%, so societies freeze or refuse payment.",
    what:
      "The writer (or publisher) shares on file don't total exactly 100%. Even a small gap — a co-writer's share never filed, or shares totalling 90% — counts as a broken registration.",
    why:
      "Societies will not pay out, or will hold, royalties on a work whose ownership doesn't reconcile to 100%. The money accrues but stays frozen until the splits are corrected.",
    how: [
      "Get written agreement from every co-writer on the exact split percentages (a signed split sheet).",
      "Correct the registration so writer shares total exactly 100% (and publisher shares total 100%).",
      "Make sure every co-writer's own PRO shows the matching split — mismatches between societies also cause holds.",
    ],
  },
  party_mismatch: {
    summary: "A society is paying someone who isn't the real owner — money flowing to the wrong place.",
    what:
      "A society has a different person or company on file as a rightsholder than who actually owns the song. Royalties are being collected — just by the wrong party.",
    why:
      "This is the most direct leak: the money is being paid out, but to a stray publisher, an old administration deal, or a metadata error — not to you. Without a correction you may never see it.",
    how: [
      "Gather proof of ownership: split sheets, agreements, and copyright registration.",
      "File a claim/dispute with the society to correct the rightsholder on the work.",
      "If an expired publishing or admin deal is the cause, confirm the term ended and request reversion of rights.",
      "Re-register the corrected ownership and splits.",
    ],
  },
  duplicate: {
    summary: "The same work is registered more than once, splitting and delaying payments.",
    what: "A work has more than one registration at the same society, usually from re-delivered metadata or a re-registration.",
    why:
      "Duplicates confuse royalty matching — plays get spread across the duplicate entries, payments are delayed, and some never reconcile and are written off.",
    how: [
      "Identify the duplicate work numbers from the finding.",
      "Ask the society to merge them under a single canonical work registration.",
      "Make sure your distributor or publisher isn't re-delivering the work and recreating duplicates.",
    ],
  },
  conflict: {
    summary: "Someone else has filed a competing claim, freezing all distributions until resolved.",
    what:
      "Another party has registered an overlapping claim on the same work, so the societies see competing ownership and can't decide who to pay.",
    why:
      "Conflicting registrations freeze distributions entirely — the society holds 100% of the money, sometimes for years, until the dispute is settled.",
    how: [
      "Open a dispute with the society, naming the conflicting registration.",
      "Provide proof of authorship and the correct splits.",
      "Contact the conflicting party directly if known — many conflicts are honest metadata errors that resolve quickly.",
      "Escalate to the society's formal dispute resolution if it isn't resolved.",
    ],
  },
  unverified: {
    summary: "We found the recording but couldn't confirm it's registered — likely uncollected income.",
    what:
      "We pulled the recording from streaming and cross-referenced public repertoire, but couldn't find a matching registration with the relevant societies.",
    why:
      "If the work genuinely isn't registered, that income isn't being collected. If it is, you simply need to confirm where — but the gap is exactly where money quietly goes missing.",
    how: [
      "Use the Register links on each song to register the work and recording with the named societies.",
      "Search each society's public repertoire for the work to confirm whether it already exists.",
      "Once registered, link your ISRCs and ISWCs so future plays match automatically.",
    ],
  },
};
