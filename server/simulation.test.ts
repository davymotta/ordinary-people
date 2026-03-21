import { describe, expect, it } from "vitest";
import {
  simulateReaction,
  runSimulation,
  computeWeightedMarketInterest,
  spearmanRho,
  blendRegimeModifiers,
  type RegimeState,
  type ScoreBreakdown,
} from "./simulation";
import type { Persona, Campaign, Regime } from "../drizzle/schema";

// ─── TEST FIXTURES ──────────────────────────────────────────────────

function makePersona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: 1,
    archetypeId: "test_persona",
    label: "Test Persona",
    ageMin: 30,
    ageMax: 45,
    incomeMin: 25000,
    incomeMax: 40000,
    region: "nord",
    education: "diploma",
    householdType: "couple_children",
    employment: "employed",
    urbanization: "urban",
    digitalLiteracy: "medium",
    noveltySeeking: 0.5,
    statusOrientation: 0.4,
    priceSensitivity: 0.6,
    riskAversion: 0.5,
    emotionalSusceptibility: 0.5,
    identityDefensiveness: 0.4,
    conformismIndex: 0.5,
    authorityTrust: 0.5,
    delayedGratification: 0.5,
    culturalCapital: 0.5,
    locusOfControl: 0.5,
    populationShare: 0.08,
    marketSpendShare: 0.07,
    comfortablePriceMid: 50,
    comfortablePriceRange: 30,
    topics: ["food", "fashion"],
    channels: ["instagram", "facebook"],
    formats: ["short_video", "image"],
    topicAffinities: { food: 0.8, fashion: 0.6, tech: 0.3 },
    formatAffinities: { short_video: 0.7, image: 0.6, long_article: 0.2 },
    channelUsage: { instagram: 0.7, facebook: 0.5, tiktok: 0.3 },
    identityProfile: { family: 0.8, tradition: 0.5, innovation: 0.3 },
    bibliographyRefs: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Persona;
}

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 1,
    name: "Test Campaign",
    topics: ["food", "fashion"],
    tone: "aspirational",
    format: "short_video",
    emotionalCharge: 0.6,
    statusSignal: 0.5,
    priceSignal: 0.5,
    noveltySignal: 0.5,
    tribalIdentitySignal: 0.5,
    pricePoint: 50,
    channel: "instagram",
    regimeState: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Campaign;
}

