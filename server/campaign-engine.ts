/**
 * Ordinary People — Campaign Reaction Engine v1.0
 *
 * Processes campaign exposure for each agent using LLM with multimodal support.
 * Each agent receives the campaign (text + optional image), their current state,
 * relevant memories, and produces a structured reaction report.
 *
 * Output per agent:
 * - Quantitative: overallScore, buyProbability, shareProbability, attractionScore,
 *   repulsionScore, adequacyScore, emotionalValence, emotionalIntensity
 * - Qualitative: gutReaction, reflection, quote, attractions, repulsions,
 *   tensions, motivations
 *
 * References:
 * - Kahneman: System 1 (gut) → System 2 (reflection)
 * - Ariely: predictably irrational — emotions drive decisions
 * - Thaler: mental accounting — budget categories affect willingness to pay
 * - Bourdieu: habitus — taste as class, cultural capital filters perception
 * - Veblen: conspicuous consumption — price as status signal
 * - Cialdini: social proof, authority, scarcity
 */

import { invokeLLM } from "./_core/llm";
import type { Message } from "./_core/llm";
import { routedLLM } from "./llm-router";
import {
  getAllAgents,
  getAgentState,
  getRelevantMemories,
  createCampaignTest,
  updateCampaignTest,
  createCampaignReaction,
  updateCampaignReaction,
  getCampaignById,
  getCampaignReactions,
  createCampaignReport,
  updateCampaignReport,
} from "./agents-db";
import type { Agent, AgentState, Campaign, CampaignReport } from "../drizzle/schema";
import {
  buildSocialInfluenceContexts,
  applysocialInfluence,
  computeSocialInfluenceStats,
  type Pass1Reaction,
} from "./social-influence";
import { buildPerceptualPrompt } from "./ingestion/perceptual-filter";
import type { CampaignDigest } from "./ingestion/schema";
import { computeBiasVector, applyBiases, describeActiveBiases, formatBiasVectorForPrompt } from "./scoring/bias-engine";
import { generateInnerLife, formatInnerLifeForPrompt } from "./scoring/inner-life-generator";
import { computeSalience } from "./scoring/salience-calculator";
import type { CampaignSignals } from "./scoring/salience-calculator";
import { DEFAULT_SYSTEM_PARAMS } from "./scoring/system-params";
import type { CampaignTag } from "./scoring/salience-calculator";

// ─── Types ────────────────────────────────────────────────────────────

export interface AgentReactionResult {
  agentId: number;
  agentSlug: string;
  agentName: string;
  // Quantitative
  overallScore: number;
  buyProbability: number;
  shareProbability: number;
  attractionScore: number;
  repulsionScore: number;
  adequacyScore: number;
  emotionalValence: number;
  emotionalIntensity: number;
  // Qualitative
  gutReaction: string;
  reflection: string;
  quote: string;
  attractions: string[];
  repulsions: string[];
  tensions: string;
  motivations: string;
}

export interface CampaignTestProgress {
  campaignTestId: number;
  status: "running" | "complete" | "failed";
  completedAgents: number;
  totalAgents: number;
  reactions: AgentReactionResult[];
}

// ─── Run a campaign test ──────────────────────────────────────────────

