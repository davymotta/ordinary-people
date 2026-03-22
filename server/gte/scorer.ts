/**
 * GTE Scorer — Ground Truth Engine
 * 
 * Computes 5 composite scores for both real posts and simulated reactions.
 * All scores are percentile-ranked within a brand's distribution (0-100),
 * making real and simulated data directly comparable.
 * 
 * Dimensions:
 * - Resonance:      engagement rate (likes + comments / followers)
 * - Depth:          comment quality (comment/like ratio × avg length)
 * - Amplification:  share propensity (shares / likes, influence-weighted)
 * - Polarity:       sentiment variance (how divisive is the content)
 * - Rejection:      negative rate (% negative comments or reactions)
 * 
 * Composite: weighted average (0.30 / 0.20 / 0.20 / 0.15 / 0.15)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RealMetrics {
  likes: number;
  comments: number;
  shares?: number;
  saves?: number;
  views?: number;
  reach?: number;
}

export interface CommentAnalysis {
  total: number;
  sampled: number;
  positivePct: number;   // 0-100
  negativePct: number;   // 0-100
  avgSentiment: number;  // -1 to +1
  sentimentVariance: number; // 0-1
  avgCommentLength: number;  // characters
  questionRate: number;  // 0-1
}

export interface PostForScoring {
  id: string | number;
  metrics48h: RealMetrics;
  commentAnalysis?: CommentAnalysis;
  brandFollowers: number;
}

export interface RealScores {
  resonance: number;    // 0-100 percentile
  depth: number;
  amplification: number;
  polarity: number;
  rejection: number;
  composite: number;
}

export interface AgentReactionForScoring {
  finalScore: number;         // -1 to +1
  engagementDepth: number;    // 0-1
  verbalReaction: string;     // length proxy for depth
  shareProbability: number;   // 0-1
  influenceWeight: number;    // agent's social influence (default 1.0)
  scrolledPast: boolean;      // L1 attention filter result
}

export interface SimulatedScores {
  resonance: number;
  depth: number;
  amplification: number;
  polarity: number;
  rejection: number;
  composite: number;
  // Raw aggregates (before percentile normalization)
  rawPositiveRate: number;
  rawScrollRate: number;
  rawShareRate: number;
  rawRejectionRate: number;
  rawScoreMean: number;
  rawScoreStd: number;
}

export interface ComparisonResult {
  postId: string | number;
  real: RealScores;
  simulated: SimulatedScores;
  delta: {
    resonance: number;
    depth: number;
    amplification: number;
    polarity: number;
    rejection: number;
    composite: number;
  };
}

// ─── Core Math ───────────────────────────────────────────────────────────────

/**
 * Percentile rank of values[index] within the distribution.
 * Uses midpoint formula to handle ties: (count_below + 0.5 * count_equal) / n * 100
 */
export function percentileRank(values: number[], index: number): number {
  if (values.length === 0) return 50;
  const value = values[index];
  const countBelow = values.filter(v => v < value).length;
  const countEqual = values.filter(v => v === value).length;
  return ((countBelow + 0.5 * countEqual) / values.length) * 100;
}

/**
 * Compute percentile ranks for all values in an array.
 */
