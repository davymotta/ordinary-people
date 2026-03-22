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
import type { Agent, AgentState, Campaign } from "../drizzle/schema";

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
  onProgress?: (progress: CampaignTestProgress) => void
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

      const result = await processAgentCampaignReaction(agent, state, campaign, memories);

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
  memories: any[]
): Promise<AgentReactionResult> {
  const systemPrompt = agent.systemPrompt ?? buildFallbackSystemPrompt(agent);
  const userPrompt = buildCampaignPrompt(agent, state, campaign, memories);

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
    const response = await invokeLLM({
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

    const reportResponse = await invokeLLM({
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
  return `Sei ${agent.firstName} ${agent.lastName}, ${agent.age} anni, ${agent.profession} di ${agent.city}.
Generazione: ${agent.generation}. Reddito: ${agent.incomeEstimate.toLocaleString("it-IT")}€/anno.
Rispondi sempre in prima persona, in italiano, come questa persona reale.`;
}

function buildCampaignPrompt(agent: Agent, state: AgentState | null, campaign: Campaign, memories: any[]): string {
  const moodDesc = (state?.moodValence ?? 0) > 0.3 ? "di buon umore" : (state?.moodValence ?? 0) < -0.3 ? "di cattivo umore" : "in uno stato neutro";
  const stressDesc = (state?.financialStress ?? 0.3) > 0.6 ? "sotto forte stress finanziario" : (state?.financialStress ?? 0.3) > 0.3 ? "con qualche preoccupazione economica" : "economicamente sereno";
  const concerns = (state?.activeConcerns as string[] | null) ?? [];
  
  const memoriesText = memories.length > 0
    ? `\nRicordi rilevanti che influenzano la tua percezione:\n${memories.map(m => `- ${m.title}: ${m.content.substring(0, 100)}...`).join("\n")}`
    : "";

  const priceText = campaign.pricePoint
    ? `\nPrezzo indicativo del prodotto: ${campaign.pricePoint.toLocaleString("it-IT")}€`
    : "";

  return `Sei ${moodDesc} e ${stressDesc}.
${concerns.length > 0 ? `Preoccupazioni attuali: ${concerns.join(", ")}.` : ""}
${memoriesText}

Hai appena visto questa campagna pubblicitaria:
**${campaign.name}**
${campaign.copyText ? `\nTesto: "${campaign.copyText}"` : ""}
${priceText}
Canale: ${campaign.channel}
Formato: ${campaign.format}
Tono: ${campaign.tone}
Argomenti: ${(campaign.topics as string[])?.join(", ") ?? ""}
${campaign.notes ? `\nNote aggiuntive: ${campaign.notes}` : ""}
${mediaUrls(campaign) ? "\n[Vedi l'immagine sopra]" : ""}

Reagisci a questa campagna come saresti tu nella vita reale. Considera il tuo carattere, la tua situazione economica, i tuoi valori, i tuoi ricordi.
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
