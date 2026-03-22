/**
 * Ordinary People — Salience Calculator
 *
 * For any given campaign + agent profile, determines which psychological
 * variables are DOMINANT (3× weight), MODULATION (1× weight), or DORMANT (0).
 *
 * Principle: "For any specific decision, 80% of the result is determined by
 * 20% of the profile variables." — Documento 3
 *
 * The salience is computed deterministically from the Campaign Digest semantic
 * tags. No LLM required — this is pure rule-based matching.
 */

import type { Agent } from "../../drizzle/schema";

// ─── Campaign Semantic Tags ───────────────────────────────────────────────────

export type CampaignTag =
  | "luxury"
  | "aspiration"
  | "status"
  | "high_price"
  | "value"
  | "discount"
  | "family"
  | "community"
  | "belonging"
  | "tradition"
  | "authority"
  | "scarcity"
  | "urgency"
  | "humor"
  | "irony"
  | "rebellion"
  | "freedom"
  | "sustainability"
  | "ecology"
  | "health"
  | "wellness"
  | "sexuality"
  | "beauty"
  | "novelty"
  | "innovation"
  | "technology"
  | "nostalgia"
  | "fear"
  | "guilt"
  | "pride"
  | "social_proof"
  | "exclusivity"
  | "political"
  | "religious"
  | "identity"
  | "gender"
  | "class";

// ─── Profile Variable Names ───────────────────────────────────────────────────

export type ProfileVariable =
  // Bourdieu Capital
  | "economic_capital"
  | "cultural_capital"
  | "social_capital"
  | "class_position"
  // Kahneman / Behavioral
  | "system1_dominance"
  | "loss_aversion"
  | "price_sensitivity"
  | "status_orientation"
  | "risk_aversion"
  | "emotional_susceptibility"
  | "identity_defensiveness"
  | "novelty_seeking"
  // Haidt Moral Foundations
  | "haidt_care"
  | "haidt_fairness"
  | "haidt_loyalty"
  | "haidt_authority"
  | "haidt_purity"
  | "haidt_liberty"
  // Big Five
  | "openness"
  | "conscientiousness"
  | "extraversion"
  | "agreeableness"
  | "neuroticism"
  // Vita Interiore
  | "core_wound"
  | "money_narrative"
  | "time_orientation"
  | "humor_style"
  | "inner_voice_tone"
  | "primary_perception_mode"
  // Media Diet
  | "advertising_cynicism"
  | "attention_span"
  // Mirofish
  | "activity_level"
  | "sentiment_bias"
  // Archetype
  | "pearson_archetype";

// ─── Salience Rules ───────────────────────────────────────────────────────────

interface SalienceRule {
  tags: CampaignTag[];           // Campaign must contain at least one of these tags
  dominant: ProfileVariable[];   // Variables that become DOMINANT (3× weight)
  modulation: ProfileVariable[]; // Variables that become MODULATION (1× weight)
  // Everything else is DORMANT (0 weight)
}

