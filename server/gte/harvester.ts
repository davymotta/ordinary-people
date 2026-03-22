/**
 * GTE Harvester
 * 
 * Collects real social media data for calibration.
 * Sources:
 * 1. TikTok — via Data API (search by brand handle/keyword)
 * 2. YouTube — via Data API (channel videos with stats)
 * 3. CSV manual upload — for Instagram (no public API)
 * 
 * Each harvested post is stored in groundTruthPosts with raw metrics.
 * The Normalizer then computes percentile scores.
 */

import { callDataApi } from "../_core/dataApi";
import { getDb } from "../db";
import { groundTruthPosts } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { parseCsvRow } from "./normalizer";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HarvestResult {
  harvested: number;
  skipped: number;
  errors: string[];
  postIds: number[];
}

export interface TikTokVideoData {
  aweme_id: string;
  desc: string;
  create_time: number;
  statistics: {
    digg_count: number;       // likes
    comment_count: number;
    share_count: number;
    play_count: number;
  };
  video?: {
    cover?: { url_list?: string[] };
  };
  author?: {
    unique_id?: string;
    follower_count?: number;
  };
}

export interface YouTubeVideoData {
  type: string;
  video?: {
    videoId: string;
    title: string;
    publishedTimeText: string;
    lengthSeconds: number;
    stats?: {
      views?: number;
      likes?: number;
      comments?: number;
    };
    thumbnails?: { url: string }[];
    descriptionSnippet?: string;
  };
}

// ─── TikTok Harvester ────────────────────────────────────────────────────────

/**
 * Harvest TikTok videos for a brand/keyword.
 * Uses the Tiktok/search_tiktok_video_general Data API.
 */
export async function harvestTikTokProfile(
  brandAgentId: number,
  keyword: string,
  maxPosts: number = 30,
  brandFollowers: number = 50000,
): Promise<HarvestResult> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const result: HarvestResult = { harvested: 0, skipped: 0, errors: [], postIds: [] };
  let cursor: number | undefined;
  let searchId: string | undefined;
  let collected = 0;

  while (collected < maxPosts) {
    let response: Record<string, unknown>;
    try {
      response = await callDataApi("Tiktok/search_tiktok_video_general", {
        query: {
          keyword,
          ...(cursor !== undefined ? { cursor } : {}),
          ...(searchId ? { search_id: searchId } : {}),
        },
      }) as Record<string, unknown>;
    } catch (err) {
      result.errors.push(`TikTok API error: ${String(err)}`);
      break;
    }

    const videos = (response?.data as TikTokVideoData[]) ?? [];
    if (videos.length === 0) break;

    for (const video of videos) {
      if (collected >= maxPosts) break;

      const postId = video.aweme_id;
      const platform = "tiktok";

      // Check if already exists
      const existing = await db
        .select({ id: groundTruthPosts.id })
        .from(groundTruthPosts)
        .where(and(
          eq(groundTruthPosts.platform, platform as "tiktok"),
          eq(groundTruthPosts.postId, postId),
        ))
        .limit(1);

      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      const stats = video.statistics ?? { digg_count: 0, comment_count: 0, share_count: 0, play_count: 0 };
      const publishedAt = new Date(video.create_time * 1000);

      try {
        const inserted = await db.insert(groundTruthPosts).values({
          brandAgentId,
          platform: "tiktok",
          postId,
          publishedAt,
          contentType: "video",
          caption: video.desc,
          brandHandle: video.author?.unique_id,
          brandFollowersAtTime: video.author?.follower_count ?? brandFollowers,
          metrics48h: {
            likes: stats.digg_count,
            comments: stats.comment_count,
            shares: stats.share_count,
            views: stats.play_count,
          },
          imageUrls: video.video?.cover?.url_list ? [video.video.cover.url_list[0]] : [],
        });

        result.harvested++;
        result.postIds.push((inserted as { insertId?: number }).insertId ?? 0);
        collected++;
      } catch (err) {
        result.errors.push(`Insert error for ${postId}: ${String(err)}`);
      }
    }

    // Pagination
    const nextCursor = response?.cursor as number | undefined;
    const nextSearchId = (response?.log_pb as Record<string, unknown>)?.impr_id as string | undefined;
    if (!nextCursor || nextCursor === cursor) break;
    cursor = nextCursor;
    searchId = nextSearchId;
  }

  return result;
}

// ─── YouTube Harvester ───────────────────────────────────────────────────────

/**
 * Harvest YouTube channel videos.
 * Uses the Youtube/get_channel_videos Data API.
 */
