/**
 * YouTube Scraper — Playwright headless
 *
 * Supplements the YouTube Data API with data not available via API:
 * - Likes count (YouTube removed from API in 2021, still visible on page)
 * - Comments count
 * - Full description with hashtags
 * - Channel subscriber count
 *
 * Strategy: intercept YouTube's internal ytInitialData JSON embedded in the page.
 */

import { chromium, type Browser, type BrowserContext } from "playwright";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface YouTubeVideoDetails {
  videoId: string;
  url: string;
  title: string;
  description: string;
  hashtags: string[];
  viewsCount: number;
  likesCount: number | null;
  commentsCount: number | null;
  publishedAt: Date;
  duration: string;
  channelId: string;
  channelName: string;
  channelSubscribers: string;
  thumbnailUrl: string;
  category?: string;
  tags: string[];
  scrapedAt: Date;
}

export interface YouTubeChannelStats {
  channelId: string;
  channelName: string;
  subscribersCount: string;
  totalViews: number;
  videoCount: number;
  description: string;
  country?: string;
  scrapedAt: Date;
}

// ─── Browser Pool ─────────────────────────────────────────────────────────────

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--window-size=1920,1080",
    ],
  });
  return _browser;
}

async function createContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/New_York",
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AnyObj = Record<string, unknown>;

function asObj(v: unknown): AnyObj {
  return (v && typeof v === "object" ? v : {}) as AnyObj;
}

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u00C0-\u024F\u0400-\u04FF]+/g) ?? [];
  return matches.map((h) => h.slice(1).toLowerCase());
}

function parseViewCount(text: string): number {
  if (!text) return 0;
  const clean = text.replace(/[^0-9KMB.]/gi, "");
  if (clean.endsWith("K")) return Math.round(parseFloat(clean) * 1000);
  if (clean.endsWith("M")) return Math.round(parseFloat(clean) * 1000000);
  if (clean.endsWith("B")) return Math.round(parseFloat(clean) * 1000000000);
  return parseInt(clean.replace(/\D/g, ""), 10) || 0;
}

/**
 * Extract ytInitialData from YouTube page.
 * This JSON contains all structured data YouTube uses to render the page.
 */
async function extractYtInitialData(
  page: import("playwright").Page
): Promise<AnyObj | null> {
  return page.evaluate((): AnyObj | null => {
    const ytData = (window as unknown as Record<string, unknown>)["ytInitialData"];
    if (ytData && typeof ytData === "object") return ytData as AnyObj;

    const scripts = Array.from(document.querySelectorAll("script"));
    for (const script of scripts) {
      const text = script.textContent ?? "";
      if (text.includes("ytInitialData")) {
        const idx = text.indexOf("ytInitialData = {");
        if (idx >= 0) {
          const start = idx + "ytInitialData = ".length;
          let depth = 0;
          let end = start;
          for (let i = start; i < text.length; i++) {
            if (text[i] === "{") depth++;
            else if (text[i] === "}") {
              depth--;
              if (depth === 0) {
                end = i + 1;
                break;
              }
            }
          }
          try {
            return JSON.parse(text.slice(start, end)) as AnyObj;
          } catch {
            // continue
          }
        }
      }
    }
    return null;
  });
}

// ─── YouTube Video Scraper ────────────────────────────────────────────────────

