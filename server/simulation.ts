/**
 * Ordinary People — Simulation Engine v0.1
 *
 * Three structural corrections from the bibliography:
 * 1. Two-phase formula: System 1 (gut_reaction) → System 2 (cognitive modulation)
 * 2. Continuous regime states with asymmetric hysteresis
 * 3. Channel × signal transformation matrix (replaces binary mismatch)
 *
 * References:
 * - Kahneman: System 1/2, loss aversion (×2), prospect theory
 * - Haidt: elephant/rider, moral foundations
 * - Bernays: emotional primacy in persuasion
 * - Thaler: mental accounting, status quo bias
 * - Bourdieu: cultural capital, habitus, taste as class marker
 * - Cialdini: social proof, authority, scarcity
 * - Schelling: tipping points, non-linear emergence
 */

import type { Persona, Campaign, Regime } from "../drizzle/schema";

// ─── TYPES ───────────────────────────────────────────────────────────

export interface RegimeState {
  stable: number;
  growth: number;
  crisis: number;
  trauma: number;
  transition: number;
  stagnation: number;
}

export interface ScoreBreakdown {
  // System 1 components
  emotionalResonance: number;
  identityMatch: number;
  statusAlignment: number;
  gutReaction: number;
  // System 2 components
  topicRelevance: number;
  formatFit: number;
  priceAcceptability: number;
  channelAmplification: number;
  cognitiveModulation: number;
  // Final
  finalScore: number;
  // Metadata
  dominantSignal: string;
  system2Active: boolean;
  riskFlags: string[];
}

export interface SimulationResult {
  personaId: string;
  personaLabel: string;
  campaignId: number;
  breakdown: ScoreBreakdown;
}

// ─── CHANNEL TRANSFORMATION MATRIX ──────────────────────────────────
// Each channel amplifies or attenuates specific campaign signals.
// Values > 1.0 = amplification, < 1.0 = attenuation.
// Source: Adorno (medium transforms message), Bernays (message-medium alignment),
//         Chomsky (algorithmic filters amplify emotional/polarizing content)

const CHANNEL_MATRIX: Record<string, Record<string, number>> = {
  tiktok: {
    emotionalCharge: 1.35,
    noveltySignal: 1.25,
    statusSignal: 0.8,
    tribalIdentitySignal: 1.1,
    priceSignal: 0.7,
    topicDepth: 0.5,
  },
  instagram: {
    emotionalCharge: 1.15,
    noveltySignal: 1.1,
    statusSignal: 1.3,
    tribalIdentitySignal: 1.0,
    priceSignal: 0.9,
    topicDepth: 0.6,
  },
  facebook: {
    emotionalCharge: 1.1,
    noveltySignal: 0.7,
    statusSignal: 0.8,
    tribalIdentitySignal: 1.35,
    priceSignal: 1.0,
    topicDepth: 0.8,
  },
  youtube: {
    emotionalCharge: 1.1,
    noveltySignal: 1.0,
    statusSignal: 0.9,
    tribalIdentitySignal: 0.9,
    priceSignal: 0.9,
    topicDepth: 1.2,
  },
  linkedin: {
    emotionalCharge: 0.6,
    noveltySignal: 0.8,
    statusSignal: 1.35,
    tribalIdentitySignal: 0.7,
    priceSignal: 1.1,
    topicDepth: 1.3,
  },
  twitter: {
    emotionalCharge: 1.2,
    noveltySignal: 1.1,
    statusSignal: 0.9,
    tribalIdentitySignal: 1.2,
    priceSignal: 0.8,
    topicDepth: 0.7,
  },
  whatsapp: {
    emotionalCharge: 1.0,
    noveltySignal: 0.6,
    statusSignal: 0.5,
    tribalIdentitySignal: 1.2,
    priceSignal: 1.1,
    topicDepth: 0.4,
  },
  tv: {
    emotionalCharge: 1.2,
    noveltySignal: 0.5,
    statusSignal: 0.9,
    tribalIdentitySignal: 1.1,
    priceSignal: 1.0,
    topicDepth: 0.9,
  },
  print: {
    emotionalCharge: 0.7,
    noveltySignal: 0.5,
    statusSignal: 1.1,
    tribalIdentitySignal: 0.8,
    priceSignal: 1.0,
    topicDepth: 1.4,
  },
};

