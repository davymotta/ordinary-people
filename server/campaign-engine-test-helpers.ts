/**
 * Test helpers for Campaign Engine — exported pure functions for unit testing.
 */

/**
 * Returns the top N most frequent items from an array of string arrays.
 */
export function getTopItems(arrays: string[][], topN: number = 5): string[] {
  const freq = new Map<string, number>();
  for (const arr of arrays) {
    for (const item of arr) {
      freq.set(item, (freq.get(item) ?? 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([item]) => item);
}

/**
 * Clamps a number to [min, max].
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Computes score distribution from an array of overall scores.
 */
export function computeScoreDistribution(scores: number[]) {
  const dist = { very_positive: 0, positive: 0, neutral: 0, negative: 0, very_negative: 0 };
  for (const score of scores) {
    if (score >= 0.6) dist.very_positive++;
    else if (score >= 0.2) dist.positive++;
    else if (score >= -0.2) dist.neutral++;
    else if (score >= -0.6) dist.negative++;
    else dist.very_negative++;
  }
  return dist;
}
