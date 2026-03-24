/**
 * World Psyche Bridge
 *
 * Traduce gli eventi del World Engine in stimoli Psyche.
 * Ogni tipo di evento attiva specifici nodi del grafo cognitivo
 * basandosi su: tipo evento, intensità, impatto economico, scope.
 *
 * References:
 * - Lazarus (1991): Cognitive Appraisal Theory — gli eventi sono valutati
 *   in base alla loro rilevanza per gli obiettivi personali
 * - Kahneman (2011): System 1 vs System 2 — eventi intensi attivano
 *   risposte automatiche (System 1) prima della razionalizzazione
 * - Bowlby (1969): Attachment Theory — minacce alla sicurezza attivano
 *   il sistema di attaccamento e la ferita primaria
 */

import type { WorldEvent } from "../../drizzle/schema";
// Psyche theme type (string union — i temi sono stringhe libere nel perceptual-router)
type PsycheTheme = string;

// ─── Event type → Psyche themes mapping ───────────────────────────────────────────────────────────────────

/**
 * Mappa il tipo di evento OP ai temi Psyche corrispondenti.
 * Ogni tipo di evento attiva un set di nodi del grafo cognitivo.
 */
const EVENT_TYPE_TO_THEMES: Record<string, PsycheTheme[]> = {
  // Crisi economica / finanziaria
  economic_crisis:    ["economic_threat", "loss_aversion", "scarcity", "risk"],
  financial_shock:    ["economic_threat", "loss_aversion", "scarcity"],
  recession:          ["economic_threat", "scarcity", "loss_aversion", "risk"],
  inflation:          ["economic_threat", "scarcity", "loss_aversion"],
  unemployment:       ["economic_threat", "exclusion", "identity", "loss_aversion"],

  // Crisi politica / istituzionale
  political_crisis:   ["authority", "fear", "uncertainty", "institutional_distrust"],
  scandal:            ["disgust", "moral_violation", "authority", "social_proof"],
  election:           ["authority", "belonging", "identity", "social_proof"],
  protest:            ["rebellion", "belonging", "authority", "social_proof"],
  war:                ["fear", "loss_aversion", "economic_threat", "belonging"],

  // Disastri naturali / emergenze
  natural_disaster:   ["fear", "loss_aversion", "belonging", "scarcity"],
  pandemic:           ["fear", "scarcity", "belonging", "economic_threat"],
  emergency:          ["fear", "loss_aversion", "scarcity"],

  // Tecnologia / innovazione
  tech_breakthrough:  ["aspiration", "novelty", "curiosity", "future"],
  digital_disruption: ["uncertainty", "risk", "novelty", "aspiration"],
  ai_news:            ["novelty", "uncertainty", "aspiration", "risk"],

  // Cultura / media / intrattenimento
  cultural_event:     ["belonging", "nostalgia", "social_proof", "identity"],
  celebrity_news:     ["social_proof", "aspiration", "belonging", "envy"],
  sports_victory:     ["belonging", "pride", "social_proof", "joy"],
  sports_defeat:      ["belonging", "disappointment", "identity"],
  music_release:      ["nostalgia", "belonging", "joy", "identity"],

  // Salute / benessere
  health_scare:       ["fear", "loss_aversion", "scarcity", "belonging"],
  medical_breakthrough: ["aspiration", "hope", "future", "novelty"],
  wellness_trend:     ["aspiration", "identity", "social_proof"],

  // Ambiente / sostenibilità
  climate_event:      ["fear", "loss_aversion", "future", "moral_violation"],
  environmental_news: ["moral_violation", "future", "aspiration", "fear"],

  // Sociale / comunità
  community_event:    ["belonging", "social_proof", "identity", "joy"],
  social_movement:    ["belonging", "rebellion", "moral_violation", "identity"],
  discrimination:     ["exclusion", "moral_violation", "identity", "belonging"],
  solidarity:         ["belonging", "social_proof", "hope", "joy"],

  // Personale (eventi mirati a singoli agenti)
  personal_loss:      ["loss_aversion", "grief", "belonging", "identity"],
  personal_gain:      ["aspiration", "joy", "social_proof", "pride"],
  relationship_event: ["belonging", "identity", "social_proof"],
  career_event:       ["identity", "aspiration", "economic_threat", "social_proof"],
  family_event:       ["belonging", "identity", "loss_aversion", "joy"],

  // Default fallback
  news:               ["social_proof", "uncertainty"],
  media:              ["social_proof", "aspiration"],
  generic:            ["uncertainty"],
};

/**
 * Intensità evento → moltiplicatore stimolo Psyche.
 * Kahneman: eventi molto intensi creano imprinting System 1.
 */
function intensityToStimulus(intensity: number): number {
  if (intensity >= 0.8) return 0.9;   // Evento catastrofico
  if (intensity >= 0.6) return 0.7;   // Evento forte
  if (intensity >= 0.4) return 0.5;   // Evento moderato
  if (intensity >= 0.2) return 0.3;   // Evento lieve
  return 0.15;                         // Evento minore
}

