/**
 * Ordinary People — LLM Reaction Engine v0.2
 *
 * "Formula per il vincolo, LLM per l'incarnazione."
 *
 * This module takes a persona (with system prompt), a campaign, a regime context,
 * and optionally a benchmark score from the formula engine, then asks the LLM
 * to produce a structured reaction as that persona.
 *
 * Output: gut reaction (System 1), reflection (System 2), score, attraction/repulsion
 * factors, and a first-person quote.
 */

import { invokeLLM } from "./_core/llm";

// ─── Types ──────────────────────────────────────────────────────────

export interface PersonaForLLM {
  archetypeId: string;
  label: string;
  systemPrompt: string | null;
  // Fallback demographic data if no system prompt
  ageMin: number;
  ageMax: number;
  incomeBand: string;
  geo: string;
  education: string;
  householdType: string;
  generationalCohort: string | null;
  topicAffinities: Record<string, number> | null;
  channelUsage: Record<string, number> | null;
  identityProfile: Record<string, number> | null;
  bibliographyNotes: string | null;
}

export interface CampaignForLLM {
  name: string;
  topics: string[];
  tone: string;
  format: string;
  channel: string;
  pricePoint: number | null;
  emotionalCharge: number;
  statusSignal: number;
  priceSignal: number;
  noveltySignal: number;
  tribalIdentitySignal: number;
  notes: string | null;
}

export interface RegimeContextForLLM {
  label: string;
  description: string | null;
}

export interface LLMReactionOutput {
  gutReaction: string;       // System 1 — immediate, visceral, 1-2 sentences
  reflection: string;        // System 2 — after thinking, 2-3 sentences
  quote: string;             // First-person quote, in character, colloquial Italian
  score: number;             // -1.0 to +1.0
  attraction: string[];      // What pulls them toward the campaign
  repulsion: string[];       // What pushes them away
  ambivalence: string | null; // Internal tension, if any
  buyProbability: number;    // 0.0 to 1.0 — would they actually buy?
  shareability: number;      // 0.0 to 1.0 — would they share/talk about it?
  emotionalValence: string;  // "positive" | "negative" | "mixed" | "indifferent"
}

// ─── System Prompt Builder ──────────────────────────────────────────

function buildPersonaSystemPrompt(persona: PersonaForLLM): string {
  if (persona.systemPrompt) {
    return persona.systemPrompt;
  }

  // Fallback: generate a minimal prompt from structured data
  const age = Math.round((persona.ageMin + persona.ageMax) / 2);
  const topics = persona.topicAffinities
    ? Object.entries(persona.topicAffinities)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 4)
        .map(([k]) => k)
        .join(", ")
    : "vari";
  const channels = persona.channelUsage
    ? Object.entries(persona.channelUsage)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 3)
        .map(([k]) => k)
        .join(", ")
    : "vari";

  return `Sei ${persona.label}, hai circa ${age} anni, vivi in zona ${persona.geo} (${persona.education}), nucleo ${persona.householdType}, fascia reddito ${persona.incomeBand}. Ti interessano: ${topics}. Usi principalmente: ${channels}. Generazione: ${persona.generationalCohort || "non specificata"}.`;
}

// ─── Reaction Prompt ────────────────────────────────────────────────

function buildReactionPrompt(
  campaign: CampaignForLLM,
  regime: RegimeContextForLLM,
  benchmarkScore: number | null
): string {
  const campaignDesc = [
    `Campagna: "${campaign.name}"`,
    `Argomenti: ${campaign.topics.join(", ")}`,
    `Tono: ${campaign.tone}`,
    `Formato: ${campaign.format}`,
    `Canale: ${campaign.channel}`,
    `Prezzo: €${campaign.pricePoint}`,
    `Carica emotiva: ${(campaign.emotionalCharge * 100).toFixed(0)}%`,
    `Segnale status: ${(campaign.statusSignal * 100).toFixed(0)}%`,
    `Segnale prezzo: ${(campaign.priceSignal * 100).toFixed(0)}%`,
    `Segnale novità: ${(campaign.noveltySignal * 100).toFixed(0)}%`,
    `Segnale identità tribale: ${(campaign.tribalIdentitySignal * 100).toFixed(0)}%`,
  ].join("\n");

  const regimeDesc = `Contesto macroeconomico: ${regime.label}${regime.description ? ` — ${regime.description}` : ""}`;

  const benchmarkHint = benchmarkScore !== null
    ? `\n\nNota tecnica: il modello statistico ha calcolato uno score di ${benchmarkScore.toFixed(2)} per te su questa campagna. Usalo come riferimento, ma la tua reazione deve essere autentica e basata su chi sei.`
    : "";

  return `${campaignDesc}

${regimeDesc}${benchmarkHint}

Reagisci a questa campagna pubblicitaria come faresti nella vita reale.

Rispondi SOLO con un JSON valido con questa struttura esatta:
{
  "gutReaction": "la tua prima reazione istintiva, 1-2 frasi",
  "reflection": "dopo averci pensato un attimo, 2-3 frasi",
  "quote": "una frase in prima persona, come la diresti davvero, in italiano colloquiale",
  "score": <numero da -1.0 a +1.0, dove -1 = rifiuto totale, 0 = indifferenza, +1 = entusiasmo>,
  "attraction": ["fattore 1", "fattore 2"],
  "repulsion": ["fattore 1", "fattore 2"],
  "ambivalence": "tensione interna se presente, altrimenti null",
  "buyProbability": <0.0 a 1.0>,
  "shareability": <0.0 a 1.0>,
  "emotionalValence": "positive" | "negative" | "mixed" | "indifferent"
}`;
}

