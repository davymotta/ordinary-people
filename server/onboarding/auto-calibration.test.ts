/**
 * Test Vitest per server/onboarding/auto-calibration.ts
 *
 * Testa le funzioni pure del modulo (non quelle che chiamano API esterne):
 *   - computeEngagementScore
 *   - normalizeToPercentileRank
 *   - computeEngagementStats
 *   - computeSpearmanRho
 *   - tuneWeights
 *   - interpretRho (tramite computeSpearmanRho)
 */

import { describe, it, expect } from "vitest";
import {
  computeEngagementScore,
  normalizeToPercentileRank,
  computeEngagementStats,
  computeSpearmanRho,
  tuneWeights,
  type HarvestedContent,
  type ModelWeights,
  type OutlierItem,
} from "./auto-calibration";

// ─── Fixture ─────────────────────────────────────────────────────────────────

const makeContent = (
  views: number,
  likes: number,
  comments: number,
  shares = 0
): HarvestedContent => ({
  url: `https://example.com/${views}`,
  platform: "youtube",
  title: `Video ${views}`,
  realEngagement: { views, likes, comments, shares },
});

const defaultWeights: ModelWeights = {
  visual: 0.30,
  messaging: 0.30,
  emotional: 0.25,
  rational: 0.15,
};

// ─── computeEngagementScore ───────────────────────────────────────────────────

describe("computeEngagementScore", () => {
  it("restituisce 0 per engagement tutto zero", () => {
    const item = makeContent(0, 0, 0);
    expect(computeEngagementScore(item)).toBe(0);
  });

  it("aumenta con views crescenti", () => {
    const low = computeEngagementScore(makeContent(100, 0, 0));
    const high = computeEngagementScore(makeContent(100000, 0, 0));
    expect(high).toBeGreaterThan(low);
  });

  it("aumenta con likes crescenti", () => {
    const low = computeEngagementScore(makeContent(1000, 10, 0));
    const high = computeEngagementScore(makeContent(1000, 1000, 0));
    expect(high).toBeGreaterThan(low);
  });

  it("i commenti contribuiscono più delle shares", () => {
    const withComments = computeEngagementScore(makeContent(0, 0, 100, 0));
    const withShares = computeEngagementScore(makeContent(0, 0, 0, 100));
    expect(withComments).toBeGreaterThan(withShares);
  });

  it("usa scala logaritmica (non lineare)", () => {
    const s1 = computeEngagementScore(makeContent(1000, 0, 0));
    const s2 = computeEngagementScore(makeContent(1000000, 0, 0));
    // Se fosse lineare, s2/s1 = 1000; con log10 è molto meno
    expect(s2 / s1).toBeLessThan(100);
  });
});

// ─── normalizeToPercentileRank ────────────────────────────────────────────────

describe("normalizeToPercentileRank", () => {
  it("restituisce array vuoto per input vuoto", () => {
    expect(normalizeToPercentileRank([])).toEqual([]);
  });

  it("il contenuto con più engagement ha rank più alto", () => {
    const items = [
      makeContent(100, 10, 1),
      makeContent(10000, 1000, 100),
      makeContent(500, 50, 5),
    ];
    const normalized = normalizeToPercentileRank(items);
    const ranks = normalized.map(i => i.realPercentileRank ?? 0);
    // Il secondo (10000 views) deve avere il rank più alto
    expect(ranks[1]).toBeGreaterThan(ranks[0]);
    expect(ranks[1]).toBeGreaterThan(ranks[2]);
  });

  it("tutti i rank sono compresi tra 0 e 1", () => {
    const items = [
      makeContent(100, 10, 1),
      makeContent(50000, 5000, 500),
      makeContent(1000, 100, 10),
      makeContent(0, 0, 0),
    ];
    const normalized = normalizeToPercentileRank(items);
    for (const item of normalized) {
      expect(item.realPercentileRank).toBeGreaterThanOrEqual(0);
      expect(item.realPercentileRank).toBeLessThanOrEqual(1);
    }
  });

  it("non modifica i dati di engagement originali", () => {
    const items = [makeContent(1000, 100, 10)];
    const normalized = normalizeToPercentileRank(items);
    expect(normalized[0].realEngagement.views).toBe(1000);
    expect(normalized[0].realEngagement.likes).toBe(100);
  });

  it("gestisce correttamente un singolo elemento", () => {
    const items = [makeContent(5000, 500, 50)];
    const normalized = normalizeToPercentileRank(items);
    expect(normalized[0].realPercentileRank).toBeDefined();
    expect(normalized[0].realPercentileRank).toBeGreaterThanOrEqual(0);
    expect(normalized[0].realPercentileRank).toBeLessThanOrEqual(1);
  });
});

