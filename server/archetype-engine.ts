/**
 * Archetype Combinatory Engine
 * 
 * Implements the 5-axis generative system for Ordinary People:
 * Axis 1: Big Five / OCEAN (McCrae & John 1992)
 * Axis 1b: Pearson/Jung 12 Archetypes (Mark & Pearson 2001)
 * Axis 2: Haidt 6 Moral Foundations (Haidt 2012)
 * Axis 3: Hofstede Cultural Clusters (Hofstede 2001)
 * 
 * Mirofish behavioral parameters integrated:
 * activityLevel, sentimentBias, stance, influenceWeight, echoChamberStrength
 */

import { getDb } from "./db";
import { invokeLLM } from "./_core/llm";
import {
  culturalClusters,
  pearsonArchetypes,
  haidtFoundations,
  hofstedeCountries,
  archetypeProfiles,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

export type BigFiveLevel = "L" | "M" | "H";
export type HaidtLevel = "H" | "L";
export type MirofishStance = "supportive" | "opposing" | "neutral" | "observer";

export interface BigFiveProfile {
  openness: BigFiveLevel;
  conscientiousness: BigFiveLevel;
  extraversion: BigFiveLevel;
  agreeableness: BigFiveLevel;
  neuroticism: BigFiveLevel;
}

export interface HaidtProfile {
  care_harm: HaidtLevel;
  fairness_cheating: HaidtLevel;
  loyalty_betrayal: HaidtLevel;
  authority_subversion: HaidtLevel;
  sanctity_degradation: HaidtLevel;
  liberty_oppression: HaidtLevel;
}

export interface ArchetypeGenerationInput {
  bigFive: BigFiveProfile;
  archetypeId: string;
  haidt: HaidtProfile;
  culturalClusterId: string;
  // Optional Mirofish overrides
  activityLevel?: number;
  sentimentBias?: number;
  stance?: MirofishStance;
  influenceWeight?: number;
  echoChamberStrength?: number;
}

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const CULTURAL_CLUSTERS_SEED = [
  {
    clusterId: "northern_europe",
    label: "Northern Europe",
    countries: ["Sweden", "Denmark", "Norway", "Finland", "Netherlands"],
    pdi: 33, idv: 74, mas: 14, uai: 29, lto: 53, ivr: 69,
    description: "Low hierarchy, highly individualistic, feminine values, low uncertainty avoidance, indulgent",
    culturalTraits: ["egalitarian", "direct communication", "work-life balance", "gender equality", "trust in institutions"],
    consumerCulture: "Values sustainability, transparency, and social responsibility; skeptical of luxury and status"
  },
  {
    clusterId: "western_europe",
    label: "Western Europe",
    countries: ["Germany", "France", "Belgium", "Austria", "Switzerland"],
    pdi: 40, idv: 67, mas: 55, uai: 72, lto: 57, ivr: 40,
    description: "Moderate hierarchy, individualistic, masculine, high uncertainty avoidance",
    culturalTraits: ["quality-focused", "rule-following", "expertise valued", "formal communication", "privacy"],
    consumerCulture: "Values quality, engineering, and expertise; willing to pay premium for proven quality"
  },
  {
    clusterId: "southern_europe",
    label: "Southern Europe",
    countries: ["Italy", "Spain", "Portugal", "Greece"],
    pdi: 56, idv: 54, mas: 56, uai: 80, lto: 44, ivr: 44,
    description: "Moderate-high hierarchy, moderate individualism, masculine, very high uncertainty avoidance",
    culturalTraits: ["family-centered", "aesthetic sensibility", "relationship-based trust", "bella figura", "emotional expressiveness"],
    consumerCulture: "Values aesthetics, brand heritage, social status, and family; strong loyalty to trusted brands"
  },
  {
    clusterId: "eastern_europe",
    label: "Eastern Europe",
    countries: ["Poland", "Czech Republic", "Hungary", "Romania", "Bulgaria"],
    pdi: 57, idv: 42, mas: 57, uai: 74, lto: 38, ivr: 30,
    description: "High hierarchy, collectivist, masculine, high uncertainty avoidance, restraint",
    culturalTraits: ["pragmatic", "skeptical of institutions", "family loyalty", "resilience", "value-conscious"],
    consumerCulture: "Price-sensitive, values practicality and durability; aspirational toward Western brands"
  },
  {
    clusterId: "anglo",
    label: "Anglo-Saxon",
    countries: ["USA", "UK", "Australia", "Canada", "New Zealand"],
    pdi: 40, idv: 90, mas: 62, uai: 46, lto: 36, ivr: 68,
    description: "Moderate hierarchy, highly individualistic, masculine, moderate uncertainty avoidance, indulgent",
    culturalTraits: ["achievement-oriented", "direct communication", "pragmatic", "competitive", "optimistic"],
    consumerCulture: "Values innovation, self-expression, and achievement; responsive to aspirational and lifestyle messaging"
  },
  {
    clusterId: "latin_america",
    label: "Latin America",
    countries: ["Brazil", "Mexico", "Argentina", "Colombia", "Chile"],
    pdi: 65, idv: 25, mas: 58, uai: 76, lto: 28, ivr: 74,
    description: "High hierarchy, collectivist, masculine, high uncertainty avoidance, indulgent",
    culturalTraits: ["family-first", "emotional expressiveness", "present-oriented", "social relationships", "festive"],
    consumerCulture: "Values family, social belonging, and celebration; responsive to emotional and community messaging"
  },
  {
    clusterId: "east_asia_confucian",
    label: "East Asia (Confucian)",
    countries: ["China", "Japan", "South Korea", "Taiwan", "Singapore"],
    pdi: 60, idv: 22, mas: 66, uai: 57, lto: 80, ivr: 29,
    description: "High hierarchy, collectivist, masculine, moderate uncertainty avoidance, long-term oriented, restrained",
    culturalTraits: ["face-saving", "group harmony", "long-term thinking", "education-valued", "hierarchy respected"],
    consumerCulture: "Values status, quality, and brand prestige; responsive to social proof and aspirational messaging"
  },
  {
    clusterId: "south_asia",
    label: "South Asia",
    countries: ["India", "Pakistan", "Bangladesh", "Sri Lanka"],
    pdi: 77, idv: 30, mas: 52, uai: 40, lto: 51, ivr: 26,
    description: "Very high hierarchy, collectivist, moderate masculinity, moderate uncertainty avoidance",
    culturalTraits: ["family-centered", "spiritual values", "social hierarchy", "frugality", "education-valued"],
    consumerCulture: "Values family benefit, education, and social mobility; price-sensitive but aspirational"
  },
  {
    clusterId: "middle_east",
    label: "Middle East",
    countries: ["Saudi Arabia", "UAE", "Egypt", "Iran", "Turkey"],
    pdi: 68, idv: 26, mas: 52, uai: 68, lto: 33, ivr: 34,
    description: "High hierarchy, collectivist, moderate masculinity, high uncertainty avoidance, restrained",
    culturalTraits: ["religious values", "family honor", "hospitality", "gender-role defined", "tradition-bound"],
    consumerCulture: "Values family, tradition, and religious compatibility; gender-specific messaging important"
  },
  {
    clusterId: "sub_saharan_africa",
    label: "Sub-Saharan Africa",
    countries: ["Nigeria", "Kenya", "Ghana", "Ethiopia", "South Africa"],
    pdi: 64, idv: 25, mas: 46, uai: 52, lto: 32, ivr: 78,
    description: "High hierarchy, collectivist, moderate femininity, moderate uncertainty avoidance, indulgent",
    culturalTraits: ["ubuntu (community)", "oral tradition", "present-oriented", "festive", "religious"],
    consumerCulture: "Values community, celebration, and belonging; responsive to social and aspirational messaging"
  },
  {
    clusterId: "nordic_protestant",
    label: "Nordic Protestant",
    countries: ["Iceland", "Estonia", "Latvia", "Lithuania"],
    pdi: 38, idv: 65, mas: 22, uai: 55, lto: 48, ivr: 55,
    description: "Low hierarchy, individualistic, very feminine, moderate uncertainty avoidance",
    culturalTraits: ["egalitarian", "environmental consciousness", "reserved", "independent"],
    consumerCulture: "Values sustainability, simplicity, and authenticity"
  },
  {
    clusterId: "global_urban",
    label: "Global Urban / Cosmopolitan",
    countries: ["Global metropolitan areas"],
    pdi: 35, idv: 80, mas: 45, uai: 40, lto: 55, ivr: 65,
    description: "Low hierarchy, highly individualistic, balanced masculinity/femininity, low uncertainty avoidance",
    culturalTraits: ["multicultural", "digital-native", "brand-conscious", "experience-seeking", "globally connected"],
    consumerCulture: "Values authenticity, experience, and self-expression; early adopter, responsive to global trends"
  }
];

const PEARSON_ARCHETYPES_SEED = [
  {
    archetypeId: "innocent",
    label: "The Innocent",
    coreDesire: "To be happy, safe, and free",
    coreFear: "Punishment, abandonment",
    strategy: "Do things right, be good",
    gift: "Faith, optimism",
    shadow: "Naivety, denial",
    brandExamples: ["Dove", "Coca-Cola", "McDonald's"],
    consumerTriggers: ["safety", "simplicity", "nostalgia", "purity", "happiness"],
    adResponse: "Responds to wholesome, simple, and optimistic messaging; values authenticity and goodness",
    bigFiveAffinity: { openness: "L", agreeableness: "H", neuroticism: "M" }
  },
  {
    archetypeId: "orphan",
    label: "The Orphan / Regular Person",
    coreDesire: "Connection, belonging",
    coreFear: "Being left out, standing out too much",
    strategy: "Develop ordinary virtues, blend in",
    gift: "Empathy, realism",
    shadow: "Cynicism, victim mentality",
    brandExamples: ["IKEA", "Gap", "Budweiser"],
    consumerTriggers: ["belonging", "community", "fairness", "everyman", "solidarity"],
    adResponse: "Responds to relatable, unpretentious, and community-focused messaging",
    bigFiveAffinity: { openness: "L", agreeableness: "H", extraversion: "M" }
  },
  {
    archetypeId: "hero",
    label: "The Hero",
    coreDesire: "To prove worth through courageous action",
    coreFear: "Weakness, vulnerability",
    strategy: "Become as strong and competent as possible",
    gift: "Competence, courage",
    shadow: "Arrogance, need to win at all costs",
    brandExamples: ["Nike", "FedEx", "BMW"],
    consumerTriggers: ["achievement", "challenge", "mastery", "strength", "winning"],
    adResponse: "Responds to challenge, achievement, and empowerment messaging",
    bigFiveAffinity: { conscientiousness: "H", extraversion: "H", agreeableness: "L" }
  },
  {
    archetypeId: "caregiver",
    label: "The Caregiver",
    coreDesire: "To protect and care for others",
    coreFear: "Selfishness, ingratitude",
    strategy: "Do things for others",
    gift: "Compassion, generosity",
    shadow: "Martyrdom, enabling",
    brandExamples: ["Johnson & Johnson", "Volvo", "Campbell's Soup"],
    consumerTriggers: ["family", "protection", "nurturing", "service", "sacrifice"],
    adResponse: "Responds to family values, protection, and altruistic messaging",
    bigFiveAffinity: { agreeableness: "H", conscientiousness: "H", openness: "M" }
  },
  {
    archetypeId: "explorer",
    label: "The Explorer",
    coreDesire: "Freedom to find out who you are through exploration",
    coreFear: "Getting trapped, conformity",
    strategy: "Journey, seek out and experience the new",
    gift: "Autonomy, ambition",
    shadow: "Aimlessness, inability to commit",
    brandExamples: ["Jeep", "REI", "Patagonia", "The North Face"],
    consumerTriggers: ["adventure", "freedom", "discovery", "authenticity", "independence"],
    adResponse: "Responds to adventure, freedom, and authentic experience messaging",
    bigFiveAffinity: { openness: "H", extraversion: "H", conscientiousness: "L" }
  },
  {
    archetypeId: "rebel",
    label: "The Rebel / Outlaw",
    coreDesire: "Revolution, to overturn what isn't working",
    coreFear: "Powerlessness, ineffectiveness",
    strategy: "Disrupt, destroy, or shock",
    gift: "Radical freedom, iconoclasm",
    shadow: "Crime, destructiveness",
    brandExamples: ["Harley-Davidson", "Virgin", "Apple (early)"],
    consumerTriggers: ["disruption", "rebellion", "anti-establishment", "freedom", "authenticity"],
    adResponse: "Responds to anti-establishment, disruptive, and countercultural messaging",
    bigFiveAffinity: { openness: "H", agreeableness: "L", conscientiousness: "L" }
  },
  {
    archetypeId: "lover",
    label: "The Lover",
    coreDesire: "Intimacy and experience",
    coreFear: "Being alone, unwanted",
    strategy: "Become more and more attractive",
    gift: "Passion, gratitude, appreciation",
    shadow: "Obsession, jealousy",
    brandExamples: ["Chanel", "Hallmark", "Haagen-Dazs"],
    consumerTriggers: ["beauty", "sensuality", "romance", "pleasure", "intimacy"],
    adResponse: "Responds to sensory, romantic, and beauty-focused messaging",
    bigFiveAffinity: { extraversion: "H", openness: "H", neuroticism: "M" }
  },
  {
    archetypeId: "creator",
    label: "The Creator",
    coreDesire: "To create things of enduring value",
    coreFear: "Mediocre vision or execution",
    strategy: "Develop artistic and creative skills",
    gift: "Creativity, imagination",
    shadow: "Perfectionism, self-indulgence",
    brandExamples: ["Apple", "Lego", "Adobe"],
    consumerTriggers: ["creativity", "self-expression", "originality", "craft", "vision"],
    adResponse: "Responds to creative, original, and self-expression messaging",
    bigFiveAffinity: { openness: "H", conscientiousness: "H", extraversion: "M" }
  },
  {
    archetypeId: "jester",
    label: "The Jester",
    coreDesire: "To live in the moment with full enjoyment",
    coreFear: "Being bored or boring others",
    strategy: "Play, make jokes, be funny",
    gift: "Joy, humor",
    shadow: "Frivolity, cruelty",
    brandExamples: ["M&Ms", "Old Spice", "Skittles"],
    consumerTriggers: ["fun", "humor", "playfulness", "spontaneity", "entertainment"],
    adResponse: "Responds to humorous, playful, and entertaining messaging",
    bigFiveAffinity: { extraversion: "H", openness: "H", conscientiousness: "L" }
  },
  {
    archetypeId: "sage",
    label: "The Sage",
    coreDesire: "To find the truth",
    coreFear: "Being duped, ignorance",
    strategy: "Seek out information and self-knowledge",
    gift: "Wisdom, intelligence",
    shadow: "Dogmatism, ivory tower",
    brandExamples: ["Google", "BBC", "Harvard"],
    consumerTriggers: ["knowledge", "truth", "expertise", "analysis", "wisdom"],
    adResponse: "Responds to data-driven, expert, and intellectually substantive messaging",
    bigFiveAffinity: { openness: "H", conscientiousness: "H", agreeableness: "M" }
  },
  {
    archetypeId: "magician",
    label: "The Magician",
    coreDesire: "To understand the fundamental laws of the universe",
    coreFear: "Unintended negative consequences",
    strategy: "Develop a vision and live by it",
    gift: "Finding win-win solutions",
    shadow: "Manipulation",
    brandExamples: ["Disney", "Dyson", "Tesla"],
    consumerTriggers: ["transformation", "vision", "possibility", "magic", "innovation"],
    adResponse: "Responds to transformative, visionary, and possibility-focused messaging",
    bigFiveAffinity: { openness: "H", conscientiousness: "H", extraversion: "H" }
  },
  {
    archetypeId: "ruler",
    label: "The Ruler",
    coreDesire: "Control, prosperity",
    coreFear: "Chaos, being overthrown",
    strategy: "Exercise power",
    gift: "Responsibility, leadership",
    shadow: "Authoritarianism, inability to delegate",
    brandExamples: ["Rolex", "Mercedes-Benz", "American Express"],
    consumerTriggers: ["status", "power", "control", "prestige", "leadership"],
    adResponse: "Responds to status, exclusivity, and prestige messaging",
    bigFiveAffinity: { conscientiousness: "H", extraversion: "H", agreeableness: "L" }
  }
];

const HAIDT_FOUNDATIONS_SEED = [
  {
    foundationId: "care_harm",
    label: "Care / Harm",
    highDescription: "Strongly sensitive to suffering and cruelty; deeply empathetic",
    highTriggers: ["animal welfare", "children's safety", "humanitarian causes", "anti-cruelty messaging"],
    highAdResponse: "Responds strongly to emotional appeals involving vulnerability and protection",
    lowDescription: "Less moved by suffering; focuses on toughness and self-reliance",
    lowTriggers: ["strength", "resilience", "personal responsibility"],
    lowAdResponse: "Responds to strength and self-reliance messaging; unmoved by emotional manipulation"
  },
  {
    foundationId: "fairness_cheating",
    label: "Fairness / Cheating",
    highDescription: "Strong sense of justice, equality, and reciprocity",
    highTriggers: ["fair trade", "transparency", "equal treatment", "anti-corruption"],
    highAdResponse: "Responds to transparency, fairness, and ethical business practices",
    lowDescription: "More pragmatic about rules; accepts hierarchy and inequality",
    lowTriggers: ["efficiency", "results", "pragmatism"],
    lowAdResponse: "Responds to results and effectiveness over ethical claims"
  },
  {
    foundationId: "loyalty_betrayal",
    label: "Loyalty / Betrayal",
    highDescription: "Strong in-group loyalty; values patriotism, tradition, team spirit",
    highTriggers: ["made in Italy", "national pride", "team", "tradition", "heritage"],
    highAdResponse: "Responds strongly to national pride, heritage, and community belonging messaging",
    lowDescription: "More cosmopolitan; values individual over group",
    lowTriggers: ["global", "individual freedom", "universal values"],
    lowAdResponse: "Responds to universal and individualistic messaging; skeptical of tribal appeals"
  },
  {
    foundationId: "authority_subversion",
    label: "Authority / Subversion",
    highDescription: "Respects hierarchy, tradition, and legitimate authority",
    highTriggers: ["expert endorsement", "institutional trust", "tradition", "order"],
    highAdResponse: "Responds to expert authority, institutional credibility, and traditional values",
    lowDescription: "Challenges authority; values questioning and disruption",
    lowTriggers: ["anti-establishment", "disruption", "questioning norms"],
    lowAdResponse: "Responds to anti-establishment and disruptive messaging; distrusts authority claims"
  },
  {
    foundationId: "sanctity_degradation",
    label: "Sanctity / Degradation",
    highDescription: "Strong sense of purity, cleanliness, and the sacred",
    highTriggers: ["natural", "pure", "clean", "organic", "sacred tradition"],
    highAdResponse: "Responds to purity, naturalness, and anti-contamination messaging",
    lowDescription: "Less concerned with purity; more pragmatic and secular",
    lowTriggers: ["pragmatic", "functional", "secular"],
    lowAdResponse: "Responds to functional and pragmatic messaging; unmoved by purity appeals"
  },
  {
    foundationId: "liberty_oppression",
    label: "Liberty / Oppression",
    highDescription: "Strong anti-authoritarian streak; values freedom from domination",
    highTriggers: ["freedom", "independence", "anti-bullying", "empowerment"],
    highAdResponse: "Responds to empowerment, freedom, and anti-oppression messaging",
    lowDescription: "More accepting of constraints; values stability over freedom",
    lowTriggers: ["security", "stability", "order"],
    lowAdResponse: "Responds to security and stability messaging over freedom appeals"
  }
];

// ─── COHERENCE RULES ─────────────────────────────────────────────────────────

interface CoherenceRule {
  rule: string;
  description: string;
  archetype: string;
  incompatibleBigFive?: Partial<BigFiveProfile>;
  incompatibleHaidt?: Partial<HaidtProfile>;
  severity: "hard" | "soft";
}

const COHERENCE_RULES: CoherenceRule[] = [
  {
    rule: "rebel_authority_conflict",
    description: "Rebel archetype with high Authority moral foundation is contradictory",
    archetype: "rebel",
    incompatibleHaidt: { authority_subversion: "H" },
    severity: "hard"
  },
  {
    rule: "ruler_low_conscientiousness",
    description: "Ruler archetype with very low Conscientiousness is implausible",
    archetype: "ruler",
    incompatibleBigFive: { conscientiousness: "L" },
    severity: "hard"
  },
  {
    rule: "sage_low_openness",
    description: "Sage archetype with low Openness is contradictory",
    archetype: "sage",
    incompatibleBigFive: { openness: "L" },
    severity: "hard"
  },
  {
    rule: "creator_low_openness",
    description: "Creator archetype with low Openness is contradictory",
    archetype: "creator",
    incompatibleBigFive: { openness: "L" },
    severity: "hard"
  },
  {
    rule: "innocent_high_neuroticism",
    description: "Innocent archetype with very high Neuroticism is implausible",
    archetype: "innocent",
    incompatibleBigFive: { neuroticism: "H" },
    severity: "soft"
  },
  {
    rule: "hero_low_conscientiousness",
    description: "Hero archetype with very low Conscientiousness is implausible",
    archetype: "hero",
    incompatibleBigFive: { conscientiousness: "L" },
    severity: "soft"
  }
];

function checkCoherence(
  archetypeId: string,
  bigFive: BigFiveProfile,
  haidt: HaidtProfile
): { isValid: boolean; violations: Array<{ rule: string; severity: string; description: string }> } {
  const violations: Array<{ rule: string; severity: string; description: string }> = [];

  for (const rule of COHERENCE_RULES) {
    if (rule.archetype !== archetypeId) continue;

    if (rule.incompatibleBigFive) {
      for (const [dim, level] of Object.entries(rule.incompatibleBigFive)) {
        if (bigFive[dim as keyof BigFiveProfile] === level) {
          violations.push({ rule: rule.rule, severity: rule.severity, description: rule.description });
        }
      }
    }

    if (rule.incompatibleHaidt) {
      for (const [foundation, level] of Object.entries(rule.incompatibleHaidt)) {
        if (haidt[foundation as keyof HaidtProfile] === level) {
          violations.push({ rule: rule.rule, severity: rule.severity, description: rule.description });
        }
      }
    }
  }

  const hardViolations = violations.filter(v => v.severity === "hard");
  return { isValid: hardViolations.length === 0, violations };
}

// ─── MIROFISH BEHAVIORAL PARAMETERS ──────────────────────────────────────────

function deriveMirofishParams(
  bigFive: BigFiveProfile,
  archetypeId: string,
  haidt: HaidtProfile
): {
  activityLevel: number;
  sentimentBias: number;
  stance: MirofishStance;
  influenceWeight: number;
  echoChamberStrength: number;
  responseDelayMin: number;
  responseDelayMax: number;
} {
  // Activity level: driven by extraversion and conscientiousness
  const extraversionScore = bigFive.extraversion === "H" ? 0.8 : bigFive.extraversion === "M" ? 0.5 : 0.2;
  const conscientiousnessScore = bigFive.conscientiousness === "H" ? 0.7 : bigFive.conscientiousness === "M" ? 0.5 : 0.3;
  const activityLevel = Math.round((extraversionScore * 0.6 + conscientiousnessScore * 0.4) * 100) / 100;

  // Sentiment bias: driven by neuroticism (inverted) and agreeableness
  const neuroticismPenalty = bigFive.neuroticism === "H" ? -0.3 : bigFive.neuroticism === "M" ? -0.1 : 0.1;
  const agreeablenessBonus = bigFive.agreeableness === "H" ? 0.2 : bigFive.agreeableness === "M" ? 0.0 : -0.2;
  const sentimentBias = Math.round((neuroticismPenalty + agreeablenessBonus) * 100) / 100;

  // Stance: derived from archetype
  const stanceMap: Record<string, MirofishStance> = {
    innocent: "supportive",
    orphan: "neutral",
    hero: "supportive",
    caregiver: "supportive",
    explorer: "neutral",
    rebel: "opposing",
    lover: "supportive",
    creator: "neutral",
    jester: "neutral",
    sage: "observer",
    magician: "supportive",
    ruler: "supportive"
  };
  const stance = stanceMap[archetypeId] ?? "neutral";

  // Influence weight: driven by extraversion and openness
  const opennessScore = bigFive.openness === "H" ? 0.7 : bigFive.openness === "M" ? 0.5 : 0.3;
  const influenceWeight = Math.round((extraversionScore * 0.5 + opennessScore * 0.5) * 100) / 100;

  // Echo chamber strength: driven by loyalty foundation and agreeableness (inverted)
  const loyaltyBonus = haidt.loyalty_betrayal === "H" ? 0.3 : 0;
  const agreeablenessEcho = bigFive.agreeableness === "H" ? 0.2 : bigFive.agreeableness === "L" ? -0.1 : 0;
  const echoChamberStrength = Math.min(0.9, Math.max(0.1, Math.round((0.3 + loyaltyBonus + agreeablenessEcho) * 100) / 100));

  // Response delay: introverts and high-conscientiousness take longer to respond
  const responseDelayMin = bigFive.extraversion === "H" ? 1 : bigFive.extraversion === "M" ? 5 : 15;
  const responseDelayMax = bigFive.conscientiousness === "H" ? 120 : bigFive.conscientiousness === "M" ? 60 : 30;

  return { activityLevel, sentimentBias, stance, influenceWeight, echoChamberStrength, responseDelayMin, responseDelayMax };
}

// ─── SYSTEM PROMPT GENERATION ─────────────────────────────────────────────────

function buildBigFiveDescription(bigFive: BigFiveProfile): string {
  const traits: Record<string, Record<string, string[]>> = {
    openness: {
      L: ["conventional", "practical", "prefers routine", "resistant to change"],
      M: ["moderately curious", "balances tradition and novelty"],
      H: ["creative", "intellectually curious", "embraces novelty", "imaginative"]
    },
    conscientiousness: {
      L: ["spontaneous", "flexible", "impulsive", "present-focused"],
      M: ["moderately organized", "balances planning and spontaneity"],
      H: ["organized", "disciplined", "goal-oriented", "reliable"]
    },
    extraversion: {
      L: ["introverted", "reserved", "prefers solitude", "thoughtful"],
      M: ["ambivert", "selectively social", "context-dependent energy"],
      H: ["outgoing", "energetic", "seeks social stimulation", "assertive"]
    },
    agreeableness: {
      L: ["competitive", "skeptical", "challenging", "self-interested"],
      M: ["moderately cooperative", "balances self and others"],
      H: ["cooperative", "trusting", "empathetic", "helpful"]
    },
    neuroticism: {
      L: ["emotionally stable", "calm", "resilient", "secure"],
      M: ["moderately stable", "occasional anxiety", "context-sensitive emotions"],
      H: ["emotionally reactive", "anxious", "sensitive", "prone to worry"]
    }
  };

  return Object.entries(bigFive)
    .map(([dim, level]) => `- ${dim.charAt(0).toUpperCase() + dim.slice(1)}: ${level} (${traits[dim][level].slice(0, 3).join(", ")})`)
    .join("\n");
}

function buildHaidtDescription(haidt: HaidtProfile): string {
  const descriptions: Record<string, Record<string, string>> = {
    care_harm: {
      H: "HIGH sensitivity to suffering -- strongly empathetic, moved by vulnerability",
      L: "low sensitivity to suffering -- focuses on toughness and self-reliance"
    },
    fairness_cheating: {
      H: "HIGH sense of justice -- values transparency and equal treatment",
      L: "low sensitivity to fairness -- pragmatic, accepts hierarchy"
    },
    loyalty_betrayal: {
      H: "HIGH in-group loyalty -- values tradition, heritage, national pride",
      L: "low group loyalty -- cosmopolitan, values universal over tribal"
    },
    authority_subversion: {
      H: "HIGH respect for authority -- trusts institutions, values tradition",
      L: "low respect for authority -- challenges hierarchy, anti-establishment"
    },
    sanctity_degradation: {
      H: "HIGH purity sensitivity -- values naturalness, cleanliness, the sacred",
      L: "low purity sensitivity -- pragmatic and secular"
    },
    liberty_oppression: {
      H: "HIGH liberty drive -- anti-authoritarian, values freedom from domination",
      L: "low liberty drive -- accepts constraints, values stability"
    }
  };

  return Object.entries(haidt)
    .map(([f, l]) => `- ${f.replace(/_/g, " ")}: ${descriptions[f][l]}`)
    .join("\n");
}

async function generateSystemPromptLLM(input: ArchetypeGenerationInput): Promise<string> {
  const archetype = PEARSON_ARCHETYPES_SEED.find(a => a.archetypeId === input.archetypeId);
  const cluster = CULTURAL_CLUSTERS_SEED.find(c => c.clusterId === input.culturalClusterId);

  if (!archetype || !cluster) {
    throw new Error(`Unknown archetype ${input.archetypeId} or cluster ${input.culturalClusterId}`);
  }

  const mirofishParams = deriveMirofishParams(input.bigFive, input.archetypeId, input.haidt);

  const prompt = `You are building a synthetic person profile for a market simulation engine.

Generate a rich, coherent system prompt for an AI agent with the following psychological and cultural profile.
The system prompt should be written in second person ("You are...") and should:
1. Establish the agent's core personality authentically
2. Describe how they perceive and react to advertising and marketing
3. Specify their emotional triggers and aversions
4. Ground their behavior in their cultural context
5. Be specific enough to generate consistent, predictable reactions

PROFILE SPECIFICATION:

Big Five Personality (OCEAN):
${buildBigFiveDescription(input.bigFive)}

Pearson/Jung Archetype: ${archetype.label}
- Core desire: ${archetype.coreDesire}
- Core fear: ${archetype.coreFear}
- Gift: ${archetype.gift}
- Shadow: ${archetype.shadow}
- Motivated by: ${archetype.consumerTriggers.join(", ")}

Haidt Moral Foundations:
${buildHaidtDescription(input.haidt)}

Cultural Context: ${cluster.label}
${cluster.description}
Cultural traits: ${cluster.culturalTraits.join(", ")}
Consumer culture: ${cluster.consumerCulture}

Mirofish Behavioral Parameters:
- Activity level: ${mirofishParams.activityLevel} (0=passive, 1=very active)
- Sentiment bias: ${mirofishParams.sentimentBias} (-1=negative, +1=positive)
- Default stance: ${mirofishParams.stance}
- Echo chamber strength: ${mirofishParams.echoChamberStrength} (tendency to cluster with similar opinions)

Generate a system prompt of 300-400 words that will make this agent react authentically and consistently.
Start with "You are a synthetic person with the following profile:" and write in second person.`;

  const response = await invokeLLM({
    messages: [{ role: "user", content: prompt }],
    maxTokens: 600
  });

  const firstChoice = response.choices[0]?.message?.content;
  if (typeof firstChoice === "string") return firstChoice;
  if (Array.isArray(firstChoice)) {
    const textPart = firstChoice.find(p => p.type === "text");
    return textPart ? (textPart as { type: "text"; text: string }).text : "";
  }
  return "";
}

// ─── DATABASE OPERATIONS ──────────────────────────────────────────────────────

export async function seedArchetypeMatrix(): Promise<{
  clustersSeeded: number;
  archetypesSeeded: number;
  foundationsSeeded: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Seed cultural clusters
  let clustersSeeded = 0;
  for (const cluster of CULTURAL_CLUSTERS_SEED) {
    const existing = await db.select().from(culturalClusters)
      .where(eq(culturalClusters.clusterId, cluster.clusterId))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(culturalClusters).values(cluster);
      clustersSeeded++;
    }
  }

  // Seed Pearson archetypes
  let archetypesSeeded = 0;
  for (const archetype of PEARSON_ARCHETYPES_SEED) {
    const existing = await db.select().from(pearsonArchetypes)
      .where(eq(pearsonArchetypes.archetypeId, archetype.archetypeId))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(pearsonArchetypes).values(archetype);
      archetypesSeeded++;
    }
  }

  // Seed Haidt foundations
  let foundationsSeeded = 0;
  for (const foundation of HAIDT_FOUNDATIONS_SEED) {
    const existing = await db.select().from(haidtFoundations)
      .where(eq(haidtFoundations.foundationId, foundation.foundationId))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(haidtFoundations).values(foundation);
      foundationsSeeded++;
    }
  }

  return { clustersSeeded, archetypesSeeded, foundationsSeeded };
}

