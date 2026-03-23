/**
 * Meta Ad Library API
 *
 * Accesses the Meta Ad Library to retrieve active and historical ads
 * for any brand/page. No login required for basic access.
 *
 * API Docs: https://www.facebook.com/ads/library/api/
 * Endpoint: https://graph.facebook.com/v21.0/ads_archive
 *
 * Required: Meta Ad Library API access token
 * How to get: https://www.facebook.com/ads/library/api/ → "Get started"
 * (Free, just requires a Facebook account and identity verification)
 *
 * Data available:
 * - Ad creative (title, body, image/video URLs)
 * - Ad status (active/inactive)
 * - Start/end dates
 * - Platforms (Facebook, Instagram, Messenger, Audience Network)
 * - Estimated audience size
 * - Spend range (not exact, in brackets)
 * - Impressions range
 * - Demographic targeting (age, gender, region)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetaAd {
  adId: string;
  adArchiveId: string;
  pageId: string;
  pageName: string;
  adStatus: "ACTIVE" | "INACTIVE";
  startDate: Date;
  endDate?: Date;
  platforms: string[];
  adCreativeBody?: string;
  adCreativeTitle?: string;
  adCreativeLinkCaption?: string;
  adCreativeImageUrl?: string;
  adCreativeVideoUrl?: string;
  estimatedAudienceSize?: { lower: number; upper: number };
  spendRange?: { lower: number; upper: number; currency: string };
  impressionsRange?: { lower: number; upper: number };
  demographics?: {
    ageGender: Array<{ age: string; gender: string; percentage: number }>;
    regions: Array<{ region: string; percentage: number }>;
  };
  currency?: string;
  scrapedAt: Date;
}

export interface MetaAdLibraryResult {
  ads: MetaAd[];
  totalCount: number;
  nextCursor?: string;
  error?: string;
}

// ─── Meta Ad Library Client ───────────────────────────────────────────────────

const META_AD_LIBRARY_BASE = "https://graph.facebook.com/v21.0/ads_archive";

/**
 * Search the Meta Ad Library for ads by brand/page name or page ID.
 *
 * @param searchTerm - Brand name or Facebook Page name to search
 * @param accessToken - Meta Ad Library API access token
 * @param options - Additional search options
 */
