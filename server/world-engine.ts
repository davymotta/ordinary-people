/**
 * Ordinary People — World Engine v1.0
 *
 * Processes world events and updates agent states + persistent memory.
 * Each agent receives an event, processes it through their psychological lens,
 * and their mutable state changes accordingly.
 *
 * References:
 * - Kahneman: emotional events create lasting memories (System 1 imprinting)
 * - Schelling: tipping points — small events can cascade
 * - Le Bon: social contagion — events spread through social networks
 * - Maslow: negative events can regress agents to lower need levels
 */

import { invokeLLM } from "./_core/llm";
import {
  getAllAgents,
  getAgentById,
  getAgentState,
  upsertAgentState,
  createMemory,
  createEventExposure,
  updateEventExposure,
  getWorldEventById,
} from "./agents-db";
import type { Agent, AgentState, WorldEvent } from "../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────────────

export interface EventProcessingResult {
  agentId: number;
  agentSlug: string;
  reaction: string;
  stateChanges: StateChanges;
  memoryCreated: boolean;
}

export interface StateChanges {
  moodValence?: number;
  moodArousal?: number;
  financialStress?: number;
  socialTrust?: number;
  institutionalTrust?: number;
  maslowCurrent?: number;
}

// ─── Determine which agents are affected by an event ─────────────────

export function getAffectedAgentIds(
  event: WorldEvent,
  allAgentIds: number[]
): number[] {
  if (event.scope === "global" || event.scope === "national") {
    return allAgentIds;
  }
  if (event.scope === "personal" && event.targetAgentIds) {
    return event.targetAgentIds as number[];
  }
  if (event.scope === "segment" && event.targetSegment) {
    // For now, return all — in production filter by segment
    return allAgentIds;
  }
  if (event.scope === "regional") {
    return allAgentIds; // Simplified: all agents
  }
  return allAgentIds;
}

// ─── Process a single agent's reaction to an event ───────────────────

export async function processAgentEvent(
  agent: Agent,
  state: AgentState | null,
  event: WorldEvent
): Promise<{ reaction: string; stateChanges: StateChanges; memoryCreated: boolean }> {
  
  const currentState = state ?? {
    moodValence: 0,
    moodArousal: 0.5,
    financialStress: 0.3,
    socialTrust: 0.5,
    institutionalTrust: 0.5,
    maslowCurrent: agent.maslowBaseline,
    activeConcerns: [],
    regimePerception: {},
  };

  const systemPrompt = agent.systemPrompt ?? buildFallbackSystemPrompt(agent);
  
  const userPrompt = buildEventPrompt(agent, currentState, event);

  let llmResponse: string;
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "event_reaction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              reaction: {
                type: "string",
                description: "Come reagisci a questo evento, in prima persona, 2-4 frasi. Sii autentico al tuo personaggio.",
              },
              mood_change: {
                type: "number",
                description: "Variazione del tuo umore: -0.5 (molto peggiorato) a +0.5 (molto migliorato)",
              },
              financial_stress_change: {
                type: "number",
                description: "Variazione dello stress finanziario: -0.3 a +0.3",
              },
              social_trust_change: {
                type: "number",
                description: "Variazione della fiducia sociale: -0.3 a +0.3",
              },
              creates_memory: {
                type: "boolean",
                description: "Questo evento è abbastanza significativo da creare un ricordo duraturo?",
              },
              memory_title: {
                type: "string",
                description: "Se crea memoria, titolo breve del ricordo (max 50 caratteri)",
              },
              memory_emotional_valence: {
                type: "number",
                description: "Valenza emotiva del ricordo: -1 (molto negativo) a +1 (molto positivo)",
              },
            },
            required: [
              "reaction",
              "mood_change",
              "financial_stress_change",
              "social_trust_change",
              "creates_memory",
              "memory_title",
              "memory_emotional_valence",
            ],
            additionalProperties: false,
          },
        },
      },
    });
    const rawContent = response.choices[0]?.message?.content;
    llmResponse = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? {});
  } catch (error) {
    console.error(`[WorldEngine] LLM error for agent ${agent.slug}:`, error);
    return {
      reaction: "Non ho avuto modo di elaborare questo evento.",
      stateChanges: {},
      memoryCreated: false,
    };
  }

  let parsed: any = {};
  try {
    parsed = JSON.parse(llmResponse);
  } catch {
    parsed = { reaction: llmResponse, mood_change: 0, financial_stress_change: 0, social_trust_change: 0, creates_memory: false };
  }

  // Apply psychological constraints
  const stateChanges: StateChanges = {
    moodValence: clamp(
      (currentState.moodValence ?? 0) + (parsed.mood_change ?? 0),
      -1, 1
    ),
    financialStress: clamp(
      (currentState.financialStress ?? 0.3) + (parsed.financial_stress_change ?? 0),
      0, 1
    ),
    socialTrust: clamp(
      (currentState.socialTrust ?? 0.5) + (parsed.social_trust_change ?? 0),
      0, 1
    ),
  };

  // Maslow regression: if financial stress > 0.8, regress to level 2
  if ((stateChanges.financialStress ?? 0) > 0.8 && (currentState.maslowCurrent ?? 3) > 2) {
    stateChanges.maslowCurrent = Math.max(2, (currentState.maslowCurrent ?? 3) - 1);
  }

  return {
    reaction: parsed.reaction ?? "Nessuna reazione.",
    stateChanges,
    memoryCreated: parsed.creates_memory ?? false,
  };
}

