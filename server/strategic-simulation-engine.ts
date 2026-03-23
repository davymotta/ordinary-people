/**
 * Ordinary People — Strategic Simulation Engine
 *
 * Abilita le 5 simulazioni strategiche descritte nel Documento 4 (Pasted_content_07.txt):
 *
 * 1. Journey Simulation — multi-touchpoint funnel processato in sequenza
 * 2. Retargeting Decay Analysis — curva di frequency response per segmento
 * 3. Media Mix Optimization — allocazione budget ottimale per piattaforma
 * 4. Competitive Response — interferenza competitiva (anchoring bias)
 * 5. Content Calendar Optimization — sequenza ottimale di contenuti
 *
 * Layer fondamentale: stato persistente dell'agente tra esposizioni.
 * Ogni agente mantiene: brand_familiarity, brand_sentiment, saturation_level,
 * accumulated_irritation, exposure_count, touchpoint_history.
 *
 * Fonte: Pasted_content_07.txt — "L'implementazione tecnica"
 * Decay model: Ebbinghaus forgetting curve (esponenziale)
 * Mere Exposure Effect: Zajonc (1968)
 * Anchoring: Tversky & Kahneman (1974)
 * Bandwagon / Contrarian: Cialdini (2001)
 */

import { getDb } from "./db";
import { journeySimulations, agentBrandStates } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  loadAgentBrandState,
  computeExposureContext,
  updateStateAfterExposure,
  applyExposureAdjustment,
  computeFrequencyResponseCurve,
} from "./scoring/exposure-engine";
import { getAllAgents, getCampaignById } from "./agents-db";
import { processAgentCampaignReaction } from "./campaign-engine";
import { computeBiasVector } from "./scoring/bias-engine";
import type { Agent } from "../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TouchpointConfig {
  campaignId: number;
  channel: string;           // "instagram" | "tiktok" | "facebook" | "youtube" | "email"
  delayDays: number;         // giorni dal touchpoint precedente
  label: string;             // es. "Awareness - Video 15s"
  objective: "awareness" | "consideration" | "conversion" | "recovery";
}

export interface TouchpointResult {
  touchpointIndex: number;
  label: string;
  channel: string;
  objective: string;
  delayDays: number;
  // Aggregate metrics
  avgScore: number;           // -1..+1
  positiveRate: number;       // % agenti con score > 0.2
  scrollRate: number;         // % agenti che hanno scrollato
  shareRate: number;          // % agenti con share_probability > 0.5
  irritationRate: number;     // % agenti con irritazione > 0.5
  saturationRate: number;     // % agenti con saturazione > 0.7
  // Funnel transitions
  awarenessLift: number;      // incremento brand_familiarity medio
  sentimentDelta: number;     // variazione brand_sentiment media
  // Per-segment breakdown
  byGeneration: Record<string, { avgScore: number; count: number }>;
  byGeo: Record<string, { avgScore: number; count: number }>;
  // Top reactions (per report narrativo)
  topReactions: Array<{
    agentName: string;
    agentSlug: string;
    score: number;
    quote: string;
    exposureCount: number;
    emotionalState: string;
  }>;
}

export interface JourneyResults {
  simulationType: "journey";
  totalAgents: number;
  touchpoints: TouchpointResult[];
  // Funnel summary
  funnelSummary: {
    awarenessRate: number;       // % agenti che hanno prestato attenzione al T1
    considerationRate: number;   // % agenti con score > 0.2 dopo T2
    conversionRate: number;      // % agenti con buy_probability > 0.5 dopo T3
    recoveryRate: number;        // % agenti recuperati dopo T4 (se presente)
  };
  // Dropout analysis
  dropoutAnalysis: Array<{
    fromTouchpoint: string;
    toTouchpoint: string;
    dropoutRate: number;
    reason: string;
  }>;
  // Segment insights
  segmentInsights: string[];
  // Recommendations
  recommendations: string[];
}

export interface FrequencyDecayResults {
  simulationType: "retargeting";
  totalAgents: number;
  intervalDays: number;
  maxExposures: number;
  // Per-exposure aggregate
  exposureCurve: Array<{
    exposure: number;
    avgScore: number;
    positiveRate: number;
    irritationRate: number;
    saturationRate: number;
  }>;
  // Optimal frequency per segment
  optimalFrequency: {
    overall: number;
    bySegment: Record<string, number>;
  };
  inversionPoint: number;  // esposizione dopo cui il sentiment diventa negativo
  recommendations: string[];
}

export interface MediaMixResults {
  simulationType: "media_mix";
  totalAgents: number;
  scenarios: Array<{
    name: string;
    allocation: Record<string, number>;  // { instagram: 0.6, tiktok: 0.25, facebook: 0.15 }
    reachRate: number;                   // % agenti raggiunti
    avgScore: number;
    positiveRate: number;
    organicAmplification: number;        // reach organico stimato
    bySegment: Record<string, { reachRate: number; avgScore: number }>;
  }>;
  recommendedScenario: string;
  recommendations: string[];
}

export interface CompetitiveResponseResults {
  simulationType: "competitive";
  totalAgents: number;
  // Baseline: solo campagna cliente
  baselineScore: number;
  baselinePositiveRate: number;
  // After competitor pre-exposure
  afterCompetitorScore: number;
  afterCompetitorPositiveRate: number;
  // Delta
  anchoringEffect: number;  // differenza di score (negativo = competitor ha ancorato contro)
  // Segment vulnerability
  vulnerableSegments: Array<{
    segment: string;
    baselineScore: number;
    afterCompetitorScore: number;
    delta: number;
  }>;
  recommendations: string[];
}

