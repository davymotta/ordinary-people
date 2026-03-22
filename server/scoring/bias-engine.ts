/**
 * Ordinary People — Bias Engine
 *
 * 13 cognitive biases computed deterministically from the agent profile.
 * Each bias is a function of existing profile variables — no new parameters needed.
 *
 * Biases distort the gut_reaction in Level 2 of the cascade.
 * They are NOT random noise — they are systematic, predictable distortions
 * that make the agent's reactions more realistic.
 *
 * Sources: Kahneman (2011), Cialdini (2001), Thaler & Sunstein (2008),
 *          Haidt (2012), Tversky & Kahneman (1974).
 */

import type { Agent } from "../../drizzle/schema";
import type { CampaignSignals } from "./salience-calculator";

// ─── Bias Vector ──────────────────────────────────────────────────────────────

export interface BiasVector {
  /** Selective attention: tendency to notice information that confirms existing beliefs.
   *  High = ignores disconfirming evidence. Derived from: identity_defensiveness, haidt_loyalty */
  selective_attention: number;           // 0-1

  /** Anchoring susceptibility: how much the first price/number seen influences judgment.
   *  High = strongly anchored. Derived from: system1_dominance, conscientiousness (inverse) */
  anchoring_susceptibility: number;      // 0-1

  /** Framing sensitivity: how much the presentation frame (gain vs loss) changes reaction.
   *  High = very frame-sensitive. Derived from: loss_aversion, emotional_susceptibility */
  framing_sensitivity: number;           // 0-1

  /** Availability heuristic: overweights vivid, recent, or personally relevant examples.
   *  High = easily swayed by anecdotes. Derived from: system1_dominance, neuroticism */
  availability_heuristic: number;        // 0-1

  /** Social proof susceptibility: tendency to follow what others do.
   *  High = bandwagon follower. Derived from: agreeableness, social_capital, haidt_loyalty */
  social_proof_susceptibility: number;   // 0-1

  /** Authority bias: deference to perceived experts or authority figures.
   *  High = trusts authority. Derived from: haidt_authority, conscientiousness */
  authority_bias: number;                // 0-1

  /** Scarcity bias: overvalues things perceived as rare or limited.
   *  High = strongly triggered by scarcity. Derived from: loss_aversion, status_orientation */
  scarcity_bias: number;                 // 0-1

  /** Confirmation bias: seeks information that confirms pre-existing beliefs.
   *  High = closed to new information. Derived from: identity_defensiveness, openness (inverse) */
  confirmation_bias: number;             // 0-1

  /** Bandwagon vs contrarian: positive = follows crowd, negative = opposes crowd.
   *  Range: -1 (strong contrarian) to +1 (strong bandwagon).
   *  Derived from: agreeableness, haidt_liberty (inverse), identity_defensiveness */
  bandwagon_contrarian: number;          // -1 to +1

  /** In-group favoritism: prefers products/messages associated with own group.
   *  High = strong in-group preference. Derived from: haidt_loyalty, cultural_capital */
  ingroup_favoritism: number;            // 0-1

  /** Optimism bias: overestimates positive outcomes for self.
   *  High = unrealistically optimistic. Derived from: neuroticism (inverse), extraversion */
  optimism_bias: number;                 // 0-1

  /** Status quo bias: preference for the current state of affairs.
   *  High = resists change. Derived from: openness (inverse), risk_aversion, conscientiousness */
  status_quo_bias: number;               // 0-1

  /** Veblen effect susceptibility: higher price = higher perceived quality/desirability.
   *  High = price signals quality. Derived from: status_orientation, cultural_capital, economic_capital */
  veblen_susceptibility: number;         // 0-1
}

// ─── Bias Computation ─────────────────────────────────────────────────────────

/**
 * Compute the full bias vector from an agent profile.
 * All values are deterministic — same profile always produces same biases.
 */
