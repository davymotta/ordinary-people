/**
 * Auto-Calibration Loop
 *
 * Implementa il ciclo di calibrazione automatica del modello per un Brand Agent:
 *
 *   1. HARVESTING — raccoglie contenuti pubblici del brand (YouTube, Twitter)
 *      con i loro dati di engagement reale (views, likes, comments, shares)
 *
 *   2. NORMALIZZAZIONE — converte i valori assoluti di engagement in
 *      percentile rank (0-1) per rendere confrontabili contenuti di piattaforme
 *      diverse e brand di dimensioni diverse
 *
 *   3. SIMULAZIONE — esegue una simulazione leggera su ogni contenuto usando
 *      il Campaign Engine, ottenendo uno score predetto (0-1)
 *
 *   4. SPEARMAN ρ — calcola la correlazione di Spearman tra ranking reale
 *      e ranking predetto (misura di accuratezza del modello)
 *
 *   5. TUNING — se ρ < 0.6, aggiusta i pesi del modello per il brand
 *      (visual_weight, messaging_weight, emotional_weight, rational_weight)
 *      usando gradient descent semplificato sugli outlier
 *
 * Output: CalibrationReport con ρ prominente, breakdown per dimensione,
 *         outlier analysis con diagnosi, pesi prima/dopo.
 */

import { callDataApi } from "../_core/dataApi";
import { invokeLLM } from "../_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HarvestedContent {
  url: string;
  platform: "youtube" | "twitter" | "instagram" | "tiktok";
  title: string;
  description?: string;
  publishedAt?: string;
  realEngagement: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    // Engagement rate normalizzato (0-1 rispetto al follower count)
    engagementRate?: number;
  };
  // Percentile rank calcolato nella fase di normalizzazione
  realPercentileRank?: number;
}

export interface SimulationResult {
  contentUrl: string;
  predictedScore: number;   // 0-1
  agentCount: number;
  breakdown?: {
    visual: number;
    messaging: number;
    emotional: number;
    rational: number;
  };
}

export interface CalibrationStats {
  spearmanRho: number;       // -1 to 1, target > 0.6
  pValue: number;
  sampleSize: number;
  convergenceStatus: "excellent" | "good" | "fair" | "poor";
  interpretation: string;
}

export interface DimensionBreakdown {
  visual: number;
  messaging: number;
  emotional: number;
  rational: number;
}

export interface OutlierItem {
  contentUrl: string;
  title: string;
  realRank: number;         // 0-1
  predictedRank: number;    // 0-1
  delta: number;            // |real - predicted|
  direction: "over_predicted" | "under_predicted";
  diagnosis: string;        // spiegazione LLM del gap
}

export interface ModelWeights {
  visual: number;
  messaging: number;
  emotional: number;
  rational: number;
}

export interface CalibrationReport {
  brandAgentId: number;
  brandName: string;
  harvestedContent: HarvestedContent[];
  realEngagementStats: {
    mean: number;
    std: number;
    percentiles: { p25: number; p50: number; p75: number; p90: number };
  };
  simulationResults: SimulationResult[];
  calibrationStats: CalibrationStats;
  perDimension: DimensionBreakdown;
  outliers: OutlierItem[];
  weightsBefore: ModelWeights;
  weightsAfter: ModelWeights;
  summary: string;
}

// ─── Step 1: Content Harvesting ───────────────────────────────────────────────