export interface ContentCalendarResults {
  simulationType: "content_calendar";
  totalAgents: number;
  // Original sequence
  originalSequence: Array<{
    position: number;
    campaignId: number;
    label: string;
    score: number;
    cumulativeSentiment: number;
  }>;
  // Optimized sequence
  optimizedSequence: Array<{
    position: number;
    originalPosition: number;
    campaignId: number;
    label: string;
    score: number;
    cumulativeSentiment: number;
    reason: string;
  }>;
  sentimentLift: number;  // differenza di sentiment cumulativo
  recommendations: string[];
}

export type StrategicSimulationResults =
  | JourneyResults
  | FrequencyDecayResults
  | MediaMixResults
  | CompetitiveResponseResults
  | ContentCalendarResults;

// ─── Media Diet Mapping ───────────────────────────────────────────────────────

const PLATFORM_MEDIA_DIET_KEY: Record<string, string> = {
  instagram: "instagram",
  tiktok: "tiktok",
  facebook: "facebook",
  youtube: "youtube",
  email: "email",
  tv: "tv",
};

function getAgentPlatformAffinity(agent: Agent, platform: string): number {
  const diet = agent.mediaDiet as Record<string, number> | null;
  if (!diet) return 0.3;
  const key = PLATFORM_MEDIA_DIET_KEY[platform.toLowerCase()] ?? platform.toLowerCase();
  return diet[key] ?? 0.3;
}

// ─── 1. Journey Simulation ────────────────────────────────────────────────────

/**
 * Simula un funnel multi-touchpoint sugli stessi agenti in sequenza.
 * Ogni agente mantiene il suo stato tra i touchpoint.
 * Fonte: Pasted_content_07.txt — Simulazione 1
 */
export async function runJourneySimulation(
  brandAgentId: number,
  touchpoints: TouchpointConfig[],
  agentIds?: number[],
): Promise<JourneyResults> {
  const allAgents = await getAllAgents();
  const targetAgents = agentIds
    ? allAgents.filter(a => agentIds.includes(a.id))
    : allAgents.slice(0, 50); // default: 50 agenti

  const touchpointResults: TouchpointResult[] = [];

  // Stato iniziale: carica lo stato brand per ogni agente
  const agentStateMap = new Map<number, Awaited<ReturnType<typeof loadAgentBrandState>>>();
  for (const agent of targetAgents) {
    const state = await loadAgentBrandState(agent.id, brandAgentId);
    agentStateMap.set(agent.id, state);
  }

  // Processa ogni touchpoint in sequenza
  for (let tIdx = 0; tIdx < touchpoints.length; tIdx++) {
    const tp = touchpoints[tIdx];
    const campaign = await getCampaignById(tp.campaignId);
    if (!campaign) continue;

    const reactions: Array<{
      agentId: number;
      agentName: string;
      agentSlug: string;
      agent: Agent;
      score: number;
      buyProbability: number;
      shareProbability: number;
      quote: string;
      scrolledPast: boolean;
      familiarityBefore: number;
      familiarityAfter: number;
      sentimentBefore: number;
      sentimentAfter: number;
      irritation: number;
      saturation: number;
      exposureCount: number;
      emotionalState: string;
    }> = [];

    for (const agent of targetAgents) {
      const currentState = agentStateMap.get(agent.id)!;

      // Verifica affinità piattaforma (la Pensionata non è su TikTok)
      const platformAffinity = getAgentPlatformAffinity(agent, tp.channel);
      if (platformAffinity < 0.1) {
        // Agente non raggiungibile su questa piattaforma
        continue;
      }

      // Calcola contesto esposizione (mere exposure effect, saturazione, irritazione)
      const exposureCtx = computeExposureContext(currentState);

      try {
        // Processa la reazione dell'agente
        const reaction = await processAgentCampaignReaction(
          agent,
          null, // agentState (usiamo il brand state invece)
          campaign,
          [],
          null
        );

        // Applica aggiustamenti da esposizione precedente
        const { adjustedScore } = applyExposureAdjustment(reaction.overallScore, exposureCtx);

        const familiarityBefore = currentState.brandFamiliarity;
        const sentimentBefore = currentState.brandSentiment;

        // Aggiorna stato dopo l'esposizione
        const newState = await updateStateAfterExposure(
          agent.id,
          brandAgentId,
          currentState,
          adjustedScore,
          tp.campaignId,
          tp.channel,
          tp.label,
        );
        agentStateMap.set(agent.id, newState);

        reactions.push({
          agentId: agent.id,
          agentName: `${agent.firstName} ${agent.lastName}`,
          agentSlug: agent.slug,
          agent,
          score: adjustedScore,
          buyProbability: reaction.buyProbability,
          shareProbability: reaction.shareProbability,
          quote: reaction.quote,
          scrolledPast: reaction.scrolledPast ?? false,
          familiarityBefore,
          familiarityAfter: newState.brandFamiliarity,
          sentimentBefore,
          sentimentAfter: newState.brandSentiment,
          irritation: newState.accumulatedIrritation,
          saturation: newState.saturationLevel,
          exposureCount: newState.exposureCount,
          emotionalState: newState.currentEmotionalState ?? "neutro",
        });
      } catch (err) {
        console.warn(`[JourneySim] Error for agent ${agent.slug} at touchpoint ${tIdx}:`, err);
      }
    }

    if (reactions.length === 0) {
      touchpointResults.push(buildEmptyTouchpointResult(tp, tIdx));
      continue;
    }

    // Aggrega risultati per questo touchpoint
    const avgScore = reactions.reduce((s, r) => s + r.score, 0) / reactions.length;
    const positiveRate = reactions.filter(r => r.score > 0.2).length / reactions.length;
    const scrollRate = reactions.filter(r => r.scrolledPast).length / reactions.length;
    const shareRate = reactions.filter(r => r.shareProbability > 0.5).length / reactions.length;
    const irritationRate = reactions.filter(r => r.irritation > 0.5).length / reactions.length;
    const saturationRate = reactions.filter(r => r.saturation > 0.7).length / reactions.length;
    const awarenessLift = reactions.reduce((s, r) => s + (r.familiarityAfter - r.familiarityBefore), 0) / reactions.length;
    const sentimentDelta = reactions.reduce((s, r) => s + (r.sentimentAfter - r.sentimentBefore), 0) / reactions.length;

    // Breakdown per generazione
    const byGeneration: Record<string, { avgScore: number; count: number }> = {};
    for (const r of reactions) {
      const gen = r.agent.generation;
      if (!byGeneration[gen]) byGeneration[gen] = { avgScore: 0, count: 0 };
      byGeneration[gen].avgScore += r.score;
      byGeneration[gen].count++;
    }
    for (const gen of Object.keys(byGeneration)) {
      byGeneration[gen].avgScore /= byGeneration[gen].count;
    }

    // Breakdown per geo
    const byGeo: Record<string, { avgScore: number; count: number }> = {};
    for (const r of reactions) {
      const geo = r.agent.geo;
      if (!byGeo[geo]) byGeo[geo] = { avgScore: 0, count: 0 };
      byGeo[geo].avgScore += r.score;
      byGeo[geo].count++;
    }
    for (const geo of Object.keys(byGeo)) {
      byGeo[geo].avgScore /= byGeo[geo].count;
    }

    // Top reactions (ordinati per score assoluto)
    const topReactions = reactions
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 5)
      .map(r => ({
        agentName: r.agentName,
        agentSlug: r.agentSlug,
        score: r.score,
        quote: r.quote,
        exposureCount: r.exposureCount,
        emotionalState: r.emotionalState,
      }));

    touchpointResults.push({
      touchpointIndex: tIdx,
      label: tp.label,
      channel: tp.channel,
      objective: tp.objective,
      delayDays: tp.delayDays,
      avgScore,
      positiveRate,
      scrollRate,
      shareRate,
      irritationRate,
      saturationRate,
      awarenessLift,
      sentimentDelta,
      byGeneration,
      byGeo,
      topReactions,
    });
  }

  // Calcola funnel summary
  const funnelSummary = computeFunnelSummary(touchpointResults, touchpoints);

  // Dropout analysis
  const dropoutAnalysis = computeDropoutAnalysis(touchpointResults, touchpoints);

  // Segment insights
  const segmentInsights = generateJourneyInsights(touchpointResults, touchpoints);

  // Recommendations
  const recommendations = generateJourneyRecommendations(touchpointResults, touchpoints);

  return {
    simulationType: "journey",
    totalAgents: targetAgents.length,
    touchpoints: touchpointResults,
    funnelSummary,
    dropoutAnalysis,
    segmentInsights,
    recommendations,
  };
}