export async function harvestYouTubeChannel(
  brandAgentId: number,
  channelId: string,
  maxPosts: number = 30,
  brandFollowers: number = 10000,
): Promise<HarvestResult> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const result: HarvestResult = { harvested: 0, skipped: 0, errors: [], postIds: [] };
  let cursor: string | undefined;
  let collected = 0;

  while (collected < maxPosts) {
    let response: Record<string, unknown>;
    try {
      response = await callDataApi("Youtube/get_channel_videos", {
        query: {
          id: channelId,
          filter: "videos_latest",
          hl: "it",
          gl: "IT",
          ...(cursor ? { cursor } : {}),
        },
      }) as Record<string, unknown>;
    } catch (err) {
      result.errors.push(`YouTube API error: ${String(err)}`);
      break;
    }

    const contents = (response?.contents as YouTubeVideoData[]) ?? [];
    if (contents.length === 0) break;

    for (const item of contents) {
      if (collected >= maxPosts) break;
      if (item.type !== "video" || !item.video) continue;

      const video = item.video;
      const postId = video.videoId;
      const platform = "youtube";

      // Check if already exists
      const existing = await db
        .select({ id: groundTruthPosts.id })
        .from(groundTruthPosts)
        .where(and(
          eq(groundTruthPosts.platform, platform as "youtube"),
          eq(groundTruthPosts.postId, postId),
        ))
        .limit(1);

      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      // Parse published date (YouTube returns relative time like "2 days ago")
      const publishedAt = parseYouTubeDate(video.publishedTimeText);
      const stats = video.stats ?? {};

      try {
        const inserted = await db.insert(groundTruthPosts).values({
          brandAgentId,
          platform: "youtube",
          postId,
          postUrl: `https://www.youtube.com/watch?v=${postId}`,
          publishedAt,
          contentType: "video",
          caption: video.title,
          brandHandle: channelId,
          brandFollowersAtTime: brandFollowers,
          metrics48h: {
            likes: stats.likes ?? 0,
            comments: stats.comments ?? 0,
            views: stats.views ?? 0,
          },
          imageUrls: video.thumbnails ? [video.thumbnails[0]?.url ?? ""] : [],
        });

        result.harvested++;
        result.postIds.push((inserted as { insertId?: number }).insertId ?? 0);
        collected++;
      } catch (err) {
        result.errors.push(`Insert error for ${postId}: ${String(err)}`);
      }
    }

    const nextCursor = response?.cursorNext as string | undefined;
    if (!nextCursor) break;
    cursor = nextCursor;
  }

  return result;
}

function parseYouTubeDate(relativeTime?: string): Date {
  if (!relativeTime) return new Date();
  const now = new Date();
  const match = relativeTime.match(/(\d+)\s+(second|minute|hour|day|week|month|year)/i);
  if (!match) return now;
  const n = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const ms = {
    second: 1000, minute: 60000, hour: 3600000,
    day: 86400000, week: 604800000, month: 2592000000, year: 31536000000,
  }[unit] ?? 86400000;
  return new Date(now.getTime() - n * ms);
}

// ─── CSV Harvester ───────────────────────────────────────────────────────────

/**
 * Ingest posts from a CSV string (manual upload for Instagram).
 * CSV format: see parseCsvRow in normalizer.ts for expected columns.
 */
export async function ingestPostsFromCsv(
  brandAgentId: number,
  csvContent: string,
  platform: "instagram" | "facebook" = "instagram",
): Promise<HarvestResult> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const result: HarvestResult = { harvested: 0, skipped: 0, errors: [], postIds: [] };

  // Parse CSV
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) {
    result.errors.push("CSV must have at least a header row and one data row");
    return result;
  }

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = values[j] ?? ""; });

    try {
      const parsed = parseCsvRow(row);
      if (!parsed.postId) {
        result.errors.push(`Row ${i}: missing post_id`);
        continue;
      }

      // Check if already exists
      const existing = await db
        .select({ id: groundTruthPosts.id })
        .from(groundTruthPosts)
        .where(and(
          eq(groundTruthPosts.platform, platform),
          eq(groundTruthPosts.postId, parsed.postId),
        ))
        .limit(1);

      if (existing.length > 0) {
        result.skipped++;
        continue;
      }

      const inserted = await db.insert(groundTruthPosts).values({
        brandAgentId,
        platform,
        postId: parsed.postId,
        postUrl: parsed.postUrl,
        publishedAt: parsed.publishedAt,
        contentType: (parsed.contentType as "image" | "video" | "carousel" | "text" | "reel" | "story" | "short") ?? "image",
        caption: parsed.caption,
        brandFollowersAtTime: parsed.brandFollowersAtTime,
        metrics48h: parsed.metrics48h,
        commentAnalysis: parsed.commentAnalysis,
      });

      result.harvested++;
      result.postIds.push((inserted as { insertId?: number }).insertId ?? 0);
    } catch (err) {
      result.errors.push(`Row ${i}: ${String(err)}`);
    }
  }

  return result;
}
