/**
 * Brand Profiler
 *
 * Dato il BrandRawData raccolto dal brand-researcher,
 * usa un LLM call per produrre il Brand Agent JSON strutturato:
 * posizionamento, target audience, tone of voice, competitor,
 * default agent pool configuration.
 *
 * Questo è il cervello dell'onboarding: trasforma dati grezzi
 * in un profilo azionabile che il sistema usa per pre-configurare
 * le simulazioni e contestualizzare i report.
 */

import { invokeLLM } from "../_core/llm";
import type { BrandRawData } from "./brand-researcher";

// ─── Types ────────────────────────────────────────────────────────────

export interface BrandIdentity {
  name: string;
  sector: string;
  positioning: "luxury" | "premium" | "mid-market" | "mass-market" | "value";
  priceRange: { min: number | null; max: number | null; currency: string };
  toneOfVoice: string[];
  brandValues: string[];
  aesthetic: string;
}

export interface MarketPresence {
  countries: string[];
  regionsStrong: string[];
  regionsModerate: string[];
  storeCount: number | null;
  channels: {
    physicalRetail?: { weight: number };
    ecommerce?: { weight: number };
    marketplace?: { weight: number };
    digital?: { weight: number };
  };
}

export interface DigitalPresence {
  website?: string;
  instagram?: { handle: string; followers: number | null; contentType: string } | null;
  facebook?: { handle: string; followers: number | null; engagement: string } | null;
  tiktok?: { handle: string; followers: number | null } | null;
  youtube?: { handle: string; subscribers: string | null } | null;
  twitter?: { handle: string; followers: number | null } | null;
}

export interface TargetAudience {
  primary: {
    gender: "female" | "male" | "all";
    ageRange: [number, number];
    generation: string[];
    culturalCluster: string;
    bourdieuCapital: { economic: number[]; cultural: number[] };
    pearsonArchetypesDominant: string[];
  };
  secondary?: {
    gender: "female" | "male" | "all";
    ageRange: [number, number];
    generation: string[];
    notes: string;
  };
}

export interface Competitor {
  name: string;
  positioning: string;
}

export interface DefaultAgentPool {
  totalAgents: number;
  composition: {
    byCluster: Record<string, number>;
    byGeneration: Record<string, number>;
    byGender: Record<string, number>;
    byCapitalEconomic: Record<string, number>;
  };
}

export interface BrandProfile {
  brandIdentity: BrandIdentity;
  marketPresence: MarketPresence;
  digitalPresence: DigitalPresence;
  targetAudience: TargetAudience;
  competitors: Competitor[];
  defaultAgentPool: DefaultAgentPool;
  confidenceScore: number; // 0-1, quanto è affidabile il profilo generato
  profilingNotes: string; // note del profiler su cosa è certo vs ipotesi
}

// ─── Main Export ──────────────────────────────────────────────────────

/**
 * Genera il Brand Profile strutturato a partire dai raw data.
 *
 * @param rawData Dati grezzi raccolti da brand-researcher
 * @returns BrandProfile strutturato pronto per il DB
 */