export function computeBiasVector(agent: Agent): BiasVector {
  const a = agent as any;

  // Extract raw values (0-1 normalized)
  const system1 = clamp01(a.system1Dominance ?? 0.5);
  const lossAversion = clamp01((a.lossAversionCoeff ?? 2.0) / 4.0);
  const identityDef = clamp01(a.identityDefensiveness ?? 0.5);
  const emotSusc = clamp01(a.emotionalSusceptibility ?? 0.5);
  const statusOr = clamp01(a.statusOrientation ?? 0.5);
  const riskAv = clamp01(a.riskAversion ?? 0.5);
  const noveltySk = clamp01(a.noveltySeeking ?? 0.5);

  // Big Five
  const openness = extractBigFive(a, "openness");
  const conscientiousness = extractBigFive(a, "conscientiousness");
  const extraversion = extractBigFive(a, "extraversion");
  const agreeableness = extractBigFive(a, "agreeableness");
  const neuroticism = extractBigFive(a, "neuroticism");

  // Haidt
  const hAuthority = extractHaidt(a, "authority");
  const hLoyalty = extractHaidt(a, "loyalty");
  const hLiberty = extractHaidt(a, "liberty");

  // Capital
  const culturalCap = normalizeCapital(a.bourdieuCapital?.cultural_capital ?? a.culturalCapital ?? 0.5);
  const economicCap = normalizeCapital(a.bourdieuCapital?.economic_capital ?? a.incomeEstimate ? incomeToCapital(a.incomeEstimate) : 0.5);
  const socialCap = normalizeCapital(a.bourdieuCapital?.social_capital ?? 0.5);

  return {
    selective_attention:        clamp01(identityDef * 0.6 + hLoyalty * 0.4),
    anchoring_susceptibility:   clamp01(system1 * 0.5 + (1 - conscientiousness) * 0.5),
    framing_sensitivity:        clamp01(lossAversion * 0.6 + emotSusc * 0.4),
    availability_heuristic:     clamp01(system1 * 0.5 + neuroticism * 0.5),
    social_proof_susceptibility: clamp01(agreeableness * 0.4 + socialCap * 0.3 + hLoyalty * 0.3),
    authority_bias:             clamp01(hAuthority * 0.6 + conscientiousness * 0.4),
    scarcity_bias:              clamp01(lossAversion * 0.5 + statusOr * 0.5),
    confirmation_bias:          clamp01(identityDef * 0.5 + (1 - openness) * 0.5),
    bandwagon_contrarian:       computeBandwagon(agreeableness, hLiberty, identityDef),
    ingroup_favoritism:         clamp01(hLoyalty * 0.5 + culturalCap * 0.3 + (1 - openness) * 0.2),
    optimism_bias:              clamp01((1 - neuroticism) * 0.5 + extraversion * 0.5),
    status_quo_bias:            clamp01((1 - openness) * 0.4 + riskAv * 0.4 + conscientiousness * 0.2),
    veblen_susceptibility:      clamp01(statusOr * 0.5 + culturalCap * 0.3 + economicCap * 0.2),
  };
}

/**
 * Apply bias distortions to the gut_reaction score.
 * Returns the distorted gut_reaction (still clamped to -1..+1).
 *
 * The distortions are campaign-specific: not all biases activate for every campaign.
 */
