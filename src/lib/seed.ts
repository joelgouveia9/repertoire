import type { Artist } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Seed catalogs.
//
// These stand in for what will eventually come from live sources (Spotify for
// the recordings/ISRCs, and each PRO/MRO's public repertoire for registrations).
// Every issue type the engine detects is represented here on purpose, so the
// product demonstrates real value the moment it loads.
//
// To plug in real data later: replace `getArtist`/`listArtists` with calls into
// the data-source layer; the audit engine and UI don't change.
// ─────────────────────────────────────────────────────────────────────────────

const NOVA_SOL: Artist = {
  slug: "nova-sol",
  name: "Nova Sol",
  homeTerritory: "United States",
  spotifyUrl: "https://open.spotify.com/artist/demo-nova-sol",
  monthlyListeners: 412_000,
  image: "🌅",
  songs: [
    {
      // ✅ The clean reference case — fully registered, splits balanced.
      title: "Goldenhour",
      isrc: "USNV12500001",
      iswc: "T-900.123.456-1",
      releaseDate: "2024-03-15",
      territories: ["United States"],
      estAnnualRoyalty: 38_000,
      expectedWriters: [
        { name: "Nova Sol", role: "writer", ipi: "00123456789", sharePct: 60 },
        { name: "Diego Marsh", role: "writer", ipi: "00987654321", sharePct: 40 },
      ],
      expectedPublishers: [{ name: "Sundial Songs (BMI)", role: "publisher", ipi: "00555000111", sharePct: 100 }],
      expectedMasterOwner: { name: "Nova Sol Recordings", role: "master_owner" },
      registrations: [
        { registryId: "bmi", status: "registered", workNumber: "BMI-22847193", partiesOnFile: [
          { name: "Nova Sol", role: "writer", sharePct: 60 },
          { name: "Diego Marsh", role: "writer", sharePct: 40 },
          { name: "Sundial Songs (BMI)", role: "publisher", sharePct: 100 },
        ] },
        { registryId: "themlc", status: "registered", workNumber: "MLC-7741203" },
        { registryId: "soundexchange", status: "registered", workNumber: "SX-9920113" },
      ],
    },
    {
      // ⚠️ Missing mechanical — performance + master fine, but The MLC has nothing.
      title: "Paper Crowns",
      isrc: "USNV12500002",
      iswc: "T-900.123.457-2",
      releaseDate: "2024-06-01",
      territories: ["United States"],
      estAnnualRoyalty: 26_500,
      expectedWriters: [{ name: "Nova Sol", role: "writer", ipi: "00123456789", sharePct: 100 }],
      expectedPublishers: [{ name: "Sundial Songs (BMI)", role: "publisher", ipi: "00555000111", sharePct: 100 }],
      registrations: [
        { registryId: "bmi", status: "registered", workNumber: "BMI-22847194", partiesOnFile: [
          { name: "Nova Sol", role: "writer", sharePct: 100 },
        ] },
        { registryId: "themlc", status: "missing" },
        { registryId: "soundexchange", status: "registered", workNumber: "SX-9920114" },
      ],
    },
    {
      // 🚨 Wrong rightsholder — a stranger publisher is collecting at The MLC.
      title: "Static Bloom",
      isrc: "USNV12400003",
      iswc: "T-900.111.222-3",
      releaseDate: "2023-09-22",
      territories: ["United States"],
      estAnnualRoyalty: 51_000,
      expectedWriters: [
        { name: "Nova Sol", role: "writer", ipi: "00123456789", sharePct: 50 },
        { name: "Priya Anand", role: "writer", ipi: "00444333222", sharePct: 50 },
      ],
      expectedPublishers: [{ name: "Sundial Songs (BMI)", role: "publisher", ipi: "00555000111", sharePct: 100 }],
      registrations: [
        { registryId: "bmi", status: "registered", workNumber: "BMI-21100045", partiesOnFile: [
          { name: "Nova Sol", role: "writer", sharePct: 50 },
          { name: "Priya Anand", role: "writer", sharePct: 50 },
        ] },
        { registryId: "themlc", status: "registered", workNumber: "MLC-6610099", partiesOnFile: [
          { name: "Nova Sol", role: "writer", sharePct: 50 },
          { name: "Brightside Admin LLC", role: "publisher", sharePct: 50 },
        ] },
        { registryId: "soundexchange", status: "registered", workNumber: "SX-8810042" },
      ],
    },
    {
      // 🚨 Conflicting registration at ASCAP claimed by another writer + no ISWC.
      title: "Midnight Ledger",
      isrc: "USNV12400004",
      releaseDate: "2023-11-30",
      territories: ["United States"],
      estAnnualRoyalty: 19_800,
      expectedWriters: [{ name: "Nova Sol", role: "writer", ipi: "00123456789", sharePct: 100 }],
      expectedPublishers: [{ name: "Sundial Songs (BMI)", role: "publisher", ipi: "00555000111", sharePct: 100 }],
      registrations: [
        { registryId: "bmi", status: "registered", workNumber: "BMI-21100099", partiesOnFile: [
          { name: "Nova Sol", role: "writer", sharePct: 100 },
        ] },
        {
          registryId: "ascap",
          status: "conflict",
          conflictNote:
            'A writer credited as "M. Calderon" registered an overlapping work with ASCAP claiming a 50% writer share. Cross-society duplication has frozen distributions.',
        },
        { registryId: "themlc", status: "registered", workNumber: "MLC-6610100" },
        { registryId: "soundexchange", status: "missing" },
      ],
    },
    {
      // 🚨 Completely unregistered — released, earning, collected by nobody.
      title: "Coastline (Demo)",
      isrc: "USNV12500005",
      releaseDate: "2025-01-10",
      territories: ["United States"],
      estAnnualRoyalty: 12_300,
      expectedWriters: [{ name: "Nova Sol", role: "writer", ipi: "00123456789", sharePct: 100 }],
      expectedPublishers: [{ name: "Sundial Songs (BMI)", role: "publisher", ipi: "00555000111", sharePct: 100 }],
      registrations: [
        { registryId: "bmi", status: "missing" },
        { registryId: "themlc", status: "missing" },
        { registryId: "soundexchange", status: "missing" },
      ],
    },
    {
      // ⚠️ Split mismatch (totals 90%) + duplicate registration at BMI.
      title: "VELVET",
      isrc: "USNV12300006",
      iswc: "T-900.333.444-5",
      releaseDate: "2022-07-04",
      territories: ["United States"],
      estAnnualRoyalty: 44_700,
      expectedWriters: [
        { name: "Nova Sol", role: "writer", ipi: "00123456789", sharePct: 50 },
        { name: "Diego Marsh", role: "writer", ipi: "00987654321", sharePct: 40 },
        // Intentionally only 90% total — a co-writer's share was never filed.
      ],
      expectedPublishers: [{ name: "Sundial Songs (BMI)", role: "publisher", ipi: "00555000111", sharePct: 100 }],
      registrations: [
        { registryId: "bmi", status: "registered", workNumber: "BMI-19980011" },
        { registryId: "bmi", status: "registered", workNumber: "BMI-23440087" }, // duplicate work number
        { registryId: "themlc", status: "registered", workNumber: "MLC-5510033" },
        { registryId: "soundexchange", status: "registered", workNumber: "SX-7710021" },
      ],
    },
  ],
};