export function percentileRankAll(values: number[]): number[] {
  return values.map((_, i) => percentileRank(values, i));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// ─── Real Post Scores ─────────────────────────────────────────────────────────

/**
 * Resonance = engagement rate = (likes + comments) / followers
 * Returns raw signal for percentile ranking.
 */
export function resonanceSignal(post: PostForScoring): number {
  const { likes, comments } = post.metrics48h;
  if (post.brandFollowers <= 0) return 0;
  return (likes + comments) / post.brandFollowers;
}

/**
 * Depth = comment quality signal = (comments/likes) × avg_comment_length
 * High depth = substantive conversation, not just likes.
 */
export function depthSignal(post: PostForScoring): number {
  const { likes, comments } = post.metrics48h;
  if (comments === 0) return 0;
  const commentLikeRatio = comments / Math.max(likes, 1);
  const avgLength = post.commentAnalysis?.avgCommentLength ?? 20;
  return commentLikeRatio * avgLength;
}

/**
 * Amplification = share rate = shares / likes
 * Proxy for content that people want to spread.
 */
export function amplificationSignal(post: PostForScoring): number {
  const { likes, shares } = post.metrics48h;
  if (!shares || shares === 0) return 0;
  return shares / Math.max(likes, 1);
}

/**
 * Polarity = sentiment variance in comments
 * High variance = divisive content (some love it, some hate it).
 */
export function polaritySignal(post: PostForScoring): number {
  if (!post.commentAnalysis || post.commentAnalysis.sampled < 5) return 0.25; // median default
  return post.commentAnalysis.sentimentVariance;
}

/**
 * Rejection = negative comment rate
 */
export function rejectionSignal(post: PostForScoring): number {
  if (!post.commentAnalysis || post.commentAnalysis.sampled < 3) return 0;
  return post.commentAnalysis.negativePct / 100;
}

/**
 * Normalize a batch of posts to percentile scores.
 * Returns RealScores[] in the same order as posts[].
 */
export function normalizeRealPosts(posts: PostForScoring[]): RealScores[] {
  if (posts.length === 0) return [];

  const resonanceSignals = posts.map(p => resonanceSignal(p));
  const depthSignals = posts.map(p => depthSignal(p));
  const amplificationSignals = posts.map(p => amplificationSignal(p));
  const polaritySignals = posts.map(p => polaritySignal(p));
  const rejectionSignals = posts.map(p => rejectionSignal(p));

  const resonancePercentiles = percentileRankAll(resonanceSignals);
  const depthPercentiles = percentileRankAll(depthSignals);
  const amplificationPercentiles = percentileRankAll(amplificationSignals);
  const polarityPercentiles = percentileRankAll(polaritySignals);
  const rejectionPercentiles = percentileRankAll(rejectionSignals);

  return posts.map((_, i) => {
    const resonance = resonancePercentiles[i];
    const depth = depthPercentiles[i];
    const amplification = amplificationPercentiles[i];
    const polarity = polarityPercentiles[i];
    const rejection = rejectionPercentiles[i];
    const composite = computeCompositeScore({ resonance, depth, amplification, polarity, rejection });
    return { resonance, depth, amplification, polarity, rejection, composite };
  });
}

// ─── Simulated Scores ────────────────────────────────────────────────────────

/**
 * Compute raw simulated scores from agent reactions.
 * Returns both raw aggregates and the 5 dimension signals for percentile ranking.
 */
export function computeSimulatedRawScores(reactions: AgentReactionForScoring[]): {
  resonanceRaw: number;
  depthRaw: number;
  amplificationRaw: number;
  polarityRaw: number;
  rejectionRaw: number;
  rawPositiveRate: number;
  rawScrollRate: number;
  rawShareRate: number;
  rawRejectionRate: number;
  rawScoreMean: number;
  rawScoreStd: number;
} {
  if (reactions.length === 0) {
    return {
      resonanceRaw: 0, depthRaw: 0, amplificationRaw: 0, polarityRaw: 0, rejectionRaw: 0,
      rawPositiveRate: 0, rawScrollRate: 0, rawShareRate: 0, rawRejectionRate: 0,
      rawScoreMean: 0, rawScoreStd: 0,
    };
  }

  const engaged = reactions.filter(r => !r.scrolledPast);
  const scrollRate = reactions.filter(r => r.scrolledPast).length / reactions.length;

  // Resonance: % of agents with positive reaction (final_score > 0.2)
  const positiveRate = engaged.filter(r => r.finalScore > 0.2).length / reactions.length;

  // Depth: % of agents with deep engagement (depth > 0.5 AND long verbal reaction)
  const deepRate = engaged.filter(r =>
    r.engagementDepth > 0.5 && r.verbalReaction.length > 50
  ).length / reactions.length;

  // Amplification: influence-weighted share propensity
  const totalInfluence = reactions.reduce((sum, r) => sum + r.influenceWeight, 0);
  const weightedShares = engaged
    .filter(r => r.shareProbability > 0.5)
    .reduce((sum, r) => sum + r.shareProbability * r.influenceWeight, 0);
  const shareRate = totalInfluence > 0 ? (weightedShares / totalInfluence) : 0;

  // Polarity: std deviation of final scores (mapped to 0-1)
  const scores = reactions.map(r => r.finalScore);
  const scoreStd = stddev(scores);
  const polarityRaw = Math.min(1, scoreStd * 2); // std 0.5 → polarity 1.0

  // Rejection: % of agents with active rejection (final_score < -0.3)
  const rejectionRate = reactions.filter(r => r.finalScore < -0.3).length / reactions.length;

  // Raw score stats
  const allScores = reactions.map(r => r.finalScore);
  const scoreMean = mean(allScores);
  const scoreStdAll = stddev(allScores);

  return {
    resonanceRaw: positiveRate,
    depthRaw: deepRate,
    amplificationRaw: shareRate,
    polarityRaw,
    rejectionRaw: rejectionRate,
    rawPositiveRate: positiveRate,
    rawScrollRate: scrollRate,
    rawShareRate: shareRate,
    rawRejectionRate: rejectionRate,
    rawScoreMean: scoreMean,
    rawScoreStd: scoreStdAll,
  };
}

/**
 * Normalize a batch of simulated raw scores to percentile scores.
 * Input: array of raw score objects (one per post/simulation).
 */
export function normalizeSimulatedScores(rawScores: {
  resonanceRaw: number;
  depthRaw: number;
  amplificationRaw: number;
  polarityRaw: number;
  rejectionRaw: number;
}[]): { resonance: number; depth: number; amplification: number; polarity: number; rejection: number; composite: number }[] {
  if (rawScores.length === 0) return [];

  const resonancePercentiles = percentileRankAll(rawScores.map(s => s.resonanceRaw));
  const depthPercentiles = percentileRankAll(rawScores.map(s => s.depthRaw));
  const amplificationPercentiles = percentileRankAll(rawScores.map(s => s.amplificationRaw));
  const polarityPercentiles = percentileRankAll(rawScores.map(s => s.polarityRaw));
  const rejectionPercentiles = percentileRankAll(rawScores.map(s => s.rejectionRaw));

  return rawScores.map((_, i) => {
    const resonance = resonancePercentiles[i];
    const depth = depthPercentiles[i];
    const amplification = amplificationPercentiles[i];
    const polarity = polarityPercentiles[i];
    const rejection = rejectionPercentiles[i];
    const composite = computeCompositeScore({ resonance, depth, amplification, polarity, rejection });
    return { resonance, depth, amplification, polarity, rejection, composite };
  });
}

// ─── Composite Score ─────────────────────────────────────────────────────────

/**
 * Weighted composite score.
 * Weights: Resonance 30%, Depth 20%, Amplification 20%, Polarity 15%, Rejection 15%
 * Note: Polarity and Rejection are "neutral" dimensions — high polarity isn't bad per se,
 * but high rejection is. The composite weights them equally for now; calibration adjusts.
 */
export function computeCompositeScore(scores: {
  resonance: number;
  depth: number;
  amplification: number;
  polarity: number;
  rejection: number;
}): number {
  return (
    scores.resonance * 0.30 +
    scores.depth * 0.20 +
    scores.amplification * 0.20 +
    scores.polarity * 0.15 +
    scores.rejection * 0.15
  );
}

// ─── Comparison ──────────────────────────────────────────────────────────────

/**
 * Compare real vs simulated scores for a single post.
 */
export function compareScores(
  postId: string | number,
  real: RealScores,
  simulated: SimulatedScores,
): ComparisonResult {
  return {
    postId,
    real,
    simulated,
    delta: {
      resonance: simulated.resonance - real.resonance,
      depth: simulated.depth - real.depth,
      amplification: simulated.amplification - real.amplification,
      polarity: simulated.polarity - real.polarity,
      rejection: simulated.rejection - real.rejection,
      composite: simulated.composite - real.composite,
    },
  };
}

/**
 * Compute Spearman rank correlation between two arrays.
 * Pure TypeScript implementation (no external dependencies).
 */
export function spearmanRho(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) return 0;
  const n = x.length;

  // Rank both arrays
  const rankX = computeRanks(x);
  const rankY = computeRanks(y);

  // Spearman ρ = 1 - (6 * Σd²) / (n * (n²-1))
  let sumD2 = 0;
  for (let i = 0; i < n; i++) {
    const d = rankX[i] - rankY[i];
    sumD2 += d * d;
  }

  return 1 - (6 * sumD2) / (n * (n * n - 1));
}

