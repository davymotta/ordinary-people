/**
 * Psyche Integration — Ordinary People Bridge
 *
 * Traduce un agente OP (Agent + AgentState) in un AgentProfile Psyche,
 * carica/salva il GraphState dal DB, e fornisce helper per il Campaign Engine.
 */

import type { Agent, AgentState, AgentBrandState } from "../../drizzle/schema";
import {
  initializeFromProfile,
  tick,
  stateToPrompt,
  serializeState,
  deserializeState,
  readState,
  type AgentProfile,
  type GraphState,
  type PsycheState,
  type TickOptions,
} from "./engine";
import { mapOPThemesToPsyche, PerceptualRouter } from "./perceptual-router";
import { getDb } from "../db";
import { agentBrandStates } from "../../drizzle/schema";
import { and, eq } from "drizzle-orm";

// ============================================================
// AGENT → PSYCHE PROFILE BRIDGE
// ============================================================

/**
 * Costruisce un AgentProfile Psyche da un agente OP.
 * Usa i campi Big Five, Haidt, Hofstede e Bourdieu se disponibili,
 * altrimenti usa valori di fallback calibrati sul profilo demografico.
 */
export function buildAgentProfile(agent: Agent): AgentProfile {
  const psychProfile = agent.habitusProfile as Record<string, number | string> | null;
  const haidtProfile = (agent as any).haidtProfile as Record<string, number> | null;
  const hofstedeProfile = (agent as any).hofstedeProfile as Record<string, number> | null;

  // ─── Big Five ─────────────────────────────────────────────────────────────
  // Priorità: habitusProfile → fallback demografico
  const openness = (psychProfile?.openness as number) ?? deriveOpenness(agent);
  const conscientiousness = (psychProfile?.conscientiousness as number) ?? 0.5;
  const extraversion = (psychProfile?.extraversion as number) ?? deriveExtraversion(agent);
  const agreeableness = (psychProfile?.agreeableness as number) ?? 0.5;
  const neuroticism = (psychProfile?.neuroticism as number) ?? deriveNeuroticism(agent);

  // ─── Haidt ────────────────────────────────────────────────────────────────
  const care = haidtProfile?.care ?? 0.6;
  const loyalty = haidtProfile?.loyalty ?? 0.5;
  const authority = haidtProfile?.authority ?? 0.5;

  // ─── Hofstede ─────────────────────────────────────────────────────────────
  // Italia: power_distance ~0.5, individualism ~0.76, uncertainty_avoidance ~0.75
  const power_distance = hofstedeProfile?.power_distance ?? 0.5;
  const individualism = hofstedeProfile?.individualism ?? 0.76;
  const uncertainty_avoidance = hofstedeProfile?.uncertainty_avoidance ?? 0.75;

  // ─── Bourdieu ─────────────────────────────────────────────────────────────
  const bourdieuClass = (psychProfile?.bourdieu_class as number) ?? 3;
  const economic_capital = Math.min(5, Math.max(1, bourdieuClass));
  const cultural_capital = (psychProfile?.cultural_capital as number) ?? bourdieuClass;
  const social_capital = (psychProfile?.social_capital as number) ?? bourdieuClass;

  // ─── Core psychological parameters ────────────────────────────────────────
  // Derivati dal profilo psicologico dell'agente se disponibile
  const core_wound = deriveCorewound(agent);
  const core_desire = deriveCoreDesire(agent);
  const inner_voice = deriveInnerVoice(agent);

  // ─── Media ────────────────────────────────────────────────────────────────
  const advertising_cynicism = (psychProfile?.advertising_cynicism as number) ?? 0.3;
  const attention_span_seconds = (psychProfile?.attention_span as number)
    ? (psychProfile?.attention_span as number) * 60  // normalizza da [0,1] a secondi
    : 30;

  // ─── Wound/Shadow triggers ────────────────────────────────────────────────
  const wound_triggers = deriveWoundTriggers(core_wound);
  const shadow_triggers = deriveShadowTriggers(agent);

  return {
    big_five: { openness, conscientiousness, extraversion, agreeableness, neuroticism },
    haidt: { care, loyalty, authority },
    hofstede: { power_distance, individualism, uncertainty_avoidance },
    bourdieu: { economic_capital, cultural_capital, social_capital },
    core_wound,
    core_desire,
    inner_voice,
    advertising_cynicism,
    attention_span_seconds,
    wound_triggers,
    shadow_triggers,
  };
}

// ─── Derivation helpers ───────────────────────────────────────────────────────

function deriveOpenness(agent: Agent): number {
  // Gen Z e Millennial tendenzialmente più aperti
  if (agent.generation === "GenZ") return 0.65;
  if (agent.generation === "Millennial") return 0.6;
  if (agent.generation === "GenX") return 0.5;
  return 0.4; // Boomer
}

