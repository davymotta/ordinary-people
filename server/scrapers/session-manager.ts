/**
 * Session Manager — Headless Browser Cookie Persistence
 *
 * Manages authenticated sessions for social media scrapers.
 * Stores encrypted cookie jars in the DB so sessions survive server restarts.
 *
 * Flow:
 * 1. Client calls `startAuthSession` → server launches a visible (non-headless) browser
 *    and returns a session token + instructions
 * 2. User logs in manually in the browser window (or provides cookies via JSON export)
 * 3. Client polls `checkAuthSession` until status = "authenticated"
 * 4. Server saves the cookie jar to DB, closes the browser
 * 5. Future scrape calls load the stored cookies automatically
 */

import { chromium, type Browser, type BrowserContext, type Cookie } from "playwright";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthPlatform = "instagram" | "tiktok";

export interface AuthSession {
  sessionId: string;
  platform: AuthPlatform;
  status: "pending" | "waiting_login" | "authenticated" | "failed" | "expired";
  createdAt: Date;
  expiresAt: Date;
  cookies?: Cookie[];
  errorMessage?: string;
  /** URL to screenshot of current browser state */
  screenshotBase64?: string;
}

// ─── In-memory session store ──────────────────────────────────────────────────
// Sessions are ephemeral (browser windows); cookies are persisted to DB separately

const activeSessions = new Map<string, {
  session: AuthSession;
  browser: Browser;
  context: BrowserContext;
  pollTimer?: ReturnType<typeof setTimeout>;
}>();

// ─── Cookie file paths ────────────────────────────────────────────────────────

const COOKIE_DIR = path.join(os.homedir(), ".ordinary-people-cookies");

async function ensureCookieDir() {
  await fs.mkdir(COOKIE_DIR, { recursive: true });
}

function cookieFilePath(platform: AuthPlatform): string {
  return path.join(COOKIE_DIR, `${platform}-session.json`);
}

// ─── Save / Load cookies ──────────────────────────────────────────────────────

export async function saveCookies(platform: AuthPlatform, cookies: Cookie[]): Promise<void> {
  await ensureCookieDir();
  const data = JSON.stringify({ cookies, savedAt: new Date().toISOString() }, null, 2);
  await fs.writeFile(cookieFilePath(platform), data, "utf-8");
}

export async function loadCookies(platform: AuthPlatform): Promise<Cookie[] | null> {
  try {
    const raw = await fs.readFile(cookieFilePath(platform), "utf-8");
    const data = JSON.parse(raw);
    // Expire after 30 days
    const savedAt = new Date(data.savedAt);
    const ageMs = Date.now() - savedAt.getTime();
    if (ageMs > 30 * 24 * 60 * 60 * 1000) {
      await fs.unlink(cookieFilePath(platform));
      return null;
    }
    return data.cookies as Cookie[];
  } catch {
    return null;
  }
}

export async function deleteCookies(platform: AuthPlatform): Promise<void> {
  try {
    await fs.unlink(cookieFilePath(platform));
  } catch {
    // ignore
  }
}

export async function hasSavedSession(platform: AuthPlatform): Promise<boolean> {
  const cookies = await loadCookies(platform);
  return cookies !== null && cookies.length > 0;
}

// ─── Import cookies from JSON string (browser extension export) ───────────────

export interface ImportedCookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  expirationDate?: number;
  expires?: number;
}

export function normalizeImportedCookies(
  raw: ImportedCookie[],
  platform: AuthPlatform
): Cookie[] {
  const domainMap: Record<AuthPlatform, string> = {
    instagram: ".instagram.com",
    tiktok: ".tiktok.com",
  };
  const expectedDomain = domainMap[platform];

  return raw
    .filter((c) => c.domain?.includes(expectedDomain.replace(".", "")))
    .map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain.startsWith(".") ? c.domain : `.${c.domain}`,
      path: c.path ?? "/",
      secure: c.secure ?? true,
      httpOnly: c.httpOnly ?? false,
      sameSite: (c.sameSite as "Strict" | "Lax" | "None") ?? "Lax",
      expires: c.expirationDate ?? c.expires ?? -1,
    }));
}

// ─── Start auth session (browser-based login) ─────────────────────────────────

