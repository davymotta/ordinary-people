/**
 * GTE Normalizer
 * 
 * Normalizes raw post metrics to percentile scores within a brand's distribution.
 * This ensures that real and simulated scores are on the same 0-100 scale,
 * making Spearman ρ comparison meaningful.
 */

import { getDb } from "../db";
import { groundTruthPosts } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  normalizeRealPosts,
  PostForScoring,
  RealMetrics,
  CommentAnalysis,
} from "./scorer";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RawPostData {
  id: number;
  brandAgentId: number;
  platform: string;
  contentType: string;
  metrics48h: RealMetrics;
  commentAnalysis?: CommentAnalysis;
  brandFollowersAtTime?: number;
}

export interface NormalizedPost {
  id: number;
  resonance: number;
  depth: number;
  amplification: number;
  polarity: number;
  rejection: number;
  composite: number;
}

// ─── Normalizer ──────────────────────────────────────────────────────────────

/**
 * Normalize all posts for a brand agent.
 * Computes percentile ranks within the brand's distribution and persists to DB.
 */
export async function normalizeBrandPosts(brandAgentId: number): Promise<NormalizedPost[]> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Load all posts for this brand
  const posts = await db
    .select()
    .from(groundTruthPosts)
    .where(eq(groundTruthPosts.brandAgentId, brandAgentId));

  if (posts.length === 0) return [];

  // Convert to PostForScoring
  const postsForScoring: PostForScoring[] = posts.map(p => ({
    id: p.id,
    metrics48h: (p.metrics48h as RealMetrics) ?? { likes: 0, comments: 0 },
    commentAnalysis: p.commentAnalysis as CommentAnalysis | undefined,
    brandFollowers: p.brandFollowersAtTime ?? 10000,
  }));

  // Compute percentile scores
  const scores = normalizeRealPosts(postsForScoring);

  // Persist normalized scores to DB
  const normalized: NormalizedPost[] = [];
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const score = scores[i];

    await db
      .update(groundTruthPosts)
      .set({
        normResonance: score.resonance,
        normDepth: score.depth,
        normAmplification: score.amplification,
        normPolarity: score.polarity,
        normRejection: score.rejection,
        normComposite: score.composite,
        normalizedAt: new Date(),
      })
      .where(eq(groundTruthPosts.id, post.id));

    normalized.push({
      id: post.id,
      ...score,
    });
  }

  return normalized;
}

/**
 * Get normalized scores for a brand's posts (from DB, no recomputation).
 */
export async function getNormalizedPosts(brandAgentId: number): Promise<NormalizedPost[]> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const posts = await db
    .select({
      id: groundTruthPosts.id,
      normResonance: groundTruthPosts.normResonance,
      normDepth: groundTruthPosts.normDepth,
      normAmplification: groundTruthPosts.normAmplification,
      normPolarity: groundTruthPosts.normPolarity,
      normRejection: groundTruthPosts.normRejection,
      normComposite: groundTruthPosts.normComposite,
    })
    .from(groundTruthPosts)
    .where(eq(groundTruthPosts.brandAgentId, brandAgentId));

  return posts
    .filter(p => p.normComposite !== null)
    .map(p => ({
      id: p.id,
      resonance: p.normResonance ?? 50,
      depth: p.normDepth ?? 50,
      amplification: p.normAmplification ?? 50,
      polarity: p.normPolarity ?? 50,
      rejection: p.normRejection ?? 50,
      composite: p.normComposite ?? 50,
    }));
}

/**
 * Parse a CSV row into a RawPostData object.
 * Expected CSV columns: platform, post_id, post_url, published_at, content_type,
 * caption, likes_48h, comments_48h, shares_48h, saves_48h, views_48h, reach_48h,
 * brand_followers, positive_pct, negative_pct, avg_sentiment, sentiment_variance,
 * avg_comment_length, total_comments, sampled_comments
 */
export function parseCsvRow(row: Record<string, string>): Partial<RawPostData> & {
  postId: string;
  postUrl?: string;
  caption?: string;
  publishedAt: Date;
  platform: string;
  contentType: string;
} {
  const metrics48h: RealMetrics = {
    likes: parseInt(row.likes_48h ?? row.likes ?? "0", 10),
    comments: parseInt(row.comments_48h ?? row.comments ?? "0", 10),
    shares: parseInt(row.shares_48h ?? row.shares ?? "0", 10) || undefined,
    saves: parseInt(row.saves_48h ?? row.saves ?? "0", 10) || undefined,
    views: parseInt(row.views_48h ?? row.views ?? "0", 10) || undefined,
    reach: parseInt(row.reach_48h ?? row.reach ?? "0", 10) || undefined,
  };

  let commentAnalysis: CommentAnalysis | undefined;
  if (row.positive_pct || row.avg_sentiment) {
    commentAnalysis = {
      total: parseInt(row.total_comments ?? "0", 10),
      sampled: parseInt(row.sampled_comments ?? "0", 10),
      positivePct: parseFloat(row.positive_pct ?? "0"),
      negativePct: parseFloat(row.negative_pct ?? "0"),
      avgSentiment: parseFloat(row.avg_sentiment ?? "0"),
      sentimentVariance: parseFloat(row.sentiment_variance ?? "0.25"),
      avgCommentLength: parseFloat(row.avg_comment_length ?? "20"),
      questionRate: parseFloat(row.question_rate ?? "0"),
    };
  }

  return {
    postId: row.post_id ?? row.id ?? "",
    postUrl: row.post_url ?? row.url,
    platform: row.platform ?? "instagram",
    contentType: row.content_type ?? "image",
    publishedAt: new Date(row.published_at ?? row.date ?? Date.now()),
    caption: row.caption,
    metrics48h,
    commentAnalysis,
    brandFollowersAtTime: parseInt(row.brand_followers ?? row.followers ?? "10000", 10),
  };
}