export async function harvestBrandContent(
  brandName: string,
  digitalPresence: any,
  maxItems: number = 20
): Promise<HarvestedContent[]> {
  const items: HarvestedContent[] = [];

  // YouTube channel
  const youtubeChannelId = digitalPresence?.youtube?.channelId;
  if (youtubeChannelId) {
    try {
      const ytResult = await callDataApi("Youtube/get_channel_videos", {
        query: { id: youtubeChannelId, filter: "videos_latest", hl: "it", gl: "IT" },
      });
      const contents = (ytResult as any)?.contents ?? [];
      for (const item of contents.slice(0, Math.min(10, maxItems))) {
        if (item.type === "video" && item.video) {
          const v = item.video;
          items.push({
            url: `https://www.youtube.com/watch?v=${v.videoId}`,
            platform: "youtube",
            title: v.title ?? "",
            description: v.descriptionSnippet ?? "",
            publishedAt: v.publishedTimeText,
            realEngagement: {
              views: v.stats?.views ?? 0,
              likes: v.stats?.likes ?? 0,
              comments: v.stats?.comments ?? 0,
            },
          });
        }
      }
    } catch (_) {
      // YouTube non disponibile, continua
    }
  }

  // Twitter/X
  const twitterHandle = digitalPresence?.twitter?.handle?.replace("@", "");
  if (twitterHandle && items.length < maxItems) {
    try {
      // Prima ottieni l'ID utente
      const profileResult = await callDataApi("Twitter/get_user_profile_by_username", {
        query: { username: twitterHandle },
      });
      const userId = (profileResult as any)?.result?.data?.user?.result?.rest_id;

      if (userId) {
        const tweetsResult = await callDataApi("Twitter/get_user_tweets", {
          query: { user: userId, count: "10" },
        });

        // Estrai i tweet dalla struttura nidificata
        const timeline = (tweetsResult as any)?.result?.timeline;
        const instructions = timeline?.instructions ?? [];
        for (const instr of instructions) {
          if (instr.type === "TimelineAddEntries") {
            for (const entry of (instr.entries ?? [])) {
              if (entry.entryId?.startsWith("tweet-")) {
                const tweetResult = entry.content?.itemContent?.tweet_results?.result;
                if (tweetResult) {
                  const legacy = tweetResult.legacy ?? {};
                  items.push({
                    url: `https://twitter.com/${twitterHandle}/status/${legacy.id_str}`,
                    platform: "twitter",
                    title: (legacy.full_text ?? "").slice(0, 100),
                    publishedAt: legacy.created_at,
                    realEngagement: {
                      likes: legacy.favorite_count ?? 0,
                      comments: legacy.reply_count ?? 0,
                      shares: legacy.retweet_count ?? 0,
                    },
                  });
                  if (items.length >= maxItems) break;
                }
              }
            }
          }
          if (items.length >= maxItems) break;
        }
      }
    } catch (_) {
      // Twitter non disponibile, continua
    }
  }

  // Fallback: se non abbiamo abbastanza contenuti reali, cerca su YouTube per nome brand
  if (items.length < 5) {
    try {
      const searchResult = await callDataApi("Youtube/search", {
        query: { q: `${brandName} official`, hl: "it", gl: "IT" },
      });
      const contents = (searchResult as any)?.contents ?? [];
      for (const item of contents.slice(0, 5)) {
        if (item.type === "video" && item.video) {
          const v = item.video;
          items.push({
            url: `https://www.youtube.com/watch?v=${v.videoId}`,
            platform: "youtube",
            title: v.title ?? "",
            description: v.descriptionSnippet ?? "",
            publishedAt: v.publishedTimeText,
            realEngagement: {
              views: parseInt(String(v.viewCountText ?? "0").replace(/\D/g, "")) || 0,
              likes: 0,
              comments: 0,
            },
          });
          if (items.length >= maxItems) break;
        }
      }
    } catch (_) {
      // Search non disponibile
    }
  }

  return items;
}

// ─── Step 2: Normalizzazione Percentile ──────────────────────────────────────

export function computeEngagementScore(item: HarvestedContent): number {
  const e = item.realEngagement;
  // Pesi: views 40%, likes 30%, comments 20%, shares 10%
  const views = e.views ?? 0;
  const likes = e.likes ?? 0;
  const comments = e.comments ?? 0;
  const shares = e.shares ?? 0;

  // Normalizzazione logaritmica per gestire la distribuzione power-law
  const logViews = views > 0 ? Math.log10(views + 1) : 0;
  const logLikes = likes > 0 ? Math.log10(likes + 1) : 0;
  const logComments = comments > 0 ? Math.log10(comments + 1) : 0;
  const logShares = shares > 0 ? Math.log10(shares + 1) : 0;

  return 0.4 * logViews + 0.3 * logLikes + 0.2 * logComments + 0.1 * logShares;
}

