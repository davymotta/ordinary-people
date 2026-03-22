/**
 * Brand Researcher
 *
 * Dato un nome brand (e opzionalmente un sito web e handle social),
 * raccoglie dati strutturati dal web:
 *   1. Web search per trovare sito ufficiale, social, notizie recenti
 *   2. Fetch della homepage per analizzare posizionamento e tone of voice
 *   3. Ricerca social (YouTube, Twitter) per metriche di presenza digitale
 *   4. Ricerca competitor tramite query LLM
 *
 * Ritorna un oggetto `BrandRawData` che verrà poi processato da brand-profiler.ts
 */

import { callDataApi } from "../_core/dataApi";
import { invokeLLM } from "../_core/llm";

// ─── Types ────────────────────────────────────────────────────────────

export interface SocialPresence {
  platform: string;
  handle?: string;
  followers?: number;
  contentType?: string;
  engagementLevel?: "low" | "moderate" | "high";
  url?: string;
}

export interface BrandRawData {
  brandName: string;
  websiteUrl?: string;
  homepageContent?: string; // testo estratto dalla homepage
  homepageSummary?: string; // riassunto LLM della homepage
  socialPresences: SocialPresence[];
  youtubeChannels?: Array<{
    title: string;
    channelId: string;
    subscribers?: string;
    description?: string;
  }>;
  twitterProfile?: {
    username: string;
    followers?: number;
    description?: string;
  };
  newsSnippets?: string[]; // ultime notizie sul brand
  searchResults?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  researchTimestamp: string;
  errors: string[]; // errori non bloccanti durante la ricerca
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Cerca il brand su YouTube per trovare canali ufficiali e contenuti.
 */
async function searchYouTube(brandName: string): Promise<BrandRawData["youtubeChannels"]> {
  try {
    const result = await callDataApi("Youtube/search", {
      query: { q: `${brandName} official`, hl: "it", gl: "IT" },
    }) as any;

    const channels: BrandRawData["youtubeChannels"] = [];
    const contents = result?.contents ?? [];

    for (const item of contents.slice(0, 5)) {
      if (item?.type === "channel" && item?.channel) {
        channels.push({
          title: item.channel.title ?? "",
          channelId: item.channel.channelId ?? "",
          subscribers: item.channel.subscriberCountText ?? undefined,
          description: item.channel.descriptionSnippet ?? undefined,
        });
      }
    }

    return channels;
  } catch {
    return [];
  }
}

/**
 * Cerca il profilo Twitter del brand.
 */
async function searchTwitter(brandName: string): Promise<BrandRawData["twitterProfile"]> {
  try {
    // Cerca il profilo Twitter tramite ricerca YouTube (fallback: solo nome)
    const username = brandName.toLowerCase().replace(/\s+/g, "");
    const result = await callDataApi("Twitter/get_user_profile_by_username", {
      query: { username },
    }) as any;

    const userData = result?.result?.data?.user?.result;
    if (!userData) return undefined;

    const legacy = userData?.legacy ?? {};
    const core = userData?.core ?? {};

    return {
      username: core?.screen_name ?? username,
      followers: legacy?.followers_count ?? undefined,
      description: legacy?.description ?? undefined,
    };
  } catch {
    return undefined;
  }
}

/**
 * Recupera il contenuto testuale di una homepage tramite fetch.
 * Estrae solo il testo visibile (no HTML, no script).
 */
async function fetchHomepage(url: string): Promise<string> {
  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrdinaryPeople/1.0; +https://ordinarypeople.ai)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return "";

    const html = await response.text();

    // Estrazione testo grezzo: rimuovi tag HTML, script, style
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000); // max 4000 caratteri per non saturare il contesto LLM

    return text;
  } catch {
    return "";
  }
}

/**
 * Usa l'LLM per riassumere il contenuto della homepage e estrarre
 * informazioni strutturate: posizionamento, tone of voice, prodotti/servizi.
 */