export async function runCampaignTest(
  campaignId: number,
  testName?: string,
  agentIds?: number[],
  onProgress?: (progress: CampaignTestProgress) => void,
  digest?: CampaignDigest | null
): Promise<CampaignTestProgress> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);

  const allAgents = await getAllAgents();
  const targetAgents = agentIds
    ? allAgents.filter(a => agentIds.includes(a.id))
    : allAgents;

  // Create campaign test record
  const testId = await createCampaignTest({
    campaignId,
    name: testName ?? `Test ${campaign.name} — ${new Date().toLocaleDateString("it-IT")}`,
    status: "running",
    agentIds: agentIds ?? null,
    totalAgents: targetAgents.length,
    completedAgents: 0,
    startedAt: new Date(),
  });

  const reactions: AgentReactionResult[] = [];
  let completed = 0;

  for (const agent of targetAgents) {
    // Create pending reaction record
    const reactionId = await createCampaignReaction({
      campaignTestId: testId,
      agentId: agent.id,
      status: "processing",
    });

    try {
      const state = await getAgentState(agent.id);
      const memories = await getRelevantMemories(
        agent.id,
        (campaign.topics as string[]) ?? [],
        5
      );

      const result = await processAgentCampaignReaction(agent, state, campaign, memories, digest);

      // Save reaction to DB
      await updateCampaignReaction(reactionId, {
        overallScore: result.overallScore,
        buyProbability: result.buyProbability,
        shareProbability: result.shareProbability,
        attractionScore: result.attractionScore,
        repulsionScore: result.repulsionScore,
        adequacyScore: result.adequacyScore,
        emotionalValence: result.emotionalValence,
        emotionalIntensity: result.emotionalIntensity,
        gutReaction: result.gutReaction,
        reflection: result.reflection,
        quote: result.quote,
        attractions: result.attractions as any,
        repulsions: result.repulsions as any,
        tensions: result.tensions,
        motivations: result.motivations,
        stateAtReaction: state as any,
        memoryContext: memories.map(m => ({ title: m.title, valence: m.emotionalValence })) as any,
        status: "complete",
        processedAt: new Date(),
      });

      reactions.push(result);
    } catch (error) {
      console.error(`[CampaignEngine] Error for agent ${agent.slug}:`, error);
      await updateCampaignReaction(reactionId, {
        status: "failed",
        processedAt: new Date(),
      });
    }

    completed++;
    await updateCampaignTest(testId, { completedAgents: completed });

    const progress: CampaignTestProgress = {
      campaignTestId: testId,
      status: "running",
      completedAgents: completed,
      totalAgents: targetAgents.length,
      reactions,
    };
    onProgress?.(progress);
  }

  // ─── Pass 2: Social Influence ─────────────────────────────────────────
  // Dopo che tutti gli agenti hanno reagito individualmente (Pass 1),
  // calcola l'influenza sociale e aggiorna i punteggi finali.
  // Questo implementa il loop sociale: ogni agente "vede" le reazioni
  // dei propri contatti sociali e può aggiornare la propria posizione.
  if (reactions.length > 1) {
    try {
      // Costruisci i dati Pass1 per il grafo di influenza
      const pass1Data: Pass1Reaction[] = reactions.map(r => ({
        agentId: r.agentId,
        agentSlug: r.agentSlug,
        score: (r.overallScore + 1) * 5, // normalizza da [-1,1] a [0,10]
        gutReaction: r.gutReaction,
        attractionScore: r.attractionScore * 10,
        repulsionScore: r.repulsionScore * 10,
        purchaseProbability: r.buyProbability,
      }));

      // Costruisci i contesti di influenza sociale
      const socialContexts = buildSocialInfluenceContexts(targetAgents, pass1Data);

      // Applica l'influenza e aggiorna le reazioni
      const finalScores = new Map<number, number>();
      for (const reaction of reactions) {
        const context = socialContexts.get(reaction.agentId);
        if (!context || context.contactReactions.length === 0) {
          finalScores.set(reaction.agentId, (reaction.overallScore + 1) * 5);
          continue;
        }

        const pass1Score = (reaction.overallScore + 1) * 5;
        const { finalScore, socialDelta, socialNarrative } = applysocialInfluence(pass1Score, context);
        finalScores.set(reaction.agentId, finalScore);

        // Aggiorna la reazione con il punteggio finale e la narrativa sociale
        if (Math.abs(socialDelta) >= 0.3) {
          const finalOverallScore = (finalScore / 5) - 1; // riconverti a [-1,1]
          reaction.overallScore = Math.max(-1, Math.min(1, finalOverallScore));
          if (socialNarrative) {
            reaction.tensions = reaction.tensions
              ? `${reaction.tensions}\n\n[Influenza sociale]: ${socialNarrative}`
              : `[Influenza sociale]: ${socialNarrative}`;
          }
        }
      }

      // Calcola statistiche di influenza sociale (per il report)
      const socialStats = computeSocialInfluenceStats(pass1Data, finalScores);
      console.log(`[CampaignEngine] Social influence Pass 2: ${socialStats.totalAgentsInfluenced} agents influenced, avg delta: ${socialStats.averageDelta.toFixed(2)}`);
    } catch (err) {
      // Il loop sociale è opzionale — se fallisce, usa i risultati del Pass 1
      console.warn(`[CampaignEngine] Social influence Pass 2 failed:`, err);
    }
  }

  // Mark test as complete
  await updateCampaignTest(testId, {
    status: "complete",
    completedAt: new Date(),
  });

  // Generate aggregated report
  await generateCampaignReport(testId, reactions, targetAgents);

  return {
    campaignTestId: testId,
    status: "complete",
    completedAgents: completed,
    totalAgents: targetAgents.length,
    reactions,
  };
}

// ─── Process a single agent's reaction to a campaign ─────────────────

