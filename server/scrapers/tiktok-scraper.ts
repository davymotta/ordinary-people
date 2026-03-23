/**
 * TikTok Scraper — Playwright headless
 *
 * Scrapes public TikTok profiles and videos without login.
 * Strategy: intercept TikTok's internal API responses (SIGI_STATE / __NEXT_DATA__)
 * which contain structured JSON with all engagement metrics.
 *
 * Data available without login:
 * - Profile: followers, following, likes total, video count, bio
 * - Video: views, likes, comments, shares, description, hashtags, music, duration
 */

import { chromium, type Browser, type BrowserContext } from "playwright";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TikTokProfile {
  userId: string;
  username: string;
  nickname: string;
  biography: string;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  videoCount: number;
  isVerified: boolean;
  profilePicUrl: string;
  scrapedAt: Date;
}

export interface TikTokVideo {
  videoId: string;
  url: string;
  description: string;
  hashtags: string[];
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  playCount: number;
  duration: number;
  publishedAt: Date;
  thumbnailUrl: string;
  musicTitle?: string;
  musicAuthor?: string;
  authorUsername: string;
  authorFollowers: number;
  isAd: boolean;
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
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--window-size=1920,1080",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  return _browser;
}

async function createStealthContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
    timezoneId: "America/New_York",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
    },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
    (window as unknown as Record<string, unknown>).chrome = { runtime: {} };
  });

  return context;
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

/**
 * Extract SIGI_STATE or __NEXT_DATA__ from TikTok page.
 * These contain all the structured data TikTok uses to render the page.
 */
async function extractPageData(
  page: import("playwright").Page
): Promise<AnyObj | null> {
  return page.evaluate((): AnyObj | null => {
    // Try SIGI_STATE first (most complete)
    const sigiState = (window as unknown as Record<string, unknown>)["SIGI_STATE"];
    if (sigiState && typeof sigiState === "object") {
      return sigiState as AnyObj;
    }

    // Try __NEXT_DATA__
    const nextData = (window as unknown as Record<string, unknown>)["__NEXT_DATA__"];
    if (nextData && typeof nextData === "object") {
      return nextData as AnyObj;
    }

    // Try script tags
    const scripts = Array.from(document.querySelectorAll("script"));
    for (const script of scripts) {
      const text = script.textContent ?? "";
      if (text.includes("SIGI_STATE")) {
        const match = text.match(/window\["SIGI_STATE"\]\s*=\s*({[\s\S]*?});/);
        if (match) {
          try {
            return JSON.parse(match[1]) as AnyObj;
          } catch {
            // continue
          }
        }
      }
      if (text.startsWith('{"props":') || text.startsWith('{"pageProps":')) {
        try {
          return JSON.parse(text) as AnyObj;
        } catch {
          // continue
        }
      }
    }

    return null;
  });
}

// ─── TikTok Profile Scraper ───────────────────────────────────────────────────