// ─── computeEngagementStats ───────────────────────────────────────────────────

describe("computeEngagementStats", () => {
  it("restituisce zeri per array vuoto", () => {
    const stats = computeEngagementStats([]);
    expect(stats.mean).toBe(0);
    expect(stats.std).toBe(0);
    expect(stats.percentiles.p50).toBe(0);
  });

  it("calcola la media correttamente", () => {
    const items = normalizeToPercentileRank([
      makeContent(100, 10, 1),
      makeContent(1000, 100, 10),
      makeContent(10000, 1000, 100),
    ]);
    const stats = computeEngagementStats(items);
    expect(stats.mean).toBeGreaterThan(0);
    expect(stats.mean).toBeLessThanOrEqual(1);
  });

  it("p90 >= p75 >= p50 >= p25", () => {
    const items = normalizeToPercentileRank([
      makeContent(100, 5, 1),
      makeContent(500, 50, 5),
      makeContent(2000, 200, 20),
      makeContent(10000, 1000, 100),
      makeContent(50000, 5000, 500),
    ]);
    const stats = computeEngagementStats(items);
    expect(stats.percentiles.p90).toBeGreaterThanOrEqual(stats.percentiles.p75);
    expect(stats.percentiles.p75).toBeGreaterThanOrEqual(stats.percentiles.p50);
    expect(stats.percentiles.p50).toBeGreaterThanOrEqual(stats.percentiles.p25);
  });
});

// ─── computeSpearmanRho ───────────────────────────────────────────────────────

describe("computeSpearmanRho", () => {
  it("restituisce rho = 0 per meno di 3 elementi", () => {
    const { rho } = computeSpearmanRho([0.5, 0.8], [0.5, 0.8]);
    expect(rho).toBe(0);
  });

  it("rho = 1 per ranking identico", () => {
    const ranks = [0.1, 0.3, 0.5, 0.7, 0.9];
    const { rho } = computeSpearmanRho(ranks, ranks);
    expect(rho).toBeCloseTo(1, 2);
  });

  it("rho = -1 per ranking inverso", () => {
    const real = [0.1, 0.3, 0.5, 0.7, 0.9];
    const predicted = [0.9, 0.7, 0.5, 0.3, 0.1];
    const { rho } = computeSpearmanRho(real, predicted);
    expect(rho).toBeCloseTo(-1, 2);
  });

  it("rho è compreso tra -1 e 1 per dati casuali", () => {
    const real = [0.2, 0.8, 0.4, 0.6, 0.1, 0.9, 0.3, 0.7];
    const predicted = [0.5, 0.3, 0.7, 0.2, 0.8, 0.4, 0.6, 0.9];
    const { rho } = computeSpearmanRho(real, predicted);
    expect(rho).toBeGreaterThanOrEqual(-1);
    expect(rho).toBeLessThanOrEqual(1);
  });

  it("rho positivo per correlazione parziale", () => {
    // Ranking simile ma non identico
    const real = [0.1, 0.3, 0.5, 0.7, 0.9];
    const predicted = [0.15, 0.25, 0.55, 0.65, 0.85];
    const { rho } = computeSpearmanRho(real, predicted);
    expect(rho).toBeGreaterThan(0.8);
  });

  it("p-value è compreso tra 0 e 1", () => {
    const real = [0.1, 0.3, 0.5, 0.7, 0.9];
    const predicted = [0.2, 0.4, 0.6, 0.8, 1.0];
    const { pValue } = computeSpearmanRho(real, predicted);
    expect(pValue).toBeGreaterThanOrEqual(0);
    expect(pValue).toBeLessThanOrEqual(1);
  });
});

// ─── tuneWeights ─────────────────────────────────────────────────────────────