// ─── 2. Retargeting Decay Analysis ───────────────────────────────────────────

/**
 * Simula N esposizioni dello stesso contenuto agli stessi agenti.
 * Misura la curva di frequency response per segmento.
 * Fonte: Pasted_content_07.txt — Simulazione 3
 */
export async function runRetargetingDecaySimulation(
  brandAgentId: number,
  campaignId: number,
  maxExposures: number = 10,
  intervalDays: number = 2,
  agentIds?: number[],
): Promise<FrequencyDecayResults> {
  const allAgents = await getAllAgents();
  const targetAgents = agentIds
    ? allAgents.filter(a => agentIds.includes(a.id))
    : allAgents.slice(0, 30);

  // Carica stato iniziale
  const agentStateMap = new Map<number, Awaited<ReturnType<typeof loadAgentBrandState>>>();
  for (const agent of targetAgents) {
    const state = await loadAgentBrandState(agent.id, brandAgentId);
    agentStateMap.set(agent.id, state);
  }

  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  // Ottieni la reazione base (prima esposizione) per ogni agente
  const baseReactions = new Map<number, number>();
  for (const agent of targetAgents) {
    try {
      const reaction = await processAgentCampaignReaction(agent, null, campaign, [], null);
      baseReactions.set(agent.id, reaction.overallScore);
    } catch {
      baseReactions.set(agent.id, 0);
    }
  }

  // Simula N esposizioni per ogni agente usando la curva di decay
  const exposureCurveData: Array<{
    exposure: number;
    scores: number[];
    irritations: number[];
    saturations: number[];
  }> = Array.from({ length: maxExposures }, (_, i) => ({
    exposure: i + 1,
    scores: [],
    irritations: [],
    saturations: [],
  }));

  for (const agent of targetAgents) {
    const baseScore = baseReactions.get(agent.id) ?? 0;
    const currentState = agentStateMap.get(agent.id)!;

    const curve = computeFrequencyResponseCurve(
      baseScore,
      currentState.brandFamiliarity,
      0.6, // irritation threshold
      maxExposures,
      intervalDays,
    );

    for (const point of curve) {
      const idx = point.exposure - 1;
      exposureCurveData[idx].scores.push(point.score);
      exposureCurveData[idx].irritations.push(point.irritation);
      exposureCurveData[idx].saturations.push(point.saturation);
    }
  }

  // Aggrega per esposizione
  const exposureCurve = exposureCurveData.map(d => ({
    exposure: d.exposure,
    avgScore: d.scores.length > 0 ? d.scores.reduce((a, b) => a + b, 0) / d.scores.length : 0,
    positiveRate: d.scores.length > 0 ? d.scores.filter(s => s > 0.2).length / d.scores.length : 0,
    irritationRate: d.irritations.length > 0 ? d.irritations.filter(i => i > 0.5).length / d.irritations.length : 0,
    saturationRate: d.saturations.length > 0 ? d.saturations.filter(s => s > 0.7).length / d.saturations.length : 0,
  }));

  // Trova il punto di inversione (dove il score medio diventa negativo o scende sotto il 50% del picco)
  const peakScore = Math.max(...exposureCurve.map(e => e.avgScore));
  const inversionPoint = exposureCurve.findIndex(e => e.avgScore < peakScore * 0.5 || e.avgScore < 0) + 1;

  // Frequenza ottimale (massimo score)
  const optimalIdx = exposureCurve.reduce((best, curr, idx) =>
    curr.avgScore > exposureCurve[best].avgScore ? idx : best, 0);
  const optimalFrequency = optimalIdx + 1;

  // Frequenza ottimale per segmento (usando bias vector)
  const bySegment: Record<string, number> = {};
    const generations = Array.from(new Set(targetAgents.map(a => a.generation)));
    for (const gen of generations) {
      const genAgents = targetAgents.filter(a => a.generation === gen);
      if (genAgents.length === 0) continue;
      // Agenti con alto cynicism saturano prima
      const avgCynicism = genAgents.reduce((s, a) => {
      const profile = a.habitusProfile as Record<string, number> | null;
      return s + (profile?.advertising_cynicism ?? 0.3);
    }, 0) / genAgents.length;
    // Frequenza ottimale inversamente proporzionale al cynicism
    bySegment[gen] = Math.max(2, Math.round(optimalFrequency * (1 - avgCynicism * 0.5)));
  }

  const recommendations = generateRetargetingRecommendations(exposureCurve, optimalFrequency, inversionPoint, intervalDays);

  return {
    simulationType: "retargeting",
    totalAgents: targetAgents.length,
    intervalDays,
    maxExposures,
    exposureCurve,
    optimalFrequency: {
      overall: optimalFrequency,
      bySegment,
    },
    inversionPoint: inversionPoint > 0 ? inversionPoint : maxExposures,
    recommendations,
  };
}

