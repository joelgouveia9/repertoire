# Getting real registration data: The MLC access guide

This is the concrete plan to move Repertoire from **estimated/unverified** to
**actually checking** US mechanical registration — the biggest single source of
commonly-missed indie royalties.

## Why The MLC first

- It was created by US federal law (Music Modernization Act) and is **legally
  required** to maintain a **public, transparent musical-works database**.
- It offers sanctioned programmatic access (no scraping, fully legitimate):
  - **Public Search API** — query works from our own systems.
  - **Bulk Data feed** — the entire database in DDEX/**BWARM** format.
- Crucially it maps **ISRC → registered work → writers / publishers / splits /
  ISWC** — exactly what we need. We already pull ISRCs from Deezer, so the join
  is direct.

## What to register for

Two programs (you can request both):

1. **Public Search API** — for per-work lookups (good for on-demand audits).
   - Sign up: https://www.themlc.com/dataprograms → "Public Search API"
2. **Bulk Data Access (BWARM)** — for downloading the whole works database
   (good for fast, offline matching at scale).
   - Sign up: https://www.themlc.com/bulk-database-feed

Eligibility: music publishers, administrators, DSPs, CMOs, and **music technology
companies** — we qualify as the last.

## Draft email to send

> **To:** bulk.data@themlc.com
> **Subject:** Public Search API + Bulk Data access — music technology company
>
> Hi,
>
> We operate Repertoire (https://repertoire-two.vercel.app), a music-technology
> platform that helps artists and managers confirm their works are correctly
> registered and collecting. We'd like to register for:
>
> 1. The Public Search API, and
> 2. The Bulk Data Access (BWARM) subscription.
>
> Could you share access steps, eligibility/agreement requirements, any pricing,
> API documentation, and the authentication method (API key / OAuth)? We key our
> data on ISRC and ISWC.
>
> Thank you,
> Joel — Repertoire

## What I'll do once you have credentials

1. You drop two values into the deployment env:
   ```
   MLC_API_BASE=<provided at registration>
   MLC_API_KEY=<your key>
   ```
2. I finish the connector at `src/lib/sources/mlc.ts` (already scaffolded against
   our `RepertoireSource` interface) using the real BWARM response shapes from
   their docs.
3. Live audits then **verify each song against The MLC by ISRC** — flipping
   "registration not verified" into a real **Registered ✓ / Not found** result,
   and detecting **wrong writers/publishers** and **duplicate works** for real.

## Other sources (for later, broader coverage)

- **ASCAP/BMI Songview** — 38M works, but no public API yet; pursue a data-
  licensing conversation or wait for their API. (Performance side.)
- **ISWC database (CISAC)** — work-ID resolution.
- **Aggregators** — Music Reports (MRI), ICE Services, Jaxsta — paid B2B data
  with broad coverage if/when we want to buy rather than integrate piecemeal.
- **Statement upload** — already live in-app (`/verify`); needs no third-party
  access and verifies from the artist's own distributor/PRO statements today.