export async function scrapeYouTubeVideo(
  videoIdOrUrl: string
): Promise<YouTubeVideoDetails | null> {
  const browser = await getBrowser();
  const context = await createContext(browser);
  const page = await context.newPage();

  try {
    const videoId = videoIdOrUrl.includes("youtube.com")
      ? new URL(videoIdOrUrl).searchParams.get("v") ?? videoIdOrUrl.split("v=")[1]?.split("&")[0]
      : videoIdOrUrl.includes("youtu.be")
      ? videoIdOrUrl.split("youtu.be/")[1]?.split("?")[0]
      : videoIdOrUrl;

    if (!videoId) return null;

    await page.goto(`https://www.youtube.com/watch?v=${videoId}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait for dynamic content
    await page.waitForTimeout(3000);

    const ytData = await extractYtInitialData(page);
    if (!ytData) return null;

    // Navigate the ytInitialData structure
    const contents = asObj(asObj(asObj(ytData["contents"])["twoColumnWatchNextResults"])["results"]);
    const resultsArray = contents["results"];
    if (!Array.isArray(resultsArray)) return null;

    let videoPrimaryInfo: AnyObj = {};
    let videoSecondaryInfo: AnyObj = {};

    for (const item of resultsArray as unknown[]) {
      const o = asObj(item);
      if (o["videoPrimaryInfoRenderer"]) videoPrimaryInfo = asObj(o["videoPrimaryInfoRenderer"]);
      if (o["videoSecondaryInfoRenderer"]) videoSecondaryInfo = asObj(o["videoSecondaryInfoRenderer"]);
    }

    // Extract title
    const titleRuns = asObj(videoPrimaryInfo["title"])["runs"];
    const title = Array.isArray(titleRuns)
      ? (titleRuns as AnyObj[]).map((r) => r["text"] as string).join("")
      : "";

    // Extract view count
    const viewCountText =
      asObj(asObj(videoPrimaryInfo["viewCount"])["videoViewCountRenderer"])["viewCount"];
    const viewCountStr =
      (asObj(viewCountText)["simpleText"] as string) ??
      (asObj(asObj(viewCountText)["runs"] as unknown)?.[0] as AnyObj)?.["text"] as string ??
      "";
    const viewsCount = parseViewCount(viewCountStr);

    // Extract likes (from accessibility text)
    const likeButton = asObj(
      asObj(
        asObj(
          asObj(
            asObj(videoPrimaryInfo["videoActions"])["menuRenderer"]
          )["topLevelButtons"]
        )
      )
    );
    // Likes are in the accessibility label of the like button
    let likesCount: number | null = null;
    const topButtons = asObj(videoPrimaryInfo["videoActions"]);
    // Deep search for like count in accessibility data
    const likeText = findLikeCount(topButtons);
    if (likeText) {
      likesCount = parseViewCount(likeText);
    }
    void likeButton; // suppress unused warning

    // Extract description
    const descRuns = asObj(
      asObj(asObj(videoSecondaryInfo["description"])["runs"])
    );
    const descArray = asObj(videoSecondaryInfo["description"])["runs"];
    const description = Array.isArray(descArray)
      ? (descArray as AnyObj[]).map((r) => r["text"] as string ?? "").join("")
      : "";
    const hashtags = extractHashtags(description);
    void descRuns;

    // Extract channel info
    const owner = asObj(videoSecondaryInfo["owner"]);
    const channelRenderer = asObj(owner["videoOwnerRenderer"]);
    const channelNameRuns = asObj(channelRenderer["title"])["runs"];
    const channelName = Array.isArray(channelNameRuns)
      ? (channelNameRuns as AnyObj[])[0]?.["text"] as string ?? ""
      : "";
    const channelId =
      (asObj(asObj(channelRenderer["navigationEndpoint"])["browseEndpoint"])["browseId"] as string) ?? "";
    const subscriberText =
      (asObj(channelRenderer["subscriberCountText"])["simpleText"] as string) ??
      (asObj(asObj(channelRenderer["subscriberCountText"])["runs"] as unknown)?.[0] as AnyObj)?.["text"] as string ??
      "";

    // Extract thumbnail
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // Extract date from date text
    const dateText =
      (asObj(videoPrimaryInfo["dateText"])["simpleText"] as string) ?? "";
    const publishedAt = dateText ? new Date(dateText) : new Date();

    return {
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      description,
      hashtags,
      viewsCount,
      likesCount,
      commentsCount: null, // Comments require additional scroll
      publishedAt: isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
      duration: "",
      channelId,
      channelName,
      channelSubscribers: subscriberText,
      thumbnailUrl,
      tags: hashtags,
      scrapedAt: new Date(),
    };
  } catch (err) {
    console.error(`[YouTube Scraper] Error scraping video ${videoIdOrUrl}:`, err);
    return null;
  } finally {
    await page.close();
    await context.close();
  }
}

function findLikeCount(obj: unknown, depth = 0): string | null {
  if (depth > 10 || !obj || typeof obj !== "object") return null;
  const o = obj as AnyObj;
  // Look for accessibility label containing "likes"
  for (const key of Object.keys(o)) {
    const val = o[key];
    if (typeof val === "string" && val.toLowerCase().includes("like")) {
      const match = val.match(/[\d,]+/);
      if (match) return match[0].replace(/,/g, "");
    }
    const result = findLikeCount(val, depth + 1);
    if (result) return result;
  }
  return null;
}

// ─── YouTube Channel Stats Scraper ───────────────────────────────────────────

export async function scrapeYouTubeChannel(
  channelIdOrUrl: string
): Promise<YouTubeChannelStats | null> {
  const browser = await getBrowser();
  const context = await createContext(browser);
  const page = await context.newPage();

  try {
    const url = channelIdOrUrl.startsWith("http")
      ? channelIdOrUrl
      : channelIdOrUrl.startsWith("@")
      ? `https://www.youtube.com/${channelIdOrUrl}/about`
      : `https://www.youtube.com/channel/${channelIdOrUrl}/about`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    const ytData = await extractYtInitialData(page);
    if (!ytData) return null;

    // Navigate to channel header
    const header = asObj(
      asObj(
        asObj(
          asObj(ytData["header"])["c4TabbedHeaderRenderer"]
        )
      )
    );

    const channelName = (header["title"] as string) ?? "";
    const channelId = (header["channelId"] as string) ?? "";
    const subscriberText =
      (asObj(header["subscriberCountText"])["simpleText"] as string) ?? "";

    // Channel metadata from about tab
    const metadata = asObj(ytData["metadata"]);
    const channelMetadata = asObj(metadata["channelMetadataRenderer"]);
    const description = (channelMetadata["description"] as string) ?? "";
    const country = (channelMetadata["country"] as string) ?? undefined;

    return {
      channelId,
      channelName,
      subscribersCount: subscriberText,
      totalViews: 0, // Not easily available without additional navigation
      videoCount: 0,
      description,
      country,
      scrapedAt: new Date(),
    };
  } catch (err) {
    console.error(`[YouTube Scraper] Error scraping channel ${channelIdOrUrl}:`, err);
    return null;
  } finally {
    await page.close();
    await context.close();
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export async function closeYouTubeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}