const SALIENCE_RULES: SalienceRule[] = [
  // ── Luxury / Status ──────────────────────────────────────────────────────
  {
    tags: ["luxury", "aspiration", "status", "high_price", "exclusivity"],
    dominant: [
      "economic_capital", "cultural_capital", "status_orientation",
      "money_narrative", "class_position",
    ],
    modulation: [
      "identity_defensiveness", "openness", "pearson_archetype",
      "haidt_purity", "advertising_cynicism",
    ],
  },

  // ── Value / Discount / Price ─────────────────────────────────────────────
  {
    tags: ["value", "discount", "high_price"],
    dominant: [
      "price_sensitivity", "loss_aversion", "economic_capital",
      "money_narrative", "system1_dominance",
    ],
    modulation: [
      "conscientiousness", "risk_aversion", "time_orientation",
    ],
  },

  // ── Family / Community / Belonging ───────────────────────────────────────
  {
    tags: ["family", "community", "belonging"],
    dominant: [
      "haidt_care", "haidt_loyalty", "agreeableness",
      "core_wound", "relational_field" as ProfileVariable,
    ],
    modulation: [
      "extraversion", "identity_defensiveness", "social_capital",
      "time_orientation",
    ],
  },

  // ── Tradition / Authority / Religion ─────────────────────────────────────
  {
    tags: ["tradition", "authority", "religious"],
    dominant: [
      "haidt_authority", "haidt_purity", "haidt_loyalty",
      "identity_defensiveness",
    ],
    modulation: [
      "openness", "conscientiousness", "cultural_capital",
      "time_orientation",
    ],
  },

  // ── Humor / Irony ─────────────────────────────────────────────────────────
  {
    tags: ["humor", "irony"],
    dominant: [
      "humor_style", "advertising_cynicism", "openness", "cultural_capital",
    ],
    modulation: [
      "extraversion", "neuroticism", "pearson_archetype",
    ],
  },

  // ── Rebellion / Freedom / Anti-authority ─────────────────────────────────
  {
    tags: ["rebellion", "freedom"],
    dominant: [
      "haidt_liberty", "identity_defensiveness", "openness",
      "pearson_archetype",
    ],
    modulation: [
      "haidt_authority", "neuroticism", "political_orientation" as ProfileVariable,
    ],
  },

  // ── Sustainability / Ecology ──────────────────────────────────────────────
  {
    tags: ["sustainability", "ecology"],
    dominant: [
      "haidt_care", "haidt_fairness", "openness", "cultural_capital",
    ],
    modulation: [
      "conscientiousness", "economic_capital", "time_orientation",
    ],
  },

  // ── Health / Wellness ─────────────────────────────────────────────────────
  {
    tags: ["health", "wellness"],
    dominant: [
      "haidt_care", "conscientiousness", "risk_aversion",
      "core_wound",
    ],
    modulation: [
      "neuroticism", "economic_capital", "time_orientation",
    ],
  },

  // ── Sexuality / Beauty ────────────────────────────────────────────────────
  {
    tags: ["sexuality", "beauty"],
    dominant: [
      "haidt_purity", "identity_defensiveness", "status_orientation",
      "emotional_susceptibility",
    ],
    modulation: [
      "haidt_authority", "openness", "cultural_capital",
    ],
  },

  // ── Novelty / Innovation / Technology ────────────────────────────────────
  {
    tags: ["novelty", "innovation", "technology"],
    dominant: [
      "novelty_seeking", "openness", "cultural_capital",
      "advertising_cynicism",
    ],
    modulation: [
      "conscientiousness", "risk_aversion", "economic_capital",
    ],
  },

  // ── Nostalgia ─────────────────────────────────────────────────────────────
  {
    tags: ["nostalgia"],
    dominant: [
      "time_orientation", "haidt_loyalty", "core_wound",
      "emotional_susceptibility",
    ],
    modulation: [
      "openness", "neuroticism", "pearson_archetype",
    ],
  },

  // ── Fear / Urgency / Scarcity ─────────────────────────────────────────────
  {
    tags: ["fear", "urgency", "scarcity"],
    dominant: [
      "loss_aversion", "risk_aversion", "system1_dominance",
      "emotional_susceptibility",
    ],
    modulation: [
      "neuroticism", "conscientiousness", "identity_defensiveness",
    ],
  },

  // ── Guilt / Pride ─────────────────────────────────────────────────────────
  {
    tags: ["guilt", "pride"],
    dominant: [
      "haidt_care", "haidt_fairness", "core_wound",
      "identity_defensiveness", "emotional_susceptibility",
    ],
    modulation: [
      "neuroticism", "agreeableness", "inner_voice_tone",
    ],
  },

  // ── Social Proof ──────────────────────────────────────────────────────────
  {
    tags: ["social_proof"],
    dominant: [
      "social_capital", "agreeableness", "haidt_loyalty",
    ],
    modulation: [
      "identity_defensiveness", "extraversion", "status_orientation",
    ],
  },

  // ── Political / Identity ──────────────────────────────────────────────────
  {
    tags: ["political", "identity", "gender", "class"],
    dominant: [
      "haidt_authority", "haidt_liberty", "haidt_fairness",
      "identity_defensiveness", "political_orientation" as ProfileVariable,
    ],
    modulation: [
      "openness", "cultural_capital", "core_wound",
    ],
  },
];

// ─── Salience Result ──────────────────────────────────────────────────────────