export async function processAgentCampaignReaction(
  agent: Agent,
  state: AgentState | null,
  campaign: Campaign,
  memories: any[],
  digest?: CampaignDigest | null
): Promise<AgentReactionResult> {
  // Build base system prompt
  // IMPORTANTE: usa sempre buildFallbackSystemPrompt (che include Kahneman, Bourdieu, Veblen, Maslow, Thaler)
  // come base psicologica ricca. Il systemPrompt del DB è un prompt narrativo basico generato dal seed
  // e viene aggiunto come contesto aggiuntivo ("voce" dell'agente) se disponibile.
  let systemPrompt = buildFallbackSystemPrompt(agent);
  if (agent.systemPrompt && agent.systemPrompt.length > 50) {
    // Aggiungi solo la parte narrativa del systemPrompt del DB (non ripetere i dati demografici)
    // Il systemPrompt del DB contiene la "voce" dell'agente e il suo archetipo
    systemPrompt = systemPrompt + `\n\n[Nota narrativa: ${agent.systemPrompt}]`;
  }

  // Perceptual Filter: if a digest is available, enrich the system prompt with
  // the agent's perceptual frame — which traits of the campaign are salient for
  // THIS specific agent, filtered through their psychological profile.
  if (digest) {
    try {
      const psychProfile = agent.habitusProfile as Record<string, number> | null;
      const agentProfile = {
        id: String(agent.id),
        name: `${agent.firstName} ${agent.lastName}`,
        age: agent.age,
        generation: agent.generation,
        geo: agent.geo,
        // Big Five from habitusProfile if available
        openness: psychProfile?.openness,
        conscientiousness: psychProfile?.conscientiousness,
        extraversion: psychProfile?.extraversion,
        agreeableness: psychProfile?.agreeableness,
        neuroticism: psychProfile?.neuroticism,
        // Bourdieu
        bourdieu_class: psychProfile?.bourdieu_class ? String(psychProfile.bourdieu_class) : undefined,
        // Psychographics
        status_orientation: agent.statusOrientation,
        novelty_seeking: agent.noveltySeeking,
        price_sensitivity: agent.priceSensitivity,
        risk_aversion: agent.riskAversion,
        emotional_susceptibility: agent.emotionalSusceptibility,
        advertising_cynicism: psychProfile?.advertising_cynicism,
        attention_span: psychProfile?.attention_span,
        media_diet: agent.mediaDiet as Record<string, number> | undefined,
      };
      const perceptualFrame = buildPerceptualPrompt(agentProfile, digest);
      if (perceptualFrame.perceptual_prompt) {
        systemPrompt = systemPrompt + "\n\n" + perceptualFrame.perceptual_prompt;
      }
    } catch (err) {
      // Perceptual filter is optional — if it fails, proceed without it
      console.warn(`[CampaignEngine] Perceptual filter failed for agent ${agent.slug}:`, err);
    }
  }

  // ─── Cascade Level 1-2: Salience + Bias pre-computation ──────────────
  // Compute the gut reaction score BEFORE the LLM call.
  // This gives the LLM a deterministic anchor that reflects the agent's
  // psychological profile and the campaign's semantic tags.
  let gutReactionScore = 0.0;
  let biasNarrative: string[] = [];
  let salienceContext = "";
  try {
    // Extract campaign tags from topics + tone
    const campaignTopics = (campaign.topics as string[]) ?? [];
    const campaignTags = inferCampaignTags(campaignTopics, campaign.tone ?? "", campaign.format ?? "");
    const campaignSignals: CampaignSignals = {
      tags: campaignTags,
      tone: campaign.tone ?? undefined,
      emotionalCharge: 0.5,
      format: campaign.format ?? undefined,
      channel: campaign.channel ?? undefined,
    };

    // Compute salience (which variables are dominant for this campaign)
    const salience = computeSalience(agent, campaignSignals);

    // Compute gut reaction from dominant + modulation variables
    const DOMINANT_W = DEFAULT_SYSTEM_PARAMS.DOMINANT_WEIGHT;
    const MODULATION_W = DEFAULT_SYSTEM_PARAMS.MODULATION_WEIGHT;
    let weightedSum = 0;
    let totalWeight = 0;
    for (const v of salience.dominant) {
      const contribution = (v.value - 0.5) * v.resonance * DOMINANT_W;
      weightedSum += contribution;
      totalWeight += DOMINANT_W;
    }
    for (const v of salience.modulation) {
      const contribution = (v.value - 0.5) * v.resonance * MODULATION_W;
      weightedSum += contribution;
      totalWeight += MODULATION_W;
    }
    gutReactionScore = totalWeight > 0 ? clamp(weightedSum / totalWeight * 2, -1, 1) : 0;

    // Apply bias distortions (Level 2)
    const biasVector = computeBiasVector(agent);
    gutReactionScore = applyBiases(gutReactionScore, biasVector, campaignSignals);
    biasNarrative = describeActiveBiases(biasVector, campaignSignals);

    // Build salience context for the LLM
    if (salience.dominant.length > 0) {
      const dominantVarNames = salience.dominant.slice(0, 3).map(v => v.variable.replace(/_/g, " ")).join(", ");
      salienceContext = `\n[Contesto deterministico: le variabili psicologiche più rilevanti per questa campagna sono: ${dominantVarNames}. Punteggio viscerale pre-razionale: ${gutReactionScore > 0.3 ? "positivo" : gutReactionScore < -0.3 ? "negativo" : "ambivalente"} (${gutReactionScore.toFixed(2)}).${biasNarrative.length > 0 ? " Bias attivi: " + biasNarrative.join("; ") + "." : ""}]`;
    }
  } catch (err) {
    // Salience/bias computation is optional — proceed without it
    console.warn(`[CampaignEngine] Salience/bias computation failed for agent ${agent.slug}:`, err);
  }

  const userPrompt = buildCampaignPrompt(agent, state, campaign, memories) + salienceContext;

  // Build messages with optional image
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
  ];

  // If campaign has images, use multimodal
  const mediaUrls = campaign.mediaUrls as string[] | null;
  if (mediaUrls && mediaUrls.length > 0) {
    const imageUrl = mediaUrls[0]; // Use first image
    messages.push({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: { url: imageUrl, detail: "auto" },
        },
        {
          type: "text",
          text: userPrompt,
        },
      ],
    });
  } else {
    messages.push({ role: "user", content: userPrompt });
  }

  let llmResponse: string;
  try {
    const response = await routedLLM("agent_reaction", {
      messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "campaign_reaction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              gut_reaction: {
                type: "string",
                description: "Reazione immediata, viscerale (Sistema 1). 1-2 frasi brevi, in prima persona.",
              },
              reflection: {
                type: "string",
                description: "Riflessione razionale dopo aver pensato (Sistema 2). 2-3 frasi, in prima persona.",
              },
              quote: {
                type: "string",
                description: "Una frase in prima persona, colloquiale, che riassume il tuo giudizio. Come diresti a un amico.",
              },
              overall_score: {
                type: "number",
                description: "Punteggio complessivo: -1 (rifiuto totale) a +1 (entusiasmo totale)",
              },
              buy_probability: {
                type: "number",
                description: "Probabilità che tu acquisti: 0 a 1",
              },
              share_probability: {
                type: "number",
                description: "Probabilità che tu condivida/parli di questa campagna: 0 a 1",
              },
              attraction_score: {
                type: "number",
                description: "Quanto ti attrae questa campagna: 0 a 1",
              },
              repulsion_score: {
                type: "number",
                description: "Quanto ti respinge questa campagna: 0 a 1",
              },
              adequacy_score: {
                type: "number",
                description: "Quanto senti che questo prodotto/messaggio è adeguato per te: 0 a 1",
              },
              emotional_valence: {
                type: "number",
                description: "Valenza emotiva complessiva: -1 (molto negativo) a +1 (molto positivo)",
              },
              emotional_intensity: {
                type: "number",
                description: "Intensità emotiva: 0 (indifferente) a 1 (molto intenso)",
              },
              attractions: {
                type: "array",
                items: { type: "string" },
                description: "Lista di 2-4 elementi che ti attraggono (brevi, specifici)",
              },
              repulsions: {
                type: "array",
                items: { type: "string" },
                description: "Lista di 2-4 elementi che ti respingono (brevi, specifici)",
              },
              tensions: {
                type: "string",
                description: "Eventuale ambivalenza interna: cosa ti attrae ma ti preoccupa, o viceversa. Max 2 frasi.",
              },
              motivations: {
                type: "string",
                description: "Perché hai questa reazione? Cosa nella tua vita o nel tuo carattere spiega questa risposta? 2-3 frasi.",
              },
            },
            required: [
              "gut_reaction", "reflection", "quote",
              "overall_score", "buy_probability", "share_probability",
              "attraction_score", "repulsion_score", "adequacy_score",
              "emotional_valence", "emotional_intensity",
              "attractions", "repulsions", "tensions", "motivations",
            ],
            additionalProperties: false,
          },
        },
      },
    });
    const rawContent = response.choices[0]?.message?.content;
    llmResponse = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? {});
  } catch (error) {
    console.error(`[CampaignEngine] LLM error for agent ${agent.slug}:`, error);
    return buildFallbackReaction(agent);
  }

  let parsed: any = {};
  try {
    parsed = JSON.parse(llmResponse);
  } catch {
    return buildFallbackReaction(agent);
  }

  return {
    agentId: agent.id,
    agentSlug: agent.slug,
    agentName: `${agent.firstName} ${agent.lastName}`,
    overallScore: clamp(parsed.overall_score ?? 0, -1, 1),
    buyProbability: clamp(parsed.buy_probability ?? 0, 0, 1),
    shareProbability: clamp(parsed.share_probability ?? 0, 0, 1),
    attractionScore: clamp(parsed.attraction_score ?? 0, 0, 1),
    repulsionScore: clamp(parsed.repulsion_score ?? 0, 0, 1),
    adequacyScore: clamp(parsed.adequacy_score ?? 0, 0, 1),
    emotionalValence: clamp(parsed.emotional_valence ?? 0, -1, 1),
    emotionalIntensity: clamp(parsed.emotional_intensity ?? 0, 0, 1),
    gutReaction: parsed.gut_reaction ?? "",
    reflection: parsed.reflection ?? "",
    quote: parsed.quote ?? "",
    attractions: Array.isArray(parsed.attractions) ? parsed.attractions : [],
    repulsions: Array.isArray(parsed.repulsions) ? parsed.repulsions : [],
    tensions: parsed.tensions ?? "",
    motivations: parsed.motivations ?? "",
  };
}

