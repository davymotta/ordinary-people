/**
 * Calibrated Statistical Sampler for Ordinary People — v2.0
 *
 * Updated with empirical data from research package (filesdiricerca.zip):
 * - Big Five: global norms 0.50 mean, SD 0.12-0.15 (Costa & McCrae 2001, Johnson 2014, N=307,313)
 * - Gender shifts: Costa, Terracciano & McCrae (2001, N=26,000, 26 cultures)
 * - Age shifts: Roberts, Walton & Viechtbauer (2006) meta-analysis
 * - Inter-trait correlations: DeYoung (2006) — corrected matrix
 * - Discretization: ±1 SD thresholds [0.37, 0.63] giving 16/68/16% split
 * - Country Big Five shifts: Schmitt et al. (2007, 56 nations)
 * - Pearson archetypes: PMAI normative data, Mark & Pearson (2001)
 * - Cultural adjustments: 6 explicit rules per cluster
 * - Haidt foundations: float 0-1 (Graham et al. 2011, Atari et al. 2023)
 * - Inglehart-Welzel: 10 clusters with coordinates (WVS Wave 7)
 * - Bourdieu capital: 5-level integer scale, power-law distribution
 * - Schema: aligned with agent_profile_schema.json v1.0
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type BigFiveLevel = "low" | "medium" | "high";
export type CapitalLevel = 1 | 2 | 3 | 4 | 5;
export type PoliticalOrientation = "progressive" | "moderate" | "conservative";
export type Generation = "silent" | "boomer" | "genx" | "millennial" | "genz" | "alpha";
export type Gender = "male" | "female";
export type Stance = "supportive" | "opposing" | "neutral" | "observer";
export type Urbanization = "rural" | "suburban" | "urban" | "metro";
export type DominantMedium = "tv_broadcast" | "tv_cable" | "early_internet" | "social_first" | "mobile_native";
export type ContentOrientation = "mainstream" | "niche" | "curated" | "algorithmic";
export type NewsConsumption = "traditional_media" | "digital_news" | "social_news" | "minimal";

export interface BigFiveRaw {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface BigFiveProfile {
  raw: BigFiveRaw;
  levels: {
    openness: BigFiveLevel;
    conscientiousness: BigFiveLevel;
    extraversion: BigFiveLevel;
    agreeableness: BigFiveLevel;
    neuroticism: BigFiveLevel;
  };
}

export interface HaidtProfile {
  care: number;           // 0.0-1.0
  equality: number;       // 0.0-1.0 (fairness/cheating)
  proportionality: number;// 0.0-1.0
  loyalty: number;        // 0.0-1.0
  authority: number;      // 0.0-1.0
  purity: number;         // 0.0-1.0 (sanctity)
  political_orientation: number; // 0.0=very progressive, 1.0=very conservative
}

export interface HofstedeIndividual {
  power_distance: number;        // 0-100
  individualism: number;         // 0-100
  masculinity: number;           // 0-100
  uncertainty_avoidance: number; // 0-100
  long_term_orientation: number; // 0-100
  indulgence: number;            // 0-100
}

export interface IngelhartWelzel {
  traditional_secular: number;     // -2.0 to +2.0
  survival_selfexpression: number; // -2.0 to +2.0
}

export interface BourdieuCapital {
  economic_capital: CapitalLevel;  // 1-5
  cultural_capital: CapitalLevel;  // 1-5
  social_capital: CapitalLevel;    // 1-5
  class_position: string;
  education_level: string;
  income_quintile: CapitalLevel;
}

export interface MediaDiet {
  dominant_medium: DominantMedium;
  platforms: string[];
  content_orientation: ContentOrientation;
  news_consumption: NewsConsumption;
  advertising_cynicism: number;    // 0.0-1.0
  attention_span_seconds: number;
  newsletter_affinity: number;     // 0.0-1.0
  sharing_propensity: number;      // 0.0-1.0
}

export interface MirofishParams {
  activity_level: number;          // 0.0-1.0
  sentiment_bias: number;          // -1.0 to +1.0
  stance: Stance;
  influence_weight: number;        // 0.0-1.0
  echo_chamber_strength: number;   // 0.0-1.0
  response_delay_hours: number;
  sharing_propensity: number;      // 0.0-1.0
}

export interface SampledProfile {
  id: string;
  generated_at: string;

  // Demographics
  gender: Gender;
  birth_year: number;
  age_2026: number;
  generation: Generation;
  country_code: string;  // ISO 3166-1 alpha-3
  country_name: string;
  cultural_cluster: string;
  urbanization: Urbanization;

  // Axis 1 — Personality
  big_five: BigFiveProfile;
  pearson_archetype: {
    primary: string;
    secondary: string | null;
    archetype_strength: "low" | "medium" | "high";
  };

  // Axis 2 — Moral Foundations
  haidt: HaidtProfile;

  // Axis 3 — Cultural
  hofstede: HofstedeIndividual;
  inglehart_welzel: IngelhartWelzel;

  // Axis 4 — Capital
  bourdieu: BourdieuCapital;

  // Axis 5 — Media Diet
  media_diet: MediaDiet;

  // Behavioral (Mirofish)
  mirofish: MirofishParams;

  // Derived
  coherence_score: number;
  sampling_method: string;
}

export interface SamplingOptions {
  targetMarket?: string;
  generation?: Generation;
  gender?: Gender;
  culturalCluster?: string;
  politicalOrientation?: PoliticalOrientation;
  urbanization?: Urbanization;
  archetypeFilter?: string[];
  seed?: number;
}

// ─── Constants: Empirical Data from Research Package ─────────────────────────

// Big Five global norms (Costa & McCrae 2001, Johnson 2014, N=307,313)
// Scale: 0.0-1.0 normalized
const BIG_FIVE_GLOBAL: Record<keyof BigFiveRaw, { mean: number; sd: number }> = {
  openness:          { mean: 0.52, sd: 0.13 },
  conscientiousness: { mean: 0.50, sd: 0.14 },
  extraversion:      { mean: 0.50, sd: 0.13 },
  agreeableness:     { mean: 0.53, sd: 0.13 },
  neuroticism:       { mean: 0.48, sd: 0.14 },
};

// Gender shifts (female - male) from Costa, Terracciano & McCrae (2001)
const GENDER_SHIFTS: Record<Gender, Partial<Record<keyof BigFiveRaw, number>>> = {
  male:   { openness: 0.00, conscientiousness: -0.01, extraversion: -0.01, agreeableness: -0.04, neuroticism: -0.05 },
  female: { openness: 0.00, conscientiousness:  0.01, extraversion:  0.01, agreeableness:  0.04, neuroticism:  0.05 },
};

// Age shifts by bracket (Roberts, Walton & Viechtbauer 2006)
const AGE_SHIFTS: Array<{ min: number; max: number; shifts: Partial<Record<keyof BigFiveRaw, number>> }> = [
  { min: 18, max: 25, shifts: { openness: 0.02, conscientiousness: -0.04, extraversion: 0.03, agreeableness: -0.03, neuroticism: 0.04 } },
  { min: 26, max: 35, shifts: { openness: 0.01, conscientiousness: -0.01, extraversion: 0.01, agreeableness: -0.01, neuroticism: 0.01 } },
  { min: 36, max: 50, shifts: { openness: 0.00, conscientiousness:  0.02, extraversion: 0.00, agreeableness:  0.01, neuroticism: -0.01 } },
  { min: 51, max: 65, shifts: { openness: -0.02, conscientiousness: 0.03, extraversion: -0.02, agreeableness: 0.03, neuroticism: -0.03 } },
  { min: 66, max: 99, shifts: { openness: -0.03, conscientiousness: 0.03, extraversion: -0.03, agreeableness: 0.04, neuroticism: -0.05 } },
];

// Country Big Five shifts (Schmitt et al. 2007, 56 nations)
const COUNTRY_BIG_FIVE_SHIFTS: Record<string, Partial<Record<keyof BigFiveRaw, number>>> = {
  ITA: { openness: 0.03, conscientiousness: -0.02, extraversion: 0.02, agreeableness: -0.02, neuroticism: 0.03 },
  USA: { openness: 0.02, conscientiousness:  0.01, extraversion: 0.04, agreeableness:  0.00, neuroticism: -0.01 },
  JPN: { openness: -0.03, conscientiousness: 0.02, extraversion: -0.04, agreeableness: 0.03, neuroticism: 0.04 },
  GBR: { openness: 0.02, conscientiousness:  0.00, extraversion: 0.01, agreeableness: -0.01, neuroticism: 0.01 },
  BRA: { openness: 0.01, conscientiousness: -0.02, extraversion: 0.03, agreeableness:  0.02, neuroticism: 0.01 },
  DEU: { openness: 0.01, conscientiousness:  0.03, extraversion: -0.02, agreeableness: -0.01, neuroticism: 0.00 },
  IND: { openness: 0.00, conscientiousness:  0.01, extraversion: 0.01, agreeableness:  0.01, neuroticism: 0.02 },
  CHN: { openness: -0.02, conscientiousness: 0.02, extraversion: -0.03, agreeableness: 0.02, neuroticism: 0.01 },
  SWE: { openness: 0.03, conscientiousness:  0.01, extraversion: 0.00, agreeableness:  0.02, neuroticism: -0.02 },
  NGA: { openness: 0.01, conscientiousness:  0.00, extraversion: 0.03, agreeableness:  0.02, neuroticism: -0.01 },
};

// Inter-trait correlations (DeYoung 2006, corrected from research package)
const TRAIT_CORRELATIONS: Record<string, number> = {
  O_C:  0.05, O_E:  0.20, O_A:  0.05, O_N: -0.10,
  C_E:  0.10, C_A:  0.15, C_N: -0.30,
  E_A:  0.10, E_N: -0.25,
  A_N: -0.20,
};

// Discretization thresholds: ±1 SD from mean → 16/68/16% split
const BIG_FIVE_LOW_THRESHOLD  = 0.37;
const BIG_FIVE_HIGH_THRESHOLD = 0.63;

// Pearson archetype base weights (PMAI normative data, Mark & Pearson 2001)
const ARCHETYPE_BASE_WEIGHTS: Record<string, number> = {
  innocent:  8,
  everyman:  14,  // "everyman/orphan" in research package
  hero:      7,
  caregiver: 13,
  explorer:  9,
  rebel:     5,
  lover:     7,
  creator:   9,
  jester:    5,
  sage:      8,
  magician:  4,
  ruler:     4,
};

// Cultural adjustments from research package (6 explicit rules)
function applyArchetypeCulturalAdjustment(
  archetype: string,
  hofstede: HofstedeIndividual
): number {
  let multiplier = 1.0;

  // High Power Distance (PDI > 60)
  if (hofstede.power_distance > 60) {
    const adj: Record<string, number> = { ruler: 1.8, hero: 1.3, rebel: 0.5, everyman: 1.2, explorer: 0.7, jester: 0.6 };
    multiplier *= adj[archetype] ?? 1.0;
  }
  // Low Power Distance (PDI < 40)
  if (hofstede.power_distance < 40) {
    const adj: Record<string, number> = { ruler: 0.5, rebel: 1.5, explorer: 1.4, jester: 1.3, everyman: 1.1, hero: 0.8 };
    multiplier *= adj[archetype] ?? 1.0;
  }
  // Collectivist (IDV < 40)
  if (hofstede.individualism < 40) {
    const adj: Record<string, number> = { caregiver: 1.4, everyman: 1.3, rebel: 0.4, explorer: 0.6, creator: 0.8 };
    multiplier *= adj[archetype] ?? 1.0;
  }
  // Individualist (IDV > 65)
  if (hofstede.individualism > 65) {
    const adj: Record<string, number> = { explorer: 1.5, creator: 1.3, rebel: 1.4, caregiver: 0.8, everyman: 0.9 };
    multiplier *= adj[archetype] ?? 1.0;
  }
  // High Uncertainty Avoidance (UAI > 65)
  if (hofstede.uncertainty_avoidance > 65) {
    const adj: Record<string, number> = { innocent: 1.3, caregiver: 1.2, sage: 1.2, rebel: 0.5, jester: 0.7, explorer: 0.7 };
    multiplier *= adj[archetype] ?? 1.0;
  }
  // Low Uncertainty Avoidance (UAI < 40)
  if (hofstede.uncertainty_avoidance < 40) {
    const adj: Record<string, number> = { explorer: 1.4, jester: 1.3, rebel: 1.3, innocent: 0.7, sage: 0.9 };
    multiplier *= adj[archetype] ?? 1.0;
  }

  return Math.max(0.05, multiplier);
}

// Hofstede country scores (official geerthofstede.com 2015 data)
const HOFSTEDE_COUNTRIES: Record<string, HofstedeIndividual> = {
  ITA: { power_distance: 50, individualism: 76, masculinity: 70, uncertainty_avoidance: 75, long_term_orientation: 61, indulgence: 30 },
  DEU: { power_distance: 35, individualism: 67, masculinity: 66, uncertainty_avoidance: 65, long_term_orientation: 83, indulgence: 40 },
  FRA: { power_distance: 68, individualism: 71, masculinity: 43, uncertainty_avoidance: 86, long_term_orientation: 63, indulgence: 48 },
  ESP: { power_distance: 57, individualism: 51, masculinity: 42, uncertainty_avoidance: 86, long_term_orientation: 48, indulgence: 44 },
  GBR: { power_distance: 35, individualism: 89, masculinity: 66, uncertainty_avoidance: 35, long_term_orientation: 51, indulgence: 69 },
  USA: { power_distance: 40, individualism: 91, masculinity: 62, uncertainty_avoidance: 46, long_term_orientation: 26, indulgence: 68 },
  SWE: { power_distance: 31, individualism: 71, masculinity:  5, uncertainty_avoidance: 29, long_term_orientation: 53, indulgence: 78 },
  JPN: { power_distance: 54, individualism: 46, masculinity: 95, uncertainty_avoidance: 92, long_term_orientation: 88, indulgence: 42 },
  CHN: { power_distance: 80, individualism: 20, masculinity: 66, uncertainty_avoidance: 30, long_term_orientation: 87, indulgence: 24 },
  BRA: { power_distance: 69, individualism: 38, masculinity: 49, uncertainty_avoidance: 76, long_term_orientation: 44, indulgence: 59 },
  IND: { power_distance: 77, individualism: 48, masculinity: 56, uncertainty_avoidance: 40, long_term_orientation: 51, indulgence: 26 },
  RUS: { power_distance: 93, individualism: 39, masculinity: 36, uncertainty_avoidance: 95, long_term_orientation: 81, indulgence: 20 },
  NGA: { power_distance: 80, individualism: 30, masculinity: 60, uncertainty_avoidance: 55, long_term_orientation: 13, indulgence: 84 },
};

// Cluster default Hofstede (for countries not in the table)
const CLUSTER_DEFAULT_HOFSTEDE: Record<string, HofstedeIndividual> = {
  protestant_europe:   { power_distance: 33, individualism: 70, masculinity: 15, uncertainty_avoidance: 32, long_term_orientation: 60, indulgence: 75 },
  english_speaking:    { power_distance: 38, individualism: 88, masculinity: 63, uncertainty_avoidance: 40, long_term_orientation: 38, indulgence: 68 },
  catholic_europe:     { power_distance: 55, individualism: 65, masculinity: 55, uncertainty_avoidance: 80, long_term_orientation: 55, indulgence: 38 },
  confucian:           { power_distance: 65, individualism: 35, masculinity: 65, uncertainty_avoidance: 55, long_term_orientation: 85, indulgence: 35 },
  orthodox_europe:     { power_distance: 75, individualism: 42, masculinity: 45, uncertainty_avoidance: 88, long_term_orientation: 65, indulgence: 25 },
  latin_america:       { power_distance: 65, individualism: 35, masculinity: 50, uncertainty_avoidance: 78, long_term_orientation: 38, indulgence: 62 },
  south_asia:          { power_distance: 75, individualism: 42, masculinity: 55, uncertainty_avoidance: 42, long_term_orientation: 52, indulgence: 28 },
  islamic:             { power_distance: 72, individualism: 28, masculinity: 52, uncertainty_avoidance: 68, long_term_orientation: 30, indulgence: 35 },
  sub_saharan_africa:  { power_distance: 68, individualism: 30, masculinity: 45, uncertainty_avoidance: 55, long_term_orientation: 28, indulgence: 45 },
  southeast_asia:      { power_distance: 64, individualism: 32, masculinity: 50, uncertainty_avoidance: 48, long_term_orientation: 40, indulgence: 42 },
};

// Inglehart-Welzel cluster centers (WVS Wave 7)
const CLUSTER_IW_CENTERS: Record<string, IngelhartWelzel> = {
  protestant_europe:  { traditional_secular: 1.5, survival_selfexpression: 1.5 },
  english_speaking:   { traditional_secular: 0.3, survival_selfexpression: 1.4 },
  catholic_europe:    { traditional_secular: 0.8, survival_selfexpression: 0.9 },
  confucian:          { traditional_secular: 1.4, survival_selfexpression: -0.3 },
  orthodox_europe:    { traditional_secular: 0.6, survival_selfexpression: -0.8 },
  latin_america:      { traditional_secular: -0.4, survival_selfexpression: 0.2 },
  south_asia:         { traditional_secular: -0.6, survival_selfexpression: -0.9 },
  islamic:            { traditional_secular: -1.0, survival_selfexpression: -0.7 },
  sub_saharan_africa: { traditional_secular: -1.0, survival_selfexpression: -0.3 },
  southeast_asia:     { traditional_secular: 0.0, survival_selfexpression: -0.4 },
};

// Country to ISO code and cluster mapping
const COUNTRY_TO_ISO: Record<string, string> = {
  Italy: "ITA", Germany: "DEU", France: "FRA", Spain: "ESP",
  "United Kingdom": "GBR", "United States": "USA", Sweden: "SWE",
  Japan: "JPN", China: "CHN", Brazil: "BRA", India: "IND", Russia: "RUS",
};

const CLUSTER_TO_REPRESENTATIVE_COUNTRY: Record<string, string> = {
  protestant_europe: "Sweden", english_speaking: "United Kingdom",
  catholic_europe: "Italy", confucian: "Japan", orthodox_europe: "Russia",
  latin_america: "Brazil", south_asia: "India", islamic: "Egypt",
  sub_saharan_africa: "Nigeria", southeast_asia: "Thailand",
};

// Generation birth years (from research package)
const GENERATION_BIRTH_YEARS: Record<Generation, [number, number]> = {
  silent:    [1928, 1945],
  boomer:    [1946, 1964],
  genx:      [1965, 1980],
  millennial:[1981, 1996],
  genz:      [1997, 2012],
  alpha:     [2013, 2025],
};

// Generation distribution per cluster (from inglehart_welzel_cultural_clusters.json)
const CLUSTER_GENERATION_WEIGHTS: Record<string, Record<Generation, number>> = {
  protestant_europe:  { silent: 8, boomer: 22, genx: 21, millennial: 20, genz: 18, alpha: 11 },
  english_speaking:   { silent: 7, boomer: 21, genx: 20, millennial: 22, genz: 18, alpha: 12 },
  catholic_europe:    { silent: 9, boomer: 23, genx: 22, millennial: 19, genz: 16, alpha: 11 },
  confucian:          { silent: 6, boomer: 18, genx: 22, millennial: 22, genz: 19, alpha: 13 },
  orthodox_europe:    { silent: 10, boomer: 22, genx: 21, millennial: 20, genz: 17, alpha: 10 },
  latin_america:      { silent: 5, boomer: 14, genx: 19, millennial: 24, genz: 22, alpha: 16 },
  south_asia:         { silent: 3, boomer: 10, genx: 17, millennial: 25, genz: 26, alpha: 19 },
  islamic:            { silent: 2, boomer: 8,  genx: 16, millennial: 26, genz: 28, alpha: 20 },
  sub_saharan_africa: { silent: 1, boomer: 5,  genx: 13, millennial: 24, genz: 30, alpha: 27 },
  southeast_asia:     { silent: 2, boomer: 9,  genx: 18, millennial: 26, genz: 26, alpha: 19 },
};

// Bourdieu class distribution (Italy, ISTAT/OECD)
const ITALY_CLASS_DISTRIBUTION: Array<{ position: string; weight: number; economic_capital: CapitalLevel; cultural_capital: CapitalLevel; social_capital: CapitalLevel; education: string; income_quintile: CapitalLevel }> = [
  { position: "dominant_class",         weight: 5,  economic_capital: 5, cultural_capital: 5, social_capital: 5, education: "university+",           income_quintile: 5 },
  { position: "new_petite_bourgeoisie", weight: 15, economic_capital: 3, cultural_capital: 4, social_capital: 3, education: "university",             income_quintile: 4 },
  { position: "middle_class",           weight: 40, economic_capital: 3, cultural_capital: 3, social_capital: 3, education: "secondary-university",   income_quintile: 3 },
  { position: "working_class",          weight: 30, economic_capital: 2, cultural_capital: 2, social_capital: 3, education: "secondary",              income_quintile: 2 },
  { position: "precariat",              weight: 10, economic_capital: 1, cultural_capital: 1, social_capital: 1, education: "primary-secondary",      income_quintile: 1 },
];

// ─── Utility: Seeded PRNG (Mulberry32) ───────────────────────────────────────

let _seed = Math.random() * 2 ** 32;

function setSeed(seed: number) { _seed = seed >>> 0; }

function seededRandom(): number {
  _seed = (_seed + 0x6D2B79F5) >>> 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function gaussianSample(mean: number, sd: number): number {
  const u1 = Math.max(1e-10, seededRandom());
  const u2 = seededRandom();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.min(1, mean + z * sd));
}

function weightedChoice<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = seededRandom() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function discretize(value: number): BigFiveLevel {
  if (value < BIG_FIVE_LOW_THRESHOLD) return "low";
  if (value > BIG_FIVE_HIGH_THRESHOLD) return "high";
  return "medium";
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round2(v: number): number { return Math.round(v * 100) / 100; }
function round1(v: number): number { return Math.round(v * 10) / 10; }

// ─── Core Sampling Functions ──────────────────────────────────────────────────

/**
 * Sample Big Five with:
 * - Gaussian distributions (global norms from research package)
 * - Gender shifts (Costa, Terracciano & McCrae 2001)
 * - Age shifts (Roberts et al. 2006)
 * - Country shifts (Schmitt et al. 2007)
 * - Inter-trait correlations (DeYoung 2006, corrected matrix)
 */