export interface ActiveVariable {
  variable: ProfileVariable;
  /** Resolved numeric value from the agent profile (0-1 normalized) */
  value: number;
  /** Resonance: how strongly this variable responds to the campaign (0-1) */
  resonance: number;
  /** Effective weight: DOMINANT_WEIGHT or MODULATION_WEIGHT */
  weight: "dominant" | "modulation";
}

export interface SalienceResult {
  dominant: ActiveVariable[];
  modulation: ActiveVariable[];
  dormant: ProfileVariable[];
  /** Campaign tags that were detected */
  detectedTags: CampaignTag[];
}

// ─── Variable Value Extractor ─────────────────────────────────────────────────

/**
 * Extract the numeric value (0-1) of a profile variable from an Agent row.
 * Returns 0.5 (neutral) if the variable is not found or not applicable.
 */
export function extractVariableValue(variable: ProfileVariable, agent: Agent): number {
  const a = agent as any;

  switch (variable) {
    // Bourdieu
    case "economic_capital":    return normalizeCapital(a.bourdieuCapital?.economic_capital ?? a.culturalCapital ?? 0.5);
    case "cultural_capital":    return normalizeCapital(a.bourdieuCapital?.cultural_capital ?? a.culturalCapital ?? 0.5);
    case "social_capital":      return normalizeCapital(a.bourdieuCapital?.social_capital ?? 0.5);
    case "class_position":      return classPositionToScore(a.bourdieuCapital?.class_position ?? a.habitusProfile?.campo_economico ?? 0.5);

    // Kahneman / Behavioral
    case "system1_dominance":   return clamp01(a.system1Dominance ?? 0.5);
    case "loss_aversion":       return clamp01((a.lossAversionCoeff ?? 2.0) / 4.0); // normalize 1-4 → 0-1
    case "price_sensitivity":   return clamp01(a.priceSensitivity ?? 0.5);
    case "status_orientation":  return clamp01(a.statusOrientation ?? 0.5);
    case "risk_aversion":       return clamp01(a.riskAversion ?? 0.5);
    case "emotional_susceptibility": return clamp01(a.emotionalSusceptibility ?? 0.5);
    case "identity_defensiveness":   return clamp01(a.identityDefensiveness ?? 0.5);
    case "novelty_seeking":     return clamp01(a.noveltySeeking ?? 0.5);

    // Haidt
    case "haidt_care":      return extractHaidt(a, "care");
    case "haidt_fairness":  return extractHaidt(a, "fairness");
    case "haidt_loyalty":   return extractHaidt(a, "loyalty");
    case "haidt_authority": return extractHaidt(a, "authority");
    case "haidt_purity":    return extractHaidt(a, "purity");
    case "haidt_liberty":   return extractHaidt(a, "liberty");

    // Big Five
    case "openness":           return extractBigFive(a, "openness");
    case "conscientiousness":  return extractBigFive(a, "conscientiousness");
    case "extraversion":       return extractBigFive(a, "extraversion");
    case "agreeableness":      return extractBigFive(a, "agreeableness");
    case "neuroticism":        return extractBigFive(a, "neuroticism");

    // Vita Interiore
    case "core_wound":     return a.coreWound ? 0.7 : 0.3; // presence = higher activation
    case "money_narrative": return moneyNarrativeToScore(a.moneyNarrative);
    case "time_orientation": return timeOrientationToScore(a.timeOrientation);
    case "humor_style":    return a.humorStyle && a.humorStyle !== "nessuno" ? 0.7 : 0.2;
    case "inner_voice_tone": return innerVoiceToScore(a.innerVoiceTone);
    case "primary_perception_mode": return 0.6; // presence is enough

    // Media Diet
    case "advertising_cynicism": return clamp01(a.mediaDiet?.advertising_cynicism ?? 0.5);
    case "attention_span": return normalizeAttentionSpan(a.mediaDiet?.attention_span_seconds ?? 30);

    // Mirofish
    case "activity_level":  return clamp01(a.activityLevel ?? a.mediaDiet?.activity_level ?? 0.5);
    case "sentiment_bias":  return clamp01((a.sentimentBias ?? 0) / 2 + 0.5); // -1..1 → 0..1

    // Archetype
    case "pearson_archetype": return 0.6; // always somewhat relevant if matched

    // Relational field (vita interiore)
    case "relational_field" as ProfileVariable: return a.relationalField ? 0.6 : 0.3;
    case "political_orientation" as ProfileVariable: return clamp01(a.politicalOrientation ?? 0.5);

    default: return 0.5;
  }
}

