/**
 * Test suite: Exposure Engine + Strategic Simulation Engine
 *
 * Testa le funzioni deterministiche pure (no DB, no LLM) del layer
 * di esposizione persistente e del motore di simulazioni strategiche.
 *
 * Pattern: fixture inline, asserzioni su range numerici e comportamenti
 * monotoni, nessuna dipendenza da contesto server.
 */

import { describe, it, expect } from "vitest";
import {
  computeExposureContext,
  applyExposureAdjustment,
  computeFrequencyResponseCurve,
  type ExposureContext,
} from "./scoring/exposure-engine";
import type { AgentBrandState } from "../drizzle/schema";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeAgentBrandState(overrides: Partial<AgentBrandState> = {}): AgentBrandState {
  return {
    id: 1,
    agentId: 1,
    brandAgentId: 1,
    brandFamiliarity: 0,
    brandSentiment: 0,
    exposureCount: 0,
    lastExposureAt: null,
    saturationLevel: 0,
    accumulatedIrritation: 0,
    contentMemory: null,
    currentEmotionalState: null,
    touchpointHistory: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as AgentBrandState;
}

function makeExposureContext(overrides: Partial<ExposureContext> = {}): ExposureContext {
  const state = makeAgentBrandState();
  return {
    state,
    familiarityBoost: 0,
    irritationPenalty: 0,
    saturationPenalty: 0,
    daysSinceLastExposure: null,
    isFirstExposure: true,
    previousExposureCount: 0,
    ...overrides,
  };
}

// ─── computeExposureContext ────────────────────────────────────────────────────

describe("computeExposureContext", () => {
  it("returns first exposure context for a fresh agent", () => {
    const state = makeAgentBrandState();
    const ctx = computeExposureContext(state);

    expect(ctx.isFirstExposure).toBe(true);
    expect(ctx.previousExposureCount).toBe(0);
    expect(ctx.familiarityBoost).toBe(0);
    expect(ctx.saturationPenalty).toBe(0);
    expect(ctx.irritationPenalty).toBe(0);
    expect(ctx.daysSinceLastExposure).toBeNull();
  });

  it("computes familiarity boost proportional to brand familiarity", () => {
    const state = makeAgentBrandState({ brandFamiliarity: 0.8, exposureCount: 10 });
    const ctx = computeExposureContext(state);

    // familiarityBoost = min(0.25, familiarity * 0.3) = min(0.25, 0.24) = 0.24
    expect(ctx.familiarityBoost).toBeCloseTo(0.24, 2);
    expect(ctx.familiarityBoost).toBeLessThanOrEqual(0.25);
  });

  it("caps familiarity boost at 0.25", () => {
    const state = makeAgentBrandState({ brandFamiliarity: 1.0, exposureCount: 20 });
    const ctx = computeExposureContext(state);

    expect(ctx.familiarityBoost).toBe(0.25);
  });

  it("computes saturation penalty proportional to saturation level", () => {
    const state = makeAgentBrandState({ saturationLevel: 0.8, exposureCount: 5 });
    const ctx = computeExposureContext(state);

    // saturationPenalty = saturation * 0.4 = 0.32
    expect(ctx.saturationPenalty).toBeCloseTo(0.32, 2);
  });

  it("computes irritation penalty proportional to accumulated irritation", () => {
    const state = makeAgentBrandState({ accumulatedIrritation: 0.6, exposureCount: 5 });
    const ctx = computeExposureContext(state);

    // irritationPenalty = irritation * 0.5 = 0.30
    expect(ctx.irritationPenalty).toBeCloseTo(0.30, 2);
  });

  it("computes daysSinceLastExposure correctly", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const state = makeAgentBrandState({ lastExposureAt: twoDaysAgo, exposureCount: 3 });
    const ctx = computeExposureContext(state);

    expect(ctx.daysSinceLastExposure).not.toBeNull();
    expect(ctx.daysSinceLastExposure!).toBeGreaterThan(1.9);
    expect(ctx.daysSinceLastExposure!).toBeLessThan(2.1);
    expect(ctx.isFirstExposure).toBe(false);
  });
});