// ─── REGIME BLENDING ─────────────────────────────────────────────────
// Continuous regime: weighted average of pure regime modifiers.
// Source: Polanyi (oscillation), Hobsbawm (long transitions), Kahneman (hysteresis)

export function blendRegimeModifiers(
  regimeState: RegimeState,
  regimes: Regime[]
): Record<string, number> {
  const modKeys = [
    "modPriceSensitivity", "modStatusOrientation", "modNoveltySeeking",
    "modRiskAversion", "modEmotionalSusceptibility", "modIdentityDefensiveness",
    "modConformismIndex", "modAuthorityTrust", "modDelayedGratification",
    "modCulturalCapital", "modLocusOfControl",
  ] as const;

  const blended: Record<string, number> = {};
  for (const key of modKeys) {
    let val = 0;
    for (const regime of regimes) {
      const regimeName = regime.name.toLowerCase() as keyof RegimeState;
      const weight = regimeState[regimeName] ?? 0;
      val += weight * ((regime[key] as number) ?? 1.0);
    }
    blended[key] = val;
  }
  return blended;
}

// ─── APPLY MODIFIERS TO PERSONA ──────────────────────────────────────

interface ModulatedPsychographics {
  noveltySeeking: number;
  statusOrientation: number;
  priceSensitivity: number;
  riskAversion: number;
  emotionalSusceptibility: number;
  identityDefensiveness: number;
  conformismIndex: number;
  authorityTrust: number;
  delayedGratification: number;
  culturalCapital: number;
  locusOfControl: number;
}