// ─── Resonance Calculator ─────────────────────────────────────────────────────

/**
 * Compute resonance between a profile variable and the campaign.
 * Resonance = how much the campaign "touches" this variable.
 * Returns 0-1. Higher = stronger activation.
 */
function computeResonance(
  variable: ProfileVariable,
  value: number,
  detectedTags: CampaignTag[],
  campaignTone: string,
  campaignEmotionalCharge: number,
): number {
  // Base resonance from variable value (extreme values resonate more)
  const extremity = Math.abs(value - 0.5) * 2; // 0 at 0.5, 1 at 0 or 1

  // Emotional charge amplifies resonance for emotional variables
  const emotionalVars: ProfileVariable[] = [
    "core_wound", "emotional_susceptibility", "haidt_care", "haidt_purity",
    "identity_defensiveness", "inner_voice_tone", "neuroticism",
  ];
  const emotionalBoost = emotionalVars.includes(variable) ? campaignEmotionalCharge * 0.3 : 0;

  // Tag-specific resonance boosts
  let tagBoost = 0;
  if (variable === "humor_style" && (detectedTags.includes("humor") || detectedTags.includes("irony"))) tagBoost = 0.3;
  if (variable === "haidt_purity" && detectedTags.includes("sexuality")) tagBoost = 0.4;
  if (variable === "haidt_authority" && detectedTags.includes("authority")) tagBoost = 0.4;
  if (variable === "loss_aversion" && (detectedTags.includes("scarcity") || detectedTags.includes("urgency"))) tagBoost = 0.4;
  if (variable === "money_narrative" && (detectedTags.includes("luxury") || detectedTags.includes("value"))) tagBoost = 0.3;
  if (variable === "core_wound" && (detectedTags.includes("fear") || detectedTags.includes("guilt") || detectedTags.includes("belonging"))) tagBoost = 0.4;

  return clamp01(0.4 + extremity * 0.4 + emotionalBoost + tagBoost);
}

// ─── Main Salience Calculator ─────────────────────────────────────────────────

export interface CampaignSignals {
  tags: CampaignTag[];
  tone?: string;
  emotionalCharge?: number;
  format?: string;
  channel?: string;
}

/**
 * Compute salience for a specific agent × campaign combination.
 * Returns dominant, modulation, and dormant variable sets.
 */