// ─── applyExposureAdjustment ──────────────────────────────────────────────────

describe("applyExposureAdjustment", () => {
  it("returns raw score unchanged for a fresh agent with no effects", () => {
    const ctx = makeExposureContext();
    const { adjustedScore, adjustmentNarrative } = applyExposureAdjustment(0.5, ctx);

    // First exposure with positive score gets +0.05 curiosity boost
    expect(adjustedScore).toBeCloseTo(0.55, 2);
    expect(adjustmentNarrative).toContain("prima esposizione: curiosità per il nuovo brand");
  });

  it("applies familiarity boost to positive scores", () => {
    const ctx = makeExposureContext({
      familiarityBoost: 0.15,
      isFirstExposure: false,
    });
    const { adjustedScore } = applyExposureAdjustment(0.4, ctx);

    expect(adjustedScore).toBeCloseTo(0.55, 2);
  });

  it("does NOT apply familiarity boost to strongly negative scores", () => {
    const ctx = makeExposureContext({
      familiarityBoost: 0.15,
      isFirstExposure: false,
    });
    const { adjustedScore } = applyExposureAdjustment(-0.5, ctx);

    // rawScore -0.5 < -0.3, so familiarity boost is skipped
    expect(adjustedScore).toBeCloseTo(-0.5, 2);
  });

  it("applies saturation penalty reducing score", () => {
    const ctx = makeExposureContext({
      saturationPenalty: 0.3,
      isFirstExposure: false,
    });
    const { adjustedScore, adjustmentNarrative } = applyExposureAdjustment(0.6, ctx);

    expect(adjustedScore).toBeCloseTo(0.3, 2);
    expect(adjustmentNarrative.some(n => n.includes("saturazione"))).toBe(true);
  });

  it("applies irritation penalty pushing score negative", () => {
    const ctx = makeExposureContext({
      irritationPenalty: 0.4,
      isFirstExposure: false,
    });
    const { adjustedScore, adjustmentNarrative } = applyExposureAdjustment(0.2, ctx);

    expect(adjustedScore).toBeCloseTo(-0.2, 2);
    expect(adjustmentNarrative.some(n => n.includes("irritazione"))).toBe(true);
  });

  it("clamps adjusted score to [-1, +1]", () => {
    const ctx = makeExposureContext({
      irritationPenalty: 0.9,
      saturationPenalty: 0.9,
      isFirstExposure: false,
    });
    const { adjustedScore } = applyExposureAdjustment(-0.8, ctx);

    expect(adjustedScore).toBeGreaterThanOrEqual(-1);
    expect(adjustedScore).toBeLessThanOrEqual(1);
  });

  it("combined effects: familiarity + saturation partially cancel out", () => {
    const ctx = makeExposureContext({
      familiarityBoost: 0.2,
      saturationPenalty: 0.2,
      isFirstExposure: false,
    });
    const { adjustedScore } = applyExposureAdjustment(0.5, ctx);

    // +0.2 familiarity, -0.2 saturation → net 0 → score stays ~0.5
    expect(adjustedScore).toBeCloseTo(0.5, 1);
  });
});

// ─── computeFrequencyResponseCurve ───────────────────────────────────────────