// ─── 3. Media Mix Optimization ────────────────────────────────────────────────

/**
 * Testa scenari di allocazione budget per piattaforma.
 * Ogni piattaforma raggiunge segmenti diversi con efficacia diversa.
 * Fonte: Pasted_content_07.txt — Simulazione 2
 */
export async function runMediaMixSimulation(
  brandAgentId: number,
  campaignId: number,
  scenarios: Array<{ name: string; allocation: Record<string, number> }>,
  agentIds?: number[],
): Promise<MediaMixResults> {
  const allAgents = await getAllAgents();
  const targetAgents = agentIds
    ? allAgents.filter(a => agentIds.includes(a.id))
    : allAgents.slice(0, 50);

  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  // Ottieni reazione base per ogni agente
  const baseReactions = new Map<number, { score: number; shareProbability: number }>();
  for (const agent of targetAgents) {
    try {
      const reaction = await processAgentCampaignReaction(agent, null, campaign, [], null);
      baseReactions.set(agent.id, {
        score: reaction.overallScore,
        shareProbability: reaction.shareProbability,
      });
    } catch {
      baseReactions.set(agent.id, { score: 0, shareProbability: 0.1 });
    }
  }

  const scenarioResults = scenarios.map(scenario => {
    const reachedAgents: Array<{
      agent: Agent;
      score: number;
      shareProbability: number;
      platform: string;
    }> = [];

    for (const agent of targetAgents) {
      // Trova la piattaforma con la migliore affinità per questo agente
      let bestPlatform = "";
      let bestAffinity = 0;
      for (const [platform, budget] of Object.entries(scenario.allocation)) {
        if (budget === 0) continue;
        const affinity = getAgentPlatformAffinity(agent, platform);
        // Probabilità di essere raggiunto = affinità × budget allocation
        const reachProb = affinity * budget;
        if (reachProb > bestAffinity) {
          bestAffinity = reachProb;
          bestPlatform = platform;
        }
      }

      // L'agente è raggiunto se la probabilità supera una soglia
      if (bestAffinity > 0.15) {
        const base = baseReactions.get(agent.id) ?? { score: 0, shareProbability: 0.1 };
        // Modifica il score in base alla piattaforma (stesso contenuto, piattaforme diverse)
        const platformModifier = getPlatformModifier(agent, bestPlatform);
        reachedAgents.push({
          agent,
          score: Math.max(-1, Math.min(1, base.score + platformModifier)),
          shareProbability: base.shareProbability,
          platform: bestPlatform,
        });
      }
    }

    const reachRate = reachedAgents.length / targetAgents.length;
    const avgScore = reachedAgents.length > 0
      ? reachedAgents.reduce((s, r) => s + r.score, 0) / reachedAgents.length
      : 0;
    const positiveRate = reachedAgents.length > 0
      ? reachedAgents.filter(r => r.score > 0.2).length / reachedAgents.length
      : 0;

    // Amplificazione organica: agenti con alta share_probability amplificano il reach
    const organicAmplification = reachedAgents.reduce((s, r) => s + r.shareProbability * 2, 0) / targetAgents.length;

    // Breakdown per segmento
    const bySegment: Record<string, { reachRate: number; avgScore: number }> = {};
    const generations = Array.from(new Set(targetAgents.map(a => a.generation)));
    for (const gen of generations) {
      const genTotal = targetAgents.filter(a => a.generation === gen).length;
      const genReached = reachedAgents.filter(r => r.agent.generation === gen);
      bySegment[gen] = {
        reachRate: genTotal > 0 ? genReached.length / genTotal : 0,
        avgScore: genReached.length > 0
          ? genReached.reduce((s, r) => s + r.score, 0) / genReached.length
          : 0,
      };
    }

    return {
      name: scenario.name,
      allocation: scenario.allocation,
      reachRate,
      avgScore,
      positiveRate,
      organicAmplification,
      bySegment,
    };
  });

  // Scenario raccomandato: massimizza (reachRate × positiveRate × (1 + organicAmplification))
  const recommendedScenario = scenarioResults.reduce((best, curr) => {
    const score = curr.reachRate * curr.positiveRate * (1 + curr.organicAmplification);
    const bestScore = best.reachRate * best.positiveRate * (1 + best.organicAmplification);
    return score > bestScore ? curr : best;
  }, scenarioResults[0]);

  const recommendations = generateMediaMixRecommendations(scenarioResults, recommendedScenario.name);

  return {
    simulationType: "media_mix",
    totalAgents: targetAgents.length,
    scenarios: scenarioResults,
    recommendedScenario: recommendedScenario.name,
    recommendations,
  };
}