export function sampleBigFive(
  gender: Gender,
  age: number,
  countryCode: string
): BigFiveProfile {
  const traits = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"] as const;

  // Determine age bracket shifts
  const ageBracket = AGE_SHIFTS.find(b => age >= b.min && age <= b.max);
  const countryShifts = COUNTRY_BIG_FIVE_SHIFTS[countryCode] ?? {};
  const genderShifts = GENDER_SHIFTS[gender];

  // Step 1: Sample raw Gaussian values with all shifts applied
  const raw: BigFiveRaw = { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 };
  for (const trait of traits) {
    const norm = BIG_FIVE_GLOBAL[trait];
    const mean = norm.mean
      + (genderShifts[trait] ?? 0)
      + (ageBracket?.shifts[trait] ?? 0)
      + (countryShifts[trait] ?? 0);
    raw[trait] = gaussianSample(clamp(mean, 0.15, 0.85), norm.sd);
  }

  // Step 2: Apply inter-trait correlations via Stability/Plasticity meta-factors
  // Stability: C+A-N → if C is high, nudge A up and N down
  const stabilitySignal = (raw.conscientiousness - 0.50) * TRAIT_CORRELATIONS.C_A;
  const stabilityN = (raw.conscientiousness - 0.50) * Math.abs(TRAIT_CORRELATIONS.C_N);
  raw.agreeableness = clamp(raw.agreeableness + stabilitySignal * 0.5 + (seededRandom() - 0.5) * 0.02, 0, 1);
  raw.neuroticism   = clamp(raw.neuroticism - stabilityN * 0.5 + (seededRandom() - 0.5) * 0.02, 0, 1);

  // Plasticity: O+E → if O is high, nudge E up slightly
  const plasticitySignal = (raw.openness - 0.50) * TRAIT_CORRELATIONS.O_E;
  raw.extraversion = clamp(raw.extraversion + plasticitySignal * 0.3 + (seededRandom() - 0.5) * 0.02, 0, 1);

  // Round raw scores
  for (const trait of traits) {
    raw[trait] = round2(raw[trait]);
  }

  return {
    raw,
    levels: {
      openness:          discretize(raw.openness),
      conscientiousness: discretize(raw.conscientiousness),
      extraversion:      discretize(raw.extraversion),
      agreeableness:     discretize(raw.agreeableness),
      neuroticism:       discretize(raw.neuroticism),
    }
  };
}