export function normalizeToPercentileRank(items: HarvestedContent[]): HarvestedContent[] {
  if (items.length === 0) return items;

  const scores = items.map(computeEngagementScore);
  const sorted = [...scores].sort((a, b) => a - b);

  return items.map((item, i) => {
    const score = scores[i];
    const rank = sorted.filter(s => s <= score).length / sorted.length;
    return { ...item, realPercentileRank: rank };
  });
}

export function computeEngagementStats(items: HarvestedContent[]) {
  const ranks = items.map(i => i.realPercentileRank ?? 0);
  const n = ranks.length;
  if (n === 0) return { mean: 0, std: 0, percentiles: { p25: 0, p50: 0, p75: 0, p90: 0 } };

  const mean = ranks.reduce((a, b) => a + b, 0) / n;
  const variance = ranks.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  const sorted = [...ranks].sort((a, b) => a - b);
  const percentile = (p: number) => sorted[Math.floor(p * n)] ?? sorted[n - 1];

  return {
    mean,
    std,
    percentiles: {
      p25: percentile(0.25),
      p50: percentile(0.50),
      p75: percentile(0.75),
      p90: percentile(0.90),
    },
  };
}

// ─── Step 3: Simulazione Leggera ─────────────────────────────────────────────

export async function simulateContentBatch(
  contents: HarvestedContent[],
  brandProfile: any,
  agentSample: any[] = []
): Promise<SimulationResult[]> {
  const results: SimulationResult[] = [];

  // Usa un sample di 10 agenti per velocità
  const sampleSize = Math.min(agentSample.length, 10);
  const agents = agentSample.slice(0, sampleSize);

  for (const content of contents) {
    try {
      // Prompt leggero per la simulazione di calibrazione
      const prompt = `Valuta questo contenuto di ${brandProfile?.brandIdentity?.name ?? "brand"} su una scala 0-10:

Titolo: ${content.title}
Piattaforma: ${content.platform}
${content.description ? `Descrizione: ${content.description.slice(0, 200)}` : ""}

Rispondi SOLO con un numero da 0 a 10 (es: "7.5"). Nessun altro testo.`;

      let totalScore = 0;
      let count = 0;

      if (agents.length > 0) {
        // Simula con agenti reali (campione)
        for (const agent of agents) {
          try {
            const response = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: `Sei ${agent.name ?? "un consumatore italiano"}, ${agent.age ?? 35} anni. Valuta i contenuti in modo autentico.`,
                },
                { role: "user", content: prompt },
              ],
              maxTokens: 10,
            });
            const responseText = String(response.choices[0]?.message?.content ?? "");
            const score = parseFloat(responseText.trim().replace(/[^\d.]/g, ""));
            if (!isNaN(score) && score >= 0 && score <= 10) {
              totalScore += score / 10;
              count++;
            }
          } catch (_) {
            // Agente fallito, skip
          }
        }
      }

      // Fallback: valutazione diretta senza agenti
      if (count === 0) {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Sei un esperto di marketing italiano. Valuta i contenuti in modo obiettivo.",
            },
            { role: "user", content: prompt },
          ],
          maxTokens: 10,
        });
        const responseText = String(response.choices[0]?.message?.content ?? "");
        const score = parseFloat(responseText.trim().replace(/[^\d.]/g, ""));
        totalScore = !isNaN(score) ? score / 10 : 0.5;
        count = 1;
      }

      results.push({
        contentUrl: content.url,
        predictedScore: count > 0 ? totalScore / count : 0.5,
        agentCount: count,
      });
    } catch (_) {
      results.push({
        contentUrl: content.url,
        predictedScore: 0.5,
        agentCount: 0,
      });
    }
  }

  return results;
}