// ─── Main Function ──────────────────────────────────────────────────

export async function generateLLMReaction(
  persona: PersonaForLLM,
  campaign: CampaignForLLM,
  regime: RegimeContextForLLM,
  benchmarkScore: number | null = null
): Promise<LLMReactionOutput> {
  const systemPrompt = buildPersonaSystemPrompt(persona);
  const userPrompt = buildReactionPrompt(campaign, regime, benchmarkScore);

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `${systemPrompt}\n\nIMPORTANTE: Rispondi SEMPRE e SOLO con JSON valido. Nessun testo prima o dopo il JSON. Sei questa persona — reagisci in modo autentico, con il tuo linguaggio, i tuoi pregiudizi, le tue paure e i tuoi desideri. Non essere diplomatico. Non essere neutro. Sii te stesso.`,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "persona_reaction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            gutReaction: { type: "string", description: "Immediate visceral reaction, 1-2 sentences" },
            reflection: { type: "string", description: "After thinking, 2-3 sentences" },
            quote: { type: "string", description: "First-person quote in colloquial Italian" },
            score: { type: "number", description: "Score from -1.0 to +1.0" },
            attraction: { type: "array", items: { type: "string" }, description: "Pull factors" },
            repulsion: { type: "array", items: { type: "string" }, description: "Push factors" },
            ambivalence: { type: ["string", "null"], description: "Internal tension if any" },
            buyProbability: { type: "number", description: "0.0 to 1.0" },
            shareability: { type: "number", description: "0.0 to 1.0" },
            emotionalValence: { type: "string", enum: ["positive", "negative", "mixed", "indifferent"], description: "Overall emotional tone" },
          },
          required: ["gutReaction", "reflection", "quote", "score", "attraction", "repulsion", "ambivalence", "buyProbability", "shareability", "emotionalValence"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices?.[0]?.message?.content as string | undefined;
  if (!content) {
    throw new Error(`LLM returned empty response for persona ${persona.archetypeId}`);
  }

  const parsed = JSON.parse(content) as LLMReactionOutput;

  // Clamp values
  parsed.score = Math.max(-1, Math.min(1, parsed.score));
  parsed.buyProbability = Math.max(0, Math.min(1, parsed.buyProbability));
  parsed.shareability = Math.max(0, Math.min(1, parsed.shareability));

  return parsed;
}

// ─── Batch Reaction (all personas) ──────────────────────────────────

export async function generateAllReactions(
  personas: PersonaForLLM[],
  campaign: CampaignForLLM,
  regime: RegimeContextForLLM,
  benchmarkScores: Record<string, number> = {}
): Promise<Record<string, LLMReactionOutput>> {
  const results: Record<string, LLMReactionOutput> = {};

  // Run sequentially to avoid rate limits — each call is ~2-5s
  for (const persona of personas) {
    try {
      const benchmark = benchmarkScores[persona.archetypeId] ?? null;
      results[persona.archetypeId] = await generateLLMReaction(
        persona,
        campaign,
        regime,
        benchmark
      );
    } catch (err) {
      console.error(`[LLM Reaction] Failed for ${persona.archetypeId}:`, err);
      // Fallback: generate a minimal reaction
      results[persona.archetypeId] = {
        gutReaction: "Non riesco a reagire a questa campagna.",
        reflection: "Il sistema non è riuscito a generare una reazione per questa persona.",
        quote: "...",
        score: 0,
        attraction: [],
        repulsion: [],
        ambivalence: null,
        buyProbability: 0,
        shareability: 0,
        emotionalValence: "indifferent",
      };
    }
  }

  return results;
}

// ─── System Prompt Generator ────────────────────────────────────────