/**
 * Sample Pearson archetype with:
 * - Base PMAI normative weights
 * - 6 cultural adjustment rules from research package
 * - Big Five coherence check
 */
export function samplePearsonArchetype(
  hofstede: HofstedeIndividual,
  bigFive: BigFiveProfile,
  filter?: string[]
): { primary: string; secondary: string | null; archetype_strength: "low" | "medium" | "high" } {
  const archetypes = filter ?? Object.keys(ARCHETYPE_BASE_WEIGHTS);

  const weights = archetypes.map(a => {
    const base = ARCHETYPE_BASE_WEIGHTS[a] ?? 5;
    const culturalMult = applyArchetypeCulturalAdjustment(a, hofstede);
    return Math.max(0.1, base * culturalMult);
  });

  const primary = weightedChoice(archetypes, weights);

  // Secondary archetype (30% chance)
  let secondary: string | null = null;
  if (seededRandom() < 0.3) {
    const remaining = archetypes.filter(a => a !== primary);
    const remWeights = remaining.map(a => ARCHETYPE_BASE_WEIGHTS[a] ?? 5);
    secondary = weightedChoice(remaining, remWeights);
  }

  // Archetype strength: based on how many extreme Big Five traits
  const extremeCount = Object.values(bigFive.levels).filter(v => v !== "medium").length;
  const archetype_strength: "low" | "medium" | "high" = extremeCount >= 3 ? "high" : extremeCount >= 1 ? "medium" : "low";

  return { primary, secondary, archetype_strength };
}