function deriveExtraversion(agent: Agent): number {
  // Proxy: commerciante/artigiano → più estroverso; casalinga/pensionata → meno
  const occupation = (agent.profession ?? "").toLowerCase();
  if (occupation.includes("commerci") || occupation.includes("vendit")) return 0.65;
  if (occupation.includes("artist") || occupation.includes("artigian")) return 0.55;
  if (occupation.includes("pensionat") || occupation.includes("casalin")) return 0.4;
  return 0.5;
}

function deriveNeuroticism(agent: Agent): number {
  // Proxy: stress finanziario, età, occupazione precaria
  const riskAversion = agent.riskAversion ?? 0.5;
  const priceSensitivity = agent.priceSensitivity ?? 0.5;
  return Math.min(0.9, (riskAversion * 0.4 + priceSensitivity * 0.3 + 0.2));
}

function deriveCorewound(agent: Agent): string {
  // Mappa il profilo psicologico alla ferita primaria
  const psychProfile = agent.habitusProfile as Record<string, number | string> | null;
  const wound = psychProfile?.core_wound as string | undefined;
  if (wound) return wound;

  // Fallback: inferisci dalla generazione e occupazione
  const gen = agent.generation;
  const occ = (agent.profession ?? "").toLowerCase();
  if (gen === "Boomer" && occ.includes("pensionat")) return "invisibility";
  if (gen === "GenZ") return "inadequacy";
  if (occ.includes("rider") || occ.includes("precari")) return "loss_of_control";
  if (agent.riskAversion && agent.riskAversion > 0.7) return "loss_of_control";
  return "inadequacy"; // default più comune
}

function deriveCoreDesire(agent: Agent): string {
  const psychProfile = agent.habitusProfile as Record<string, number | string> | null;
  const desire = psychProfile?.core_desire as string | undefined;
  if (desire) return desire;

  const wound = deriveCorewound(agent);
  const desireMap: Record<string, string> = {
    "inadequacy": "to_be_respected",
    "abandonment": "to_belong",
    "invisibility": "to_be_seen",
    "betrayal": "to_be_safe",
    "loss_of_control": "to_be_free",
  };
  return desireMap[wound] ?? "to_be_respected";
}

function deriveInnerVoice(agent: Agent): string {
  const psychProfile = agent.habitusProfile as Record<string, number | string> | null;
  const voice = psychProfile?.inner_voice as string | undefined;
  if (voice) return voice;

  const gen = agent.generation;
  const cynicism = (psychProfile?.advertising_cynicism as number) ?? 0.3;
  if (cynicism > 0.6) return "cynic";
  if (gen === "GenZ") return "pragmatist";
  if (gen === "Millennial") return "dreamer";
  if (gen === "Boomer") return "critic";
  return "pragmatist";
}

function deriveWoundTriggers(wound: string): string[] {
  const triggerMap: Record<string, string[]> = {
    "inadequacy":       ["non sei abbastanza", "non riesci", "gli altri fanno meglio", "non sei capace", "mediocre"],
    "abandonment":      ["solo", "abbandonato", "nessuno ti vuole", "escluso", "ignorato", "dimenticato"],
    "invisibility":     ["nessuno ti vede", "non conti", "irrilevante", "invisibile", "non importa"],
    "betrayal":         ["tradito", "ingannato", "bugiardo", "non ci si può fidare", "deluso"],
    "loss_of_control":  ["non puoi fare niente", "è fuori controllo", "sei in balia", "non dipende da te"],
  };
  return triggerMap[wound] ?? [];
}

function deriveShadowTriggers(agent: Agent): string[] {
  // Trigger che attivano il lato ombra (reazione difensiva forte)
  const gen = agent.generation;
  const base = ["ipocrita", "falso", "pubblicità ingannevole", "truffa"];
  if (gen === "Boomer") return [...base, "giovani di oggi", "rispetto", "ai miei tempi"];
  if (gen === "GenZ") return [...base, "boomer", "capitalismo", "greenwashing"];
  return base;
}

// ============================================================
// PSYCHE STATE PERSISTENCE
// ============================================================

/**
 * Carica il GraphState Psyche per un agente da agentBrandStates.
 * Se non esiste o non è valido, inizializza da profilo.
 */
export async function loadPsycheState(
  agentId: number,
  brandAgentId: number,
  agent: Agent
): Promise<{ graphState: GraphState; profile: AgentProfile; isNew: boolean }> {
  const dbInstance = await getDb();
  if (!dbInstance) {
    const profile = buildAgentProfile(agent);
    return { graphState: initializeFromProfile(profile), profile, isNew: true };
  }
  const db = dbInstance;
  const profile = buildAgentProfile(agent);

  try {
    const rows = await db
      .select()
      .from(agentBrandStates)
      .where(and(eq(agentBrandStates.agentId, agentId), eq(agentBrandStates.brandAgentId, brandAgentId)))
      .limit(1);

    const row = rows[0];
    if (row && row.psycheState && typeof row.psycheState === "string" && row.psycheState.length > 10) {
      const graphState = deserializeState(row.psycheState as string);
      return { graphState, profile, isNew: false };
    }
  } catch (err) {
    console.warn(`[PsycheIntegration] Could not load psyche state for agent ${agentId}:`, err);
  }

  // Inizializza da profilo
  const graphState = initializeFromProfile(profile);
  return { graphState, profile, isNew: true };
}

