// ─────────────────────────────────────────────────────────────────────────────
// Royalty estimation model.
//
// Spotify's API does NOT expose play counts, so we MODEL a track's annual
// royalties from the two signals it does give us — track `popularity` (0–100)
// and the artist's `followers` — then apply blended, publicly-reported payout
// rates. Every number here is a DIRECTIONAL estimate and is labeled as such in
// the UI. When real statement data is connected, it overrides these estimates.
//
// Sources for the rate assumptions (industry-reported ranges, 2023–2025):
//   • Spotify pays roughly $0.003–$0.005 per stream to all rightsholders combined.
//   • Of recorded-music streaming income, the publishing side (mechanical +
//     performance) is ~20–25%, the recording/master side ~75–80%.
//   • Streaming is the majority of an indie artist's collectible income, but
//     radio, public performance and neighbouring rights add a meaningful uplift.
// ─────────────────────────────────────────────────────────────────────────────

/** Blended Spotify payout to ALL rightsholders, per stream (USD). Conservative midpoint. */
const PER_STREAM_USD = 0.0038;

/** Uplift for non-streaming collectible income (radio, public performance, neighbouring, sync). */
const NON_STREAMING_UPLIFT = 1.18;

/**
 * Popularity assumed when Spotify doesn't expose it for the app's API tier
 * (newer apps get `popularity`/`followers` nulled). Picks a modest mid-catalog
 * baseline so estimates stay sane and never NaN.
 */
const BASELINE_POPULARITY = 42;

const finite = (n: number | null | undefined, fallback: number): number =>
  typeof n === "number" && Number.isFinite(n) ? n : fallback;

/**
 * Estimate a single track's annual streams from Spotify signals.
 * Popularity is the dominant signal (it already reflects recent play velocity);
 * followers provide a floor so catalog tracks from large artists aren't zeroed out.
 * Both inputs may be null (restricted API tier) — we fall back to a baseline.
 */
export function estimateAnnualStreams(
  popularity: number | null | undefined,
  followers: number | null | undefined = 0
): number {
  const pop = Math.max(0, Math.min(100, finite(popularity, BASELINE_POPULARITY)));
  // Nonlinear: popularity is roughly logarithmic in real plays. (pop/10)^3 gives
  // a smooth curve — pop 30 ≈ 26k/yr, pop 50 ≈ 120k/yr, pop 70 ≈ 329k/yr, pop 85 ≈ 590k/yr.
  const monthlyFromPop = Math.pow(pop / 10, 3) * 100;
  // Follower floor: even low-popularity catalog tracks get a small base from fanbase.
  const monthlyFloor = finite(followers, 0) * 0.02;
  const monthly = Math.max(monthlyFromPop, monthlyFloor);
  return Math.round(monthly * 12);
}

/** Estimate a track's total annual collectible royalty across all streams (USD). */
export function estimateAnnualRoyalty(
  popularity: number | null | undefined,
  followers: number | null | undefined = 0
): number {
  const annualStreams = estimateAnnualStreams(popularity, followers);
  return Math.round(annualStreams * PER_STREAM_USD * NON_STREAMING_UPLIFT);
}

// ── Per-song estimation from Deezer's track `rank` (0 … ~1,000,000) ───────────
//
// `rank` is Deezer's popularity score per track — far more granular than a flat
// baseline, so it lets us estimate EACH song individually. Deezer's rank scale is
// compressed, so we deliberately calibrate CONSERVATIVELY to avoid overstating
// indie earnings:
//   rank    9k →  ~$20/yr     (tiny release)
//   rank   33k →  ~$200/yr    (modest indie track)
//   rank  100k →  ~$1.6k/yr   (regional traction)
//   rank  985k →  ~$120k/yr   (global smash)
// then apply the same blended per-stream payout. Directional, not exact — real
// figures come from connected royalty statements.
const RANK_COEFF = 1.36e-4;
const RANK_EXP = 1.885;

export function estimateAnnualStreamsFromRank(rank: number | null | undefined): number {
  const r = finite(rank, 0);
  if (r <= 0) return 0;
  return Math.round(RANK_COEFF * Math.pow(r, RANK_EXP));
}

/** Estimate a single track's annual royalty (at 100% ownership) from its Deezer rank. */
export function estimateAnnualRoyaltyFromRank(rank: number | null | undefined): number {
  const streams = estimateAnnualStreamsFromRank(rank);
  if (streams <= 0) return 0;
  // Floor at a few dollars so a genuinely-released-but-tiny track isn't shown as $0.
  return Math.max(5, Math.round(streams * PER_STREAM_USD * NON_STREAMING_UPLIFT));
}

/** True when Spotify exposed real play signals (vs. us applying a baseline). */
export function hasPlaySignal(popularity: number | null | undefined): boolean {
  return typeof popularity === "number" && Number.isFinite(popularity) && popularity > 0;
}

/** Human-readable note explaining the estimate, for tooltips/disclaimers. */
export const ROYALTY_MODEL_NOTE =
  "Royalty figures are directional estimates using blended per-stream payout rates (~$0.0038/stream) and a conservative per-track baseline where play data isn't available. Connect royalty statements for exact figures.";