/**
 * Derive political orientation (float 0-1) from Big Five + Hofstede
 * Based on: Carney et al. (2008), Jost et al. (2003)
 * 0.0 = very progressive, 1.0 = very conservative
 */
export function derivePoliticalOrientation(
  bigFive: BigFiveProfile,
  hofstede: HofstedeIndividual
): number {
  // Openness: strongest predictor of progressive orientation (negative correlation)
  // Conscientiousness: positive correlation with conservative
  let score = 0.5; // start at center

  score -= (bigFive.raw.openness - 0.50) * 0.6;
  score += (bigFive.raw.conscientiousness - 0.50) * 0.4;
  score -= (bigFive.raw.agreeableness - 0.50) * 0.15;
  score += (bigFive.raw.neuroticism - 0.50) * 0.1;

  // Cultural context
  score += (hofstede.power_distance - 50) / 100 * 0.3;
  score -= (hofstede.individualism - 50) / 100 * 0.2;
  score += (hofstede.uncertainty_avoidance - 50) / 100 * 0.15;

  // Add noise
  score += (seededRandom() - 0.5) * 0.3;

  return round2(clamp(score, 0, 1));
}

/**
 * Sample Haidt moral foundations as floats 0-1
 * Based on: Graham et al. (2011), Atari et al. (2023), YourMorals.org
 */