// ─── 4. Competitive Response ──────────────────────────────────────────────────

/**
 * Simula l'effetto dell'interferenza competitiva.
 * Prima espone gli agenti alla campagna del competitor, poi alla campagna del cliente.
 * L'anchoring bias fa sì che la prima campagna diventi il riferimento.
 * Fonte: Pasted_content_07.txt — Simulazione 4
 */
export async function runCompetitiveResponseSimulation(
  brandAgentId: number,
  clientCampaignId: number,
  competitorCampaignId: number,
  agentIds?: number[],
): Promise<CompetitiveResponseResults> {
  const allAgents = await getAllAgents();
  const targetAgents = agentIds
    ? allAgents.filter(a => agentIds.includes(a.id))
    : allAgents.slice(0, 30);

  const clientCampaign = await getCampaignById(clientCampaignId);
  const competitorCampaign = await getCampaignById(competitorCampaignId);
  if (!clientCampaign || !competitorCampaign) {
    throw new Error("Campaign not found");
  }

  // Baseline: solo campagna cliente (senza pre-esposizione competitor)
  const baselineResults: Array<{ agentId: number; score: number; generation: string; geo: string }> = [];
  for (const agent of targetAgents) {
    try {
      const reaction = await processAgentCampaignReaction(agent, null, clientCampaign, [], null);
      baselineResults.push({
        agentId: agent.id,
        score: reaction.overallScore,
        generation: agent.generation,
        geo: agent.geo,
      });
    } catch {
      baselineResults.push({ agentId: agent.id, score: 0, generation: agent.generation, geo: agent.geo });
    }
  }

  // Scenario competitivo: prima competitor, poi cliente
  const competitiveResults: Array<{ agentId: number; score: number; generation: string; geo: string }> = [];
  for (const agent of targetAgents) {
    try {
      // Step 1: Esponi al competitor (crea ancora cognitiva)
      const competitorReaction = await processAgentCampaignReaction(agent, null, competitorCampaign, [], null);

      // Calcola effetto anchoring dal bias vector
      const biasVector = computeBiasVector(agent);
      const anchoringStrength = biasVector.anchoring_susceptibility;

      // Step 2: Esponi al cliente — il competitor ha già impostato l'ancora
      const clientReaction = await processAgentCampaignReaction(agent, null, clientCampaign, [], null);

      // L'anchoring riduce l'efficacia della campagna cliente se il competitor era più aggressivo sul prezzo
      // o più familiare (primo visto = ancora di riferimento)
      const anchoringPenalty = anchoringStrength * 0.25 * Math.sign(competitorReaction.overallScore - clientReaction.overallScore);
      const adjustedScore = Math.max(-1, Math.min(1, clientReaction.overallScore - anchoringPenalty));

      competitiveResults.push({
        agentId: agent.id,
        score: adjustedScore,
        generation: agent.generation,
        geo: agent.geo,
      });
    } catch {
      competitiveResults.push({ agentId: agent.id, score: 0, generation: agent.generation, geo: agent.geo });
    }
  }

  const baselineScore = baselineResults.reduce((s, r) => s + r.score, 0) / baselineResults.length;
  const afterCompetitorScore = competitiveResults.reduce((s, r) => s + r.score, 0) / competitiveResults.length;
  const baselinePositiveRate = baselineResults.filter(r => r.score > 0.2).length / baselineResults.length;
  const afterCompetitorPositiveRate = competitiveResults.filter(r => r.score > 0.2).length / competitiveResults.length;
  const anchoringEffect = afterCompetitorScore - baselineScore;

  // Segmenti più vulnerabili
  const generations = Array.from(new Set(targetAgents.map(a => a.generation)));
  const vulnerableSegments = generations.map(gen => {
    const baseGen = baselineResults.filter(r => r.generation === gen);
    const compGen = competitiveResults.filter(r => r.generation === gen);
    const baseAvg = baseGen.length > 0 ? baseGen.reduce((s, r) => s + r.score, 0) / baseGen.length : 0;
    const compAvg = compGen.length > 0 ? compGen.reduce((s, r) => s + r.score, 0) / compGen.length : 0;
    return {
      segment: gen,
      baselineScore: baseAvg,
      afterCompetitorScore: compAvg,
      delta: compAvg - baseAvg,
    };
  }).sort((a, b) => a.delta - b.delta); // ordinati dal più vulnerabile

  const recommendations = generateCompetitiveRecommendations(
    anchoringEffect,
    vulnerableSegments,
    baselineScore,
    afterCompetitorScore,
  );

  return {
    simulationType: "competitive",
    totalAgents: targetAgents.length,
    baselineScore,
    baselinePositiveRate,
    afterCompetitorScore,
    afterCompetitorPositiveRate,
    anchoringEffect,
    vulnerableSegments,
    recommendations,
  };
}

// ─── 5. Content Calendar Optimization ────────────────────────────────────────

/**
 * Processa un calendario di contenuti in sequenza e misura il sentiment cumulativo.
 * Ottimizza l'ordine per massimizzare il sentiment accumulato.
 * Fonte: Pasted_content_07.txt — Simulazione 5
 */