export async function scrapeTikTokProfile(
  username: string
): Promise<TikTokProfile | null> {
  const browser = await getBrowser();
  const context = await createStealthContext(browser);
  const page = await context.newPage();

  try {
    // Intercept TikTok's internal API
    let apiData: AnyObj | null = null;

    page.on("response", async (response) => {
      const url = response.url();
      if (
        url.includes("api/user/detail") ||
        url.includes("api16-normal-c-useast1a.tiktokv.com") ||
        (url.includes("tiktok.com") && url.includes("user"))
      ) {
        try {
          const json = await response.json() as AnyObj;
          const userInfo = asObj(json["userInfo"]);
          if (userInfo["user"]) {
            apiData = json;
          }
        } catch {
          // Not JSON
        }
      }
    });

    const cleanUsername = username.replace(/^@/, "");
    await page.goto(`https://www.tiktok.com/@${cleanUsername}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.waitForTimeout(2000);

    // Extract from page state
    const pageData = await extractPageData(page);

    // Try SIGI_STATE structure
    if (pageData) {
      const userModule = asObj(pageData["UserModule"]);
      const users = asObj(userModule["users"]);
      const stats = asObj(userModule["stats"]);

      // Find user by username
      const userKey = Object.keys(users).find(
        (k) => k.toLowerCase() === cleanUsername.toLowerCase()
      );

      if (userKey) {
        const u = asObj(users[userKey]);
        const s = asObj(stats[userKey]);

        return {
          userId: (u["id"] as string) ?? "",
          username: (u["uniqueId"] as string) ?? cleanUsername,
          nickname: (u["nickname"] as string) ?? "",
          biography: (u["signature"] as string) ?? "",
          followersCount: (s["followerCount"] as number) ?? 0,
          followingCount: (s["followingCount"] as number) ?? 0,
          likesCount: (s["heartCount"] as number) ?? (s["diggCount"] as number) ?? 0,
          videoCount: (s["videoCount"] as number) ?? 0,
          isVerified: (u["verified"] as boolean) ?? false,
          profilePicUrl:
            (u["avatarLarger"] as string) ??
            (u["avatarMedium"] as string) ??
            "",
          scrapedAt: new Date(),
        };
      }
    }

    // Try API intercept data
    if (apiData) {
      const userInfo = asObj(apiData["userInfo"]);
      const u = asObj(userInfo["user"]);
      const s = asObj(userInfo["stats"]);

      return {
        userId: (u["id"] as string) ?? "",
        username: (u["uniqueId"] as string) ?? cleanUsername,
        nickname: (u["nickname"] as string) ?? "",
        biography: (u["signature"] as string) ?? "",
        followersCount: (s["followerCount"] as number) ?? 0,
        followingCount: (s["followingCount"] as number) ?? 0,
        likesCount: (s["heartCount"] as number) ?? 0,
        videoCount: (s["videoCount"] as number) ?? 0,
        isVerified: (u["verified"] as boolean) ?? false,
        profilePicUrl:
          (u["avatarLarger"] as string) ?? (u["avatarMedium"] as string) ?? "",
        scrapedAt: new Date(),
      };
    }

    return null;
  } catch (err) {
    console.error(`[TikTok Scraper] Error scraping profile @${username}:`, err);
    return null;
  } finally {
    await page.close();
    await context.close();
  }
}

// ─── TikTok Videos Scraper ────────────────────────────────────────────────────

export async function scrapeTikTokVideos(
  username: string,
  limit = 20
): Promise<TikTokVideo[]> {
  const browser = await getBrowser();
  const context = await createStealthContext(browser);
  const page = await context.newPage();
  const videos: TikTokVideo[] = [];

  try {
    const cleanUsername = username.replace(/^@/, "");

    await page.goto(`https://www.tiktok.com/@${cleanUsername}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.waitForTimeout(2000);

    const pageData = await extractPageData(page);
    if (!pageData) return videos;

    // SIGI_STATE structure: ItemModule contains all videos
    const itemModule = asObj(pageData["ItemModule"]);
    const items = Object.values(itemModule);

    for (const item of items.slice(0, limit)) {
      const video = parseTikTokItem(asObj(item));
      if (video) videos.push(video);
    }

    return videos;
  } catch (err) {
    console.error(`[TikTok Scraper] Error scraping videos for @${username}:`, err);
    return videos;
  } finally {
    await page.close();
    await context.close();
  }
}

// ─── Single TikTok Video Scraper ──────────────────────────────────────────────

export async function scrapeTikTokVideo(
  urlOrId: string
): Promise<TikTokVideo | null> {
  const browser = await getBrowser();
  const context = await createStealthContext(browser);
  const page = await context.newPage();

  try {
    // Normalize URL
    const url = urlOrId.startsWith("http")
      ? urlOrId
      : `https://www.tiktok.com/video/${urlOrId}`;

    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    const pageData = await extractPageData(page);
    if (!pageData) return null;

    const itemModule = asObj(pageData["ItemModule"]);
    const items = Object.values(itemModule);

    if (items.length > 0) {
      return parseTikTokItem(asObj(items[0]));
    }

    return null;
  } catch (err) {
    console.error(`[TikTok Scraper] Error scraping video ${urlOrId}:`, err);
    return null;
  } finally {
    await page.close();
    await context.close();
  }
}

// ─── Parse TikTok Item ────────────────────────────────────────────────────────

function parseTikTokItem(item: AnyObj): TikTokVideo | null {
  try {
    const videoId = (item["id"] as string) ?? "";
    if (!videoId) return null;

    const desc = (item["desc"] as string) ?? "";
    const hashtags = extractHashtags(desc);

    const stats = asObj(item["stats"]);
    const video = asObj(item["video"]);
    const music = asObj(item["music"]);
    const author = asObj(item["author"]);
    const authorStats = asObj(item["authorStats"]);

    const createTime = (item["createTime"] as number) ?? 0;

    return {
      videoId,
      url: `https://www.tiktok.com/@${(author["uniqueId"] as string) ?? "unknown"}/video/${videoId}`,
      description: desc,
      hashtags,
      viewsCount: (stats["playCount"] as number) ?? 0,
      likesCount: (stats["diggCount"] as number) ?? 0,
      commentsCount: (stats["commentCount"] as number) ?? 0,
      sharesCount: (stats["shareCount"] as number) ?? 0,
      savesCount: (stats["collectCount"] as number) ?? 0,
      playCount: (stats["playCount"] as number) ?? 0,
      duration: (video["duration"] as number) ?? 0,
      publishedAt: createTime ? new Date(createTime * 1000) : new Date(),
      thumbnailUrl:
        (video["originCover"] as string) ??
        (video["cover"] as string) ??
        "",
      musicTitle: (music["title"] as string) ?? undefined,
      musicAuthor: (music["authorName"] as string) ?? undefined,
      authorUsername: (author["uniqueId"] as string) ?? "",
      authorFollowers: (authorStats["followerCount"] as number) ?? 0,
      isAd: (item["isAd"] as boolean) ?? false,
      scrapedAt: new Date(),
    };
  } catch {
    return null;
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export async function closeTikTokBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}