function computeRanks(values: number[]): number[] {
  const sorted = [...values].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length).fill(0);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    // Find ties
    while (j < sorted.length - 1 && sorted[j + 1].v === sorted[j].v) j++;
    // Average rank for ties
    const avgRank = (i + j) / 2 + 1; // 1-indexed
    for (let k = i; k <= j; k++) {
      ranks[sorted[k].i] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

/**
 * Compute calibration metrics for a set of comparison results.
 * Returns Spearman ρ, MAE, and quartile accuracy per dimension.
 */
export function computeCalibrationMetrics(comparisons: ComparisonResult[]): {
  [dimension: string]: {
    spearmanRho: number;
    mae: number;
    topQuartileAccuracy: number;
    bottomQuartileAccuracy: number;
    interpretation: string;
  };
} {
  const dimensions = ['resonance', 'depth', 'amplification', 'polarity', 'rejection', 'composite'] as const;
  const result: ReturnType<typeof computeCalibrationMetrics> = {};

  for (const dim of dimensions) {
    const realScores = comparisons.map(c => c.real[dim]);
    const simScores = comparisons.map(c => c.simulated[dim]);

    const rho = spearmanRho(realScores, simScores);
    const mae = mean(comparisons.map(c => Math.abs(c.delta[dim])));

    // Top quartile: % of real top-25% that are also in simulated top-25%
    const realTop = new Set(realScores.map((s, i) => s >= 75 ? i : -1).filter(i => i >= 0));
    const simTop = new Set(simScores.map((s, i) => s >= 75 ? i : -1).filter(i => i >= 0));
    const topIntersection = Array.from(realTop).filter(i => simTop.has(i)).length;
    const topQuartileAccuracy = realTop.size > 0 ? topIntersection / realTop.size : 0;

    // Bottom quartile
    const realBottom = new Set(realScores.map((s, i) => s <= 25 ? i : -1).filter(i => i >= 0));
    const simBottom = new Set(simScores.map((s, i) => s <= 25 ? i : -1).filter(i => i >= 0));
    const bottomIntersection = Array.from(realBottom).filter(i => simBottom.has(i)).length;
    const bottomQuartileAccuracy = realBottom.size > 0 ? bottomIntersection / realBottom.size : 0;

    result[dim] = {
      spearmanRho: Math.round(rho * 1000) / 1000,
      mae: Math.round(mae * 10) / 10,
      topQuartileAccuracy: Math.round(topQuartileAccuracy * 1000) / 1000,
      bottomQuartileAccuracy: Math.round(bottomQuartileAccuracy * 1000) / 1000,
      interpretation: interpretRho(rho),
    };
  }

  return result;
}

function interpretRho(rho: number): string {
  if (rho >= 0.80) return 'Excellent — production ready';
  if (rho >= 0.65) return 'Good — minor calibration needed';
  if (rho >= 0.50) return 'Moderate — calibration needed, directionally useful';
  if (rho >= 0.35) return 'Weak — significant calibration needed';
  return 'Poor — model structure may need revision for this brand';
}