export function sampleHaidtFoundations(
  hofstede: HofstedeIndividual,
  bigFive: BigFiveProfile,
  politicalOrientation: number // 0=progressive, 1=conservative
): HaidtProfile {
  // Base means (from YourMorals.org population norms)
  const baseMeans = {
    care:           0.72,
    equality:       0.68,
    proportionality:0.55,
    loyalty:        0.48,
    authority:      0.42,
    purity:         0.38,
  };

  // Political orientation adjustments (progressive=0 → conservative=1)
  const polAdj = (politicalOrientation - 0.5); // -0.5 to +0.5
  const adjustments = {
    care:            -polAdj * 0.25,
    equality:        -polAdj * 0.20,
    proportionality:  polAdj * 0.10,
    loyalty:          polAdj * 0.40,
    authority:        polAdj * 0.45,
    purity:           polAdj * 0.50,
  };

  // Hofstede adjustments (Graham et al. 2011)
  const hofAdj = {
    care:            (50 - hofstede.masculinity) / 100 * 0.30,
    equality:        (hofstede.individualism - 50) / 100 * 0.25 + (50 - hofstede.power_distance) / 100 * 0.35,
    proportionality:  0,
    loyalty:         (50 - hofstede.individualism) / 100 * 0.40 + (hofstede.uncertainty_avoidance - 50) / 100 * 0.20,
    authority:       (hofstede.power_distance - 50) / 100 * 0.50 + (hofstede.uncertainty_avoidance - 50) / 100 * 0.25,
    purity:          (hofstede.uncertainty_avoidance - 50) / 100 * 0.35 + (50 - hofstede.individualism) / 100 * 0.25,
  };

  const result: Record<string, number> = {};
  for (const key of Object.keys(baseMeans) as Array<keyof typeof baseMeans>) {
    const mean = clamp(baseMeans[key] + adjustments[key] + hofAdj[key], 0.05, 0.95);
    result[key] = round2(clamp(gaussianSample(mean, 0.12), 0, 1));
  }

  return {
    care:            result.care,
    equality:        result.equality,
    proportionality: result.proportionality,
    loyalty:         result.loyalty,
    authority:       result.authority,
    purity:          result.purity,
    political_orientation: round2(politicalOrientation),
  };
}

/**
 * Sample individual Hofstede scores (Gaussian around country mean)
 */