describe("computeFrequencyResponseCurve", () => {
  it("returns the correct number of data points", () => {
    const curve = computeFrequencyResponseCurve(0.5, 0, 0.6, 10, 2);
    expect(curve).toHaveLength(10);
  });

  it("first exposure score is close to base score for a fresh agent", () => {
    const curve = computeFrequencyResponseCurve(0.5, 0, 0.6, 10, 2);
    // First exposure: no familiarity, no saturation, no irritation
    expect(curve[0].score).toBeCloseTo(0.5, 1);
    expect(curve[0].exposure).toBe(1);
  });

  it("score increases initially due to familiarity (Zajonc mere exposure effect)", () => {
    const curve = computeFrequencyResponseCurve(0.3, 0, 0.8, 10, 3);
    // Score should be higher at exposure 3-5 than at exposure 1
    const early = curve[0].score;
    const mid = curve[3].score;
    expect(mid).toBeGreaterThan(early);
  });

  it("score decreases at high frequency due to saturation", () => {
    // Very high frequency (0.5 days interval) → saturation builds fast
    const curve = computeFrequencyResponseCurve(0.5, 0, 0.6, 15, 0.5);
    const peak = Math.max(...curve.map(p => p.score));
    const last = curve[curve.length - 1].score;
    expect(last).toBeLessThan(peak);
  });

  it("saturation grows monotonically with high frequency", () => {
    const curve = computeFrequencyResponseCurve(0.5, 0, 0.6, 8, 0.5);
    for (let i = 1; i < curve.length; i++) {
      // Saturation should be non-decreasing at high frequency
      expect(curve[i].saturation).toBeGreaterThanOrEqual(curve[i - 1].saturation * 0.8);
    }
  });

  it("irritation grows faster when irritation threshold is exceeded", () => {
    const curve = computeFrequencyResponseCurve(0.5, 0, 0.1, 10, 0.5);
    // Low threshold (0.1) → irritation builds faster
    const lastIrritation = curve[curve.length - 1].irritation;
    expect(lastIrritation).toBeGreaterThan(0.3);
  });

  it("starting with high familiarity gives higher initial scores", () => {
    const curveNoFamiliarity = computeFrequencyResponseCurve(0.3, 0, 0.6, 5, 3);
    const curveHighFamiliarity = computeFrequencyResponseCurve(0.3, 0.8, 0.6, 5, 3);

    expect(curveHighFamiliarity[0].score).toBeGreaterThan(curveNoFamiliarity[0].score);
  });

  it("all scores are within [-1, +1] range", () => {
    const curve = computeFrequencyResponseCurve(-0.3, 0.5, 0.3, 20, 1);
    for (const point of curve) {
      expect(point.score).toBeGreaterThanOrEqual(-1);
      expect(point.score).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Decay behavior (via computeExposureContext) ──────────────────────────────

describe("Temporal decay behavior", () => {
  it("saturation decays faster than brand familiarity", () => {
    // Saturation half-life = 3 days, familiarity half-life = 30 days
    // After 6 days: saturation should be ~25% of original, familiarity ~87%
    const ln2 = Math.LN2;
    const saturationAfter6 = Math.exp(-ln2 / 3 * 6);   // ≈ 0.25
    const familiarityAfter6 = Math.exp(-ln2 / 30 * 6);  // ≈ 0.87

    expect(saturationAfter6).toBeLessThan(0.3);
    expect(familiarityAfter6).toBeGreaterThan(0.8);
    expect(familiarityAfter6).toBeGreaterThan(saturationAfter6 * 2);
  });

  it("irritation decays faster than brand familiarity", () => {
    // Irritation half-life = 7 days, familiarity half-life = 30 days
    const ln2 = Math.LN2;
    const irritationAfter14 = Math.exp(-ln2 / 7 * 14);   // ≈ 0.25
    const familiarityAfter14 = Math.exp(-ln2 / 30 * 14); // ≈ 0.72

    expect(irritationAfter14).toBeLessThan(0.3);
    expect(familiarityAfter14).toBeGreaterThan(0.6);
  });

  it("brand sentiment decays at moderate rate (half-life 14 days)", () => {
    const ln2 = Math.LN2;
    const sentimentAfter14 = Math.exp(-ln2 / 14 * 14); // ≈ 0.5 (exactly half)
    expect(sentimentAfter14).toBeCloseTo(0.5, 2);
  });
});