const ATLAS_KIDD: Artist = {
  slug: "atlas-kidd",
  name: "Atlas Kidd",
  homeTerritory: "United Kingdom",
  spotifyUrl: "https://open.spotify.com/artist/demo-atlas-kidd",
  monthlyListeners: 88_500,
  image: "🧭",
  songs: [
    {
      title: "Northern Line",
      isrc: "GBUM72500001",
      iswc: "T-070.555.111-9",
      releaseDate: "2024-10-02",
      territories: ["United Kingdom"],
      estAnnualRoyalty: 14_200,
      expectedWriters: [{ name: "Atlas Kidd", role: "writer", ipi: "00322114455", sharePct: 100 }],
      expectedPublishers: [{ name: "Self-published", role: "publisher", sharePct: 100 }],
      registrations: [
        { registryId: "prs", status: "registered", workNumber: "PRS-CW88210" },
        { registryId: "mcps", status: "missing" },
        { registryId: "ppl", status: "registered", workNumber: "PPL-44120" },
      ],
    },
    {
      title: "Brixton in the Rain",
      isrc: "GBUM72400002",
      releaseDate: "2023-05-19",
      territories: ["United Kingdom"],
      estAnnualRoyalty: 9_600,
      expectedWriters: [
        { name: "Atlas Kidd", role: "writer", ipi: "00322114455", sharePct: 70 },
        { name: "Jules Verne", role: "writer", sharePct: 30 },
      ],
      expectedPublishers: [{ name: "Self-published", role: "publisher", sharePct: 100 }],
      registrations: [
        { registryId: "prs", status: "pending", workNumber: "PRS-PEND-1192" },
        { registryId: "mcps", status: "missing" },
        { registryId: "ppl", status: "missing" },
      ],
    },
  ],
};

const ARTISTS: Artist[] = [NOVA_SOL, ATLAS_KIDD];

export function listArtists(): Artist[] {
  return ARTISTS;
}

export function getArtist(slug: string): Artist | undefined {
  return ARTISTS.find((a) => a.slug === slug);
}