/**
 * Impatto economico → temi aggiuntivi.
 * Kahneman: le perdite pesano 2x i guadagni (loss aversion).
 */
function economicImpactToThemes(economicImpact: number): PsycheTheme[] {
  if (economicImpact < -0.5) return ["economic_threat", "loss_aversion", "scarcity"];
  if (economicImpact < -0.2) return ["economic_threat", "loss_aversion"];
  if (economicImpact < 0)    return ["economic_threat"];
  if (economicImpact > 0.5)  return ["aspiration", "joy"];
  if (economicImpact > 0.2)  return ["aspiration"];
  return [];
}

/**
 * Scope evento → moltiplicatore di rilevanza personale.
 * Lazarus: la rilevanza personale amplifica la risposta emotiva.
 */
function scopeToRelevance(scope: string): number {
  switch (scope) {
    case "personal":  return 1.5;  // Evento diretto → massima rilevanza
    case "regional":  return 1.2;  // Evento locale → alta rilevanza
    case "national":  return 1.0;  // Evento nazionale → rilevanza normale
    case "global":    return 0.7;  // Evento globale → rilevanza ridotta
    case "segment":   return 1.1;  // Evento di segmento → rilevanza moderata
    default:          return 1.0;
  }
}

// ─── Main export ──────────────────────────────────────────────────────

export interface WorldEventPsycheStimulus {
  /** Temi Psyche attivati dall'evento */
  themes: PsycheTheme[];
  /** Intensità dello stimolo (0-1) */
  stimulusStrength: number;
  /** Testo descrittivo per il log */
  description: string;
}

/**
 * Traduce un WorldEvent in uno stimolo Psyche.
 * Combina: tipo evento + intensità + impatto economico + scope.
 */
export function worldEventToPsycheStimulus(
  event: WorldEvent
): WorldEventPsycheStimulus {
  // 1. Temi base dal tipo di evento
  const eventType = event.eventType ?? "generic";
  const baseThemes: PsycheTheme[] = EVENT_TYPE_TO_THEMES[eventType] ?? EVENT_TYPE_TO_THEMES.generic;

  // 2. Temi aggiuntivi dall'impatto economico
  const economicThemes = economicImpactToThemes(event.economicImpact ?? 0);

  // 3. Merge temi (dedup)
  const allThemes = Array.from(new Set([...baseThemes, ...economicThemes])) as PsycheTheme[];

  // 4. Calcola intensità stimolo
  const baseStrength = intensityToStimulus(event.intensity ?? 0.5);
  const relevanceMultiplier = scopeToRelevance(event.scope ?? "national");
  const stimulusStrength = Math.min(1.0, baseStrength * relevanceMultiplier);

  return {
    themes: allThemes,
    stimulusStrength,
    description: `[WorldEvent:${eventType}] "${event.title}" → temi: ${allThemes.slice(0, 3).join(", ")} (intensità: ${stimulusStrength.toFixed(2)})`,
  };
}

// ─── Social Influence Psyche Stimulus ────────────────────────────────

export type SocialInfluenceType =
  | "agreement"       // Un contatto concorda con la mia posizione
  | "disagreement"    // Un contatto non concorda
  | "positive_reaction" // Un contatto ha reagito positivamente a qualcosa
  | "negative_reaction" // Un contatto ha reagito negativamente
  | "peer_pressure"   // Pressione del gruppo
  | "social_proof"    // Molti contatti concordano
  | "criticism"       // Critica diretta
  | "praise"          // Lode diretta
  | "conformity"      // Il gruppo si comporta in un certo modo

/**
 * Traduce un'influenza sociale in stimolo Psyche.
 * Bowlby: le reazioni degli altri attivano il sistema di attaccamento.
 */
export function socialInfluenceToPsycheStimulus(
  influenceType: SocialInfluenceType,
  strength: number = 0.4
): WorldEventPsycheStimulus {
  const SOCIAL_THEMES: Record<SocialInfluenceType, PsycheTheme[]> = {
    agreement:          ["belonging", "social_proof", "identity"],
    disagreement:       ["exclusion", "identity", "uncertainty"],
    positive_reaction:  ["social_proof", "aspiration", "belonging"],
    negative_reaction:  ["exclusion", "uncertainty", "loss_aversion"],
    peer_pressure:      ["belonging", "conformity", "authority"],
    social_proof:       ["social_proof", "belonging", "aspiration"],
    criticism:          ["exclusion", "identity", "loss_aversion"],
    praise:             ["belonging", "social_proof", "pride"],
    conformity:         ["belonging", "conformity", "social_proof"],
  };

  return {
    themes: SOCIAL_THEMES[influenceType],
    stimulusStrength: Math.min(1.0, strength),
    description: `[SocialInfluence:${influenceType}] → temi: ${SOCIAL_THEMES[influenceType].slice(0, 2).join(", ")}`,
  };
}