export async function buildBrandProfile(rawData: BrandRawData): Promise<BrandProfile> {
  // Prepara il contesto per l'LLM
  const socialSummary = rawData.socialPresences
    .map(s => `${s.platform}: ${s.handle ?? "?"} (${s.followers?.toLocaleString() ?? "?"} follower)`)
    .join(", ");

  const youtubeSummary = rawData.youtubeChannels && rawData.youtubeChannels.length > 0
    ? rawData.youtubeChannels[0].title + " (" + (rawData.youtubeChannels[0].subscribers ?? "?") + " iscritti)"
    : "nessun canale trovato";

  const competitorHints = rawData.searchResults
    ?.filter(r => r.snippet.startsWith("Competitor:"))
    .map(r => `${r.title} (${r.snippet.replace("Competitor: ", "")})`)
    .join(", ") ?? "";

  const homepageInfo = rawData.homepageSummary
    ? `Homepage analizzata: ${rawData.homepageSummary}`
    : "Homepage non disponibile";

  const systemPrompt = `Sei un esperto di analisi di brand e consumer insight italiani.
Dato un set di dati raccolti su un brand, genera un profilo strutturato completo.
Rispondi SOLO con JSON valido, nessun testo aggiuntivo prima o dopo.
Usa la tua conoscenza del mercato italiano per completare le informazioni mancanti.
Sii preciso sui dati demografici italiani: generazioni (Boomer 1946-1964, GenX 1965-1980, Millennial 1981-1996, GenZ 1997-2012).`;

  const userPrompt = `Brand: "${rawData.brandName}"
${rawData.websiteUrl ? `Sito: ${rawData.websiteUrl}` : ""}
${homepageInfo}
Social: ${socialSummary || "non trovati"}
YouTube: ${youtubeSummary}
Competitor identificati: ${competitorHints || "da determinare"}

Genera un Brand Profile completo con questa struttura JSON esatta:
{
  "brandIdentity": {
    "name": "${rawData.brandName}",
    "sector": "settore (es. footwear, food, fashion, tech, beauty, automotive)",
    "positioning": "luxury|premium|mid-market|mass-market|value",
    "priceRange": { "min": null, "max": null, "currency": "EUR" },
    "toneOfVoice": ["aggettivo1", "aggettivo2", "aggettivo3"],
    "brandValues": ["valore1", "valore2", "valore3"],
    "aesthetic": "descrizione estetica in una frase"
  },
  "marketPresence": {
    "countries": ["IT"],
    "regionsStrong": ["Lombardia", "Lazio"],
    "regionsModerate": ["Campania", "Sicilia"],
    "storeCount": null,
    "channels": {
      "physicalRetail": { "weight": 0.5 },
      "ecommerce": { "weight": 0.3 },
      "marketplace": { "weight": 0.2 }
    }
  },
  "digitalPresence": {
    "website": "${rawData.websiteUrl ?? ""}",
    "instagram": null,
    "facebook": null,
    "tiktok": null,
    "youtube": null,
    "twitter": null
  },
  "targetAudience": {
    "primary": {
      "gender": "female|male|all",
      "ageRange": [25, 55],
      "generation": ["millennial", "genx"],
      "culturalCluster": "catholic_europe",
      "bourdieuCapital": { "economic": [2, 3], "cultural": [2, 3] },
      "pearsonArchetypesDominant": ["caregiver", "everyman"]
    },
    "secondary": {
      "gender": "all",
      "ageRange": [18, 35],
      "generation": ["genz"],
      "notes": "segmento secondario"
    }
  },
  "competitors": [
    { "name": "Competitor1", "positioning": "posizionamento" }
  ],
  "defaultAgentPool": {
    "totalAgents": 100,
    "composition": {
      "byCluster": { "catholic_europe_IT": 0.85, "catholic_europe_other": 0.15 },
      "byGeneration": { "boomer": 0.15, "genx": 0.30, "millennial": 0.35, "genz": 0.20 },
      "byGender": { "female": 0.60, "male": 0.40 },
      "byCapitalEconomic": { "1": 0.10, "2": 0.35, "3": 0.35, "4": 0.15, "5": 0.05 }
    }
  },
  "confidenceScore": 0.7,
  "profilingNotes": "Note su cosa è certo vs ipotesi basate su conoscenza generale del brand"
}`;

  const result = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 1500,
  });

  const content = result.choices[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("LLM non ha restituito testo");
  }

  // Estrai JSON dalla risposta
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("LLM non ha restituito JSON valido");
  }

  const profile = JSON.parse(jsonMatch[0]) as BrandProfile;

  // Arricchisci con dati social reali se disponibili
  if (rawData.twitterProfile) {
    profile.digitalPresence.twitter = {
      handle: `@${rawData.twitterProfile.username}`,
      followers: rawData.twitterProfile.followers ?? null,
    };
  }

  if (rawData.youtubeChannels && rawData.youtubeChannels.length > 0) {
    const yt = rawData.youtubeChannels[0];
    profile.digitalPresence.youtube = {
      handle: yt.channelId,
      subscribers: yt.subscribers ?? null,
    };
  }

  return profile;
}

/**
 * Genera un messaggio di presentazione del profilo per la chat UI.
 * Questo è il testo che l'AI mostra al brand manager dopo la ricerca.
 */
export function formatProfilePresentation(profile: BrandProfile): string {
  const { brandIdentity, marketPresence, targetAudience, competitors, defaultAgentPool } = profile;

  const primaryTarget = targetAudience.primary;
  const ageRange = `${primaryTarget.ageRange[0]}-${primaryTarget.ageRange[1]} anni`;
  const generations = primaryTarget.generation.join(", ");
  const genderLabel = primaryTarget.gender === "female" ? "donna" : primaryTarget.gender === "male" ? "uomo" : "tutti i generi";

  const competitorNames = competitors.slice(0, 3).map(c => c.name).join(", ");
  const storeInfo = marketPresence.storeCount
    ? `${marketPresence.storeCount} punti vendita`
    : "presenza retail";

  const regionsInfo = marketPresence.regionsStrong.slice(0, 3).join(", ");

  const toneStr = brandIdentity.toneOfVoice.slice(0, 3).join(", ");

  return `Ecco cosa ho trovato su **${brandIdentity.name}**.

È un brand di **${brandIdentity.sector}** con posizionamento **${brandIdentity.positioning}**, ${storeInfo} concentrati principalmente in ${regionsInfo}. Il vostro tone of voice è ${toneStr}. I vostri competitor diretti sono ${competitorNames || "da confermare"}.

Il target primario che ho identificato è **${genderLabel}, ${ageRange}** (${generations}). Sulla base di questo profilo, ho pre-selezionato **${defaultAgentPool.totalAgents} agenti** dal nostro pool che rappresentano il vostro mercato reale.

Vuoi vedere la composizione del panel e modificare i parametri?`;
}
