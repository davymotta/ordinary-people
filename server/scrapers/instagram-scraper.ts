/**
 * Instagram Scraper — Playwright headless
 *
 * Scrapes public Instagram profiles and posts without login.
 * Uses Instagram's internal GraphQL/JSON endpoints intercepted via network requests.
 *
 * Strategy:
 * 1. Navigate to the public profile page
 * 2. Intercept the API response that contains profile/post data
 * 3. Parse the JSON payload — no DOM parsing needed
 *
 * Limitations:
 * - Requires residential proxy for production (datacenter IPs are blocked)
 * - Rate limit: ~200 req/hour per IP
 * - Likes are hidden for most accounts (Instagram hid them in 2021)
 * - Views are available for Reels/Videos
 */

import { chromium, type Browser, type BrowserContext } from "playwright";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstagramProfile {
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  profilePicUrl: string;
  externalUrl?: string;
  isBusinessAccount: boolean;
  businessCategory?: string;
  scrapedAt: Date;
}

export interface InstagramPost {
  postId: string;
  shortcode: string;
  url: string;
  contentType: "image" | "video" | "carousel" | "reel";
  caption: string;
  hashtags: string[];
  likesCount: number | null;
  commentsCount: number;
  viewsCount?: number;
  playsCount?: number;
  publishedAt: Date;
  thumbnailUrl: string;
  isSponsored: boolean;
  locationName?: string;
  taggedUsers: string[];
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
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
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
      "Upgrade-Insecure-Requests": "1",
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

function findEdges(obj: unknown): unknown[] | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as AnyObj;
  const media = asObj(o["edge_owner_to_timeline_media"]);
  if (Array.isArray(media["edges"])) return media["edges"] as unknown[];
  for (const key of Object.keys(o)) {
    const result = findEdges(o[key]);
    if (result) return result;
  }
  return null;
}

function parseInstagramNode(node: AnyObj): InstagramPost | null {
  try {
    const shortcode = (node["shortcode"] as string) ?? "";
    if (!shortcode) return null;

    const typename = (node["__typename"] as string) ?? "";
    let contentType: InstagramPost["contentType"] = "image";
    if (typename === "GraphVideo" || node["is_video"]) contentType = "video";
    else if (typename === "GraphSidecar") contentType = "carousel";
    if (node["product_type"] === "clips") contentType = "reel";

    const captionEdges = asObj(node["edge_media_to_caption"])["edges"];
    const caption =
      Array.isArray(captionEdges) && captionEdges.length > 0
        ? (asObj(asObj(captionEdges[0])["node"])["text"] as string) ?? ""
        : "";
    const hashtags = extractHashtags(caption);

    const likesCount =
      (asObj(node["edge_media_preview_like"])["count"] as number) ??
      (asObj(node["edge_liked_by"])["count"] as number) ??
      null;

    const commentsCount =
      (asObj(node["edge_media_to_comment"])["count"] as number) ??
      (asObj(node["edge_media_preview_comment"])["count"] as number) ??
      0;

    const viewsCount = node["is_video"]
      ? ((node["video_view_count"] as number) ?? undefined)
      : undefined;

    const playsCount = (node["video_play_count"] as number) ?? undefined;

    const thumbnailUrl =
      (node["thumbnail_src"] as string) ??
      (node["display_url"] as string) ??
      "";

    const takenAt = (node["taken_at_timestamp"] as number) ?? 0;
    const publishedAt = takenAt ? new Date(takenAt * 1000) : new Date();

    const taggedEdges = asObj(node["edge_media_to_tagged_user"])["edges"];
    const taggedUsers = Array.isArray(taggedEdges)
      ? (taggedEdges as unknown[])
          .map(
            (e) =>
              (asObj(asObj(asObj(e)["node"])["user"])["username"] as string) ??
              ""
          )
          .filter(Boolean)
      : [];

    const locationName =
      (asObj(node["location"])["name"] as string) ?? undefined;

    return {
      postId: (node["id"] as string) ?? shortcode,
      shortcode,
      url: `https://www.instagram.com/p/${shortcode}/`,
      contentType,
      caption,
      hashtags,
      likesCount,
      commentsCount,
      viewsCount,
      playsCount,
      publishedAt,
      thumbnailUrl,
      isSponsored: (node["is_ad"] as boolean) ?? false,
      locationName,
      taggedUsers,
      scrapedAt: new Date(),
    };
  } catch {
    return null;
  }
}