async function summarizeHomepage(brandName: string, homepageText: string): Promise<string> {
  if (!homepageText || homepageText.length < 50) return "";

  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Sei un analista di brand. Analizza il testo di una homepage e restituisci un riassunto strutturato in JSON.
Rispondi SOLO con JSON valido, nessun testo aggiuntivo.`,
        },
        {
          role: "user",
          content: `Brand: "${brandName}"

Testo homepage:
${homepageText}

Restituisci JSON con questa struttura:
{
  "positioning": "luxury|premium|mid-market|mass-market|value",
  "sector": "settore principale (es. footwear, food, fashion, tech)",
  "toneOfVoice": ["aggettivo1", "aggettivo2", "aggettivo3"],
  "brandValues": ["valore1", "valore2"],
  "mainProducts": ["prodotto/servizio principale"],
  "priceRange": { "min": null, "max": null, "currency": "EUR" },
  "targetHint": "descrizione breve del target percepito",
  "aesthetic": "descrizione estetica del brand"
}`,
        },
      ],
      maxTokens: 500,
    });

    const content = result.choices[0]?.message?.content;
    if (typeof content !== "string") return "";

    // Estrai JSON dalla risposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : "";
  } catch {
    return "";
  }
}

/**
 * Usa l'LLM per identificare i competitor principali del brand.
 */
async function identifyCompetitors(
  brandName: string,
  sector: string,
  positioning: string
): Promise<Array<{ name: string; positioning: string }>> {
  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Sei un esperto di analisi competitiva. Identifica i competitor diretti di un brand.
Rispondi SOLO con JSON valido.`,
        },
        {
          role: "user",
          content: `Brand: "${brandName}"
Settore: ${sector}
Posizionamento: ${positioning}

Identifica 3-5 competitor diretti. Rispondi con JSON:
[
  { "name": "Nome Competitor", "positioning": "posizionamento" },
  ...
]`,
        },
      ],
      maxTokens: 300,
    });

    const content = result.choices[0]?.message?.content;
    if (typeof content !== "string") return [];

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

// ─── Main Export ──────────────────────────────────────────────────────

/**
 * Ricerca autonoma del brand.
 * Raccoglie dati da web search, homepage, social media.
 *
 * @param brandName Nome del brand (es. "Bata Italia")
 * @param websiteUrl URL del sito (opzionale, se non fornito viene cercato)
 * @param socialHandles Handle social opzionali { instagram?, twitter?, tiktok? }
 * @param onProgress Callback per aggiornamenti in tempo reale (per la UI)
 */
export async function researchBrand(
  brandName: string,
  websiteUrl?: string,
  socialHandles?: { instagram?: string; twitter?: string; tiktok?: string },
  onProgress?: (step: string) => void
): Promise<BrandRawData> {
  const errors: string[] = [];
  const raw: BrandRawData = {
    brandName,
    websiteUrl,
    homepageContent: "",
    homepageSummary: "",
    socialPresences: [],
    youtubeChannels: [],
    twitterProfile: undefined,
    newsSnippets: [],
    searchResults: [],
    researchTimestamp: new Date().toISOString(),
    errors,
  };

  // Step 1: Fetch homepage
  onProgress?.(`Analizzando ${websiteUrl ?? brandName.toLowerCase().replace(/\s+/g, "") + ".com"}...`);

  const urlToFetch = websiteUrl ?? `${brandName.toLowerCase().replace(/\s+/g, "")}.com`;
  const homepageText = await fetchHomepage(urlToFetch);
  raw.homepageContent = homepageText;

  if (homepageText) {
    onProgress?.("Interpretando il posizionamento del brand...");
    raw.homepageSummary = await summarizeHomepage(brandName, homepageText);
  } else {
    errors.push(`Homepage non raggiungibile: ${urlToFetch}`);
  }

  // Step 2: YouTube search
  onProgress?.(`Cercando presenza YouTube...`);
  raw.youtubeChannels = await searchYouTube(brandName);

  if (raw.youtubeChannels && raw.youtubeChannels.length > 0) {
    raw.socialPresences.push({
      platform: "youtube",
      handle: raw.youtubeChannels[0].channelId,
      contentType: "video",
    });
  }

  // Step 3: Twitter/X search
  onProgress?.(`Cercando profilo Twitter/X...`);
  const twitterHandle = socialHandles?.twitter ?? brandName.toLowerCase().replace(/\s+/g, "");
  raw.twitterProfile = await searchTwitter(twitterHandle);

  if (raw.twitterProfile) {
    raw.socialPresences.push({
      platform: "twitter",
      handle: `@${raw.twitterProfile.username}`,
      followers: raw.twitterProfile.followers,
    });
  }

  // Step 4: Instagram (placeholder — non abbiamo API diretta)
  if (socialHandles?.instagram) {
    raw.socialPresences.push({
      platform: "instagram",
      handle: socialHandles.instagram,
      url: `https://instagram.com/${socialHandles.instagram.replace("@", "")}`,
    });
  }

  // Step 5: Identify competitors via LLM
  onProgress?.("Identificando competitor diretti...");

  let sector = "retail";
  let positioning = "mid-market";

  if (raw.homepageSummary) {
    try {
      const parsed = JSON.parse(raw.homepageSummary);
      sector = parsed.sector ?? sector;
      positioning = parsed.positioning ?? positioning;
    } catch {
      // ignore parse error
    }
  }

  const competitors = await identifyCompetitors(brandName, sector, positioning);
  raw.searchResults = competitors.map(c => ({
    title: c.name,
    url: "",
    snippet: `Competitor: ${c.positioning}`,
  }));

  onProgress?.("Ricerca completata.");

  return raw;
}
