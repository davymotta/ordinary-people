/**
 * Ordinary People — System Parameters (Global Calibration Knobs)
 *
 * These are the 8-10 global parameters that govern the entire 4-level cascade.
 * They are calibrated empirically via the auto-calibration loop.
 * Initial values are grounded in literature (Kahneman, Asch, Nielsen).
 *
 * Per-brand overrides are stored in the DB (calibrationResults.weightsAfter).
 */

export interface SystemParams {
  // Level 1 — Attention Filter
  /** Minimum attention score to stop scrolling. Below this → "scrolled_past".
   *  Literature: ~60-70% of ads are skipped. Default: 0.30 */
  THRESHOLD_ATTENTION: number;

  // Level 2 — Gut Reaction
  /** Multiplier for dominant variables in salience-weighted sum. Default: 3.0 */
  DOMINANT_WEIGHT: number;
  /** Multiplier for modulation variables. Default: 1.0 */
  MODULATION_WEIGHT: number;

  // Level 3 — Rational Processing
  /** If |gut_reaction| > this threshold, System 2 is mostly bypassed (confirmation bias only).
   *  Literature: Kahneman — strong emotions suppress analytical processing. Default: 0.50 */
  THRESHOLD_CERTAINTY: number;
  /** Confirmation bias multiplier for agents already decided. Default: 0.10 */
  CONFIRMATION_BIAS_STRENGTH: number;

  // Level 4 — Social Influence
  /** Weight of social adjustment on final score.
   *  Literature: Asch conformism ~25%. Default: 0.20 */
  SOCIAL_INFLUENCE_WEIGHT: number;

  // Bias Engine
  /** Global scaling factor for bias distortions. Default: 1.0 */
  BIAS_INTENSITY: number;

  // Distribution
  /** Expected scroll rate (fraction of agents that scroll past). Used for calibration validation. */
  EXPECTED_SCROLL_RATE: number;
}

/** Default system parameters (pre-calibration baseline) */
export const DEFAULT_SYSTEM_PARAMS: SystemParams = {
  THRESHOLD_ATTENTION:       0.30,
  DOMINANT_WEIGHT:           3.0,
  MODULATION_WEIGHT:         1.0,
  THRESHOLD_CERTAINTY:       0.50,
  CONFIRMATION_BIAS_STRENGTH: 0.10,
  SOCIAL_INFLUENCE_WEIGHT:   0.20,
  BIAS_INTENSITY:            1.0,
  EXPECTED_SCROLL_RATE:      0.65,
};

/**
 * Merge brand-specific calibrated params over defaults.
 * Brand params (from calibrationResults.weightsAfter) override defaults.
 */
export function resolveSystemParams(brandParams?: Partial<SystemParams>): SystemParams {
  if (!brandParams) return { ...DEFAULT_SYSTEM_PARAMS };
  return { ...DEFAULT_SYSTEM_PARAMS, ...brandParams };
}