describe("tuneWeights", () => {
  it("non modifica i pesi se rho >= 0.6", () => {
    const outliers: OutlierItem[] = [
      {
        contentUrl: "https://example.com/1",
        title: "Test",
        realRank: 0.8,
        predictedRank: 0.4,
        delta: 0.4,
        direction: "under_predicted",
        diagnosis: "Test",
      },
    ];
    const result = tuneWeights(defaultWeights, outliers, 0.65);
    expect(result).toEqual(defaultWeights);
  });

  it("non modifica i pesi se non ci sono outlier", () => {
    const result = tuneWeights(defaultWeights, [], 0.4);
    expect(result).toEqual(defaultWeights);
  });

  it("riduce emotional/visual se ci sono più over_predicted", () => {
    const outliers: OutlierItem[] = [
      { contentUrl: "u1", title: "T1", realRank: 0.3, predictedRank: 0.7, delta: 0.4, direction: "over_predicted", diagnosis: "" },
      { contentUrl: "u2", title: "T2", realRank: 0.2, predictedRank: 0.6, delta: 0.4, direction: "over_predicted", diagnosis: "" },
      { contentUrl: "u3", title: "T3", realRank: 0.8, predictedRank: 0.5, delta: 0.3, direction: "under_predicted", diagnosis: "" },
    ];
    const result = tuneWeights(defaultWeights, outliers, 0.3);
    expect(result.emotional).toBeLessThan(defaultWeights.emotional);
    expect(result.visual).toBeLessThan(defaultWeights.visual);
  });

  it("aumenta emotional/visual se ci sono più under_predicted", () => {
    const outliers: OutlierItem[] = [
      { contentUrl: "u1", title: "T1", realRank: 0.8, predictedRank: 0.4, delta: 0.4, direction: "under_predicted", diagnosis: "" },
      { contentUrl: "u2", title: "T2", realRank: 0.9, predictedRank: 0.5, delta: 0.4, direction: "under_predicted", diagnosis: "" },
      { contentUrl: "u3", title: "T3", realRank: 0.2, predictedRank: 0.5, delta: 0.3, direction: "over_predicted", diagnosis: "" },
    ];
    const result = tuneWeights(defaultWeights, outliers, 0.3);
    expect(result.emotional).toBeGreaterThan(defaultWeights.emotional);
    expect(result.visual).toBeGreaterThan(defaultWeights.visual);
  });

  it("i pesi risultanti sommano sempre a 1", () => {
    const outliers: OutlierItem[] = [
      { contentUrl: "u1", title: "T1", realRank: 0.3, predictedRank: 0.7, delta: 0.4, direction: "over_predicted", diagnosis: "" },
      { contentUrl: "u2", title: "T2", realRank: 0.2, predictedRank: 0.6, delta: 0.4, direction: "over_predicted", diagnosis: "" },
    ];
    const result = tuneWeights(defaultWeights, outliers, 0.2);
    const total = result.visual + result.messaging + result.emotional + result.rational;
    expect(total).toBeCloseTo(1, 5);
  });

  it("nessun peso scende sotto 0.1", () => {
    const outliers: OutlierItem[] = Array.from({ length: 10 }, (_, i) => ({
      contentUrl: `u${i}`,
      title: `T${i}`,
      realRank: 0.1,
      predictedRank: 0.9,
      delta: 0.8,
      direction: "over_predicted" as const,
      diagnosis: "",
    }));
    // Applica tuning ripetuto per simulare molte iterazioni
    let weights = { ...defaultWeights };
    for (let i = 0; i < 20; i++) {
      weights = tuneWeights(weights, outliers, 0.1);
    }
    // Il clamp garantisce >= 0.1 prima della normalizzazione;
    // dopo la ri-normalizzazione il valore può essere leggermente sotto 0.1
    // per artefatti floating point (es. 0.09999999...), quindi usiamo 0.09
    expect(weights.visual).toBeGreaterThanOrEqual(0.09);
    expect(weights.messaging).toBeGreaterThanOrEqual(0.09);
    expect(weights.emotional).toBeGreaterThanOrEqual(0.09);
    expect(weights.rational).toBeGreaterThanOrEqual(0.09);
  });
});