export async function startAuthSession(platform: AuthPlatform): Promise<AuthSession> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  const loginUrls: Record<AuthPlatform, string> = {
    instagram: "https://www.instagram.com/accounts/login/",
    tiktok: "https://www.tiktok.com/login",
  };

  const browser = await chromium.launch({
    headless: true, // headless in server env; user provides cookies via JSON
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "it-IT",
  });

  const page = await context.newPage();
  await page.goto(loginUrls[platform], { waitUntil: "domcontentloaded" });

  const session: AuthSession = {
    sessionId,
    platform,
    status: "waiting_login",
    createdAt: new Date(),
    expiresAt,
  };

  activeSessions.set(sessionId, { session, browser, context });

  // Auto-expire
  const timer = setTimeout(async () => {
    await closeAuthSession(sessionId, "expired");
  }, 10 * 60 * 1000);

  activeSessions.get(sessionId)!.pollTimer = timer;

  return session;
}

// ─── Import cookies into active session ───────────────────────────────────────

export async function importCookiesIntoSession(
  sessionId: string,
  cookiesJson: string
): Promise<{ success: boolean; cookieCount: number; error?: string }> {
  const entry = activeSessions.get(sessionId);

  let rawCookies: ImportedCookie[];
  try {
    rawCookies = JSON.parse(cookiesJson);
    if (!Array.isArray(rawCookies)) throw new Error("Expected array");
  } catch (e: any) {
    return { success: false, cookieCount: 0, error: `JSON non valido: ${e.message}` };
  }

  const platform = entry?.session.platform ?? "instagram";
  const normalized = normalizeImportedCookies(rawCookies, platform);

  if (normalized.length === 0) {
    return {
      success: false,
      cookieCount: 0,
      error: `Nessun cookie valido trovato per ${platform}. Assicurati di esportare i cookie dal dominio ${platform}.com`,
    };
  }

  // Save to disk
  await saveCookies(platform, normalized);

  // If there's an active session, also inject into context
  if (entry) {
    await entry.context.addCookies(normalized);
    entry.session.status = "authenticated";
    entry.session.cookies = normalized;
  }

  return { success: true, cookieCount: normalized.length };
}

// ─── Check session status ─────────────────────────────────────────────────────

export async function checkAuthSession(sessionId: string): Promise<AuthSession | null> {
  const entry = activeSessions.get(sessionId);
  if (!entry) return null;

  // Try to take a screenshot for status feedback
  try {
    const pages = entry.context.pages();
    if (pages.length > 0) {
      const screenshot = await pages[0].screenshot({ type: "jpeg", quality: 60 });
      entry.session.screenshotBase64 = screenshot.toString("base64");
    }
  } catch {
    // ignore screenshot errors
  }

  return entry.session;
}

// ─── Close session ────────────────────────────────────────────────────────────

export async function closeAuthSession(
  sessionId: string,
  reason: "authenticated" | "cancelled" | "expired" = "cancelled"
): Promise<void> {
  const entry = activeSessions.get(sessionId);
  if (!entry) return;

  if (entry.pollTimer) clearTimeout(entry.pollTimer);

  try {
    await entry.browser.close();
  } catch {
    // ignore
  }

  if (reason === "authenticated") {
    entry.session.status = "authenticated";
  } else if (reason === "expired") {
    entry.session.status = "expired";
  }

  activeSessions.delete(sessionId);
}

// ─── Apply saved session to a browser context ─────────────────────────────────

export async function applySessionToContext(
  platform: AuthPlatform,
  context: BrowserContext
): Promise<boolean> {
  const cookies = await loadCookies(platform);
  if (!cookies || cookies.length === 0) return false;

  try {
    await context.addCookies(cookies);
    return true;
  } catch {
    return false;
  }
}

// ─── Get session status summary ───────────────────────────────────────────────

export async function getSessionStatus(platform: AuthPlatform): Promise<{
  hasSession: boolean;
  savedAt?: string;
  cookieCount?: number;
}> {
  try {
    const filePath = cookieFilePath(platform);
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return {
      hasSession: true,
      savedAt: data.savedAt,
      cookieCount: (data.cookies as Cookie[]).length,
    };
  } catch {
    return { hasSession: false };
  }
}