function applyModifiers(
  persona: Persona,
  mods: Record<string, number>
): ModulatedPsychographics {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return {
    noveltySeeking: clamp(persona.noveltySeeking * (mods.modNoveltySeeking ?? 1)),
    statusOrientation: clamp(persona.statusOrientation * (mods.modStatusOrientation ?? 1)),
    priceSensitivity: clamp(persona.priceSensitivity * (mods.modPriceSensitivity ?? 1)),
    riskAversion: clamp(persona.riskAversion * (mods.modRiskAversion ?? 1)),
    emotionalSusceptibility: clamp(persona.emotionalSusceptibility * (mods.modEmotionalSusceptibility ?? 1)),
    identityDefensiveness: clamp(persona.identityDefensiveness * (mods.modIdentityDefensiveness ?? 1)),
    conformismIndex: clamp(persona.conformismIndex * (mods.modConformismIndex ?? 1)),
    authorityTrust: clamp(persona.authorityTrust * (mods.modAuthorityTrust ?? 1)),
    delayedGratification: clamp(persona.delayedGratification * (mods.modDelayedGratification ?? 1)),
    culturalCapital: clamp(persona.culturalCapital * (mods.modCulturalCapital ?? 1)),
    locusOfControl: clamp(persona.locusOfControl * (mods.modLocusOfControl ?? 1)),
  };
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────

function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
  let dot = 0, magA = 0, magB = 0;
  for (const k of keys) {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function getChannelModifiers(channel: string): Record<string, number> {
  const ch = channel.toLowerCase().replace(/\s+/g, "");
  return CHANNEL_MATRIX[ch] ?? {
    emotionalCharge: 1.0, noveltySignal: 1.0, statusSignal: 1.0,
    tribalIdentitySignal: 1.0, priceSignal: 1.0, topicDepth: 1.0,
  };
}

// ─── SIMULATION ENGINE v0.1 ─────────────────────────────────────────

export function simulateReaction(
  persona: Persona,
  campaign: Campaign,
  regimeMods: Record<string, number>,
  weights: Record<string, number> = {}
): ScoreBreakdown {
  // Default weights (calibratable)
  const w = {
    w_emotion: weights.w_emotion ?? 0.35,
    w_identity: weights.w_identity ?? 0.35,
    w_status: weights.w_status ?? 0.30,
    w_topic: weights.w_topic ?? 0.25,
    w_format: weights.w_format ?? 0.15,
    w_price: weights.w_price ?? 0.30,
    w_channel: weights.w_channel ?? 0.20,
    dominance_threshold: weights.dominance_threshold ?? 0.65,
    ambiguity_zone: weights.ambiguity_zone ?? 0.30,
    loss_aversion: weights.loss_aversion ?? 2.0,
  };

  // Apply regime modifiers to persona psychographics
  const psy = applyModifiers(persona, regimeMods);

  // Get channel transformation
  const chMods = getChannelModifiers(campaign.channel);

  // Transform campaign signals through channel
  const effectiveEmotional = Math.min(1, campaign.emotionalCharge * chMods.emotionalCharge);
  const effectiveNovelty = Math.min(1, campaign.noveltySignal * chMods.noveltySignal);
  const effectiveStatus = Math.min(1, campaign.statusSignal * chMods.statusSignal);
  const effectiveTribal = Math.min(1, campaign.tribalIdentitySignal * chMods.tribalIdentitySignal);
  const effectivePrice = Math.min(1, campaign.priceSignal * chMods.priceSignal);

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 1: SYSTEM 1 — GUT REACTION (Kahneman, Haidt, Bernays)
  // Pre-cognitive, emotional, fast. Three signals: emotion, identity, status.
  // ═══════════════════════════════════════════════════════════════════

  // 1a. Emotional Resonance
  // How much the campaign's emotional charge resonates with the persona's susceptibility
  const emotionalResonance = effectiveEmotional * psy.emotionalSusceptibility;

  // 1b. Identity Match (Haidt: moral foundations; Anderson: imagined communities)
  // Cosine similarity between campaign tribal signal and persona identity profile
  const personaIdentity = (persona.identityProfile ?? {}) as Record<string, number>;
  const campaignTopics = (campaign.topics ?? []) as string[];

  // Build a rough campaign identity vector from tribal signal + topics
  const campaignIdentity: Record<string, number> = {};
  for (const t of campaignTopics) {
    campaignIdentity[t] = effectiveTribal;
  }

  let identityMatch = 0;
  if (Object.keys(personaIdentity).length > 0 && Object.keys(campaignIdentity).length > 0) {
    identityMatch = cosineSimilarity(personaIdentity, campaignIdentity);
  }
  // Identity gap penalty (Haidt: moral disgust when identity is threatened)
  const identityGap = 1 - identityMatch;
  const identityScore = identityMatch - (identityGap > 0.5 ? identityGap * psy.identityDefensiveness * 1.5 : identityGap * psy.identityDefensiveness * 0.5);

  // 1c. Status Alignment (Bourdieu: taste as class; Veblen: conspicuous consumption)
  // Positive when status signal matches persona's status orientation
  // But: if persona's income is much lower than implied price, aspiration becomes rejection
  const comfortMid = persona.comfortablePriceMid ?? 50;
  const priceRatio = campaign.pricePoint / Math.max(comfortMid, 1);
  let statusAlignment = effectiveStatus * psy.statusOrientation;
  // Veblen inversion: for high-status personas, high price IS the product
  if (psy.statusOrientation > 0.7 && priceRatio > 1.0 && priceRatio < 3.0) {
    statusAlignment *= 1.2; // Veblen effect
  }
  // Aspiration rejection: if price is >3x comfort, status becomes negative (Bourdieu)
  if (priceRatio > 3.0 && psy.statusOrientation < 0.6) {
    statusAlignment *= -0.5;
  }

  // Combine System 1 components
  const gutReaction = Math.max(-1, Math.min(1,
    (emotionalResonance * w.w_emotion +
     identityScore * w.w_identity +
     statusAlignment * w.w_status) /
    (w.w_emotion + w.w_identity + w.w_status)
  ));

  // ═══════════════════════════════════════════════════════════════════
  // DOMINANCE CHECK (Kahneman: attribute substitution)
  // If a single signal is very strong, it dominates and System 2 barely activates
  // ═══════════════════════════════════════════════════════════════════

  const signals = [
    { name: "emotional_resonance", value: emotionalResonance },
    { name: "identity_score", value: Math.abs(identityScore) },
    { name: "status_alignment", value: Math.abs(statusAlignment) },
  ];
  const dominant = signals.reduce((a, b) => Math.abs(a.value) > Math.abs(b.value) ? a : b);
  const isDominant = Math.abs(dominant.value) > w.dominance_threshold;

  // ═══════════════════════════════════════════════════════════════════
  // PHASE 2: SYSTEM 2 — COGNITIVE MODULATION (Thaler, Ariely)
  // Deliberate, slow. Only activates significantly in the ambiguity zone.
  // ═══════════════════════════════════════════════════════════════════

  // 2a. Topic Relevance
  const personaTopics = (persona.topicAffinities ?? {}) as Record<string, number>;
  let topicRelevance = 0;
  if (campaignTopics.length > 0) {
    let sum = 0;
    for (const t of campaignTopics) {
      sum += personaTopics[t] ?? 0;
    }
    topicRelevance = sum / campaignTopics.length;
  }
  // Cultural capital filter: low cultural_capital → weaker topic processing (Bourdieu)
  topicRelevance *= (0.5 + 0.5 * psy.culturalCapital);

  // 2b. Format Fit
  const personaFormats = (persona.formatAffinities ?? {}) as Record<string, number>;
  const formatFit = personaFormats[campaign.format] ?? 0.3;

  // 2c. Price Acceptability (Kahneman: loss aversion; Thaler: mental accounting)
  const comfortRange = persona.comfortablePriceRange ?? 30;
  const priceDiff = campaign.pricePoint - comfortMid;
  let priceAcceptability: number;
  if (priceDiff <= 0) {
    // Below comfort: slight positive (bargain)
    priceAcceptability = Math.min(0.5, Math.abs(priceDiff) / comfortRange * 0.3);
  } else {
    // Above comfort: loss aversion kicks in (Kahneman: losses weigh 2×)
    const lossWeighted = priceDiff * w.loss_aversion;
    priceAcceptability = -Math.min(1, lossWeighted / comfortRange) * psy.priceSensitivity;
  }

  // 2d. Channel amplification score (how well the channel fits the persona)
  const personaChannels = (persona.channelUsage ?? {}) as Record<string, number>;
  const channelFit = personaChannels[campaign.channel.toLowerCase()] ?? 0.1;
  const channelAmplification = channelFit; // 0-1

  // Combine System 2
  const cognitiveModulation =
    (topicRelevance * w.w_topic +
     formatFit * w.w_format +
     priceAcceptability * w.w_price +
     channelAmplification * w.w_channel) /
    (w.w_topic + w.w_format + w.w_price + w.w_channel);

  // ═══════════════════════════════════════════════════════════════════
  // FINAL SCORE: S1/S2 blending with ambiguity-dependent activation
  // ═══════════════════════════════════════════════════════════════════

  let system2Weight: number;
  const absGut = Math.abs(gutReaction);

  if (isDominant || absGut > w.dominance_threshold) {
    // Strong gut reaction → System 2 barely activates (confirmation bias)
    system2Weight = 0.15;
  } else if (absGut < w.ambiguity_zone) {
    // Ambiguous gut → System 2 fully activates
    system2Weight = 0.60;
  } else {
    // Intermediate: linear interpolation
    system2Weight = 0.60 - (absGut - w.ambiguity_zone) / (w.dominance_threshold - w.ambiguity_zone) * 0.45;
  }

  const system1Weight = 1 - system2Weight;
  const finalScore = Math.max(-1, Math.min(1,
    gutReaction * system1Weight + cognitiveModulation * system2Weight
  ));

  // ═══════════════════════════════════════════════════════════════════
  // RISK FLAGS
  // ═══════════════════════════════════════════════════════════════════

  const riskFlags: string[] = [];
  if (identityGap > 0.6) riskFlags.push("HIGH_IDENTITY_GAP");
  if (priceRatio > 3.0) riskFlags.push("PRICE_SHOCK");
  if (emotionalResonance > 0.8 && identityScore < -0.3) riskFlags.push("EMOTIONAL_MANIPULATION");
  if (psy.riskAversion > 0.7 && effectiveNovelty > 0.7) riskFlags.push("NOVELTY_RESISTANCE");
  if (statusAlignment < -0.3) riskFlags.push("ASPIRATION_REJECTION");
  if (psy.conformismIndex > 0.7 && effectiveNovelty > 0.6) riskFlags.push("CONFORMISM_BARRIER");

  return {
    emotionalResonance: round(emotionalResonance),
    identityMatch: round(identityMatch),
    statusAlignment: round(statusAlignment),
    gutReaction: round(gutReaction),
    topicRelevance: round(topicRelevance),
    formatFit: round(formatFit),
    priceAcceptability: round(priceAcceptability),
    channelAmplification: round(channelAmplification),
    cognitiveModulation: round(cognitiveModulation),
    finalScore: round(finalScore),
    dominantSignal: dominant.name,
    system2Active: system2Weight > 0.3,
    riskFlags,
  };
}

function round(n: number, decimals = 4): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

// ─── BATCH SIMULATION ────────────────────────────────────────────────

export function runSimulation(
  personas: Persona[],
  campaigns: Campaign[],
  regimes: Regime[],
  regimeState: RegimeState,
  weights?: Record<string, number>
): SimulationResult[] {
  const mods = blendRegimeModifiers(regimeState, regimes);
  const results: SimulationResult[] = [];

  for (const campaign of campaigns) {
    // Use campaign-specific regime state if available, otherwise use global
    const campaignRegimeState = (campaign.regimeState as RegimeState) ?? regimeState;
    const campaignMods = blendRegimeModifiers(campaignRegimeState, regimes);

    for (const persona of personas) {
      const breakdown = simulateReaction(persona, campaign, campaignMods, weights);
      results.push({
        personaId: persona.archetypeId,
        personaLabel: persona.label,
        campaignId: campaign.id,
        breakdown,
      });
    }
  }

  return results;
}

// ─── WEIGHTED MARKET INTEREST ────────────────────────────────────────

export function computeWeightedMarketInterest(
  results: SimulationResult[],
  personas: Persona[]
): number {
  const personaMap = new Map(personas.map(p => [p.archetypeId, p]));
  let weightedSum = 0;
  let totalWeight = 0;

  for (const r of results) {
    const persona = personaMap.get(r.personaId);
    if (!persona) continue;
    const weight = persona.marketSpendShare;
    weightedSum += r.breakdown.finalScore * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// ─── SPEARMAN RANK CORRELATION ───────────────────────────────────────

export function spearmanRho(predicted: number[], actual: number[]): number {
  if (predicted.length !== actual.length || predicted.length < 2) return 0;
  const n = predicted.length;

  const rank = (arr: number[]): number[] => {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    const ranks = new Array(n);
    for (let i = 0; i < n; i++) {
      ranks[sorted[i].i] = i + 1;
    }
    return ranks;
  };

  const rP = rank(predicted);
  const rA = rank(actual);

  let sumD2 = 0;
  for (let i = 0; i < n; i++) {
    const d = rP[i] - rA[i];
    sumD2 += d * d;
  }

  return 1 - (6 * sumD2) / (n * (n * n - 1));
}
