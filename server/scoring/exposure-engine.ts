/**
 * Ordinary People — Exposure Engine
 *
 * Manages the persistent state of each agent toward a specific brand.
 * This is the layer that enables strategic simulations:
 * - Journey Simulation (multi-touchpoint funnel)
 * - Retargeting Decay Analysis (frequency capping)
 * - Competitive Response (anchoring from competitor exposure)
 * - Content Calendar Optimization (sequence effects)
 *
 * Core principle: "The third time an agent sees the same campaign, they react
 * differently from the first time." — Documento 4
 *
 * Decay model (exponential, per Ebbinghaus forgetting curve):
 * - brand_familiarity: slow decay (τ = 30 days) — Zajonc mere exposure is durable
 * - brand_sentiment: moderate decay (τ = 14 days) — opinions attenuate without reinforcement
 * - saturation_level: fast decay (τ = 3 days) — ad fatigue recovers quickly
 * - accumulated_irritation: medium decay (τ = 7 days) — annoyance fades but leaves residue
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { agentBrandStates } from "../../drizzle/schema";
import type { AgentBrandState, InsertAgentBrandState } from "../../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContentMemoryItem {
  campaignId?: number;
  channel: string;
  title?: string;
  score: number;           // agent's reaction score (-1..+1)
  exposedAt: string;       // ISO timestamp
}

export interface ExposureContext {
  /** Current state before this exposure (with decay applied) */
  state: AgentBrandState;
  /** Familiarity boost from mere exposure effect (0-1) */
  familiarityBoost: number;
  /** Irritation penalty if retargeting too aggressively (0-1) */
  irritationPenalty: number;
  /** Saturation penalty (0-1) */
  saturationPenalty: number;
  /** Days since last exposure (null if first) */
  daysSinceLastExposure: number | null;
  /** Whether this is the first exposure */
  isFirstExposure: boolean;
  /** Exposure count before this one */
  previousExposureCount: number;
}

// ─── Decay Parameters ─────────────────────────────────────────────────────────

/** Half-life in days for each dimension */
const DECAY_HALF_LIFE_DAYS = {
  brandFamiliarity:      30,  // slow — Zajonc: mere exposure effects last weeks
  brandSentiment:        14,  // moderate — opinions attenuate without reinforcement
  saturationLevel:        3,  // fast — ad fatigue recovers in days
  accumulatedIrritation:  7,  // medium — annoyance fades but leaves residue
};

/** Exponential decay: value × e^(-λt), where λ = ln(2)/halfLife */
function applyDecay(value: number, halfLifeDays: number, daysSince: number): number {
  if (daysSince <= 0) return value;
  const lambda = Math.LN2 / halfLifeDays;
  return value * Math.exp(-lambda * daysSince);
}

// ─── Load & Decay ─────────────────────────────────────────────────────────────

/**
 * Load the agent's brand state from DB, applying temporal decay.
 * If no state exists, returns a fresh zero-state.
 */
export async function loadAgentBrandState(
  agentId: number,
  brandAgentId: number,
): Promise<AgentBrandState> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rows = await db
    .select()
    .from(agentBrandStates)
    .where(and(
      eq(agentBrandStates.agentId, agentId),
      eq(agentBrandStates.brandAgentId, brandAgentId),
    ))
    .limit(1);

  if (rows.length === 0) {
    // Return a fresh zero-state (not persisted yet)
    return {
      id: 0,
      agentId,
      brandAgentId,
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
    } as AgentBrandState;
  }

  const state = rows[0];
  if (!state.lastExposureAt) return state;

  // Apply temporal decay
  const now = new Date();
  const daysSince = (now.getTime() - state.lastExposureAt.getTime()) / (1000 * 60 * 60 * 24);

  return {
    ...state,
    brandFamiliarity:      applyDecay(state.brandFamiliarity,      DECAY_HALF_LIFE_DAYS.brandFamiliarity,      daysSince),
    brandSentiment:        applyDecay(Math.abs(state.brandSentiment), DECAY_HALF_LIFE_DAYS.brandSentiment, daysSince) * Math.sign(state.brandSentiment || 1),
    saturationLevel:       applyDecay(state.saturationLevel,       DECAY_HALF_LIFE_DAYS.saturationLevel,       daysSince),
    accumulatedIrritation: applyDecay(state.accumulatedIrritation, DECAY_HALF_LIFE_DAYS.accumulatedIrritation, daysSince),
  };
}