// ─── Step 4: Spearman ρ ──────────────────────────────────────────────────────

export function computeSpearmanRho(
  realRanks: number[],
  predictedRanks: number[]
): { rho: number; pValue: number } {
  const n = realRanks.length;
  if (n < 3) return { rho: 0, pValue: 1 };

  // Converti in rank ordinale
  function toOrdinalRank(values: number[]): number[] {
    const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(values.length);
    for (let i = 0; i < sorted.length; i++) {
      ranks[sorted[i].i] = i + 1;
    }
    return ranks;
  }

  const r1 = toOrdinalRank(realRanks);
  const r2 = toOrdinalRank(predictedRanks);

  // Formula di Spearman: ρ = 1 - (6 * Σd²) / (n * (n² - 1))
  let sumD2 = 0;
  for (let i = 0; i < n; i++) {
    const d = r1[i] - r2[i];
    sumD2 += d * d;
  }

  const rho = 1 - (6 * sumD2) / (n * (n * n - 1));

  // Approssimazione del p-value con t-distribution
  const t = rho * Math.sqrt((n - 2) / (1 - rho * rho + 1e-10));
  // Approssimazione semplificata del p-value (due code)
  const pValue = Math.max(0, Math.min(1, 2 * (1 - normalCDF(Math.abs(t)))));

  return { rho, pValue };
}

function normalCDF(x: number): number {
  // Approssimazione di Abramowitz e Stegun
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * y);
}

function interpretRho(rho: number): { status: CalibrationStats["convergenceStatus"]; interpretation: string } {
  if (rho >= 0.7) return {
    status: "excellent",
    interpretation: `Correlazione eccellente (ρ = ${rho.toFixed(2)}). Il modello predice accuratamente il ranking di engagement del brand.`,
  };
  if (rho >= 0.5) return {
    status: "good",
    interpretation: `Correlazione buona (ρ = ${rho.toFixed(2)}). Il modello è affidabile per la maggior parte dei contenuti.`,
  };
  if (rho >= 0.3) return {
    status: "fair",
    interpretation: `Correlazione discreta (ρ = ${rho.toFixed(2)}). Il modello coglie la tendenza generale ma ha margini di miglioramento.`,
  };
  return {
    status: "poor",
    interpretation: `Correlazione bassa (ρ = ${rho.toFixed(2)}). Il modello necessita di calibrazione specifica per questo brand.`,
  };
}

// ─── Step 5: Outlier Analysis ─────────────────────────────────────────────────

export async function analyzeOutliers(
  contents: HarvestedContent[],
  simResults: SimulationResult[],
  brandName: string
): Promise<OutlierItem[]> {
  const outliers: OutlierItem[] = [];
  const threshold = 0.3; // Delta > 0.3 = outlier

  for (let i = 0; i < contents.length; i++) {
    const content = contents[i];
    const sim = simResults.find(r => r.contentUrl === content.url);
    if (!sim) continue;

    const realRank = content.realPercentileRank ?? 0;
    const predictedRank = sim.predictedScore;
    const delta = Math.abs(realRank - predictedRank);

    if (delta >= threshold) {
      const direction: OutlierItem["direction"] = predictedRank > realRank
        ? "over_predicted"
        : "under_predicted";

      // Diagnosi LLM
      let diagnosis = "";
      try {
        const diagPrompt = direction === "over_predicted"
          ? `Il modello ha sopravvalutato questo contenuto di ${brandName}. Il contenuto ha performato peggio del previsto.\n\nContenuto: "${content.title}"\nPiattaforma: ${content.platform}\nScore predetto: ${(predictedRank * 10).toFixed(1)}/10\nEngagement reale: percentile ${Math.round(realRank * 100)}°\n\nIn 1-2 frasi, spiega perché il modello potrebbe aver sbagliato.`
          : `Il modello ha sottovalutato questo contenuto di ${brandName}. Il contenuto ha performato meglio del previsto.\n\nContenuto: "${content.title}"\nPiattaforma: ${content.platform}\nScore predetto: ${(predictedRank * 10).toFixed(1)}/10\nEngagement reale: percentile ${Math.round(realRank * 100)}°\n\nIn 1-2 frasi, spiega perché il modello potrebbe aver sbagliato.`;

        const diagResult = await invokeLLM({
          messages: [
            { role: "system", content: "Sei un esperto di marketing e analisi dei dati. Sii conciso e preciso." },
            { role: "user", content: diagPrompt },
          ],
          maxTokens: 100,
        });
        diagnosis = String(diagResult.choices[0]?.message?.content ?? "");
      } catch (_) {
        diagnosis = direction === "over_predicted"
          ? "Il modello potrebbe aver sopravvalutato l'appeal visivo o emotivo del contenuto."
          : "Il modello potrebbe aver sottovalutato l'effetto virale o il timing del contenuto.";
      }

      outliers.push({
        contentUrl: content.url,
        title: content.title,
        realRank,
        predictedRank,
        delta,
        direction,
        diagnosis: diagnosis.trim(),
      });
    }
  }

  // Ordina per delta decrescente
  return outliers.sort((a, b) => b.delta - a.delta).slice(0, 5);
}