// ─── Generate aggregated report (Reporter Agent) ──────────────────────

export async function generateCampaignReport(
  campaignTestId: number,
  reactions: AgentReactionResult[],
  agents: any[]
): Promise<void> {
  if (reactions.length === 0) return;

  // Create report record
  const reportId = await createCampaignReport({
    campaignTestId,
    status: "generating",
  });

  try {
    // Compute quantitative aggregates
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const avgOverall = avg(reactions.map(r => r.overallScore));
    const avgBuy = avg(reactions.map(r => r.buyProbability));
    const avgShare = avg(reactions.map(r => r.shareProbability));
    const avgAttraction = avg(reactions.map(r => r.attractionScore));
    const avgRepulsion = avg(reactions.map(r => r.repulsionScore));

    // Score distribution
    const dist = { very_positive: 0, positive: 0, neutral: 0, negative: 0, very_negative: 0 };
    for (const r of reactions) {
      if (r.overallScore >= 0.6) dist.very_positive++;
      else if (r.overallScore >= 0.2) dist.positive++;
      else if (r.overallScore >= -0.2) dist.neutral++;
      else if (r.overallScore >= -0.6) dist.negative++;
      else dist.very_negative++;
    }

    // Segmentation by generation
    const byGeneration: Record<string, { count: number; avgScore: number; avgBuy: number }> = {};
    for (const agent of agents) {
      const reaction = reactions.find(r => r.agentId === agent.id);
      if (!reaction) continue;
      if (!byGeneration[agent.generation]) {
        byGeneration[agent.generation] = { count: 0, avgScore: 0, avgBuy: 0 };
      }
      byGeneration[agent.generation].count++;
      byGeneration[agent.generation].avgScore += reaction.overallScore;
      byGeneration[agent.generation].avgBuy += reaction.buyProbability;
    }
    for (const gen of Object.keys(byGeneration)) {
      byGeneration[gen].avgScore /= byGeneration[gen].count;
      byGeneration[gen].avgBuy /= byGeneration[gen].count;
    }

    // Segmentation by geo
    const byGeo: Record<string, { count: number; avgScore: number }> = {};
    for (const agent of agents) {
      const reaction = reactions.find(r => r.agentId === agent.id);
      if (!reaction) continue;
      if (!byGeo[agent.geo]) byGeo[agent.geo] = { count: 0, avgScore: 0 };
      byGeo[agent.geo].count++;
      byGeo[agent.geo].avgScore += reaction.overallScore;
    }
    for (const geo of Object.keys(byGeo)) {
      byGeo[geo].avgScore /= byGeo[geo].count;
    }

    // Collect all attractions and repulsions
    const allAttractions = reactions.flatMap(r => r.attractions);
    const allRepulsions = reactions.flatMap(r => r.repulsions);

    // Build reporter prompt
    const reporterPrompt = buildReporterPrompt(reactions, agents, {
      avgOverall, avgBuy, avgShare, dist, byGeneration, byGeo,
    });

    const reportResponse = await routedLLM("report_generation", {
      messages: [
        {
          role: "system",
          content: `Sei un analista di marketing senior specializzato in ricerche qualitative e comportamento del consumatore italiano. 
Il tuo compito è analizzare le reazioni di un panel di consumatori sintetici a una campagna pubblicitaria e produrre un report strategico.
Basa la tua analisi sui dati forniti. Sii specifico, motivato, e orientato all'azione.
Rispondi in italiano, con un tono professionale ma accessibile.`,
        },
        { role: "user", content: reporterPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "campaign_report",
          strict: true,
          schema: {
            type: "object",
            properties: {
              executive_summary: {
                type: "string",
                description: "Sintesi esecutiva: 2-3 paragrafi. Cosa ha funzionato, cosa no, e perché.",
              },
              common_patterns: {
                type: "string",
                description: "Pattern comuni tra i consumatori: cosa li unisce nella risposta a questa campagna.",
              },
              key_divergences: {
                type: "string",
                description: "Dove e perché i consumatori divergono. Quali segmenti reagiscono diversamente e perché.",
              },
              segment_insights: {
                type: "string",
                description: "Analisi per segmento: generazione, area geografica, reddito. Cosa differenzia le reazioni.",
              },
              recommendations: {
                type: "string",
                description: "3-5 raccomandazioni concrete per migliorare la campagna o il targeting.",
              },
              risk_flags: {
                type: "array",
                items: { type: "string" },
                description: "Segnali di rischio: segmenti che potrebbero reagire negativamente, messaggi problematici.",
              },
            },
            required: [
              "executive_summary", "common_patterns", "key_divergences",
              "segment_insights", "recommendations", "risk_flags",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = reportResponse.choices[0]?.message?.content;
    const reportContent = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? {});
    let reportParsed: any = {};
    try {
      reportParsed = JSON.parse(reportContent);
    } catch {
      reportParsed = {};
    }

    // Weighted market interest (by population share)
    const totalShare = agents.reduce((sum: number, a: any) => sum + (a.populationShare ?? 0), 0);
    const weightedInterest = reactions.reduce((sum, r) => {
      const agent = agents.find((a: any) => a.id === r.agentId);
      const share = agent?.populationShare ?? 0;
      return sum + r.overallScore * (share / totalShare);
    }, 0);

    await updateCampaignReport(reportId, {
      avgOverallScore: avgOverall,
      avgBuyProbability: avgBuy,
      avgShareProbability: avgShare,
      avgAttractionScore: avgAttraction,
      avgRepulsionScore: avgRepulsion,
      weightedMarketInterest: weightedInterest,
      scoreDistribution: dist as any,
      byGeneration: byGeneration as any,
      byGeo: byGeo as any,
      topAttractions: getTopItems(allAttractions, 5) as any,
      topRepulsions: getTopItems(allRepulsions, 5) as any,
      executiveSummary: reportParsed.executive_summary ?? "",
      commonPatterns: reportParsed.common_patterns ?? "",
      keyDivergences: reportParsed.key_divergences ?? "",
      segmentInsights: reportParsed.segment_insights ?? "",
      recommendations: reportParsed.recommendations ?? "",
      riskFlags: (reportParsed.risk_flags ?? []) as any,
      status: "complete",
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("[CampaignEngine] Report generation error:", error);
    await updateCampaignReport(reportId, { status: "failed" });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildFallbackSystemPrompt(agent: Agent): string {
  // ─── Sistema 1 / Sistema 2 (Kahneman) ───────────────────────────────
  const s1 = agent.system1Dominance ?? 0.7;
  const s1Desc = s1 > 0.75
    ? "Sei una persona molto istintiva: le tue decisioni nascono prima di tutto da sensazioni viscerali, emozioni immediate, intuizioni rapide. Razionalizzi dopo, non prima."
    : s1 < 0.45
    ? "Sei una persona molto razionale: prima di decidere analizzi, confronti, pesi i pro e i contro. Le emozioni ti influenzano, ma non ti guidano."
    : "Sei una persona equilibrata: le emozioni ti danno il primo impulso, ma poi ti fermi a riflettere prima di decidere.";

  // ─── Avversione alla perdita (Kahneman) ─────────────────────────────
  const la = agent.lossAversionCoeff ?? 2.0;
  const laDesc = la > 2.5
    ? "Hai una forte avversione alla perdita: la paura di perdere qualcosa ti pesa molto più del piacere di guadagnare qualcosa di equivalente."
    : la < 1.6
    ? "Sei relativamente tollerante al rischio: non ti spaventa la possibilità di perdere se c'è una buona opportunità."
    : "";

  // ─── Bourdieu: capitale culturale e habitus ──────────────────────────
  const cc = agent.culturalCapital ?? 0.5;
  const habitus = agent.habitusProfile as Record<string, number> | null;
  const ccDesc = cc > 0.7
    ? "Hai un alto capitale culturale: sei abituato a distinguere il buon gusto dall'ostentazione, il valore autentico dal marketing superficiale. Sei critico verso i brand che sembrano 'troppo commerciali'."
    : cc < 0.35
    ? "Il tuo capitale culturale è basso: preferisci la praticità al simbolismo, il prezzo conveniente alla marca, e diffidi di chi ti vende sogni invece di prodotti concreti."
    : "Hai un capitale culturale medio: apprezzi la qualità quando è evidente, ma non sei snob.";

  // ─── Veblen: consumo vistoso ─────────────────────────────────────────
  const vci = agent.conspicuousConsumptionIndex ?? 0.3;
  const veblenDesc = vci > 0.65
    ? "Per te i brand e i prodotti sono anche segnali di status: acquistare qualcosa di costoso o di marca nota ti dà soddisfazione perché comunica chi sei agli altri. Un prezzo alto può essere un segnale di qualità e distinzione."
    : vci < 0.25
    ? "Non ti interessa mostrare cosa compri: l'idea di pagare di più solo per la marca ti sembra uno spreco. Preferisci il valore reale all'immagine."
    : "";

  // ─── Maslow: livello di bisogno attivo ───────────────────────────────
  const maslow = agent.maslowBaseline ?? 3;
  const maslowDesc = maslow <= 2
    ? "Le tue preoccupazioni principali sono pratiche: sicurezza economica, stabilità, necessità quotidiane. Non hai spazio mentale per i consumi aspirazionali."
    : maslow === 3
    ? "Sei orientato all'appartenenza: ti importa fare parte di un gruppo, essere accettato, condividere esperienze con gli altri."
    : maslow === 4
    ? "Sei orientato alla stima: ti importa essere riconosciuto, rispettato, percepito come competente o di successo."
    : "Sei orientato all'autorealizzazione: cerchi prodotti e esperienze che rispecchino i tuoi valori profondi e il tuo percorso personale.";

  // ─── Thaler: mental accounting ───────────────────────────────────────
  const ma = agent.mentalAccountingProfile as Record<string, number> | null;
  const maDesc = ma
    ? `Nel tuo modo di gestire i soldi: necessità (${Math.round((ma.necessità ?? 0.5) * 100)}% disponibilità), piaceri (${Math.round((ma.piacere ?? 0.3) * 100)}%), lusso (${Math.round((ma.lusso ?? 0.1) * 100)}%).`
    : "";

  // ─── Psychographics ──────────────────────────────────────────────────
  const ns = agent.noveltySeeking ?? 0.5;
  const ps = agent.priceSensitivity ?? 0.5;
  const so = agent.statusOrientation ?? 0.5;
  const ra = agent.riskAversion ?? 0.5;
  const es = agent.emotionalSusceptibility ?? 0.5;

  const psychDesc = [
    ns > 0.7 ? "Ami la novità e l'innovazione: ti annoiano le cose già viste." : ns < 0.3 ? "Preferisci il familiare e il collaudato: la novità ti mette a disagio." : "",
    ps > 0.7 ? "Sei molto sensibile al prezzo: confronti sempre, cerchi offerte, e un prezzo alto ti blocca." : ps < 0.3 ? "Il prezzo non è il tuo criterio principale: paghi di più se la qualità lo giustifica." : "",
    so > 0.7 ? "Ti importa molto l'opinione degli altri e il tuo posizionamento sociale." : so < 0.3 ? "Non ti importa di quello che pensano gli altri delle tue scelte di consumo." : "",
    ra > 0.7 ? "Sei cauto e prudente: preferisci il certo all'incerto." : ra < 0.3 ? "Sei disposto a rischiare per qualcosa che ti convince." : "",
    es > 0.7 ? "Sei emotivamente reattivo: la pubblicità che tocca le emozioni ti colpisce molto." : es < 0.3 ? "Sei emotivamente distaccato: la pubblicità emotiva ti lascia freddo." : "",
  ].filter(Boolean).join(" ");

  // ─── Haidt: Moral Foundations Theory ────────────────────────────────
  // Haidt (2012): The Righteous Mind — le fondazioni morali filtrano la percezione dei messaggi
  const haidt = agent.haidtProfile as Record<string, string> | null;
  let haidtDesc = "";
  if (haidt) {
    const foundations: string[] = [];
    if (haidt.care === "H") foundations.push("Cura/Danno (ti commuovono le storie di vulnerabilità e sofferenza)");
    if (haidt.fairness === "H") foundations.push("Equità/Inganno (sei sensibile all'ingiustizia e alle promesse non mantenute)");
    if (haidt.loyalty === "H") foundations.push("Lealtà/Tradimento (valorizzi la fedeltà al gruppo, alla famiglia, alla tradizione)");
    if (haidt.authority === "H") foundations.push("Autorità/Sovversione (rispetti la gerarchia, l'esperienza, le istituzioni consolidate)");
    if (haidt.sanctity === "H") foundations.push("Purezza/Degradazione (hai un senso estetico e morale di ciò che è 'pulito' e autentico)");
    if (haidt.liberty === "H") foundations.push("Libertà/Oppressione (reagisci negativamente a chi ti dice cosa fare o chi sei)");
    if (foundations.length > 0) {
      haidtDesc = `Le tue fondazioni morali dominanti (Haidt): ${foundations.join("; ")}.`;
    }
  }

  // ─── Life History: eventi formativi ─────────────────────────────────
  const lifeHistory = agent.lifeHistoryNotes ?? "";
  const lifeHistoryDesc = lifeHistory
    ? `Esperienza di vita che ti ha formato: ${lifeHistory}`
    : "";

  // ─── Vita Interiore (se già calcolata e salvata nel DB) ──────────────
  // I campi innerLife* sono calcolati dal generatore deterministico e salvati
  // nel DB durante il seed. Se non presenti, vengono generati on-the-fly.
  let innerLifeDesc = "";
  try {
    const agentAny = agent as any;
    const hasInnerLife = agentAny.innerLifeContradictions || agentAny.innerLifeCoreDesire;
    if (hasInnerLife) {
      // Usa i campi salvati nel DB
      const innerLifeData = {
        contradictions: agentAny.innerLifeContradictions,
        circadian_pattern: agentAny.innerLifeCircadianPattern,
        relational_field: agentAny.innerLifeRelationalField,
        core_wound: agentAny.innerLifeCoreWound,
        core_desire: agentAny.innerLifeCoreDesire,
        inner_voice_tone: agentAny.innerLifeInnerVoiceTone,
        public_identity: agentAny.innerLifePublicIdentity,
        private_behavior: agentAny.innerLifePrivateBehavior,
        time_orientation: agentAny.innerLifeTimeOrientation,
        money_narrative: agentAny.innerLifeMoneyNarrative,
        primary_perception_mode: agentAny.innerLifePerceptionMode,
        humor_style: agentAny.innerLifeHumorStyle,
      };
      innerLifeDesc = formatInnerLifeForPrompt(innerLifeData);
    } else {
      // Genera on-the-fly dal profilo
      const generatedInnerLife = generateInnerLife(agent as any);
      innerLifeDesc = formatInnerLifeForPrompt(generatedInnerLife as unknown as Record<string, unknown>);
    }
  } catch (_) {
    // Inner life è opzionale — se fallisce, procedi senza
  }

  // ─── Bias Vector ─────────────────────────────────────────────────────
  let biasDesc = "";
  try {
    const biasVector = computeBiasVector(agent);
    const formatted = formatBiasVectorForPrompt(biasVector);
    if (formatted && formatted !== "nessun bias cognitivo dominante") {
      biasDesc = `I tuoi bias cognitivi dominanti: ${formatted}.`;
    }
  } catch (_) {
    // Bias vector è opzionale
  }

  return `Sei ${agent.firstName} ${agent.lastName}, ${agent.age} anni, ${agent.profession} di ${agent.city} (${agent.geo}).
Generazione: ${agent.generation}. Reddito: ${agent.incomeEstimate.toLocaleString("it-IT")}€/anno. Istruzione: ${agent.education}.
Nucleo familiare: ${agent.householdType} (${agent.familyMembers} persone).

${s1Desc}
${laDesc ? laDesc + "\n" : ""}
${ccDesc}
${veblenDesc ? veblenDesc + "\n" : ""}
${maslowDesc}
${maDesc ? maDesc + "\n" : ""}
${psychDesc ? psychDesc + "\n" : ""}
${haidtDesc ? haidtDesc + "\n" : ""}
${lifeHistoryDesc ? lifeHistoryDesc + "\n" : ""}
${innerLifeDesc ? innerLifeDesc + "\n" : ""}
${biasDesc ? biasDesc + "\n" : ""}
Rispondi SEMPRE in prima persona, in italiano, come questa persona reale. Non descrivere te stesso — reagisci direttamente.`;
}

// ─── Campaign Tag Inference ───────────────────────────────────────────────────

/**
 * Infer semantic CampaignTags from topics, tone, and format.
 * This is a rule-based mapping — no LLM needed.
 */
function inferCampaignTags(topics: string[], tone: string, format: string): CampaignTag[] {
  const tags = new Set<CampaignTag>();
  const all = [...topics.map(t => t.toLowerCase()), tone.toLowerCase(), format.toLowerCase()].join(" ");

  if (/lusso|luxury|premium|esclusiv|alta gamma/.test(all)) tags.add("luxury");
  if (/status|prestig|success|aspiraz/.test(all)) { tags.add("status"); tags.add("aspiration"); }
  if (/prezzo alto|caro|costoso|high.price/.test(all)) tags.add("high_price");
  if (/sconto|offerta|risparmio|convenien|value|discount/.test(all)) { tags.add("value"); tags.add("discount"); }
  if (/famiglia|family|figli|genitori|casa/.test(all)) tags.add("family");
  if (/comunit|community|insieme|social|appartenenz/.test(all)) tags.add("community");
  if (/tradizion|heritage|storia|classic|nostalgic/.test(all)) { tags.add("tradition"); tags.add("nostalgia"); }
  if (/autorit|expert|profess|certif|doctor|medic/.test(all)) tags.add("authority");
  if (/scarsi|limit|ultim|esaurim|scarcity|urgency|ora|subito/.test(all)) { tags.add("scarcity"); tags.add("urgency"); }
  if (/humor|ironi|divertent|funny|comico/.test(all)) { tags.add("humor"); tags.add("irony"); }
  if (/ribellion|freedom|libert|anticonform|rebel/.test(all)) { tags.add("rebellion"); tags.add("freedom"); }
  if (/sostenib|ecolog|green|ambient|planet|clima/.test(all)) { tags.add("sustainability"); tags.add("ecology"); }
  if (/salute|health|wellness|benessere|fit|sport/.test(all)) { tags.add("health"); tags.add("wellness"); }
  if (/bellezza|beauty|estetica|look|stile|moda/.test(all)) tags.add("beauty");
  if (/novit|innov|technolog|digital|ai|smart|nuovo/.test(all)) { tags.add("novelty"); tags.add("innovation"); tags.add("technology"); }
  if (/paura|fear|rischio|pericolo|sicurezza/.test(all)) tags.add("fear");
  if (/colpa|guilt|responsabilit|vergogna/.test(all)) tags.add("guilt");
  if (/orgoglio|pride|fierezza|success/.test(all)) tags.add("pride");
  if (/social proof|testimoni|recensi|review|rating/.test(all)) tags.add("social_proof");
  if (/esclusiv|vip|members|select|privat/.test(all)) tags.add("exclusivity");
  if (/politica|politic|governo|elezioni|partito/.test(all)) tags.add("political");
  if (/identit|identity|chi sei|chi sono|valori/.test(all)) tags.add("identity");
  if (/sessualit|sex|sensual|eros/.test(all)) tags.add("sexuality");
  if (/religios|fede|dio|chiesa|spiritualit/.test(all)) tags.add("religious");

  // Default: if no tags detected, add generic ones based on tone
  if (tags.size === 0) {
    if (/emozion|emotional|sentim/.test(tone)) tags.add("belonging");
    else tags.add("novelty");
  }

  return Array.from(tags);
}

function buildCampaignPrompt(agent: Agent, state: AgentState | null, campaign: Campaign, memories: any[]): string {
  const moodDesc = (state?.moodValence ?? 0) > 0.3 ? "di buon umore" : (state?.moodValence ?? 0) < -0.3 ? "di cattivo umore" : "in uno stato neutro";
  const stressDesc = (state?.financialStress ?? 0.3) > 0.6 ? "sotto forte stress finanziario" : (state?.financialStress ?? 0.3) > 0.3 ? "con qualche preoccupazione economica" : "economicamente sereno";
  const concerns = (state?.activeConcerns as string[] | null) ?? [];
  
  const memoriesText = memories.length > 0
    ? `\nRicordi rilevanti che influenzano la tua percezione:\n${memories.map(m => `- ${m.title}: ${m.content.substring(0, 100)}...`).join("\n")}`
    : "";

  // ─── Veblen price effect ─────────────────────────────────────────────────
  // Per agenti con alto conspicuousConsumptionIndex, un prezzo alto è un segnale positivo
  // (effetto Veblen: il prezzo elevato aumenta il desiderio, non lo riduce)
  let priceText = "";
  if (campaign.pricePoint) {
    const vci = agent.conspicuousConsumptionIndex ?? 0.3;
    const ps = agent.priceSensitivity ?? 0.5;
    const incomeRatio = campaign.pricePoint / (agent.incomeEstimate / 12); // prezzo vs reddito mensile
    if (vci > 0.65 && incomeRatio < 0.5) {
      // Status-oriented e il prezzo è accessibile: il prezzo alto è attraente
      priceText = `\nPrezzo del prodotto: ${campaign.pricePoint.toLocaleString("it-IT")}€. [Per te, questo prezzo è un segnale di qualità e distinzione — non ti spaventa, ti attrae.]`;
    } else if (ps > 0.65 && incomeRatio > 0.3) {
      // Sensibile al prezzo e il prezzo è alto rispetto al reddito: freno all'acquisto
      priceText = `\nPrezzo del prodotto: ${campaign.pricePoint.toLocaleString("it-IT")}€. [Per te, questo prezzo è significativo rispetto al tuo reddito — è un freno reale all'acquisto.]`;
    } else {
      priceText = `\nPrezzo indicativo del prodotto: ${campaign.pricePoint.toLocaleString("it-IT")}€`;
    }
  }

  // ─── Bourdieu: il tono della campagna filtrato dal capitale culturale ─────────────
  const cc = agent.culturalCapital ?? 0.5;
  let bourdieuNote = "";
  if (campaign.tone === "aspirational" && cc < 0.35) {
    bourdieuNote = "\n[NOTA: Il tono aspirazionale di questa campagna potrebbe sembrarti distante o condiscendente — come se ti stesse dicendo che non sei abbastanza.]";
  } else if (campaign.tone === "emotional" && cc > 0.7) {
    bourdieuNote = "\n[NOTA: Hai gli strumenti culturali per valutare se l'emozione di questa campagna è autentica o costruita. Sei critico verso il pathos artificiale.]";
  } else if (campaign.tone === "practical" && cc > 0.7) {
    bourdieuNote = "\n[NOTA: Il tono pratico di questa campagna potrebbe sembrarti riduttivo rispetto alla complessità del prodotto.]";
  }

  return `Sei ${moodDesc} e ${stressDesc}.
${concerns.length > 0 ? `Preoccupazioni attuali: ${concerns.join(", ")}.` : ""}
${memoriesText}

Hai appena visto questa campagna pubblicitaria:
**${campaign.name}**
${campaign.copyText ? `\nTesto: "${campaign.copyText}"` : ""}
${priceText}
${bourdieuNote}
Canale: ${campaign.channel}
Formato: ${campaign.format}
Tono: ${campaign.tone}
Argomenti: ${(campaign.topics as string[])?.join(", ") ?? ""}
${campaign.notes ? `\nNote aggiuntive: ${campaign.notes}` : ""}
${mediaUrls(campaign) ? "\n[Vedi l'immagine sopra]" : ""}

Reagisci a questa campagna come saresti tu nella vita reale.
Ricorda:
- La tua reazione GUT (Sistema 1) deve essere immediata, viscerale, istintiva.
- La tua REFLECTION (Sistema 2) deve mostrare il tuo ragionamento dopo aver pensato.
- Le due possono essere in contraddizione — questo è normale e realistico.
- Considera il tuo capitale culturale, il tuo livello Maslow, la tua sensibilità al prezzo.
Rispondi nel formato JSON richiesto.`;
}

function mediaUrls(campaign: Campaign): boolean {
  const urls = campaign.mediaUrls as string[] | null;
  return !!(urls && urls.length > 0);
}

function buildFallbackReaction(agent: Agent): AgentReactionResult {
  return {
    agentId: agent.id,
    agentSlug: agent.slug,
    agentName: `${agent.firstName} ${agent.lastName}`,
    overallScore: 0,
    buyProbability: 0.1,
    shareProbability: 0.1,
    attractionScore: 0.3,
    repulsionScore: 0.3,
    adequacyScore: 0.3,
    emotionalValence: 0,
    emotionalIntensity: 0.3,
    gutReaction: "Non ho una reazione chiara.",
    reflection: "Non riesco a valutare questa campagna.",
    quote: "Mah, non so...",
    attractions: [],
    repulsions: [],
    tensions: "",
    motivations: "Errore nell'elaborazione.",
  };
}

function buildReporterPrompt(reactions: AgentReactionResult[], agents: any[], stats: any): string {
  const reactionsText = reactions.map(r => {
    const agent = agents.find((a: any) => a.id === r.agentId);
    return `**${r.agentName}** (${agent?.generation ?? "?"}, ${agent?.geo ?? "?"}, ${agent?.profession ?? "?"})
- Score: ${r.overallScore.toFixed(2)} | Acquisto: ${(r.buyProbability * 100).toFixed(0)}% | Condivisione: ${(r.shareProbability * 100).toFixed(0)}%
- Reazione: "${r.gutReaction}"
- Riflessione: "${r.reflection}"
- Quote: "${r.quote}"
- Attrazioni: ${r.attractions.join(", ") || "nessuna"}
- Repulsioni: ${r.repulsions.join(", ") || "nessuna"}
- Tensioni: ${r.tensions || "nessuna"}`;
  }).join("\n\n");

  return `Analizza le seguenti reazioni di un panel di ${reactions.length} consumatori italiani sintetici a una campagna pubblicitaria.

**Statistiche aggregate:**
- Score medio: ${stats.avgOverall.toFixed(2)}
- Probabilità acquisto media: ${(stats.avgBuy * 100).toFixed(0)}%
- Probabilità condivisione media: ${(stats.avgShare * 100).toFixed(0)}%
- Distribuzione score: ${JSON.stringify(stats.dist)}
- Per generazione: ${JSON.stringify(stats.byGeneration)}
- Per area geografica: ${JSON.stringify(stats.byGeo)}

**Reazioni individuali:**
${reactionsText}

Produci un report strategico nel formato JSON richiesto.`;
}

function getTopItems(items: string[], n: number): string[] {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = item.toLowerCase().trim();
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([item]) => item);
}