// ─── Compute Exposure Context ─────────────────────────────────────────────────

/**
 * Given the current (decayed) state, compute the exposure context
 * that will be used to modulate the reaction score.
 */
export function computeExposureContext(state: AgentBrandState): ExposureContext {
  const now = new Date();
  const daysSince = state.lastExposureAt
    ? (now.getTime() - state.lastExposureAt.getTime()) / (1000 * 60 * 60 * 24)
    : null;

  // Mere Exposure Effect (Zajonc 1968): familiarity → positive affect
  // Peaks around 10-15 exposures, then plateaus
  const exposureCount = state.exposureCount;
  const familiarityBoost = Math.min(0.25, state.brandFamiliarity * 0.3);

  // Saturation penalty: high saturation → reduced engagement
  const saturationPenalty = state.saturationLevel * 0.4;

  // Irritation penalty: accumulated irritation → negative adjustment
  const irritationPenalty = state.accumulatedIrritation * 0.5;

  return {
    state,
    familiarityBoost,
    irritationPenalty,
    saturationPenalty,
    daysSinceLastExposure: daysSince,
    isFirstExposure: exposureCount === 0,
    previousExposureCount: exposureCount,
  };
}

// ─── Update State After Exposure ─────────────────────────────────────────────

/**
 * Update the agent's brand state after an exposure.
 * Persists to DB (upsert).
 */
export async function updateStateAfterExposure(
  agentId: number,
  brandAgentId: number,
  currentState: AgentBrandState,
  reactionScore: number,     // -1..+1 (the final score from the cascade)
  campaignId: number | undefined,
  channel: string,
  campaignTitle?: string,
): Promise<AgentBrandState> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const now = new Date();

  // Familiarity grows with each exposure (diminishing returns)
  const newFamiliarity = Math.min(1, currentState.brandFamiliarity + 0.08 * (1 - currentState.brandFamiliarity));

  // Sentiment: weighted average of current and new reaction
  // More weight to current as it accumulates
  const weight = Math.min(0.7, 0.3 + currentState.exposureCount * 0.05);
  const newSentiment = clamp(
    currentState.brandSentiment * weight + reactionScore * (1 - weight),
    -1, 1
  );

  // Saturation: grows with high-frequency exposure
  const daysSince = currentState.lastExposureAt
    ? (now.getTime() - currentState.lastExposureAt.getTime()) / (1000 * 60 * 60 * 24)
    : 999;
  const isHighFrequency = daysSince < 2; // less than 2 days = high frequency
  const saturationGrowth = isHighFrequency ? 0.15 : 0.05;
  const newSaturation = Math.min(1, currentState.saturationLevel + saturationGrowth);

  // Irritation: grows if high frequency AND agent has seen it before
  const irritationGrowth = (isHighFrequency && currentState.exposureCount > 1) ? 0.12 : 0.02;
  const newIrritation = Math.min(1, currentState.accumulatedIrritation + irritationGrowth);

  // Emotional state label
  const newEmotionalState = computeEmotionalState(newSentiment, newSaturation, newIrritation);

  // Content memory (keep last 10)
  const existingMemory: ContentMemoryItem[] = (currentState.contentMemory as ContentMemoryItem[]) ?? [];
  const newMemoryItem: ContentMemoryItem = {
    campaignId,
    channel,
    title: campaignTitle,
    score: reactionScore,
    exposedAt: now.toISOString(),
  };
  const newMemory = [...existingMemory, newMemoryItem].slice(-10);

  // Touchpoint history
  const existingHistory = (currentState.touchpointHistory as any[]) ?? [];
  const newHistory = [...existingHistory, {
    campaignId,
    score: reactionScore,
    timestamp: now.toISOString(),
    channel,
  }].slice(-50); // keep last 50 touchpoints

  const updatedState: InsertAgentBrandState = {
    agentId,
    brandAgentId,
    brandFamiliarity: newFamiliarity,
    brandSentiment: newSentiment,
    exposureCount: currentState.exposureCount + 1,
    lastExposureAt: now,
    saturationLevel: newSaturation,
    accumulatedIrritation: newIrritation,
    contentMemory: newMemory as any,
    currentEmotionalState: newEmotionalState,
    touchpointHistory: newHistory as any,
  };

  if (currentState.id === 0) {
    // Insert new state
    const result = await db.insert(agentBrandStates).values(updatedState);
    return { ...updatedState, id: Number((result as any).insertId ?? 0), createdAt: now, updatedAt: now } as AgentBrandState;
  } else {
    // Update existing state
    await db.update(agentBrandStates)
      .set({ ...updatedState, updatedAt: now })
      .where(eq(agentBrandStates.id, currentState.id));
    return { ...currentState, ...updatedState, updatedAt: now } as AgentBrandState;
  }
}