export async function runContentCalendarSimulation(
  brandAgentId: number,
  contentItems: Array<{ campaignId: number; label: string }>,
  agentIds?: number[],
): Promise<ContentCalendarResults> {
  const allAgents = await getAllAgents();
  const targetAgents = agentIds
    ? allAgents.filter(a => agentIds.includes(a.id))
    : allAgents.slice(0, 20);

  // Carica stato iniziale
  const agentStateMap = new Map<number, Awaited<ReturnType<typeof loadAgentBrandState>>>();
  for (const agent of targetAgents) {
    const state = await loadAgentBrandState(agent.id, brandAgentId);
    agentStateMap.set(agent.id, state);
  }

  // Ottieni score base per ogni contenuto (senza effetti sequenza)
  const contentScores = new Map<number, number>();
  for (const item of contentItems) {
    const campaign = await getCampaignById(item.campaignId);
    if (!campaign) continue;
    let totalScore = 0;
    let count = 0;
    for (const agent of targetAgents.slice(0, 10)) { // campione per velocità
      try {
        const reaction = await processAgentCampaignReaction(agent, null, campaign, [], null);
        totalScore += reaction.overallScore;
        count++;
      } catch {}
    }
    contentScores.set(item.campaignId, count > 0 ? totalScore / count : 0);
  }

  // Simula sequenza originale
  const originalSequence = await simulateContentSequence(
    contentItems,
    targetAgents,
    agentStateMap,
    brandAgentId,
    "original",
  );

  // Ottimizza la sequenza (greedy: metti prima i contenuti che costruiscono credibilità)
  const optimizedItems = optimizeContentSequence(contentItems, contentScores);

  // Reset stati per simulare sequenza ottimizzata
  const agentStateMapReset = new Map<number, Awaited<ReturnType<typeof loadAgentBrandState>>>();
  for (const agent of targetAgents) {
    const state = await loadAgentBrandState(agent.id, brandAgentId);
    agentStateMapReset.set(agent.id, state);
  }

  const optimizedSequence = await simulateContentSequence(
    optimizedItems.items,
    targetAgents,
    agentStateMapReset,
    brandAgentId,
    "optimized",
  );

  const originalFinalSentiment = originalSequence[originalSequence.length - 1]?.cumulativeSentiment ?? 0;
  const optimizedFinalSentiment = optimizedSequence[optimizedSequence.length - 1]?.cumulativeSentiment ?? 0;
  const sentimentLift = optimizedFinalSentiment - originalFinalSentiment;

  const optimizedWithReason = optimizedSequence.map((item, idx) => ({
    ...item,
    originalPosition: contentItems.findIndex(c => c.campaignId === item.campaignId) + 1,
    reason: optimizedItems.reasons[idx] ?? "",
  }));

  const recommendations = generateCalendarRecommendations(
    originalSequence,
    optimizedWithReason,
    sentimentLift,
  );

  return {
    simulationType: "content_calendar",
    totalAgents: targetAgents.length,
    originalSequence,
    optimizedSequence: optimizedWithReason,
    sentimentLift,
    recommendations,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEmptyTouchpointResult(tp: TouchpointConfig, idx: number): TouchpointResult {
  return {
    touchpointIndex: idx,
    label: tp.label,
    channel: tp.channel,
    objective: tp.objective,
    delayDays: tp.delayDays,
    avgScore: 0,
    positiveRate: 0,
    scrollRate: 1,
    shareRate: 0,
    irritationRate: 0,
    saturationRate: 0,
    awarenessLift: 0,
    sentimentDelta: 0,
    byGeneration: {},
    byGeo: {},
    topReactions: [],
  };
}

function getPlatformModifier(agent: Agent, platform: string): number {
  // Lo stesso contenuto è percepito diversamente su piattaforme diverse
  const psychProfile = agent.habitusProfile as Record<string, number> | null;
  const cynicism = psychProfile?.advertising_cynicism ?? 0.3;
  const openness = psychProfile?.openness ?? 0.5;

  switch (platform.toLowerCase()) {
    case "instagram":
      // Instagram: favorisce visual, status, aspirazionale
      return (agent.statusOrientation - 0.5) * 0.1;
    case "tiktok":
      // TikTok: favorisce novità, humor, GenZ
      return (agent.noveltySeeking - 0.5) * 0.15 + (agent.generation === "GenZ" ? 0.1 : -0.05);
    case "facebook":
      // Facebook: favorisce community, family, Boomer/GenX
      const isFacebook = ["Boomer", "GenX"].includes(agent.generation);
      return isFacebook ? 0.05 : -0.05;
    case "youtube":
      // YouTube: favorisce contenuti lunghi, informativi
      return (openness - 0.5) * 0.1;
    case "email":
      // Email: favorisce agenti con alta conscientiousness
      const conscientiousness = psychProfile?.conscientiousness ?? 0.5;
      return (conscientiousness - 0.5) * 0.1 - cynicism * 0.1;
    default:
      return 0;
  }
}

function computeFunnelSummary(
  touchpointResults: TouchpointResult[],
  touchpoints: TouchpointConfig[],
): JourneyResults["funnelSummary"] {
  const awarenessTP = touchpointResults.find((_, i) => touchpoints[i]?.objective === "awareness");
  const considerationTP = touchpointResults.find((_, i) => touchpoints[i]?.objective === "consideration");
  const conversionTP = touchpointResults.find((_, i) => touchpoints[i]?.objective === "conversion");
  const recoveryTP = touchpointResults.find((_, i) => touchpoints[i]?.objective === "recovery");

  return {
    awarenessRate: awarenessTP ? (1 - awarenessTP.scrollRate) : touchpointResults[0] ? (1 - touchpointResults[0].scrollRate) : 0,
    considerationRate: considerationTP ? considerationTP.positiveRate : touchpointResults[1]?.positiveRate ?? 0,
    conversionRate: conversionTP ? conversionTP.positiveRate * 0.5 : touchpointResults[2]?.positiveRate ?? 0,
    recoveryRate: recoveryTP ? recoveryTP.positiveRate : 0,
  };
}

function computeDropoutAnalysis(
  touchpointResults: TouchpointResult[],
  touchpoints: TouchpointConfig[],
): JourneyResults["dropoutAnalysis"] {
  const analysis: JourneyResults["dropoutAnalysis"] = [];
  for (let i = 1; i < touchpointResults.length; i++) {
    const prev = touchpointResults[i - 1];
    const curr = touchpointResults[i];
    const dropoutRate = Math.max(0, prev.positiveRate - curr.positiveRate);
    if (dropoutRate > 0.05) {
      let reason = "cambio di tono o formato tra i touchpoint";
      if (curr.irritationRate > 0.3) reason = "irritazione da retargeting troppo aggressivo";
      else if (curr.saturationRate > 0.4) reason = "saturazione — troppa esposizione ravvicinata";
      else if (curr.scrollRate > 0.5) reason = "bassa attenzione — formato o canale non adeguato";
      analysis.push({
        fromTouchpoint: prev.label,
        toTouchpoint: curr.label,
        dropoutRate,
        reason,
      });
    }
  }
  return analysis;
}

function generateJourneyInsights(
  touchpointResults: TouchpointResult[],
  touchpoints: TouchpointConfig[],
): string[] {
  const insights: string[] = [];
  if (touchpointResults.length === 0) return insights;

  const firstTP = touchpointResults[0];
  const lastTP = touchpointResults[touchpointResults.length - 1];

  if (firstTP.scrollRate > 0.4) {
    insights.push(`Il primo touchpoint ha un alto tasso di scroll (${(firstTP.scrollRate * 100).toFixed(0)}%) — considera un formato più coinvolgente per l'awareness.`);
  }

  const maxIrritationTP = touchpointResults.reduce((max, tp) => tp.irritationRate > max.irritationRate ? tp : max, touchpointResults[0]);
  if (maxIrritationTP.irritationRate > 0.3) {
    insights.push(`Il touchpoint "${maxIrritationTP.label}" genera irritazione nel ${(maxIrritationTP.irritationRate * 100).toFixed(0)}% degli agenti — considera un intervallo più lungo.`);
  }

  const bestTP = touchpointResults.reduce((max, tp) => tp.avgScore > max.avgScore ? tp : max, touchpointResults[0]);
  insights.push(`Il touchpoint più efficace è "${bestTP.label}" con un punteggio medio di ${bestTP.avgScore.toFixed(2)}.`);

  return insights;
}

function generateJourneyRecommendations(
  touchpointResults: TouchpointResult[],
  touchpoints: TouchpointConfig[],
): string[] {
  const recommendations: string[] = [];

  for (let i = 0; i < touchpointResults.length; i++) {
    const tp = touchpointResults[i];
    if (tp.irritationRate > 0.4) {
      recommendations.push(`Aumenta l'intervallo prima del touchpoint "${tp.label}" — l'irritazione è troppo alta (${(tp.irritationRate * 100).toFixed(0)}%).`);
    }
    if (tp.scrollRate > 0.6) {
      recommendations.push(`Rivedi il formato del touchpoint "${tp.label}" — il ${(tp.scrollRate * 100).toFixed(0)}% degli agenti non presta attenzione.`);
    }
    if (tp.shareRate > 0.4) {
      recommendations.push(`Il touchpoint "${tp.label}" ha alto potenziale virale (${(tp.shareRate * 100).toFixed(0)}% di share propensity) — considera di amplificarlo.`);
    }
  }

  return recommendations;
}

function generateRetargetingRecommendations(
  curve: FrequencyDecayResults["exposureCurve"],
  optimalFrequency: number,
  inversionPoint: number,
  intervalDays: number,
): string[] {
  const recs: string[] = [];
  recs.push(`Frequenza ottimale: ${optimalFrequency} esposizioni con intervallo di ${intervalDays} giorni.`);
  if (inversionPoint <= optimalFrequency + 2) {
    recs.push(`Attenzione: il punto di inversione è a ${inversionPoint} esposizioni — il frequency cap consigliato è ${inversionPoint - 1}.`);
  }
  const irritationAtOptimal = curve[optimalFrequency - 1]?.irritationRate ?? 0;
  if (irritationAtOptimal > 0.2) {
    recs.push(`Al picco di efficacia, il ${(irritationAtOptimal * 100).toFixed(0)}% degli agenti mostra già irritazione — considera un cooldown di ${intervalDays * 2} giorni dopo ${optimalFrequency} esposizioni.`);
  }
  return recs;
}

function generateMediaMixRecommendations(
  scenarios: MediaMixResults["scenarios"],
  recommendedName: string,
): string[] {
  const recs: string[] = [];
  const recommended = scenarios.find(s => s.name === recommendedName);
  if (!recommended) return recs;

  recs.push(`Scenario raccomandato: "${recommendedName}" — raggiunge il ${(recommended.reachRate * 100).toFixed(0)}% del target con un punteggio medio di ${recommended.avgScore.toFixed(2)}.`);

  // Confronta con gli altri scenari
  for (const scenario of scenarios) {
    if (scenario.name === recommendedName) continue;
    const delta = recommended.reachRate - scenario.reachRate;
    if (Math.abs(delta) > 0.05) {
      recs.push(`"${recommendedName}" raggiunge il ${(Math.abs(delta) * 100).toFixed(0)}% ${delta > 0 ? "in più" : "in meno"} rispetto a "${scenario.name}".`);
    }
  }

  return recs;
}

function generateCompetitiveRecommendations(
  anchoringEffect: number,
  vulnerableSegments: CompetitiveResponseResults["vulnerableSegments"],
  baselineScore: number,
  afterCompetitorScore: number,
): string[] {
  const recs: string[] = [];

  if (anchoringEffect < -0.1) {
    recs.push(`La pre-esposizione al competitor riduce l'efficacia della campagna del ${(Math.abs(anchoringEffect) * 100).toFixed(0)}% — considera di anticipare il lancio di 48-72 ore.`);
  }

  const mostVulnerable = vulnerableSegments[0];
  if (mostVulnerable && mostVulnerable.delta < -0.1) {
    recs.push(`Il segmento "${mostVulnerable.segment}" è il più vulnerabile all'interferenza competitiva (delta: ${(mostVulnerable.delta * 100).toFixed(0)}%) — considera un messaggio dedicato per questo segmento.`);
  }

  if (anchoringEffect < -0.15) {
    recs.push(`L'effetto anchoring è significativo — adatta la creatività per il segmento price-sensitive per contrastare l'ancora di prezzo del competitor.`);
  }

  return recs;
}

function generateCalendarRecommendations(
  original: ContentCalendarResults["originalSequence"],
  optimized: ContentCalendarResults["optimizedSequence"],
  sentimentLift: number,
): string[] {
  const recs: string[] = [];

  if (sentimentLift > 0.05) {
    recs.push(`La sequenza ottimizzata aumenta il sentiment cumulativo del ${(sentimentLift * 100).toFixed(0)}% rispetto alla sequenza originale.`);
  }

  for (const item of optimized) {
    if (item.originalPosition !== item.position) {
      recs.push(`Sposta "${item.label}" dalla posizione ${item.originalPosition} alla posizione ${item.position}: ${item.reason}`);
    }
  }

  return recs;
}

async function simulateContentSequence(
  items: Array<{ campaignId: number; label: string }>,
  agents: Agent[],
  agentStateMap: Map<number, Awaited<ReturnType<typeof loadAgentBrandState>>>,
  brandAgentId: number,
  mode: "original" | "optimized",
): Promise<Array<{ position: number; campaignId: number; label: string; score: number; cumulativeSentiment: number }>> {
  const results = [];
  let cumulativeSentiment = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const campaign = await getCampaignById(item.campaignId);
    if (!campaign) continue;

    let totalScore = 0;
    let count = 0;

    for (const agent of agents.slice(0, 10)) { // campione per velocità
      const currentState = agentStateMap.get(agent.id)!;
      const exposureCtx = computeExposureContext(currentState);

      try {
        const reaction = await processAgentCampaignReaction(agent, null, campaign, [], null);
        const { adjustedScore } = applyExposureAdjustment(reaction.overallScore, exposureCtx);
        totalScore += adjustedScore;
        count++;

        // Aggiorna stato
        const newState = await updateStateAfterExposure(
          agent.id,
          brandAgentId,
          currentState,
          adjustedScore,
          item.campaignId,
          "social",
          item.label,
        );
        agentStateMap.set(agent.id, newState);
      } catch {}
    }

    const avgScore = count > 0 ? totalScore / count : 0;
    cumulativeSentiment += avgScore;

    results.push({
      position: i + 1,
      campaignId: item.campaignId,
      label: item.label,
      score: avgScore,
      cumulativeSentiment,
    });
  }

  return results;
}

function optimizeContentSequence(
  items: Array<{ campaignId: number; label: string }>,
  contentScores: Map<number, number>,
): { items: Array<{ campaignId: number; label: string }>; reasons: string[] } {
  // Strategia: ordina per score decrescente con alcune regole euristiche
  // 1. Contenuti con score positivo prima (costruiscono credibilità)
  // 2. Evita due contenuti molto simili in sequenza
  // 3. Alterna aspirazionale e pratico

  const scored = items.map(item => ({
    ...item,
    score: contentScores.get(item.campaignId) ?? 0,
  }));

  // Ordina: prima i contenuti con score positivo ma non troppo alto (credibilità),
  // poi i contenuti più forti (conversione), infine i deboli (recovery)
  const sorted = [...scored].sort((a, b) => {
    // Contenuti con score moderato positivo prima
    const aIsModerate = a.score > 0.1 && a.score < 0.5;
    const bIsModerate = b.score > 0.1 && b.score < 0.5;
    if (aIsModerate && !bIsModerate) return -1;
    if (!aIsModerate && bIsModerate) return 1;
    return b.score - a.score;
  });

  const reasons = sorted.map((item, idx) => {
    const originalIdx = items.findIndex(i => i.campaignId === item.campaignId);
    if (idx === originalIdx) return "posizione invariata";
    if (idx < originalIdx) return `anticipato — score positivo (${item.score.toFixed(2)}) costruisce credibilità per i contenuti successivi`;
    return `posticipato — score più basso (${item.score.toFixed(2)}), meglio come contenuto di follow-up`;
  });

  return { items: sorted, reasons };
}

// ─── DB Operations ────────────────────────────────────────────────────────────

export async function createJourneySimulationRecord(
  brandAgentId: number | undefined,
  name: string,
  simulationType: "journey" | "retargeting" | "media_mix" | "competitive" | "content_calendar",
  touchpoints: any[],
  agentIds?: number[],
  totalAgents: number = 0,
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const result = await db.insert(journeySimulations).values({
    brandAgentId: brandAgentId ?? null,
    name,
    simulationType,
    touchpoints: touchpoints as any,
    agentIds: agentIds ? agentIds as any : null,
    totalAgents,
    status: "pending",
  });

  return Number((result as any).insertId ?? 0);
}

export async function updateJourneySimulationRecord(
  id: number,
  updates: {
    status?: "pending" | "running" | "complete" | "failed";
    results?: any;
    totalAgents?: number;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
  },
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  await db.update(journeySimulations)
    .set(updates as any)
    .where(eq(journeySimulations.id, id));
}

export async function getJourneySimulationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rows = await db.select().from(journeySimulations).where(eq(journeySimulations.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listJourneySimulations(brandAgentId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (brandAgentId) {
    return db.select().from(journeySimulations).where(eq(journeySimulations.brandAgentId, brandAgentId));
  }
  return db.select().from(journeySimulations);
}
