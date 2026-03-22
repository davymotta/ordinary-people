/**
 * GTE Simulator — genera score simulati deterministici per ogni post normalizzato.
 * Usato quando non si vuole eseguire la simulazione LLM completa (più veloce, per test/calibrazione iniziale).
 * La simulazione LLM completa è disponibile tramite campaign-engine.
 */

import { getDb } from "../db";
import { groundTruthPosts, groundTruthSimulations } from "../../drizzle/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { DEFAULT_SYSTEM_PARAMS } from "../scoring/system-params";

const AGENT_POOL_SIZE_DEFAULT = 10;

export interface SimulationResult {
  processed: number;
  skipped: number;
  total: number;
}

/**
 * Esegue la simulazione GTE per tutti i post normalizzati di un brand.
 * Genera score simulati deterministici basati sui metadati del post.
 * I post già simulati vengono saltati.
 */
export async function runGteSimulation(
  brandAgentId: number,
  agentPoolSize: number = AGENT_POOL_SIZE_DEFAULT,
): Promise<SimulationResult> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Carica post normalizzati
  const posts = await db
    .select()
    .from(groundTruthPosts)
    .where(and(
      eq(groundTruthPosts.brandAgentId, brandAgentId),
      isNotNull(groundTruthPosts.normComposite),
    ));

  if (posts.length === 0) {
    throw new Error("Nessun post normalizzato trovato. Esegui prima la normalizzazione.");
  }

  // Verifica simulazioni già esistenti
  const existingSims = await db
    .select({ postId: groundTruthSimulations.groundTruthPostId })
    .from(groundTruthSimulations)
    .where(eq(groundTruthSimulations.brandAgentId, brandAgentId));

  const simulatedPostIds = new Set(existingSims.map(s => s.postId));
  const postsToSimulate = posts.filter(p => !simulatedPostIds.has(p.id));

  if (postsToSimulate.length === 0) {
    return { processed: 0, skipped: posts.length, total: posts.length };
  }

  let processed = 0;

  for (const post of postsToSimulate) {
    const metrics = post.metrics48h as Record<string, number> | null;
    const views = metrics?.views ?? 0;
    const likes = metrics?.likes ?? 0;
    const comments = metrics?.comments ?? 0;
    const shares = metrics?.shares ?? 0;

    const captionLength = (post.caption ?? "").length;
    const isLongForm = captionLength > 300;

    // Engagement rate come proxy per la qualità del contenuto
    const engagementRate = views > 0 ? (likes + comments * 2 + shares * 3) / views : 0;
    const baseScore = Math.min(1, engagementRate * 50);

    // Simula panel di agenti con varianza deterministica
    const reactions: Array<{
      finalScore: number;
      scrolledPast: boolean;
      sharePropensity: number;
      rejectionScore: number;
      depthScore: number;
    }> = [];

    for (let a = 0; a < agentPoolSize; a++) {
      const seed = (post.id * 31 + a * 17) % 100 / 100;
      const noise = (seed - 0.5) * 0.4;
      const agentScore = Math.max(-1, Math.min(1, baseScore * 2 - 1 + noise));
      const scrolledPast = agentScore < -0.1 || (seed < 0.15 && agentScore < 0.3);

      reactions.push({
        finalScore: agentScore,
        scrolledPast,
        sharePropensity: Math.max(0, agentScore * 0.3 + seed * 0.1),
        rejectionScore: Math.max(0, -agentScore * 0.5),
        depthScore: isLongForm ? Math.max(0, agentScore * 0.8 + 0.2) : Math.max(0, agentScore * 0.5),
      });
    }

    const positiveRate = reactions.filter(r => r.finalScore > 0.2).length / reactions.length;
    const scrollRate = reactions.filter(r => r.scrolledPast).length / reactions.length;
    const shareRate = reactions.reduce((s, r) => s + r.sharePropensity, 0) / reactions.length;
    const rejectionRate = reactions.filter(r => r.finalScore < -0.3).length / reactions.length;
    const scoreMean = reactions.reduce((s, r) => s + r.finalScore, 0) / reactions.length;
    const scoreVariance = reactions.reduce((s, r) => s + Math.pow(r.finalScore - scoreMean, 2), 0) / reactions.length;
    const scoreStd = Math.sqrt(scoreVariance);

    const simComposite = Math.round(Math.max(0, Math.min(100,
      positiveRate * 40 + (1 - scrollRate) * 30 + shareRate * 100 * 20 + (1 - rejectionRate) * 10
    )));
    const simResonance = Math.round(Math.max(0, Math.min(100, positiveRate * 100)));
    const simDepth = Math.round(Math.max(0, Math.min(100,
      reactions.reduce((s, r) => s + r.depthScore, 0) / reactions.length * 100
    )));
    const simAmplification = Math.round(Math.max(0, Math.min(100, shareRate * 1000)));
    const simPolarity = Math.round(Math.max(0, Math.min(100, Math.abs(scoreMean) * 100)));
    const simRejection = Math.round(Math.max(0, Math.min(100, rejectionRate * 100)));

    await db.insert(groundTruthSimulations).values({
      groundTruthPostId: post.id,
      brandAgentId,
      agentPoolSize,
      modelParams: DEFAULT_SYSTEM_PARAMS as unknown as Record<string, unknown>,
      simResonance,
      simDepth,
      simAmplification,
      simPolarity,
      simRejection,
      simComposite,
      rawPositiveRate: positiveRate,
      rawScrollRate: scrollRate,
      rawShareRate: shareRate,
      rawRejectionRate: rejectionRate,
      rawScoreMean: scoreMean,
      rawScoreStd: scoreStd,
      simulatedAt: new Date(),
    });

    processed++;
  }

  return {
    processed,
    skipped: simulatedPostIds.size,
    total: posts.length,
  };
}