// ─── Score Adjustment ─────────────────────────────────────────────────────────

/**
 * Apply exposure context adjustments to the raw reaction score.
 * This modulates the score based on familiarity, saturation, and irritation.
 */
export function applyExposureAdjustment(
  rawScore: number,
  context: ExposureContext,
): { adjustedScore: number; adjustmentNarrative: string[] } {
  let score = rawScore;
  const narrative: string[] = [];

  // Mere Exposure Effect: familiarity boosts positive reactions
  if (context.familiarityBoost > 0.05 && rawScore > -0.3) {
    score += context.familiarityBoost;
    narrative.push(`mere exposure effect: la familiarità con il brand (+${(context.familiarityBoost * 100).toFixed(0)}%) aumenta la risposta positiva`);
  }

  // Saturation penalty: reduces engagement
  if (context.saturationPenalty > 0.1) {
    score -= context.saturationPenalty;
    narrative.push(`saturazione da esposizione ripetuta: engagement ridotto del ${(context.saturationPenalty * 100).toFixed(0)}%`);
  }

  // Irritation penalty: pushes toward negative
  if (context.irritationPenalty > 0.1) {
    score -= context.irritationPenalty;
    narrative.push(`irritazione da retargeting aggressivo: reazione negativa attivata (-${(context.irritationPenalty * 100).toFixed(0)}%)`);
  }

  // First exposure curiosity boost
  if (context.isFirstExposure && rawScore > 0) {
    score += 0.05;
    narrative.push("prima esposizione: curiosità per il nuovo brand");
  }

  return {
    adjustedScore: clamp(score, -1, 1),
    adjustmentNarrative: narrative,
  };
}

// ─── Frequency Response Curve ─────────────────────────────────────────────────

/**
 * Simulate N exposures of the same content to an agent and return
 * the frequency response curve (score at each exposure).
 * Used for Retargeting Decay Analysis.
 */
export function computeFrequencyResponseCurve(
  baseScore: number,
  agentFamiliarityStart: number = 0,
  agentIrritationThreshold: number = 0.6,
  exposures: number = 10,
  intervalDays: number = 2,
): Array<{ exposure: number; score: number; saturation: number; irritation: number }> {
  let familiarity = agentFamiliarityStart;
  let saturation = 0;
  let irritation = 0;

  const curve = [];

  for (let i = 1; i <= exposures; i++) {
    // Apply decay for interval
    saturation = applyDecay(saturation, DECAY_HALF_LIFE_DAYS.saturationLevel, intervalDays);
    irritation = applyDecay(irritation, DECAY_HALF_LIFE_DAYS.accumulatedIrritation, intervalDays);

    // Compute score for this exposure
    const familiarityBoost = Math.min(0.25, familiarity * 0.3);
    const saturationPenalty = saturation * 0.4;
    const irritationPenalty = irritation * 0.5;

    const score = clamp(baseScore + familiarityBoost - saturationPenalty - irritationPenalty, -1, 1);

    curve.push({ exposure: i, score, saturation, irritation });

    // Update state
    familiarity = Math.min(1, familiarity + 0.08 * (1 - familiarity));
    saturation = Math.min(1, saturation + (intervalDays < 2 ? 0.15 : 0.05));
    irritation = Math.min(1, irritation + (irritation > agentIrritationThreshold ? 0.15 : 0.02));
  }

  return curve;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computeEmotionalState(
  sentiment: number,
  saturation: number,
  irritation: number,
): string {
  if (irritation > 0.6) return "irritazione";
  if (saturation > 0.7) return "saturazione";
  if (sentiment > 0.6) return "entusiasmo";
  if (sentiment > 0.3) return "interesse";
  if (sentiment > 0) return "curiosità";
  if (sentiment > -0.3) return "indifferenza";
  if (sentiment > -0.6) return "scetticismo";
  return "opposizione";
}