// ─── Instagram Profile Scraper ────────────────────────────────────────────────

export async function scrapeInstagramProfile(
  username: string
): Promise<InstagramProfile | null> {
  const browser = await getBrowser();
  const context = await createStealthContext(browser);
  const page = await context.newPage();

  try {
    let profileData: AnyObj | null = null;

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("__a=1") || url.includes("graphql/query")) {
        try {
          const json = await response.json() as AnyObj;
          const graphql = asObj(json["graphql"]);
          const data = asObj(json["data"]);
          if (graphql["user"] || data["user"]) {
            profileData = json;
          }
        } catch {
          // Not JSON
        }
      }
    });

    await page.goto(
      `https://www.instagram.com/${username}/?__a=1&__d=dis`,
      { waitUntil: "networkidle", timeout: 30000 }
    );

    // Fallback: try profile page
    if (!profileData) {
      await page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      const sharedData = await page.evaluate((): unknown => {
        const scripts = Array.from(document.querySelectorAll("script"));
        for (const script of scripts) {
          const text = script.textContent ?? "";
          if (text.includes("window._sharedData")) {
            const idx = text.indexOf("{");
            const end = text.lastIndexOf("}");
            if (idx >= 0 && end > idx) {
              try {
                return JSON.parse(text.slice(idx, end + 1));
              } catch {
                return null;
              }
            }
          }
        }
        return null;
      });

      if (sharedData) profileData = sharedData as AnyObj;
    }

    if (!profileData) return null;

    const graphql = asObj(profileData["graphql"]);
    const data = asObj(profileData["data"]);
    const entryData = asObj(profileData["entry_data"]);
    const profilePages = entryData["ProfilePage"];
    const firstPage = Array.isArray(profilePages)
      ? asObj(asObj(profilePages[0])["graphql"])
      : null;

    const u: AnyObj =
      (graphql["user"] as AnyObj) ??
      (data["user"] as AnyObj) ??
      (firstPage ? (firstPage["user"] as AnyObj) : null) ??
      {};

    if (!u["username"]) return null;

    return {
      username: (u["username"] as string) ?? username,
      fullName: (u["full_name"] as string) ?? "",
      biography: (u["biography"] as string) ?? "",
      followersCount: (asObj(u["edge_followed_by"])["count"] as number) ?? 0,
      followingCount: (asObj(u["edge_follow"])["count"] as number) ?? 0,
      postsCount:
        (asObj(u["edge_owner_to_timeline_media"])["count"] as number) ?? 0,
      isVerified: (u["is_verified"] as boolean) ?? false,
      profilePicUrl:
        (u["profile_pic_url_hd"] as string) ??
        (u["profile_pic_url"] as string) ??
        "",
      externalUrl: (u["external_url"] as string) ?? undefined,
      isBusinessAccount: (u["is_business_account"] as boolean) ?? false,
      businessCategory: (u["business_category_name"] as string) ?? undefined,
      scrapedAt: new Date(),
    };
  } catch (err) {
    console.error(`[Instagram Scraper] Error scraping profile ${username}:`, err);
    return null;
  } finally {
    await page.close();
    await context.close();
  }
}

// ─── Instagram Posts Scraper ──────────────────────────────────────────────────

