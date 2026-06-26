# Repertoire

**Cracking open the music royalty black box.**

Repertoire cross-references the world's royalty organizations — PROs, mechanical
collectives, and master-recording societies — to check that every song an artist
releases is registered correctly, trace it back to the real creators, and flag
where money is flowing to the wrong place.

## What it does today

- **Registration completeness audit** for an artist's catalog, with a 0–100 health
  score and a per-song scorecard.
- **Money-at-risk** quantification: every issue is priced in estimated annual royalties.
- Detects: unregistered songs, missing royalty streams, no ISWC, broken splits,
  wrong rightsholder being paid, duplicate registrations, conflicting claims, and
  (for live data) unverified registrations.
- **Live Spotify audits** — search an artist or paste a Spotify link to pull their
  real catalog + ISRCs.
- **Recording → Work matching** — fuzzy title + performer matching that links a
  Spotify recording to a PRO work so writer splits can be attached with a
  confidence score.
- **69 organizations across 39 territories** catalogued, four royalty streams.

## Architecture

The engine is fully pluggable — swap data sources without touching the audit or UI.

| File | Role |
|---|---|
| `src/lib/types.ts` | Domain model |
| `src/lib/registries.ts` | World catalog of royalty orgs (add a territory = add rows) |
| `src/lib/audit.ts` | Reconciliation engine + money-at-risk |
| `src/lib/matching.ts` | Recording → Work fuzzy matching with confidence |
| `src/lib/royalty-model.ts` | Royalty estimation from Spotify signals |
| `src/lib/spotify.ts` | Spotify Client-Credentials catalog pull |
| `src/lib/seed.ts` | Demo catalogs (replaced by live sources) |

## Setup

```bash
npm install
npm run dev   # http://localhost:3210
```

For live Spotify audits, create a free app at
[developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and add
to `.env.local`:

```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
```

Demo catalogs work without any credentials.

## Roadmap

- Live PRO/MRO repertoire connectors to feed the matching engine
- Royalty-statement & CWR upload (ground-truth option C → exact figures)
- International registration checks as catalogs earn across territories
