/**
 * seed-loewe-brand.ts
 * Crea il Brand Agent Loewe nel DB con profilo completo.
 * Run: npx tsx scripts/seed-loewe-brand.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { brandAgents } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);

  // Check if Loewe already exists
  const existing = await db
    .select()
    .from(brandAgents)
    .where(eq(brandAgents.brandName, "Loewe"))
    .limit(1);

  if (existing.length > 0) {
    console.log(`✅ Brand Agent Loewe già presente (id: ${existing[0].id})`);
    await connection.end();
    return;
  }

  const loewe = {
    brandName: "Loewe",
    sector: "fashion",
    positioning: "luxury" as const,
    brandIdentity: {
      tone_of_voice: "cerebral, poetic, artisanal, understated",
      brand_values: [
        "craftsmanship",
        "art",
        "intellectual curiosity",
        "nature",
        "craft heritage",
        "quiet luxury",
      ],
      aesthetic: "Spanish heritage meets contemporary art direction. Leather craft, botanical motifs, sculptural forms. Jonathan Anderson era: conceptual, witty, culturally literate.",
      price_range: {
        entry: 300,
        mid: 1500,
        top: 8000,
        currency: "EUR",
      },
      founding_year: 1846,
      country_of_origin: "Spain",
      creative_director: "Jonathan Anderson (since 2013)",
      signature_products: [
        "Puzzle Bag",
        "Hammock Bag",
        "Elephant Bag",
        "Anagram Basket",
        "Flamenco Bag",
        "Gate Bag",
        "Paula's Ibiza line",
      ],
      brand_codes: [
        "Anagram logo",
        "leather craft",
        "botanical prints",
        "art collaboration",
        "craft prize",
        "cultural references",
      ],
    },
    marketPresence: {
      countries: ["ES", "FR", "IT", "UK", "US", "JP", "CN", "KR", "AE", "HK"],
      regions_strong: ["Europe", "East Asia", "Middle East"],
      regions_moderate: ["North America", "Southeast Asia"],
      store_count: 160,
      channels: ["flagship stores", "department stores", "e-commerce", "travel retail"],
      parent_company: "LVMH",
      revenue_estimate_eur: "1.2B+",
    },
    digitalPresence: {
      website: "loewe.com",
      instagram: "@loewe",
      instagram_followers: 10800000,
      tiktok: "@loewe",
      tiktok_followers: 1200000,
      youtube: "LOEWE",
      youtube_channel_id: "UCF_NVFJjGCFHzaJWMNMRBqg",
      pinterest: "loewe",
      twitter: "@LOEWE",
    },
    targetAudience: {
      primary: {
        gender: "female_skewed",
        age_range: [28, 45],
        generation: ["Millennial", "Gen X"],
        income_bracket: "high",
        education: "university+",
        psychographic: "culturally literate, art-interested, fashion-forward, values craftsmanship over logomania",
        lifestyle: "urban professional, travels internationally, attends art fairs and cultural events",
        geography: "global cities (Milan, Paris, London, Tokyo, NYC, Seoul)",
      },
      secondary: {
        gender: "male",
        age_range: [25, 40],
        generation: ["Millennial", "Gen Z"],
        psychographic: "fashion-conscious men interested in conceptual design and craft",
      },
      brand_fans: {
        celebrity_affinity: ["Zendaya", "Cate Blanchett", "Greta Lee", "Pedro Pascal"],
        cultural_affinity: ["contemporary art", "architecture", "literature", "film"],
      },
    },
    competitors: [
      { name: "Bottega Veneta", positioning: "luxury", similarity: 0.85 },
      { name: "Celine", positioning: "luxury", similarity: 0.80 },
      { name: "The Row", positioning: "luxury", similarity: 0.75 },
      { name: "Jacquemus", positioning: "premium", similarity: 0.60 },
      { name: "Loro Piana", positioning: "luxury", similarity: 0.65 },
      { name: "Dior", positioning: "luxury", similarity: 0.55 },
      { name: "Gucci", positioning: "luxury", similarity: 0.50 },
    ],
    defaultAgentPool: {
      total_agents: 50,
      composition: {
        by_generation: {
          "Gen Z": 0.20,
          "Millennial": 0.45,
          "Gen X": 0.25,
          "Boomer": 0.10,
        },
        by_gender: {
          female: 0.65,
          male: 0.30,
          non_binary: 0.05,
        },
        by_income: {
          "alto": 0.50,
          "medio-alto": 0.35,
          "medio": 0.15,
        },
        by_geo: {
          "Nord Italia": 0.35,
          "Centro Italia": 0.20,
          "Sud Italia": 0.10,
          "Estero": 0.35,
        },
      },
    },
    researchRaw: {
      brand_story: "Loewe was founded in Madrid in 1846 as a collective of leather artisans. Acquired by LVMH in 1996. Jonathan Anderson became creative director in 2013, transforming it into one of the most critically acclaimed luxury houses. Known for the Loewe Craft Prize (est. 2016), celebrating artisanal excellence globally.",
      key_campaigns: [
        "Paula's Ibiza (summer lifestyle)",
        "Loewe Craft Prize",
        "Eye/Loewe/Nature",
        "Jonathan Anderson x Smiley collaboration",
        "Howl's Moving Castle capsule",
      ],
      brand_positioning_notes: "Loewe occupies a unique position: intellectual luxury that appeals to the fashion-literate consumer who values concept over status signaling. The brand avoids overt logomania in favor of craft, art, and cultural references.",
    },
    onboardingStatus: "complete" as const,
    onboardingCompletedAt: new Date(),
  };

  const result = await db.insert(brandAgents).values(loewe);
  const insertId = (result as any)[0]?.insertId ?? "unknown";
  console.log(`✅ Brand Agent Loewe creato con id: ${insertId}`);

  await connection.end();
}

main().catch(err => {
  console.error("❌ Errore:", err);
  process.exit(1);
});