export async function generateArchetypeProfile(
  input: ArchetypeGenerationInput,
  generateLLMPrompt: boolean = false
): Promise<{
  archetypeProfileId: string;
  isValid: boolean;
  violations: Array<{ rule: string; severity: string; description: string }>;
  mirofishParams: ReturnType<typeof deriveMirofishParams>;
  systemPrompt?: string;
  dbId?: number;
}> {
  // Check coherence
  const { isValid, violations } = checkCoherence(input.archetypeId, input.bigFive, input.haidt);

  // Generate profile ID
  const bfCode = [
    input.bigFive.openness,
    input.bigFive.conscientiousness,
    input.bigFive.extraversion,
    input.bigFive.agreeableness,
    input.bigFive.neuroticism
  ].join("");

  const haidtCode = [
    input.haidt.care_harm,
    input.haidt.fairness_cheating,
    input.haidt.loyalty_betrayal,
    input.haidt.authority_subversion,
    input.haidt.sanctity_degradation,
    input.haidt.liberty_oppression
  ].join("");

  const clusterCode = input.culturalClusterId.slice(0, 3).toUpperCase();
  const archetypeCode = input.archetypeId.slice(0, 3).toUpperCase();
  const archetypeProfileId = `${archetypeCode}_${bfCode}_${haidtCode}_${clusterCode}`;

  // Derive Mirofish parameters
  const mirofishParams = deriveMirofishParams(input.bigFive, input.archetypeId, input.haidt);

  // Override with explicit values if provided
  if (input.activityLevel !== undefined) mirofishParams.activityLevel = input.activityLevel;
  if (input.sentimentBias !== undefined) mirofishParams.sentimentBias = input.sentimentBias;
  if (input.stance !== undefined) mirofishParams.stance = input.stance;
  if (input.influenceWeight !== undefined) mirofishParams.influenceWeight = input.influenceWeight;
  if (input.echoChamberStrength !== undefined) mirofishParams.echoChamberStrength = input.echoChamberStrength;

  // Generate system prompt if requested
  let systemPrompt: string | undefined;
  if (generateLLMPrompt) {
    systemPrompt = await generateSystemPromptLLM(input);
  }

  // Save to DB
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(archetypeProfiles)
    .where(eq(archetypeProfiles.archetypeProfileId, archetypeProfileId))
    .limit(1);

  let dbId: number | undefined;
  if (existing.length === 0) {
    const result = await db.insert(archetypeProfiles).values({
      archetypeProfileId,
      openness: input.bigFive.openness,
      conscientiousness: input.bigFive.conscientiousness,
      extraversion: input.bigFive.extraversion,
      agreeableness: input.bigFive.agreeableness,
      neuroticism: input.bigFive.neuroticism,
      archetypeId: input.archetypeId,
      haidtCareHarm: input.haidt.care_harm,
      haidtFairnessCheating: input.haidt.fairness_cheating,
      haidtLoyaltyBetrayal: input.haidt.loyalty_betrayal,
      haidtAuthoritySubversion: input.haidt.authority_subversion,
      haidtSanctityDegradation: input.haidt.sanctity_degradation,
      haidtLibertyOppression: input.haidt.liberty_oppression,
      culturalClusterId: input.culturalClusterId,
      hasCoherenceViolations: !isValid || violations.some(v => v.severity === "soft"),
      coherenceViolations: violations,
      systemPrompt: systemPrompt ?? null,
      ...mirofishParams
    });
    dbId = (result as any).insertId;
  } else {
    dbId = existing[0].id;
    // Update system prompt if generated
    if (systemPrompt) {
      await db.update(archetypeProfiles)
        .set({ systemPrompt })
        .where(eq(archetypeProfiles.archetypeProfileId, archetypeProfileId));
    }
  }

  return { archetypeProfileId, isValid, violations, mirofishParams, systemPrompt, dbId };
}