export function sampleHofstedeIndividual(countryCode: string, cluster: string): HofstedeIndividual {
  const base = HOFSTEDE_COUNTRIES[countryCode] ?? CLUSTER_DEFAULT_HOFSTEDE[cluster] ?? CLUSTER_DEFAULT_HOFSTEDE.catholic_europe;
  const sd = 12; // Individual variation around country mean

  return {
    power_distance:        Math.round(clamp(gaussianSample(base.power_distance / 100, sd / 100) * 100, 0, 100)),
    individualism:         Math.round(clamp(gaussianSample(base.individualism / 100, sd / 100) * 100, 0, 100)),
    masculinity:           Math.round(clamp(gaussianSample(base.masculinity / 100, sd / 100) * 100, 0, 100)),
    uncertainty_avoidance: Math.round(clamp(gaussianSample(base.uncertainty_avoidance / 100, sd / 100) * 100, 0, 100)),
    long_term_orientation: Math.round(clamp(gaussianSample(base.long_term_orientation / 100, sd / 100) * 100, 0, 100)),
    indulgence:            Math.round(clamp(gaussianSample(base.indulgence / 100, sd / 100) * 100, 0, 100)),
  };
}

/**
 * Sample Inglehart-Welzel coordinates (Gaussian around cluster center)
 */
export function sampleIngelhartWelzel(cluster: string): IngelhartWelzel {
  const center = CLUSTER_IW_CENTERS[cluster] ?? CLUSTER_IW_CENTERS.catholic_europe;
  return {
    traditional_secular:     round2(clamp(gaussianSample((center.traditional_secular + 2) / 4, 0.15) * 4 - 2, -2, 2)),
    survival_selfexpression: round2(clamp(gaussianSample((center.survival_selfexpression + 2) / 4, 0.15) * 4 - 2, -2, 2)),
  };
}

/**
 * Sample Bourdieu capital (power-law distribution, Italy default)
 */
export function sampleBourdieuCapital(
  generation: Generation,
  cluster: string
): BourdieuCapital {
  const classData = weightedChoice(
    ITALY_CLASS_DISTRIBUTION,
    ITALY_CLASS_DISTRIBUTION.map(c => c.weight)
  );

  // Generational economic shift (Millennials/GenZ have lower economic capital)
  let economicCapital = classData.economic_capital;
  const genShift = generation === "millennial" ? -0.15 : generation === "genz" ? -0.2 : generation === "boomer" ? 0.15 : 0;
  if (genShift < -0.12 && economicCapital > 1 && seededRandom() < 0.35) {
    economicCapital = (economicCapital - 1) as CapitalLevel;
  } else if (genShift > 0.12 && economicCapital < 5 && seededRandom() < 0.25) {
    economicCapital = (economicCapital + 1) as CapitalLevel;
  }

  return {
    economic_capital: economicCapital,
    cultural_capital: classData.cultural_capital,
    social_capital:   classData.social_capital,
    class_position:   classData.position,
    education_level:  classData.education,
    income_quintile:  classData.income_quintile,
  };
}

/**
 * Derive media diet from generation + Bourdieu + cluster
 */
export function deriveMediaDiet(
  generation: Generation,
  bourdieu: BourdieuCapital,
  cluster: string
): MediaDiet {
  const isWestern = ["protestant_europe", "english_speaking", "catholic_europe"].includes(cluster);

  if (generation === "silent") {
    return {
      dominant_medium: "tv_broadcast",
      platforms: ["RAI 1", "RAI 2", "newspaper", "radio"],
      content_orientation: "mainstream",
      news_consumption: "traditional_media",
      advertising_cynicism: round2(0.25 + seededRandom() * 0.15),
      attention_span_seconds: Math.round(30 + seededRandom() * 30),
      newsletter_affinity: round2(0.15 + seededRandom() * 0.15),
      sharing_propensity: round2(0.10 + seededRandom() * 0.10),
    };
  }

  if (generation === "boomer") {
    return {
      dominant_medium: "tv_broadcast",
      platforms: ["RAI 1", "Canale 5", "newspaper", "Facebook"],
      content_orientation: "mainstream",
      news_consumption: "traditional_media",
      advertising_cynicism: round2(0.30 + seededRandom() * 0.20),
      attention_span_seconds: Math.round(20 + seededRandom() * 20),
      newsletter_affinity: round2(0.20 + seededRandom() * 0.15),
      sharing_propensity: round2(0.20 + seededRandom() * 0.15),
    };
  }

  if (generation === "genx") {
    if (bourdieu.cultural_capital >= 4) {
      return {
        dominant_medium: "early_internet",
        platforms: ["LinkedIn", "Podcast", "Newsletter", "YouTube", "Facebook"],
        content_orientation: "curated",
        news_consumption: "digital_news",
        advertising_cynicism: round2(0.55 + seededRandom() * 0.20),
        attention_span_seconds: Math.round(12 + seededRandom() * 10),
        newsletter_affinity: round2(0.50 + seededRandom() * 0.20),
        sharing_propensity: round2(0.30 + seededRandom() * 0.20),
      };
    }
    return {
      dominant_medium: "tv_cable",
      platforms: ["Facebook", "YouTube", "TV", "news websites"],
      content_orientation: "mainstream",
      news_consumption: "digital_news",
      advertising_cynicism: round2(0.40 + seededRandom() * 0.20),
      attention_span_seconds: Math.round(15 + seededRandom() * 12),
      newsletter_affinity: round2(0.25 + seededRandom() * 0.15),
      sharing_propensity: round2(0.30 + seededRandom() * 0.20),
    };
  }

  if (generation === "millennial") {
    if (bourdieu.cultural_capital >= 4) {
      return {
        dominant_medium: "social_first",
        platforms: ["Instagram", "Podcast", "Substack", "LinkedIn", "WhatsApp"],
        content_orientation: "curated",
        news_consumption: "digital_news",
        advertising_cynicism: round2(0.65 + seededRandom() * 0.20),
        attention_span_seconds: Math.round(6 + seededRandom() * 6),
        newsletter_affinity: round2(0.55 + seededRandom() * 0.20),
        sharing_propensity: round2(0.45 + seededRandom() * 0.20),
      };
    }
    return {
      dominant_medium: "social_first",
      platforms: ["Instagram", "Facebook", "YouTube", "WhatsApp", "TikTok"],
      content_orientation: "algorithmic",
      news_consumption: "social_news",
      advertising_cynicism: round2(0.60 + seededRandom() * 0.20),
      attention_span_seconds: Math.round(5 + seededRandom() * 5),
      newsletter_affinity: round2(0.30 + seededRandom() * 0.15),
      sharing_propensity: round2(0.50 + seededRandom() * 0.20),
    };
  }

  // GenZ and Alpha
  return {
    dominant_medium: "mobile_native",
    platforms: ["TikTok", "Instagram", "YouTube Shorts", "WhatsApp", "Twitch"],
    content_orientation: "algorithmic",
    news_consumption: "social_news",
    advertising_cynicism: round2(0.75 + seededRandom() * 0.15),
    attention_span_seconds: Math.round(2 + seededRandom() * 4),
    newsletter_affinity: round2(0.10 + seededRandom() * 0.10),
    sharing_propensity: round2(0.60 + seededRandom() * 0.25),
  };
}

