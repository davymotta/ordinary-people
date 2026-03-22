/**
 * import-loewe-posts.ts
 * Importa i post Loewe harvested nel database groundTruthPosts.
 * Usa Drizzle ORM direttamente (non via tRPC).
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";
import { groundTruthPosts } from "../drizzle/schema";
import * as fs from "fs";
import * as path from "path";
import * as mysql from "mysql2/promise";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Carica dati harvest ────────────────────────────────────────────────────
const harvestPath = path.join(__dirname, "loewe-harvest.json");
const harvestData = JSON.parse(fs.readFileSync(harvestPath, "utf-8"));
const posts = harvestData.posts as Array<{
  platform: string;
  external_id: string;
  url: string;
  title: string;
  description: string;
  published_at: string;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  author: { handle: string; nickname: string; followers: number };
  content_type: string;
  duration_seconds: number;
  hashtags: string[];
  thumbnail: string;
  brand_agent_id: number;
  is_official: boolean;
  engagement_rate: number;
}>;

// ─── Connessione DB ─────────────────────────────────────────────────────────
async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL non trovato");
    process.exit(1);
  }

  const connection = await mysql.createConnection(dbUrl);
  const db = drizzle(connection);

  console.log(`\n📥 Importazione ${posts.length} post Loewe nel database...`);
  console.log(`   Brand Agent ID: ${harvestData.brand_agent_id}`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const post of posts) {
    try {
      // Controlla se esiste già
      const existing = await db
        .select({ id: groundTruthPosts.id })
        .from(groundTruthPosts)
        .where(
          and(
            eq(groundTruthPosts.platform, post.platform as "youtube" | "tiktok"),
            eq(groundTruthPosts.postId, post.external_id),
          )
        )
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Parsa la data (YouTube usa date relative come "1 day ago")
      const publishedAt = parseRelativeDate(post.published_at);

      // Determina il content type
      const contentTypeMap: Record<string, "image" | "video" | "carousel" | "text" | "reel" | "story" | "short"> = {
        video: "video",
        short: "short",
        image: "image",
        reel: "reel",
        story: "story",
        carousel: "carousel",
        text: "text",
      };
      const contentType = contentTypeMap[post.content_type] ?? "video";

      await db.insert(groundTruthPosts).values({
        brandAgentId: post.brand_agent_id,
        platform: post.platform as "youtube" | "tiktok",
        postId: post.external_id,
        postUrl: post.url,
        publishedAt,
        contentType,
        caption: post.title,
        hashtags: post.hashtags,
        imageUrls: post.thumbnail ? [post.thumbnail] : [],
        brandHandle: post.author.handle,
        brandFollowersAtTime: post.author.followers || null,
        metrics48h: {
          views: post.metrics.views,
          likes: post.metrics.likes,
          comments: post.metrics.comments,
          shares: post.metrics.shares,
        },
        metrics7d: null,
        commentAnalysis: null,
      });

      imported++;
      if (imported % 10 === 0) {
        process.stdout.write(`\r  Importati: ${imported}/${posts.length}...`);
      }
    } catch (err) {
      errors++;
      if (errors <= 5) {
        console.error(`\n  ❌ Errore per ${post.external_id}: ${err}`);
      }
    }
  }

  console.log(`\n\n✅ Importazione completata:`);
  console.log(`   Importati: ${imported}`);
  console.log(`   Saltati (già presenti): ${skipped}`);
  console.log(`   Errori: ${errors}`);

  // Verifica totale nel DB
  const total = await db
    .select({ id: groundTruthPosts.id })
    .from(groundTruthPosts)
    .where(eq(groundTruthPosts.brandAgentId, 1));
  console.log(`   Totale post nel DB per Loewe: ${total.length}`);

  await connection.end();
}

function parseRelativeDate(text: string): Date {
  if (!text) return new Date();
  const now = new Date();
  const match = text.match(/(\d+)\s+(second|minute|hour|day|week|month|year)/i);
  if (!match) return now;
  const n = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const ms: Record<string, number> = {
    second: 1000,
    minute: 60000,
    hour: 3600000,
    day: 86400000,
    week: 604800000,
    month: 2592000000,
    year: 31536000000,
  };
  return new Date(now.getTime() - n * (ms[unit] ?? 86400000));
}

main().catch(console.error);