export function computeSalience(
  agent: Agent,
  campaign: CampaignSignals,
): SalienceResult {
  const detectedTags = campaign.tags;
  const tone = campaign.tone ?? "informational";
  const emotionalCharge = campaign.emotionalCharge ?? 0.5;

  // Collect dominant and modulation variables from matching rules
  const dominantSet = new Set<ProfileVariable>();
  const modulationSet = new Set<ProfileVariable>();

  for (const rule of SALIENCE_RULES) {
    const ruleMatches = rule.tags.some(t => detectedTags.includes(t));
    if (!ruleMatches) continue;

    for (const v of rule.dominant)    dominantSet.add(v);
    for (const v of rule.modulation)  modulationSet.add(v);
  }

  // Dominant takes priority over modulation
  Array.from(dominantSet).forEach(v => modulationSet.delete(v));

  // All known variables
  const allVars: ProfileVariable[] = [
    "economic_capital", "cultural_capital", "social_capital", "class_position",
    "system1_dominance", "loss_aversion", "price_sensitivity", "status_orientation",
    "risk_aversion", "emotional_susceptibility", "identity_defensiveness", "novelty_seeking",
    "haidt_care", "haidt_fairness", "haidt_loyalty", "haidt_authority", "haidt_purity", "haidt_liberty",
    "openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism",
    "core_wound", "money_narrative", "time_orientation", "humor_style", "inner_voice_tone", "primary_perception_mode",
    "advertising_cynicism", "attention_span",
    "activity_level", "sentiment_bias",
    "pearson_archetype",
  ];

  const dormant = allVars.filter(v => !dominantSet.has(v) && !modulationSet.has(v));

  // Build ActiveVariable arrays
  const dominant: ActiveVariable[] = Array.from(dominantSet).map(v => {
    const value = extractVariableValue(v, agent);
    return {
      variable: v,
      value,
      resonance: computeResonance(v, value, detectedTags, tone, emotionalCharge),
      weight: "dominant",
    };
  });

  const modulation: ActiveVariable[] = Array.from(modulationSet).map(v => {
    const value = extractVariableValue(v, agent);
    return {
      variable: v,
      value,
      resonance: computeResonance(v, value, detectedTags, tone, emotionalCharge),
      weight: "modulation",
    };
  });

  return { dominant, modulation, dormant, detectedTags };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function normalizeCapital(v: number | string): number {
  if (typeof v === "number") {
    // If it's already 0-1 range
    if (v <= 1) return clamp01(v);
    // If it's 1-5 scale (Bourdieu)
    return clamp01((v - 1) / 4);
  }
  return 0.5;
}

function classPositionToScore(v: string | number): number {
  if (typeof v === "number") return clamp01(v);
  const map: Record<string, number> = {
    "working_class": 0.2, "lower_middle": 0.35, "middle": 0.5,
    "upper_middle": 0.7, "upper": 0.9,
    "proletariato": 0.15, "piccola_borghesia": 0.35, "borghesia": 0.65, "alta_borghesia": 0.85,
  };
  return map[v] ?? 0.5;
}

function extractHaidt(agent: any, foundation: string): number {
  const profile = agent.haidtProfile;
  if (!profile) return 0.5;
  if (typeof profile === "string") {
    try {
      const parsed = JSON.parse(profile);
      return haidtLevelToScore(parsed[foundation] ?? parsed[`${foundation}_harm`] ?? "M");
    } catch { return 0.5; }
  }
  if (typeof profile === "object") {
    const v = profile[foundation] ?? profile[`${foundation}_harm`];
    if (typeof v === "number") return clamp01(v);
    return haidtLevelToScore(v ?? "M");
  }
  return 0.5;
}

function haidtLevelToScore(level: string): number {
  if (level === "H" || level === "high") return 0.8;
  if (level === "L" || level === "low") return 0.2;
  return 0.5;
}

function extractBigFive(agent: any, trait: string): number {
  const bf = agent.bigFiveProfile ?? agent.bigFive;
  if (!bf) return 0.5;
  const parsed = typeof bf === "string" ? JSON.parse(bf) : bf;
  const levels = parsed.levels ?? parsed;
  const raw = parsed.raw;
  if (raw?.[trait] !== undefined) return clamp01(raw[trait]);
  const level = levels[trait];
  if (level === "high") return 0.8;
  if (level === "low") return 0.2;
  return 0.5;
}

function moneyNarrativeToScore(narrative?: string): number {
  if (!narrative) return 0.5;
  const n = narrative.toLowerCase();
  if (n.includes("scars") || n.includes("ansia") || n.includes("paura")) return 0.8;
  if (n.includes("strumento") || n.includes("neutro")) return 0.4;
  if (n.includes("status") || n.includes("potere")) return 0.7;
  if (n.includes("libertà") || n.includes("sicurezza")) return 0.6;
  return 0.5;
}

function timeOrientationToScore(orientation?: string): number {
  if (!orientation) return 0.5;
  const map: Record<string, number> = {
    "past_oriented": 0.7, "present_hedonist": 0.8,
    "future_oriented": 0.3, "fatalistic": 0.6,
  };
  return map[orientation] ?? 0.5;
}

function innerVoiceToScore(tone?: string): number {
  if (!tone) return 0.5;
  const map: Record<string, number> = {
    "critico": 0.8, "ansioso": 0.75, "ironico": 0.6,
    "incoraggiante": 0.4, "neutro": 0.5,
  };
  return map[tone] ?? 0.5;
}

function normalizeAttentionSpan(seconds: number): number {
  // 5s = very short (0.1), 30s = medium (0.5), 120s = long (0.9)
  return clamp01(seconds / 120);
}