export function applyBiases(
  gutReaction: number,
  biasVector: BiasVector,
  campaign: CampaignSignals,
  biasIntensity: number = 1.0,
): number {
  let distorted = gutReaction;
  const tags = campaign.tags;

  // Framing sensitivity: loss-framed campaigns amplify negative reactions
  if (tags.some(t => ["fear", "scarcity", "urgency"].includes(t))) {
    const framingEffect = biasVector.framing_sensitivity * 0.2 * biasIntensity;
    distorted -= framingEffect; // loss frame pushes toward negative
  }

  // Scarcity bias: amplifies positive reaction to scarcity signals
  if (tags.some(t => ["scarcity", "exclusivity", "urgency"].includes(t))) {
    const scarcityEffect = biasVector.scarcity_bias * 0.15 * biasIntensity;
    distorted += scarcityEffect * Math.sign(gutReaction); // amplifies existing direction
  }

  // Authority bias: amplifies positive reaction to authority signals
  if (tags.some(t => ["authority", "tradition"].includes(t))) {
    const authorityEffect = biasVector.authority_bias * 0.15 * biasIntensity;
    distorted += authorityEffect * Math.sign(gutReaction);
  }

  // Social proof: pulls toward positive if social proof is present
  if (tags.includes("social_proof")) {
    const socialEffect = biasVector.social_proof_susceptibility * 0.15 * biasIntensity;
    distorted += socialEffect; // social proof is generally positive
  }

  // Veblen effect: high price can INCREASE desirability for status-oriented agents
  if (tags.some(t => ["luxury", "high_price", "exclusivity"].includes(t))) {
    const veblenEffect = biasVector.veblen_susceptibility * 0.20 * biasIntensity;
    distorted += veblenEffect; // Veblen: price signals quality
  }

  // Availability heuristic: vivid/emotional content amplifies reaction
  if (tags.some(t => ["fear", "guilt", "pride", "sexuality"].includes(t))) {
    const availEffect = biasVector.availability_heuristic * 0.10 * biasIntensity;
    distorted += availEffect * Math.sign(gutReaction);
  }

  // Anchoring: high-price anchors can shift perception
  if (tags.includes("high_price")) {
    const anchorEffect = (biasVector.anchoring_susceptibility - 0.5) * 0.10 * biasIntensity;
    distorted += anchorEffect;
  }

  // Status quo bias: reduces reaction to novelty/change
  if (tags.some(t => ["novelty", "innovation", "rebellion"].includes(t))) {
    const sqEffect = biasVector.status_quo_bias * 0.15 * biasIntensity;
    distorted -= sqEffect; // status quo bias resists novelty
  }

  return clamp(distorted, -1, 1);
}

/**
 * Generate a human-readable description of the active biases for a campaign.
 * Used in the emotional_signature of the reaction.
 */
