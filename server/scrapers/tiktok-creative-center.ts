/**
 * TikTok Creative Center Scraper
 *
 * Accesses TikTok's public Creative Center to retrieve:
 * - Top ads by industry/brand
 * - Trending hashtags
 * - Trending sounds
 * - Top creators by category
 *
 * No API key required for basic access.
 * Endpoint: https://ads.tiktok.com/business/creativecenter/
 *
 * TikTok also has a commercial API for ads:
 * https://ads.tiktok.com/marketing_api/docs
 * (requires TikTok for Business account)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TikTokAd {
  adId: string;
  advertiserId: string;
  advertiserName: string;
  adTitle?: string;
  adDescription?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  landingPageUrl?: string;
  industry?: string;
  country: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  ctr?: number;
  cvr?: number;
  startDate?: Date;
  duration?: number;
  hashtags: string[];
  musicTitle?: string;
  scrapedAt: Date;
}

export interface TikTokTrendingHashtag {
  hashtagId: string;
  hashtagName: string;
  publishCount: number;
  videoViews: number;
  rank: number;
  trend: "up" | "down" | "stable";
  scrapedAt: Date;
}

export interface TikTokCreativeCenterResult {
  ads: TikTokAd[];
  hashtags: TikTokTrendingHashtag[];
  error?: string;
}

// ─── TikTok Creative Center API (public endpoints) ───────────────────────────

const CC_BASE = "https://ads.tiktok.com/creative_radar_api/v1";

/**
 * Fetch top performing ads from TikTok Creative Center.
 * Uses the public API endpoint (no auth required for basic data).
 */
export async function getTikTokTopAds(options: {
  industry?: string;
  country?: string;
  period?: 7 | 30 | 180;
  limit?: number;
  page?: number;
} = {}): Promise<TikTokCreativeCenterResult> {
  const {
    industry = "",
    country = "IT",
    period = 30,
    limit = 20,
    page = 1,
  } = options;

  try {
    // TikTok Creative Center public API
    const params = new URLSearchParams({
      period: String(period),
      country_code: country,
      industry_id: industry,
      page: String(page),
      limit: String(limit),
      order_by: "vta",
      filter_by: "0",
    });

    const response = await fetch(
      `${CC_BASE}/top_ads/pc/list?${params.toString()}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Referer": "https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en",
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      return { ads: [], hashtags: [], error: `TikTok CC API error ${response.status}` };
    }

    const data = await response.json() as Record<string, unknown>;
    const rawAds = ((data["data"] as Record<string, unknown>)?.["list"] as unknown[]) ?? [];

    const ads: TikTokAd[] = rawAds.map((raw) => parseTikTokAd(raw as Record<string, unknown>, country));

    return { ads, hashtags: [] };
  } catch (err) {
    return { ads: [], hashtags: [], error: `Network error: ${String(err)}` };
  }
}

/**
 * Fetch trending hashtags from TikTok Creative Center.
 */
export async function getTikTokTrendingHashtags(options: {
  country?: string;
  period?: 7 | 30;
  limit?: number;
  industry?: string;
} = {}): Promise<TikTokTrendingHashtag[]> {
  const { country = "IT", period = 7, limit = 20, industry = "" } = options;

  try {
    const params = new URLSearchParams({
      period: String(period),
      country_code: country,
      industry_id: industry,
      page: "1",
      limit: String(limit),
    });

    const response = await fetch(
      `${CC_BASE}/hashtag/list?${params.toString()}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Referer": "https://ads.tiktok.com/business/creativecenter/hashtag/pc/en",
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json() as Record<string, unknown>;
    const rawHashtags = ((data["data"] as Record<string, unknown>)?.["list"] as unknown[]) ?? [];

    return rawHashtags.map((raw, idx) => {
      const r = raw as Record<string, unknown>;
      return {
        hashtagId: String(r["hashtag_id"] ?? r["id"] ?? idx),
        hashtagName: String(r["hashtag_name"] ?? r["name"] ?? ""),
        publishCount: Number(r["publish_cnt"] ?? 0),
        videoViews: Number(r["video_views"] ?? 0),
        rank: idx + 1,
        trend: "stable" as const,
        scrapedAt: new Date(),
      };
    });
  } catch (err) {
    console.error(`[TikTok CC] Error fetching hashtags:`, err);
    return [];
  }
}

/**
 * Search TikTok Creative Center for ads by brand name.
 * Uses Playwright headless as fallback when API is blocked.
 */
export async function searchTikTokAdsByBrand(
  brandName: string,
  country = "IT"
): Promise<TikTokAd[]> {
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "en-US",
  });

  const page = await context.newPage();
  const ads: TikTokAd[] = [];

  try {
    const interceptedAds: TikTokAd[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("creative_radar_api") || url.includes("top_ads")) {
        try {
          const json = await response.json() as Record<string, unknown>;
          const list = ((json["data"] as Record<string, unknown>)?.["list"] as unknown[]) ?? [];
          for (const item of list) {
            const ad = parseTikTokAd(item as Record<string, unknown>, country);
            interceptedAds.push(ad);
          }
        } catch {
          // Not JSON
        }
      }
    });

    const searchUrl = `https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?country_code=${country}&search=${encodeURIComponent(brandName)}`;
    await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    ads.push(...interceptedAds);
    return ads;
  } catch (err) {
    console.error(`[TikTok CC] Error searching ads for ${brandName}:`, err);
    return ads;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseTikTokAd(raw: Record<string, unknown>, country: string): TikTokAd {
  const video = (raw["video_info"] as Record<string, unknown>) ?? {};
  const stats = (raw["cost"] as Record<string, unknown>) ??
                (raw["stats"] as Record<string, unknown>) ?? {};

  const desc = String(raw["ad_title"] ?? raw["video_description"] ?? "");
  const hashtags = desc.match(/#[\w\u00C0-\u024F]+/g)?.map((h) => h.slice(1).toLowerCase()) ?? [];

  return {
    adId: String(raw["material_id"] ?? raw["ad_id"] ?? ""),
    advertiserId: String(raw["advertiser_id"] ?? ""),
    advertiserName: String(raw["advertiser_name"] ?? ""),
    adTitle: String(raw["ad_title"] ?? ""),
    adDescription: desc,
    videoUrl: String(video["video_url"] ?? raw["video_url"] ?? ""),
    thumbnailUrl: String(video["vid_cover"] ?? raw["cover"] ?? ""),
    landingPageUrl: String(raw["landing_page_url"] ?? ""),
    industry: String(raw["industry_key"] ?? ""),
    country,
    likes: Number(stats["like"] ?? raw["like_count"] ?? 0),
    comments: Number(stats["comment"] ?? raw["comment_count"] ?? 0),
    shares: Number(stats["share"] ?? raw["share_count"] ?? 0),
    views: Number(stats["play"] ?? raw["play_count"] ?? raw["vta"] ?? 0),
    ctr: Number(raw["ctr"] ?? 0) || undefined,
    cvr: Number(raw["cvr"] ?? 0) || undefined,
    startDate: raw["first_shown_date"]
      ? new Date(String(raw["first_shown_date"]))
      : undefined,
    duration: Number(video["duration"] ?? 0) || undefined,
    hashtags,
    musicTitle: String((raw["music_info"] as Record<string, unknown>)?.["title"] ?? ""),
    scrapedAt: new Date(),
  };
}