// ─── Process a world event for all affected agents ────────────────────

export async function processWorldEvent(
  eventId: number,
  onProgress?: (agentSlug: string, done: number, total: number) => void
): Promise<EventProcessingResult[]> {
  const event = await getWorldEventById(eventId);
  if (!event) throw new Error(`Event ${eventId} not found`);

  const allAgents = await getAllAgents();
  const affectedIds = getAffectedAgentIds(event, allAgents.map(a => a.id));
  const affectedAgents = allAgents.filter(a => affectedIds.includes(a.id));

  const results: EventProcessingResult[] = [];
  let done = 0;

  for (const agent of affectedAgents) {
    const state = await getAgentState(agent.id);
    
    // Create exposure record
    const exposureId = await createEventExposure({
      agentId: agent.id,
      eventId: event.id,
      memoryCreated: false,
    });

    try {
      const { reaction, stateChanges, memoryCreated } = await processAgentEvent(agent, state, event);

      // Update agent state
      await upsertAgentState(agent.id, stateChanges);

      // Create memory if significant
      if (memoryCreated) {
        await createMemory({
          agentId: agent.id,
          memoryType: "episodic",
          title: `${event.title} — ${new Date(event.occurredAt).toLocaleDateString("it-IT")}`,
          content: reaction,
          emotionalValence: stateChanges.moodValence ? stateChanges.moodValence - (state?.moodValence ?? 0) : 0,
          emotionalIntensity: event.intensity,
          tags: [event.eventType, "world_event"],
          sourceEventId: event.id,
          importance: event.intensity,
          occurredAt: event.occurredAt,
        });
      }

      // Update exposure record
      await updateEventExposure(exposureId, {
        reaction,
        stateChanges: stateChanges as any,
        memoryCreated,
        processedAt: new Date(),
      });

      results.push({
        agentId: agent.id,
        agentSlug: agent.slug,
        reaction,
        stateChanges,
        memoryCreated,
      });
    } catch (error) {
      console.error(`[WorldEngine] Error processing agent ${agent.slug}:`, error);
      await updateEventExposure(exposureId, {
        reaction: "Errore durante l'elaborazione.",
        processedAt: new Date(),
      });
    }

    done++;
    onProgress?.(agent.slug, done, affectedAgents.length);
  }

  return results;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildFallbackSystemPrompt(agent: Agent): string {
  return `Sei ${agent.firstName} ${agent.lastName}, ${agent.age} anni, ${agent.profession} di ${agent.city}. 
Reddito annuo stimato: ${agent.incomeEstimate.toLocaleString("it-IT")}€. 
Generazione: ${agent.generation}. Istruzione: ${agent.education}.
Rispondi sempre in prima persona, in italiano, come questa persona reale.`;
}

function buildEventPrompt(agent: Agent, state: any, event: WorldEvent): string {
  const concerns = (state.activeConcerns as string[] | null) ?? [];
  const moodDesc = state.moodValence > 0.3 ? "di buon umore" : state.moodValence < -0.3 ? "di cattivo umore" : "in uno stato neutro";
  const stressDesc = state.financialStress > 0.6 ? "sotto forte stress finanziario" : state.financialStress > 0.3 ? "con qualche preoccupazione economica" : "economicamente sereno";

  return `Sei ${moodDesc} e ${stressDesc}.
${concerns.length > 0 ? `Le tue preoccupazioni principali in questo momento: ${concerns.join(", ")}.` : ""}

Hai appena appreso questo evento:
**${event.title}**
${event.description}

Tipo di evento: ${event.eventType}
Intensità: ${event.intensity > 0.7 ? "molto forte" : event.intensity > 0.4 ? "moderata" : "lieve"}
Impatto economico: ${event.economicImpact > 0 ? "positivo" : event.economicImpact < 0 ? "negativo" : "neutro"}

Come reagisci a questo evento? Considera il tuo carattere, la tua situazione attuale, le tue preoccupazioni.
Rispondi nel formato JSON richiesto.`;
}