export async function searchMetaAdLibrary(
  searchTerm: string,
  accessToken: string,
  options: {
    adType?: "ALL" | "POLITICAL_AND_ISSUE_ADS" | "HOUSING_ADS" | "EMPLOYMENT_ADS" | "CREDIT_ADS";
    adActiveStatus?: "ALL" | "ACTIVE" | "INACTIVE";
    countries?: string[];
    limit?: number;
    after?: string;
    mediaType?: "ALL" | "IMAGE" | "MEME" | "VIDEO" | "NONE";
  } = {}
): Promise<MetaAdLibraryResult> {
  const {
    adType = "ALL",
    adActiveStatus = "ALL",
    countries = ["IT", "FR", "ES", "DE", "GB", "US"],
    limit = 25,
    after,
    mediaType = "ALL",
  } = options;

  const fields = [
    "id",
    "ad_archive_id",
    "page_id",
    "page_name",
    "ad_delivery_start_time",
    "ad_delivery_stop_time",
    "publisher_platforms",
    "ad_creative_bodies",
    "ad_creative_link_titles",
    "ad_creative_link_captions",
    "ad_creative_link_descriptions",
    "eu_total_reach",
    "target_ages",
    "target_gender",
    "target_locations",
    "currency",
    "spend",
    "impressions",
  ].join(",");

  const params = new URLSearchParams({
    search_terms: searchTerm,
    ad_type: adType,
    ad_active_status: adActiveStatus,
    search_page_ids: "",
    countries: countries.join(","),
    limit: String(limit),
    fields,
    access_token: accessToken,
    media_type: mediaType,
  });

  if (after) params.set("after", after);

  try {
    const response = await fetch(`${META_AD_LIBRARY_BASE}?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ads: [],
        totalCount: 0,
        error: `Meta API error ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json() as Record<string, unknown>;
    const rawAds = (data["data"] as unknown[]) ?? [];
    const paging = data["paging"] as Record<string, unknown> | undefined;
    const nextCursor = (paging?.["cursors"] as Record<string, string> | undefined)?.["after"];

    const ads: MetaAd[] = rawAds.map((raw) => parseMetaAd(raw as Record<string, unknown>));

    return {
      ads,
      totalCount: ads.length,
      nextCursor,
    };
  } catch (err) {
    return {
      ads: [],
      totalCount: 0,
      error: `Network error: ${String(err)}`,
    };
  }
}

/**
 * Get all ads for a specific Facebook Page ID.
 */
export async function getMetaAdsByPageId(
  pageId: string,
  accessToken: string,
  options: { limit?: number; after?: string } = {}
): Promise<MetaAdLibraryResult> {
  const { limit = 25, after } = options;

  const fields = [
    "id",
    "ad_archive_id",
    "page_id",
    "page_name",
    "ad_delivery_start_time",
    "ad_delivery_stop_time",
    "publisher_platforms",
    "ad_creative_bodies",
    "ad_creative_link_titles",
    "currency",
    "spend",
    "impressions",
    "eu_total_reach",
  ].join(",");

  const params = new URLSearchParams({
    search_page_ids: pageId,
    ad_type: "ALL",
    ad_active_status: "ALL",
    countries: "ALL",
    limit: String(limit),
    fields,
    access_token: accessToken,
  });

  if (after) params.set("after", after);

  try {
    const response = await fetch(`${META_AD_LIBRARY_BASE}?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ads: [],
        totalCount: 0,
        error: `Meta API error ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json() as Record<string, unknown>;
    const rawAds = (data["data"] as unknown[]) ?? [];
    const paging = data["paging"] as Record<string, unknown> | undefined;
    const nextCursor = (paging?.["cursors"] as Record<string, string> | undefined)?.["after"];

    const ads: MetaAd[] = rawAds.map((raw) => parseMetaAd(raw as Record<string, unknown>));

    return { ads, totalCount: ads.length, nextCursor };
  } catch (err) {
    return {
      ads: [],
      totalCount: 0,
      error: `Network error: ${String(err)}`,
    };
  }
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseMetaAd(raw: Record<string, unknown>): MetaAd {
  const bodies = raw["ad_creative_bodies"] as string[] | undefined;
  const titles = raw["ad_creative_link_titles"] as string[] | undefined;
  const captions = raw["ad_creative_link_captions"] as string[] | undefined;

  const spend = raw["spend"] as Record<string, unknown> | undefined;
  const impressions = raw["impressions"] as Record<string, unknown> | undefined;

  const startDateStr = raw["ad_delivery_start_time"] as string | undefined;
  const endDateStr = raw["ad_delivery_stop_time"] as string | undefined;

  return {
    adId: (raw["id"] as string) ?? "",
    adArchiveId: (raw["ad_archive_id"] as string) ?? "",
    pageId: (raw["page_id"] as string) ?? "",
    pageName: (raw["page_name"] as string) ?? "",
    adStatus: endDateStr ? "INACTIVE" : "ACTIVE",
    startDate: startDateStr ? new Date(startDateStr) : new Date(),
    endDate: endDateStr ? new Date(endDateStr) : undefined,
    platforms: (raw["publisher_platforms"] as string[]) ?? [],
    adCreativeBody: bodies?.[0],
    adCreativeTitle: titles?.[0],
    adCreativeLinkCaption: captions?.[0],
    spendRange: spend
      ? {
          lower: Number(spend["lower_bound"] ?? 0),
          upper: Number(spend["upper_bound"] ?? 0),
          currency: (raw["currency"] as string) ?? "EUR",
        }
      : undefined,
    impressionsRange: impressions
      ? {
          lower: Number(impressions["lower_bound"] ?? 0),
          upper: Number(impressions["upper_bound"] ?? 0),
        }
      : undefined,
    currency: (raw["currency"] as string) ?? undefined,
    scrapedAt: new Date(),
  };
}

// ─── Scraper fallback (no token) ──────────────────────────────────────────────

/**
 * Scrape Meta Ad Library via browser when no API token is available.
 * Uses the public web interface at https://www.facebook.com/ads/library/
 */
export async function scrapeMetaAdLibraryWeb(
  brandName: string,
  country = "IT"
): Promise<MetaAd[]> {
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
  const ads: MetaAd[] = [];

  try {
    const url = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${country}&q=${encodeURIComponent(brandName)}&search_type=keyword_unordered`;

    // Intercept the internal API call that powers the Ad Library search
    page.on("response", async (response) => {
      const respUrl = response.url();
      if (respUrl.includes("ads/library/async/search_ads")) {
        try {
          const json = await response.json() as Record<string, unknown>;
          const payload = json["payload"] as Record<string, unknown> | undefined;
          const results = payload?.["results"] as unknown[] | undefined;

          if (results) {
            for (const result of results) {
              const r = result as Record<string, unknown>;
              const adId = String(r["adArchiveID"] ?? r["ad_archive_id"] ?? "");
              if (!adId) continue;

              ads.push({
                adId,
                adArchiveId: adId,
                pageId: String(r["pageID"] ?? ""),
                pageName: String(r["pageName"] ?? brandName),
                adStatus: r["isActive"] ? "ACTIVE" : "INACTIVE",
                startDate: r["startDate"]
                  ? new Date(Number(r["startDate"]) * 1000)
                  : new Date(),
                endDate: r["endDate"]
                  ? new Date(Number(r["endDate"]) * 1000)
                  : undefined,
                platforms: (r["publisherPlatform"] as string[]) ?? [],
                adCreativeBody: ((((r["snapshot"] as Record<string, unknown>)?.["body"]) as Record<string, unknown>)?.["markup"] as Record<string, unknown>)?.["__html"] as string ?? undefined,
                scrapedAt: new Date(),
              });
            }
          }
        } catch {
          // Not JSON or unexpected format
        }
      }
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    return ads;
  } catch (err) {
    console.error(`[Meta Ad Library] Error scraping ${brandName}:`, err);
    return ads;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}