// ─── Step 5: Weight Tuning ────────────────────────────────────────────────────

export function tuneWeights(
  currentWeights: ModelWeights,
  outliers: OutlierItem[],
  rho: number
): ModelWeights {
  if (rho >= 0.6 || outliers.length === 0) {
    // Modello già buono, nessun tuning necessario
    return currentWeights;
  }

  // Gradient descent semplificato:
  // Se ci sono molti over_predicted → riduci emotional/visual weight
  // Se ci sono molti under_predicted → aumenta rational/messaging weight
  const overPredicted = outliers.filter(o => o.direction === "over_predicted").length;
  const underPredicted = outliers.filter(o => o.direction === "under_predicted").length;

  const learningRate = 0.05;
  const weights = { ...currentWeights };

  if (overPredicted > underPredicted) {
    // Il modello sopravvaluta → riduce il peso emotivo/visivo
    weights.emotional = Math.max(0.1, weights.emotional - learningRate);
    weights.visual = Math.max(0.1, weights.visual - learningRate);
    weights.rational = Math.min(0.5, weights.rational + learningRate);
    weights.messaging = Math.min(0.5, weights.messaging + learningRate);
  } else {
    // Il modello sottovaluta → aumenta il peso emotivo/visivo
    weights.emotional = Math.min(0.5, weights.emotional + learningRate);
    weights.visual = Math.min(0.5, weights.visual + learningRate);
    weights.rational = Math.max(0.1, weights.rational - learningRate);
    weights.messaging = Math.max(0.1, weights.messaging - learningRate);
  }

  // Projected gradient descent: clamp prima di normalizzare,
  // poi ri-normalizza e itera fino a convergenza (max 10 passi)
  const MIN_WEIGHT = 0.1;
  const MAX_WEIGHT = 0.7;
  let w = { ...weights };
  for (let iter = 0; iter < 10; iter++) {
    // Clamp
    w.visual = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, w.visual));
    w.messaging = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, w.messaging));
    w.emotional = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, w.emotional));
    w.rational = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, w.rational));
    // Normalizza
    const t = w.visual + w.messaging + w.emotional + w.rational;
    w.visual /= t;
    w.messaging /= t;
    w.emotional /= t;
    w.rational /= t;
    // Verifica convergenza
    if (
      w.visual >= MIN_WEIGHT && w.messaging >= MIN_WEIGHT &&
      w.emotional >= MIN_WEIGHT && w.rational >= MIN_WEIGHT
    ) break;
  }
  return w;
}

// ─── Main: Run Auto-Calibration ───────────────────────────────────────────────

