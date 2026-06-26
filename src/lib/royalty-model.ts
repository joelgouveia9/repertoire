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
 * Estimate a single track's annual streams from Spotify signals.
 * Popularity is the dominant signal (it already reflects recent play velocity);
 * followers provide a floor so catalog tracks from large artists aren't zeroed out.
 */
export function estimateAnnualStreams(popularity: number, followers = 0): number {
  const pop = Math.max(0, Math.min(100, popularity));
  // Nonlinear: popularity is roughly logarithmic in real plays. (pop/10)^3 gives
  // a smooth curve — pop 30 ≈ 26k/yr, pop 50 ≈ 120k/yr, pop 70 ≈ 329k/yr, pop 85 ≈ 590k/yr.
  const monthlyFromPop = Math.pow(pop / 10, 3) * 100;
  // Follower floor: even low-popularity catalog tracks get a small base from fanbase.
  const monthlyFloor = followers * 0.02;
  const monthly = Math.max(monthlyFromPop, monthlyFloor);
  return Math.round(monthly * 12);
}

/** Estimate a track's total annual collectible royalty across all streams (USD). */
export function estimateAnnualRoyalty(popularity: number, followers = 0): number {
  const annualStreams = estimateAnnualStreams(popularity, followers);
  return Math.round(annualStreams * PER_STREAM_USD * NON_STREAMING_UPLIFT);
}

/** Human-readable note explaining the estimate, for tooltips/disclaimers. */
export const ROYALTY_MODEL_NOTE =
  "Estimated from Spotify popularity and follower data using blended per-stream payout rates (~$0.0038/stream). Directional only — connect royalty statements for exact figures.";