/**
 * Derive Mirofish behavioral parameters
 */
export function deriveMirofishParams(
  bigFive: BigFiveProfile,
  archetype: string,
  hofstede: HofstedeIndividual,
  generation: Generation,
  politicalOrientation: number,
  mediaDiet: MediaDiet
): MirofishParams {
  // Activity level: Extraversion + IVR + generation + media
  const extScore = bigFive.raw.extraversion;
  const ivrFactor = hofstede.indulgence / 100;
  const genFactor = { genz: 0.8, millennial: 0.7, genx: 0.5, boomer: 0.4, silent: 0.3, alpha: 0.75 }[generation] ?? 0.5;
  const activity_level = round2(clamp(extScore * 0.45 + ivrFactor * 0.25 + genFactor * 0.20 + mediaDiet.sharing_propensity * 0.10 + (seededRandom() - 0.5) * 0.15, 0.05, 1));

  // Sentiment bias: Agreeableness - Neuroticism + IVR
  const sentiment_bias = round2(clamp(
    (bigFive.raw.agreeableness - 0.5) * 0.6 +
    (0.5 - bigFive.raw.neuroticism) * 0.5 +
    (ivrFactor - 0.5) * 0.2 +
    (seededRandom() - 0.5) * 0.3,
    -1, 1
  ));

  // Stance: from political orientation + archetype
  const rebellious = ["rebel", "explorer", "jester"].includes(archetype);
  const conformist = ["caregiver", "innocent", "everyman"].includes(archetype);
  let stance: Stance = "neutral";
  if (rebellious && politicalOrientation < 0.35) stance = "opposing";
  else if (conformist && politicalOrientation > 0.65) stance = "supportive";
  else if (seededRandom() < 0.25) stance = "observer";

  // Influence weight: social capital proxy + extraversion + archetype
  const socialArchetypes = ["ruler", "hero", "magician", "creator", "lover"];
  const influenceBase = socialArchetypes.includes(archetype) ? 0.65 : 0.35;
  const influence_weight = round2(clamp(influenceBase + extScore * 0.2 + (seededRandom() - 0.5) * 0.2, 0.05, 1));

  // Echo chamber: UAI + low openness + conformist archetypes
  const echo_chamber_strength = round2(clamp(
    (hofstede.uncertainty_avoidance / 100) * 0.4 +
    (1 - bigFive.raw.openness) * 0.35 +
    (conformist ? 0.15 : 0) +
    (seededRandom() - 0.5) * 0.15,
    0.05, 1
  ));

  // Response delay: inversely proportional to activity
  const response_delay_hours = round1(clamp((1 - activity_level) * 8 + seededRandom() * 2, 0.1, 12));

  return {
    activity_level,
    sentiment_bias,
    stance,
    influence_weight,
    echo_chamber_strength,
    response_delay_hours,
    sharing_propensity: mediaDiet.sharing_propensity,
  };
}

// ─── Main Sampling Function ───────────────────────────────────────────────────

let _profileCounter = 0;

export function sampleRealisticProfile(options: SamplingOptions = {}): SampledProfile {
  if (options.seed !== undefined) setSeed(options.seed);

  // Step 1: Cultural cluster
  const cluster = options.culturalCluster ?? "catholic_europe";

  // Step 2: Country
  const countryName = CLUSTER_TO_REPRESENTATIVE_COUNTRY[cluster] ?? "Italy";
  const countryCode = COUNTRY_TO_ISO[countryName] ?? "ITA";

  // Step 3: Generation (weighted by cluster demographics)
  const genWeights = CLUSTER_GENERATION_WEIGHTS[cluster] ?? CLUSTER_GENERATION_WEIGHTS.catholic_europe;
  const genKeys = Object.keys(genWeights) as Generation[];
  const generation = options.generation ?? weightedChoice(genKeys, genKeys.map(g => genWeights[g]));

  // Step 4: Gender (51% female globally)
  const gender = options.gender ?? (seededRandom() < 0.51 ? "female" : "male");

  // Step 5: Age
  const [minYear, maxYear] = GENERATION_BIRTH_YEARS[generation];
  const birthYear = Math.round(minYear + seededRandom() * (maxYear - minYear));
  const age = 2026 - birthYear;

  // Step 6: Urbanization
  const urbanizationWeights = { rural: 15, suburban: 25, urban: 40, metro: 20 };
  const urbanization = options.urbanization ?? weightedChoice(
    ["rural", "suburban", "urban", "metro"] as Urbanization[],
    [urbanizationWeights.rural, urbanizationWeights.suburban, urbanizationWeights.urban, urbanizationWeights.metro]
  );

  // Step 7: Hofstede (individual variation around country mean)
  const hofstede = sampleHofstedeIndividual(countryCode, cluster);

  // Step 8: Big Five
  const bigFive = sampleBigFive(gender, age, countryCode);

  // Step 9: Political orientation (float 0-1)
  const politicalOrientation = options.politicalOrientation
    ? { progressive: 0.2, moderate: 0.5, conservative: 0.8 }[options.politicalOrientation]
    : derivePoliticalOrientation(bigFive, hofstede);

  // Step 10: Pearson archetype
  const pearsonArchetype = samplePearsonArchetype(hofstede, bigFive, options.archetypeFilter);

  // Step 11: Haidt foundations (floats)
  const haidt = sampleHaidtFoundations(hofstede, bigFive, politicalOrientation);

  // Step 12: Inglehart-Welzel coordinates
  const ingelhartWelzel = sampleIngelhartWelzel(cluster);

  // Step 13: Bourdieu capital
  const bourdieu = sampleBourdieuCapital(generation, cluster);

  // Step 14: Media diet
  const mediaDiet = deriveMediaDiet(generation, bourdieu, cluster);

  // Step 15: Mirofish params
  const mirofish = deriveMirofishParams(bigFive, pearsonArchetype.primary, hofstede, generation, politicalOrientation, mediaDiet);

  // Step 16: Coherence score
  const coherenceScore = computeCoherenceScore(bigFive, pearsonArchetype.primary, haidt);

  _profileCounter++;
  const id = `OP-${String(_profileCounter).padStart(5, "0")}`;

  return {
    id,
    generated_at: new Date().toISOString(),
    gender,
    birth_year: birthYear,
    age_2026: age,
    generation,
    country_code: countryCode,
    country_name: countryName,
    cultural_cluster: cluster,
    urbanization,
    big_five: bigFive,
    pearson_archetype: pearsonArchetype,
    haidt,
    hofstede,
    inglehart_welzel: ingelhartWelzel,
    bourdieu,
    media_diet: mediaDiet,
    mirofish,
    coherence_score: coherenceScore,
    sampling_method: options.seed !== undefined ? "seeded" : "random",
  };
}