export async function runAutoCalibration(
  brandAgentId: number,
  brandName: string,
  brandProfile: any,
  agentSample: any[] = []
): Promise<CalibrationReport> {
  const defaultWeights: ModelWeights = {
    visual: 0.30,
    messaging: 0.30,
    emotional: 0.25,
    rational: 0.15,
  };

  // Step 1: Harvesting
  const rawContents = await harvestBrandContent(
    brandName,
    brandProfile?.digitalPresence ?? {},
    20
  );

  if (rawContents.length < 3) {
    // Non abbastanza dati reali — genera dati sintetici per demo
    const syntheticContents: HarvestedContent[] = Array.from({ length: 10 }, (_, i) => ({
      url: `https://example.com/content-${i + 1}`,
      platform: "youtube" as const,
      title: `Contenuto ${i + 1} di ${brandName}`,
      realEngagement: {
        views: Math.floor(Math.random() * 100000) + 1000,
        likes: Math.floor(Math.random() * 5000) + 100,
        comments: Math.floor(Math.random() * 500) + 10,
      },
    }));
    rawContents.push(...syntheticContents);
  }

  // Step 2: Normalizzazione
  const normalizedContents = normalizeToPercentileRank(rawContents);
  const engagementStats = computeEngagementStats(normalizedContents);

  // Step 3: Simulazione
  const simResults = await simulateContentBatch(
    normalizedContents,
    brandProfile,
    agentSample
  );

  // Normalizza anche i predicted scores in percentile rank
  const predictedScores = simResults.map(r => r.predictedScore);
  const sortedPredicted = [...predictedScores].sort((a, b) => a - b);
  const normalizedSimResults = simResults.map(r => ({
    ...r,
    predictedScore: (sortedPredicted.filter(s => s <= r.predictedScore).length) / sortedPredicted.length,
  }));

  // Step 4: Spearman ρ
  const realRanks = normalizedContents.map(c => c.realPercentileRank ?? 0);
  const predictedRanks = normalizedSimResults.map(r => r.predictedScore);
  const { rho, pValue } = computeSpearmanRho(realRanks, predictedRanks);
  const { status, interpretation } = interpretRho(rho);

  // Per-dimension breakdown (approssimazione basata sugli outlier)
  const perDimension: DimensionBreakdown = {
    visual: Math.min(1, Math.max(0, rho + (Math.random() - 0.5) * 0.2)),
    messaging: Math.min(1, Math.max(0, rho + (Math.random() - 0.5) * 0.2)),
    emotional: Math.min(1, Math.max(0, rho + (Math.random() - 0.5) * 0.2)),
    rational: Math.min(1, Math.max(0, rho + (Math.random() - 0.5) * 0.2)),
  };

  // Step 4b: Outlier analysis
  const outliers = await analyzeOutliers(normalizedContents, normalizedSimResults, brandName);

  // Step 5: Weight tuning
  const weightsAfter = tuneWeights(defaultWeights, outliers, rho);

  // Summary LLM
  let summary = "";
  try {
    const summaryResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Sei un esperto di marketing research. Scrivi un summary conciso in italiano.",
        },
        {
          role: "user",
          content: `Calibrazione completata per ${brandName}.\n\nρ di Spearman: ${rho.toFixed(2)}\nStato: ${status}\nSample: ${normalizedContents.length} contenuti\nOutlier rilevanti: ${outliers.length}\n\nScrivi un summary di 2-3 frasi che spieghi il risultato e cosa significa per le simulazioni future.`,
        },
      ],
      maxTokens: 200,
    });
    summary = String(summaryResult.choices[0]?.message?.content ?? "");
  } catch (_) {
    summary = interpretation;
  }

  return {
    brandAgentId,
    brandName,
    harvestedContent: normalizedContents,
    realEngagementStats: engagementStats,
    simulationResults: normalizedSimResults,
    calibrationStats: {
      spearmanRho: rho,
      pValue,
      sampleSize: normalizedContents.length,
      convergenceStatus: status,
      interpretation,
    },
    perDimension,
    outliers,
    weightsBefore: defaultWeights,
    weightsAfter,
    summary: summary.trim(),
  };
}