export async function generateSystemPrompt(
  persona: {
    label: string;
    ageMin: number;
    ageMax: number;
    incomeBand: string;
    geo: string;
    education: string;
    householdType: string;
    generationalCohort: string | null;
    topicAffinities: Record<string, number> | null;
    channelUsage: Record<string, number> | null;
    identityProfile: Record<string, number> | null;
    mediaDiet: Record<string, number> | null;
    referenceGroup: string | null;
    rejectionGroup: string | null;
    bibliographyNotes: string | null;
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
): Promise<string> {
  const age = Math.round((persona.ageMin + persona.ageMax) / 2);

  const topTopics = persona.topicAffinities
    ? Object.entries(persona.topicAffinities)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5)
        .map(([k, v]) => `${k} (${((v as number) * 100).toFixed(0)}%)`)
        .join(", ")
    : "non specificati";

  const topChannels = persona.channelUsage
    ? Object.entries(persona.channelUsage)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 4)
        .map(([k, v]) => `${k} (${((v as number) * 100).toFixed(0)}%)`)
        .join(", ")
    : "non specificati";

  const topMedia = persona.mediaDiet
    ? Object.entries(persona.mediaDiet)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 4)
        .map(([k, v]) => `${k} (${((v as number) * 100).toFixed(0)}%)`)
        .join(", ")
    : "non specificata";

  const identityTraits = persona.identityProfile
    ? Object.entries(persona.identityProfile)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 4)
        .map(([k, v]) => `${k} (${((v as number) * 100).toFixed(0)}%)`)
        .join(", ")
    : "non specificati";

  const psychProfile = [
    `novità: ${(persona.noveltySeeking * 100).toFixed(0)}%`,
    `status: ${(persona.statusOrientation * 100).toFixed(0)}%`,
    `sensibilità prezzo: ${(persona.priceSensitivity * 100).toFixed(0)}%`,
    `avversione rischio: ${(persona.riskAversion * 100).toFixed(0)}%`,
    `suscettibilità emotiva: ${(persona.emotionalSusceptibility * 100).toFixed(0)}%`,
    `difesa identitaria: ${(persona.identityDefensiveness * 100).toFixed(0)}%`,
    `conformismo: ${(persona.conformismIndex * 100).toFixed(0)}%`,
    `fiducia autorità: ${(persona.authorityTrust * 100).toFixed(0)}%`,
    `gratificazione differita: ${(persona.delayedGratification * 100).toFixed(0)}%`,
    `capitale culturale: ${(persona.culturalCapital * 100).toFixed(0)}%`,
    `locus of control: ${(persona.locusOfControl * 100).toFixed(0)}%`,
  ].join(", ");

  const prompt = `Genera un system prompt narrativo per incarnare questa persona italiana in una simulazione di marketing.

DATI STRUTTURALI:
- Label: ${persona.label}
- Età: circa ${age} anni (range ${persona.ageMin}-${persona.ageMax})
- Reddito: ${persona.incomeBand}
- Area: ${persona.geo}
- Istruzione: ${persona.education}
- Nucleo: ${persona.householdType}
- Generazione: ${persona.generationalCohort || "non specificata"}

PROFILO PSICOGRAFICO: ${psychProfile}

INTERESSI: ${topTopics}
CANALI: ${topChannels}
DIETA MEDIALE: ${topMedia}
TRATTI IDENTITARI: ${identityTraits}
GRUPPO DI RIFERIMENTO: ${persona.referenceGroup || "nessuno"}
GRUPPO DI RIFIUTO: ${persona.rejectionGroup || "nessuno"}

NOTE BIBLIOGRAFICHE: ${persona.bibliographyNotes || "nessuna"}

ISTRUZIONI:
Scrivi un system prompt in seconda persona ("Sei...") che:
1. Dia un NOME italiano plausibile e una STORIA MINIMA (lavoro, famiglia, abitudini, paure, desideri)
2. Descriva COME PARLA (registro linguistico, dialettismi, tic verbali)
3. Descriva COSA LA MUOVE (motivazioni profonde, non solo interessi superficiali)
4. Descriva COSA LA BLOCCA (paure, resistenze, vergogne)
5. Descriva IL SUO RAPPORTO CON I SOLDI (come decide, cosa la fa sentire in colpa, cosa la fa sentire furba)
6. Descriva IL SUO RAPPORTO CON LA PUBBLICITÀ (cosa la attira, cosa la irrita, cosa la fa sentire presa in giro)
7. Integri i riferimenti bibliografici come TRATTI COMPORTAMENTALI, non come citazioni accademiche

Il prompt deve essere lungo 300-500 parole. Deve suonare come la descrizione di una persona vera, non di un segmento di mercato.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "Sei un esperto di psicologia del consumatore italiano, sociologia e marketing. Scrivi system prompts narrativi per incarnare personas in simulazioni. Scrivi in italiano.",
      },
      { role: "user", content: prompt },
    ],
  });

  return (response.choices?.[0]?.message?.content as string) || "";
}