export async function getArchetypeMatrixStats(): Promise<{
  clustersCount: number;
  archetypesCount: number;
  foundationsCount: number;
  profilesCount: number;
  hofstedeCountriesCount: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [clusters, archetypes, foundations, profiles, countries] = await Promise.all([
    db.select().from(culturalClusters),
    db.select().from(pearsonArchetypes),
    db.select().from(haidtFoundations),
    db.select().from(archetypeProfiles),
    db.select().from(hofstedeCountries)
  ]);

  return {
    clustersCount: clusters.length,
    archetypesCount: archetypes.length,
    foundationsCount: foundations.length,
    profilesCount: profiles.length,
    hofstedeCountriesCount: countries.length
  };
}

export async function listArchetypeProfiles(limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(archetypeProfiles).limit(limit).offset(offset);
}

export async function getArchetypeProfileById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const results = await db.select().from(archetypeProfiles)
    .where(eq(archetypeProfiles.id, id))
    .limit(1);
  return results[0] ?? null;
}

export async function seedHofstedeCountries(countriesData: Record<string, {
  ctr: string; pdi: number | null; idv: number | null; mas: number | null;
  uai: number | null; lto: number | null; ivr: number | null;
}>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let seeded = 0;

  // Assign clusters based on country
  const countryToCluster: Record<string, string> = {
    "Italy": "southern_europe", "Spain": "southern_europe", "Portugal": "southern_europe", "Greece": "southern_europe",
    "Germany": "western_europe", "France": "western_europe", "Belgium": "western_europe", "Austria": "western_europe", "Switzerland": "western_europe",
    "Sweden": "northern_europe", "Denmark": "northern_europe", "Norway": "northern_europe", "Finland": "northern_europe", "Netherlands": "northern_europe",
    "Poland": "eastern_europe", "Czech Rep": "eastern_europe", "Hungary": "eastern_europe", "Romania": "eastern_europe", "Bulgaria": "eastern_europe",
    "United States": "anglo", "Great Britain": "anglo", "Australia": "anglo", "Canada": "anglo", "New Zealand": "anglo",
    "Brazil": "latin_america", "Mexico": "latin_america", "Argentina": "latin_america", "Colombia": "latin_america", "Chile": "latin_america",
    "China": "east_asia_confucian", "Japan": "east_asia_confucian", "Korea South": "east_asia_confucian", "Taiwan": "east_asia_confucian", "Singapore": "east_asia_confucian",
    "India": "south_asia", "Pakistan": "south_asia", "Bangladesh": "south_asia",
    "Saudi Arabia": "middle_east", "United Arab Emirates": "middle_east", "Egypt": "middle_east", "Iran": "middle_east", "Turkey": "middle_east",
    "Nigeria": "sub_saharan_africa", "Kenya": "sub_saharan_africa", "Ghana": "sub_saharan_africa", "Ethiopia": "sub_saharan_africa", "South Africa": "sub_saharan_africa",
    "Iceland": "nordic_protestant", "Estonia": "nordic_protestant", "Latvia": "nordic_protestant", "Lithuania": "nordic_protestant"
  };

  for (const [country, scores] of Object.entries(countriesData)) {
    const existing = await db.select().from(hofstedeCountries)
      .where(eq(hofstedeCountries.country, country))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(hofstedeCountries).values({
        ctr: scores.ctr,
        country,
        pdi: scores.pdi,
        idv: scores.idv,
        mas: scores.mas,
        uai: scores.uai,
        lto: scores.lto,
        ivr: scores.ivr,
        assignedCluster: countryToCluster[country] ?? "global_urban"
      });
      seeded++;
    }
  }

  return seeded;
}