function computeCoherenceScore(
  bigFive: BigFiveProfile,
  archetype: string,
  haidt: HaidtProfile
): number {
  let score = 1.0;

  // Archetype-Big Five coherence checks
  if (archetype === "explorer" && bigFive.levels.openness === "low") score -= 0.25;
  if (archetype === "ruler" && bigFive.levels.conscientiousness === "low") score -= 0.20;
  if (archetype === "caregiver" && bigFive.levels.agreeableness === "low") score -= 0.20;
  if (archetype === "rebel" && bigFive.levels.agreeableness === "high" && haidt.authority > 0.65) score -= 0.30;
  if (archetype === "sage" && bigFive.levels.openness === "low") score -= 0.20;
  if (archetype === "hero" && bigFive.levels.conscientiousness === "low") score -= 0.15;
  if (archetype === "jester" && bigFive.levels.extraversion === "low") score -= 0.15;

  // Haidt-political coherence
  if (haidt.political_orientation < 0.3 && haidt.authority > 0.7) score -= 0.15;
  if (haidt.political_orientation > 0.7 && haidt.care < 0.3) score -= 0.15;

  return round2(Math.max(0, score));
}

/**
 * Generate a batch of profiles
 */
export function generateProfileBatch(count: number, options: SamplingOptions = {}): SampledProfile[] {
  return Array.from({ length: count }, (_, i) =>
    sampleRealisticProfile({ ...options, seed: options.seed !== undefined ? options.seed + i : undefined })
  );
}

/**
 * Compute distribution statistics for a batch
 */
export function computeBatchStats(profiles: SampledProfile[]) {
  const n = profiles.length;
  if (n === 0) return null;

  const pct = (count: number) => Math.round(count / n * 100);

  const bigFiveStats: Record<string, Record<string, number>> = {};
  for (const trait of ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"] as const) {
    bigFiveStats[trait] = {
      low:    pct(profiles.filter(p => p.big_five.levels[trait] === "low").length),
      medium: pct(profiles.filter(p => p.big_five.levels[trait] === "medium").length),
      high:   pct(profiles.filter(p => p.big_five.levels[trait] === "high").length),
    };
  }

  const archetypeDist: Record<string, number> = {};
  for (const p of profiles) {
    archetypeDist[p.pearson_archetype.primary] = (archetypeDist[p.pearson_archetype.primary] ?? 0) + 1;
  }

  const genDist: Record<string, number> = {};
  for (const p of profiles) {
    genDist[p.generation] = (genDist[p.generation] ?? 0) + 1;
  }

  const classDist: Record<string, number> = {};
  for (const p of profiles) {
    classDist[p.bourdieu.class_position] = (classDist[p.bourdieu.class_position] ?? 0) + 1;
  }

  const allMedium = profiles.filter(p =>
    Object.values(p.big_five.levels).every(v => v === "medium")
  ).length;

  const avgHaidt = {
    care:            round2(profiles.reduce((s, p) => s + p.haidt.care, 0) / n),
    equality:        round2(profiles.reduce((s, p) => s + p.haidt.equality, 0) / n),
    loyalty:         round2(profiles.reduce((s, p) => s + p.haidt.loyalty, 0) / n),
    authority:       round2(profiles.reduce((s, p) => s + p.haidt.authority, 0) / n),
    purity:          round2(profiles.reduce((s, p) => s + p.haidt.purity, 0) / n),
    political_orientation: round2(profiles.reduce((s, p) => s + p.haidt.political_orientation, 0) / n),
  };

  return {
    total: n,
    big_five_distribution: bigFiveStats,
    archetype_distribution: Object.fromEntries(Object.entries(archetypeDist).map(([k, v]) => [k, pct(v)])),
    generation_distribution: Object.fromEntries(Object.entries(genDist).map(([k, v]) => [k, pct(v)])),
    class_distribution: Object.fromEntries(Object.entries(classDist).map(([k, v]) => [k, pct(v)])),
    gender_distribution: {
      male:   pct(profiles.filter(p => p.gender === "male").length),
      female: pct(profiles.filter(p => p.gender === "female").length),
    },
    avg_haidt: avgHaidt,
    avg_coherence_score: round2(profiles.reduce((s, p) => s + p.coherence_score, 0) / n),
    mid_range_pct: pct(allMedium),
    avg_activity_level: round2(profiles.reduce((s, p) => s + p.mirofish.activity_level, 0) / n),
    avg_echo_chamber: round2(profiles.reduce((s, p) => s + p.mirofish.echo_chamber_strength, 0) / n),
  };
}