export function describeActiveBiases(
  biasVector: BiasVector,
  campaign: CampaignSignals,
): string[] {
  const tags = campaign.tags;
  const descriptions: string[] = [];

  if (tags.some(t => ["scarcity", "exclusivity", "urgency"].includes(t)) && biasVector.scarcity_bias > 0.6) {
    descriptions.push("bias di scarsità attivato — la limitatezza amplifica il desiderio");
  }
  if (tags.some(t => ["luxury", "high_price"].includes(t)) && biasVector.veblen_susceptibility > 0.6) {
    descriptions.push("effetto Veblen — il prezzo alto segnala qualità e status");
  }
  if (tags.some(t => ["fear", "scarcity"].includes(t)) && biasVector.framing_sensitivity > 0.6) {
    descriptions.push("sensibilità al framing di perdita — il messaggio negativo amplifica la risposta");
  }
  if (tags.includes("social_proof") && biasVector.social_proof_susceptibility > 0.6) {
    descriptions.push("effetto bandwagon — la prova sociale rafforza la reazione positiva");
  }
  if (tags.some(t => ["authority", "tradition"].includes(t)) && biasVector.authority_bias > 0.6) {
    descriptions.push("bias di autorità — la fonte autorevole aumenta la credibilità");
  }
  if (tags.some(t => ["novelty", "innovation"].includes(t)) && biasVector.status_quo_bias > 0.6) {
    descriptions.push("bias dello status quo — la novità genera resistenza");
  }

  return descriptions;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computeBandwagon(agreeableness: number, liberty: number, identityDef: number): number {
  // Positive = bandwagon, Negative = contrarian
  // High agreeableness + low liberty = bandwagon
  // Low agreeableness + high liberty + high identity defensiveness = contrarian
  const raw = agreeableness * 0.5 - liberty * 0.3 - identityDef * 0.2;
  return clamp(raw * 2 - 0.5, -1, 1); // normalize to -1..+1
}

function extractBigFive(agent: any, trait: string): number {
  const bf = agent.bigFiveProfile ?? agent.bigFive;
  if (!bf) return 0.5;
  const parsed = typeof bf === "string" ? JSON.parse(bf) : bf;
  const raw = parsed.raw;
  if (raw?.[trait] !== undefined) return clamp01(raw[trait]);
  const level = (parsed.levels ?? parsed)[trait];
  if (level === "high") return 0.8;
  if (level === "low") return 0.2;
  return 0.5;
}

function extractHaidt(agent: any, foundation: string): number {
  const profile = agent.haidtProfile;
  if (!profile) return 0.5;
  const parsed = typeof profile === "string" ? JSON.parse(profile) : profile;
  const v = parsed[foundation] ?? parsed[`${foundation}_harm`];
  if (typeof v === "number") return clamp01(v);
  if (v === "H" || v === "high") return 0.8;
  if (v === "L" || v === "low") return 0.2;
  return 0.5;
}

function normalizeCapital(v: number | string): number {
  if (typeof v === "number") {
    if (v <= 1) return clamp01(v);
    return clamp01((v - 1) / 4); // 1-5 → 0-1
  }
  return 0.5;
}

function incomeToCapital(income: number): number {
  // Map income (€/year) to 0-1 capital score
  if (income < 15000) return 0.15;
  if (income < 25000) return 0.30;
  if (income < 40000) return 0.50;
  if (income < 70000) return 0.70;
  return 0.85;
}

/**
 * Format the bias vector as a readable summary for system prompts.
 * Returns a concise Italian description of the 3-4 dominant biases.
 */
export function formatBiasVectorForPrompt(bv: BiasVector): string {
  const labels: Record<keyof BiasVector, string> = {
    selective_attention: "attenzione selettiva (tendi a notare solo ciò che conferma le tue credenze)",
    anchoring_susceptibility: "ancoraggio (il primo numero che vedi influenza molto il tuo giudizio)",
    framing_sensitivity: "sensibilità al framing (reagisci diversamente se il messaggio è presentato come perdita vs guadagno)",
    availability_heuristic: "euristica della disponibilità (esempi vividi e recenti pesano più delle statistiche)",
    social_proof_susceptibility: "riprova sociale (ti fidi di più di qualcosa se molti altri lo usano)",
    authority_bias: "bias di autorità (le fonti autorevoli aumentano la tua fiducia)",
    scarcity_bias: "bias di scarsità (la limitatezza aumenta il desiderio)",
    confirmation_bias: "bias di conferma (cerchi informazioni che confermano ciò che già pensi)",
    bandwagon_contrarian: "tendenza conformista (segui la massa) o contrarian (ti distingui dalla massa)",
    ingroup_favoritism: "favoritismo in-group (preferisci prodotti associati al tuo gruppo)",
    optimism_bias: "ottimismo (tendi a sovrastimare i risultati positivi per te)",
    status_quo_bias: "bias dello status quo (preferisci le cose come stanno)",
    veblen_susceptibility: "effetto Veblen (il prezzo alto segnala qualità e status)",
  };

  // Find dominant biases (|value| > 0.25)
  const dominant = (Object.entries(bv) as [keyof BiasVector, number][])
    .filter(([k, v]) => {
      if (k === "bandwagon_contrarian") return Math.abs(v) > 0.3;
      return v > 0.25;
    })
    .sort((a, b) => {
      const absA = Math.abs(a[1]);
      const absB = Math.abs(b[1]);
      return absB - absA;
    })
    .slice(0, 4);

  if (dominant.length === 0) return "nessun bias cognitivo dominante";

  return dominant.map(([k, v]) => {
    if (k === "bandwagon_contrarian") {
      return v > 0
        ? `tendenza conformista forte (segui la massa, ti fidi del consenso)`
        : `tendenza contrarian (ti distingui dalla massa, diffidi del mainstream)`;
    }
    const intensity = v > 0.5 ? "forte" : "moderato";
    return `${labels[k]} — ${intensity}`;
  }).join("; ");
}