export async function scrapeInstagramPosts(
  username: string,
  limit = 12
): Promise<InstagramPost[]> {
  const browser = await getBrowser();
  const context = await createStealthContext(browser);
  const page = await context.newPage();
  const posts: InstagramPost[] = [];

  try {
    const interceptedData: AnyObj[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (
        url.includes("graphql/query") ||
        url.includes("api/v1/feed/user") ||
        url.includes("?__a=1")
      ) {
        try {
          const json = await response.json() as AnyObj;
          interceptedData.push(json);
        } catch {
          // Not JSON
        }
      }
    });

    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.waitForTimeout(2000);

    for (const data of interceptedData) {
      const graphql = asObj(data["graphql"]);
      const dataField = asObj(data["data"]);
      const userG = asObj(graphql["user"]);
      const userD = asObj(dataField["user"]);
      const media = asObj(userG["edge_owner_to_timeline_media"] ?? userD["edge_owner_to_timeline_media"]);
      const edges = media["edges"];

      if (Array.isArray(edges)) {
        for (const edge of (edges as unknown[]).slice(0, limit)) {
          const node = asObj(asObj(edge)["node"]);
          const post = parseInstagramNode(node);
          if (post) posts.push(post);
        }
        break;
      }
    }

    // Fallback: extract from page source
    if (posts.length === 0) {
      const edges = await page.evaluate((): unknown[] | null => {
        const scripts = Array.from(
          document.querySelectorAll("script[type='application/json']")
        );
        for (const script of scripts) {
          const text = script.textContent ?? "";
          if (text.includes("edge_owner_to_timeline_media")) {
            try {
              const parsed = JSON.parse(text) as Record<string, unknown>;
              const findEdgesInner = (obj: unknown): unknown[] | null => {
                if (!obj || typeof obj !== "object") return null;
                const o = obj as Record<string, unknown>;
                const m = o["edge_owner_to_timeline_media"] as Record<string, unknown> | undefined;
                if (m && Array.isArray(m["edges"])) return m["edges"] as unknown[];
                for (const k of Object.keys(o)) {
                  const r = findEdgesInner(o[k]);
                  if (r) return r;
                }
                return null;
              };
              return findEdgesInner(parsed);
            } catch {
              return null;
            }
          }
        }
        return null;
      });

      if (edges) {
        for (const edge of (edges as unknown[]).slice(0, limit)) {
          const node = asObj(asObj(edge)["node"] ?? edge);
          const post = parseInstagramNode(node);
          if (post) posts.push(post);
        }
      }
    }

    return posts;
  } catch (err) {
    console.error(`[Instagram Scraper] Error scraping posts for ${username}:`, err);
    return posts;
  } finally {
    await page.close();
    await context.close();
  }
}

// ─── Single Post Scraper ──────────────────────────────────────────────────────

export async function scrapeInstagramPost(
  urlOrShortcode: string
): Promise<InstagramPost | null> {
  const browser = await getBrowser();
  const context = await createStealthContext(browser);
  const page = await context.newPage();

  try {
    const shortcode = urlOrShortcode.includes("instagram.com")
      ? urlOrShortcode.split("/p/")[1]?.split("/")[0] ??
        urlOrShortcode.split("/reel/")[1]?.split("/")[0]
      : urlOrShortcode;

    if (!shortcode) return null;

    let postData: AnyObj | null = null;

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("graphql/query") || url.includes("?__a=1")) {
        try {
          const json = await response.json() as AnyObj;
          const graphql = asObj(json["graphql"]);
          const data = asObj(json["data"]);
          if (graphql["shortcode_media"] || data["shortcode_media"]) {
            postData = json;
          }
        } catch {
          // Not JSON
        }
      }
    });

    await page.goto(
      `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`,
      { waitUntil: "networkidle", timeout: 30000 }
    );

    if (!postData) {
      await page.goto(`https://www.instagram.com/p/${shortcode}/`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      await page.waitForTimeout(2000);
    }

    if (!postData) return null;

    const graphql = asObj(postData["graphql"]);
    const data = asObj(postData["data"]);
    const media =
      (graphql["shortcode_media"] as AnyObj) ??
      (data["shortcode_media"] as AnyObj);

    if (!media) return null;

    return parseInstagramNode(media);
  } catch (err) {
    console.error(
      `[Instagram Scraper] Error scraping post ${urlOrShortcode}:`,
      err
    );
    return null;
  } finally {
    await page.close();
    await context.close();
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}