/**
 * Salva il GraphState Psyche aggiornato nel DB.
 */
export async function savePsycheState(
  agentId: number,
  brandAgentId: number,
  graphState: GraphState,
  psycheState: PsycheState
): Promise<void> {
  const dbInstance = await getDb();
  if (!dbInstance) return;
  const db = dbInstance;
  const serialized = serializeState(graphState);
  const now = new Date();

  try {
    // Upsert: aggiorna se esiste, altrimenti inserisce
    const existing = await db
      .select({ id: agentBrandStates.id })
      .from(agentBrandStates)
      .where(and(eq(agentBrandStates.agentId, agentId), eq(agentBrandStates.brandAgentId, brandAgentId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(agentBrandStates)
        .set({
          psycheState: serialized,
          psycheLastTick: now,
          psycheActiveBiases: psycheState.active_biases as any,
          psycheMood: psycheState.mood,
          updatedAt: now,
        })
        .where(and(eq(agentBrandStates.agentId, agentId), eq(agentBrandStates.brandAgentId, brandAgentId)));
    } else {
      await db.insert(agentBrandStates).values({
        agentId,
        brandAgentId,
        psycheState: serialized as any,
        psycheLastTick: now,
        psycheActiveBiases: psycheState.active_biases as any,
        psycheMood: psycheState.mood,
        exposureCount: 0,
        lastExposureAt: now,
        brandFamiliarity: 0.0,
        brandSentiment: 0.0,
        saturationLevel: 0.0,
        accumulatedIrritation: 0.0,
      });
    }
  } catch (err) {
    console.warn(`[PsycheIntegration] Could not save psyche state for agent ${agentId}:`, err);
  }
}

// ============================================================
// CAMPAIGN ENGINE INTEGRATION
// ============================================================

/**
 * Esegue un tick Psyche per un agente esposto a una campagna.
 * Restituisce il PsycheState e il prompt da iniettare nel system prompt.
 */
export async function runPsycheTick(
  agent: Agent,
  brandAgentId: number | null | undefined,
  campaignTopics: string[],
  campaignText: string,
  campaignTone: string | null | undefined
): Promise<{
  psycheState: PsycheState | null;
  psychePrompt: string;
  graphState: GraphState | null;
  profile: AgentProfile | null;
}> {
  // Se non c'è un brandAgentId, non possiamo persistere lo stato
  // ma possiamo comunque eseguire un tick one-shot
  const profile = buildAgentProfile(agent);

  try {
    // Carica o inizializza il GraphState
    let graphState: GraphState;
    if (brandAgentId) {
      const loaded = await loadPsycheState(agent.id, brandAgentId, agent);
      graphState = loaded.graphState;
    } else {
      graphState = initializeFromProfile(profile);
    }

    // Costruisci i temi Psyche dalla campagna
    const router = new PerceptualRouter();
    const routingResult = router.route(campaignText, profile);

    // Aggiungi i temi OP mappati
    const opMappedThemes = mapOPThemesToPsyche(campaignTopics);
    const allThemes = Array.from(new Set([...routingResult.themes, ...opMappedThemes]));

    // Aggiungi temi dal tono della campagna
    if (campaignTone) {
      const toneThemeMap: Record<string, string[]> = {
        "luxury": ["luxury", "distinction"],
        "humor": ["humor"],
        "fear": ["fear", "scarcity"],
        "inspiration": ["innovation", "aspiration"],
        "nostalgia": ["nostalgia", "tradition"],
        "authority": ["authority"],
        "community": ["inclusion", "social_proof"],
      };
      const toneThemes = toneThemeMap[campaignTone.toLowerCase()] ?? [];
      for (const t of toneThemes) allThemes.push(t);
    }

    // Esegui il tick
    const currentHour = new Date().getHours();
    const tickOptions: TickOptions = {
      stimulusThemes: allThemes.slice(0, 8), // max 8 temi per tick
      stimulusIntensity: routingResult.intensity,
      customTriggers: routingResult.triggeredNodes,
      currentHour,
      elapsedMinutes: 60, // assume 1 ora dall'ultima esposizione
    };

    const psycheState = tick(graphState, profile, tickOptions);
    const psychePrompt = stateToPrompt(psycheState, profile);

    return { psycheState, psychePrompt, graphState, profile };
  } catch (err) {
    console.warn(`[PsycheIntegration] Tick failed for agent ${agent.slug}:`, err);
    return { psycheState: null, psychePrompt: "", graphState: null, profile: null };
  }
}