function makeRegime(name: string, modValue: number = 1.0): Regime {
  return {
    id: 1,
    name,
    description: `${name} regime`,
    modPriceSensitivity: modValue,
    modStatusOrientation: modValue,
    modNoveltySeeking: modValue,
    modRiskAversion: modValue,
    modEmotionalSusceptibility: modValue,
    modIdentityDefensiveness: modValue,
    modConformismIndex: modValue,
    modAuthorityTrust: modValue,
    modDelayedGratification: modValue,
    modCulturalCapital: modValue,
    modLocusOfControl: modValue,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Regime;
}

const neutralMods: Record<string, number> = {
  modPriceSensitivity: 1.0,
  modStatusOrientation: 1.0,
  modNoveltySeeking: 1.0,
  modRiskAversion: 1.0,
  modEmotionalSusceptibility: 1.0,
  modIdentityDefensiveness: 1.0,
  modConformismIndex: 1.0,
  modAuthorityTrust: 1.0,
  modDelayedGratification: 1.0,
  modCulturalCapital: 1.0,
  modLocusOfControl: 1.0,
};

const defaultRegimeState: RegimeState = {
  stable: 1.0,
  growth: 0.0,
  crisis: 0.0,
  trauma: 0.0,
  transition: 0.0,
  stagnation: 0.0,
};

// ─── TESTS ──────────────────────────────────────────────────────────

describe("simulateReaction", () => {
  it("returns a score between -1 and +1", () => {
    const persona = makePersona();
    const campaign = makeCampaign();
    const result = simulateReaction(persona, campaign, neutralMods);

    expect(result.finalScore).toBeGreaterThanOrEqual(-1);
    expect(result.finalScore).toBeLessThanOrEqual(1);
  });

  it("returns all required breakdown fields", () => {
    const result = simulateReaction(makePersona(), makeCampaign(), neutralMods);

    expect(result).toHaveProperty("emotionalResonance");
    expect(result).toHaveProperty("identityMatch");
    expect(result).toHaveProperty("statusAlignment");
    expect(result).toHaveProperty("gutReaction");
    expect(result).toHaveProperty("topicRelevance");
    expect(result).toHaveProperty("formatFit");
    expect(result).toHaveProperty("priceAcceptability");
    expect(result).toHaveProperty("channelAmplification");
    expect(result).toHaveProperty("cognitiveModulation");
    expect(result).toHaveProperty("finalScore");
    expect(result).toHaveProperty("dominantSignal");
    expect(result).toHaveProperty("system2Active");
    expect(result).toHaveProperty("riskFlags");
    expect(Array.isArray(result.riskFlags)).toBe(true);
  });

  it("high emotional charge + high susceptibility → high emotional resonance", () => {
    const persona = makePersona({ emotionalSusceptibility: 0.9 });
    const campaign = makeCampaign({ emotionalCharge: 0.9 });
    const result = simulateReaction(persona, campaign, neutralMods);

    expect(result.emotionalResonance).toBeGreaterThan(0.7);
  });

  it("low emotional charge + low susceptibility → low emotional resonance", () => {
    const persona = makePersona({ emotionalSusceptibility: 0.1 });
    const campaign = makeCampaign({ emotionalCharge: 0.1 });
    const result = simulateReaction(persona, campaign, neutralMods);

    expect(result.emotionalResonance).toBeLessThan(0.1);
  });

  it("PRICE_SHOCK risk flag when price >> comfort", () => {
    const persona = makePersona({ comfortablePriceMid: 30, statusOrientation: 0.3 });
    const campaign = makeCampaign({ pricePoint: 200 });
    const result = simulateReaction(persona, campaign, neutralMods);

    expect(result.riskFlags).toContain("PRICE_SHOCK");
  });

  it("Veblen effect: high status persona + moderately high price → boosted status alignment", () => {
    const persona = makePersona({ statusOrientation: 0.85, comfortablePriceMid: 100 });
    const campaignModerate = makeCampaign({ pricePoint: 150, statusSignal: 0.8 });
    const campaignLow = makeCampaign({ pricePoint: 30, statusSignal: 0.8 });

    const resultModerate = simulateReaction(persona, campaignModerate, neutralMods);
    const resultLow = simulateReaction(persona, campaignLow, neutralMods);

    // Veblen effect: moderate-high price should produce higher status alignment
    expect(resultModerate.statusAlignment).toBeGreaterThan(resultLow.statusAlignment);
  });

  it("NOVELTY_RESISTANCE flag when risk-averse persona meets high novelty", () => {
    const persona = makePersona({ riskAversion: 0.85 });
    const campaign = makeCampaign({ noveltySignal: 0.8 });
    const result = simulateReaction(persona, campaign, neutralMods);

    expect(result.riskFlags).toContain("NOVELTY_RESISTANCE");
  });

  it("channel transformation: TikTok amplifies emotional charge", () => {
    const persona = makePersona({ emotionalSusceptibility: 0.7 });
    const campaignTiktok = makeCampaign({ channel: "tiktok", emotionalCharge: 0.6 });
    const campaignPrint = makeCampaign({ channel: "print", emotionalCharge: 0.6 });

    const resultTiktok = simulateReaction(persona, campaignTiktok, neutralMods);
    const resultPrint = simulateReaction(persona, campaignPrint, neutralMods);

    // TikTok amplifies emotional charge (1.35) vs print (0.7)
    expect(resultTiktok.emotionalResonance).toBeGreaterThan(resultPrint.emotionalResonance);
  });

  it("System 2 activates more in ambiguity zone", () => {
    // Low emotional charge → weak gut reaction → ambiguity → S2 activates
    const persona = makePersona({ emotionalSusceptibility: 0.2, statusOrientation: 0.2, identityDefensiveness: 0.2 });
    const campaign = makeCampaign({ emotionalCharge: 0.2, statusSignal: 0.2, tribalIdentitySignal: 0.2 });
    const result = simulateReaction(persona, campaign, neutralMods);

    expect(result.system2Active).toBe(true);
  });

  it("regime modifiers affect final score", () => {
    const persona = makePersona({ priceSensitivity: 0.5 });
    const campaign = makeCampaign({ pricePoint: 80 });

    // Neutral regime
    const resultNeutral = simulateReaction(persona, campaign, neutralMods);

    // Crisis regime: amplify price sensitivity
    const crisisMods = { ...neutralMods, modPriceSensitivity: 1.5, modEmotionalSusceptibility: 1.3 };
    const resultCrisis = simulateReaction(persona, campaign, crisisMods);

    // Scores should differ because regime modifiers change psychographics
    expect(resultNeutral.finalScore).not.toEqual(resultCrisis.finalScore);
  });
});

describe("blendRegimeModifiers", () => {
  it("returns neutral modifiers when only stable regime is active", () => {
    const regimes = [makeRegime("stable", 1.0)];
    const state: RegimeState = { stable: 1.0, growth: 0, crisis: 0, trauma: 0, transition: 0, stagnation: 0 };
    const blended = blendRegimeModifiers(state, regimes);

    expect(blended.modPriceSensitivity).toBeCloseTo(1.0, 2);
    expect(blended.modStatusOrientation).toBeCloseTo(1.0, 2);
  });

  it("blends two regimes proportionally", () => {
    const stableRegime = makeRegime("stable", 1.0);
    const crisisRegime = makeRegime("crisis", 1.5);
    crisisRegime.id = 2;
    const regimes = [stableRegime, crisisRegime];

    const state: RegimeState = { stable: 0.6, growth: 0, crisis: 0.4, trauma: 0, transition: 0, stagnation: 0 };
    const blended = blendRegimeModifiers(state, regimes);

    // 0.6 * 1.0 + 0.4 * 1.5 = 1.2
    expect(blended.modPriceSensitivity).toBeCloseTo(1.2, 2);
  });

  it("handles missing regime names gracefully", () => {
    const regimes = [makeRegime("stable", 1.0)];
    const state: RegimeState = { stable: 0.5, growth: 0.5, crisis: 0, trauma: 0, transition: 0, stagnation: 0 };
    const blended = blendRegimeModifiers(state, regimes);

    // Only stable contributes: 0.5 * 1.0 = 0.5 (growth regime not found)
    expect(blended.modPriceSensitivity).toBeCloseTo(0.5, 2);
  });
});

describe("spearmanRho", () => {
  it("returns 1.0 for perfectly correlated rankings", () => {
    const predicted = [0.9, 0.7, 0.5, 0.3, 0.1];
    const actual = [0.8, 0.6, 0.4, 0.2, 0.0];
    const rho = spearmanRho(predicted, actual);

    expect(rho).toBeCloseTo(1.0, 4);
  });

  it("returns -1.0 for perfectly inverse rankings", () => {
    const predicted = [0.9, 0.7, 0.5, 0.3, 0.1];
    const actual = [0.0, 0.2, 0.4, 0.6, 0.8];
    const rho = spearmanRho(predicted, actual);

    expect(rho).toBeCloseTo(-1.0, 4);
  });

  it("returns 0 for arrays with fewer than 2 elements", () => {
    expect(spearmanRho([1], [1])).toBe(0);
    expect(spearmanRho([], [])).toBe(0);
  });

  it("handles identical values", () => {
    const predicted = [0.5, 0.5, 0.5];
    const actual = [0.3, 0.6, 0.9];
    const rho = spearmanRho(predicted, actual);

    // With identical predicted values, ranking is arbitrary
    expect(rho).toBeGreaterThanOrEqual(-1);
    expect(rho).toBeLessThanOrEqual(1);
  });
});

describe("computeWeightedMarketInterest", () => {
  it("weights results by marketSpendShare", () => {
    const p1 = makePersona({ archetypeId: "p1", marketSpendShare: 0.8 });
    const p2 = makePersona({ archetypeId: "p2", marketSpendShare: 0.2 });

    const results = [
      { personaId: "p1", personaLabel: "P1", campaignId: 1, breakdown: { finalScore: 0.5 } as ScoreBreakdown },
      { personaId: "p2", personaLabel: "P2", campaignId: 1, breakdown: { finalScore: -0.5 } as ScoreBreakdown },
    ];

    const wmi = computeWeightedMarketInterest(results, [p1, p2]);

    // (0.5 * 0.8 + (-0.5) * 0.2) / (0.8 + 0.2) = (0.4 - 0.1) / 1.0 = 0.3
    expect(wmi).toBeCloseTo(0.3, 2);
  });

  it("returns 0 when no personas match", () => {
    const results = [
      { personaId: "unknown", personaLabel: "?", campaignId: 1, breakdown: { finalScore: 0.5 } as ScoreBreakdown },
    ];
    const wmi = computeWeightedMarketInterest(results, []);
    expect(wmi).toBe(0);
  });
});

describe("runSimulation", () => {
  it("produces results for every persona × campaign combination", () => {
    const personas = [
      makePersona({ archetypeId: "p1", id: 1 }),
      makePersona({ archetypeId: "p2", id: 2 }),
    ];
    const campaigns = [
      makeCampaign({ id: 1 }),
      makeCampaign({ id: 2 }),
    ];
    const regimes = [makeRegime("stable", 1.0)];

    const results = runSimulation(personas, campaigns, regimes, defaultRegimeState);

    expect(results).toHaveLength(4); // 2 personas × 2 campaigns
    expect(results.every(r => r.breakdown.finalScore >= -1 && r.breakdown.finalScore <= 1)).toBe(true);
  });
});
