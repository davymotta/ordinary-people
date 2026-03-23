/**
 * Hook Analyser — Behavioral Intelligence Engine
 *
 * Analizza hook, caption, script o prime frasi di video usando Claude.
 * Restituisce un JSON strutturato con:
 * - hookScore (0-100)
 * - verdict (una frase tagliente)
 * - emotionalTone
 * - triggers comportamentali (Cialdini, JTBD, Narrative Tension)
 * - dimensions (5 assi: patternInterrupt, curiosityGap, emotionalActivation, clarityOfValue, scrollStop)
 * - platformForecast (instagram, tiktok, linkedin: low|medium|high)
 * - strengths / weaknesses
 * - rewrites ottimizzate
 *
 * Integrazione nel sistema:
 * 1. GTE Harvest: analizza automaticamente titolo/caption di ogni post raccolto
 * 2. Onboarding: analizza i top post del brand per costruire il "hook fingerprint"
 * 3. Retraining: confronta hookScore con performance reale per rilevare deriva del modello
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HookTrigger {
  name: string;
  strength: 1 | 2 | 3 | 4 | 5;
  description: string;
}

export interface HookDimensions {
  patternInterrupt: number;   // 0-100: quanto rompe il pattern di scroll
  curiosityGap: number;       // 0-100: quanto crea tensione informativa
  emotionalActivation: number; // 0-100: intensità emotiva
  clarityOfValue: number;     // 0-100: chiarezza del valore offerto
  scrollStop: number;         // 0-100: potere di fermare lo scroll
}

export interface PlatformForecast {
  instagram: "low" | "medium" | "high";
  tiktok: "low" | "medium" | "high";
  linkedin: "low" | "medium" | "high";
}

export interface HookRewrite {
  label: string;  // es. "FOMO Version", "Authority Version", "Curiosity Gap Version"
  text: string;
}

export interface HookAnalysis {
  hookScore: number;
  verdict: string;
  emotionalTone: string;
  triggers: HookTrigger[];
  dimensions: HookDimensions;
  platformForecast: PlatformForecast;
  strengths: string[];
  weaknesses: string[];
  rewrites: HookRewrite[];
  // Metadata
  analyzedAt: Date;
  inputText: string;
  hasImage: boolean;
  // Derived signals for GTE
  dominantTrigger?: string;
  gteSignals?: {
    resonanceBoost: number;    // +/- adjustment for Resonance dimension based on hook quality
    depthSignal: number;       // curiosityGap → Depth
    amplificationSignal: number; // scrollStop + shareability → Amplification
    polarityRisk: number;      // emotional extremes → Polarity risk
  };
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const HOOK_ANALYSER_SYSTEM_PROMPT = `You are an elite behavioral hook analyst specializing in social media content performance. You analyze hooks using:

- BEHAVIORAL TRIGGERS: Social proof, scarcity, authority, reciprocity, novelty, FOMO, loss aversion, curiosity gap, pattern interrupt, tribal identity
- COGNITIVE FRAMEWORKS: Cialdini's 7 principles, Jobs-To-Be-Done, Narrative Tension, Emotional Activation Theory
- PLATFORM DYNAMICS: Scroll-stopping power, retention curve, comment bait, share triggers, save triggers
- CONTEXTUAL ANALYTICS: Tone-audience fit, format effectiveness, first-3-seconds rule

Analyze the provided hook/content and return ONLY a valid JSON object with this exact structure:
{
  "hookScore": <0-100 integer>,
  "verdict": "<one punchy sentence verdict>",
  "emotionalTone": "<primary emotional tone>",
  "triggers": [
    { "name": "<trigger name>", "strength": <1-5>, "description": "<short explanation>" }
  ],
  "dimensions": {
    "patternInterrupt": <0-100>,
    "curiosityGap": <0-100>,
    "emotionalActivation": <0-100>,
    "clarityOfValue": <0-100>,
    "scrollStop": <0-100>
  },
  "platformForecast": {
    "instagram": "<low|medium|high>",
    "tiktok": "<low|medium|high>",
    "linkedin": "<low|medium|high>"
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "rewrites": [
    { "label": "<rewrite style>", "text": "<improved hook version>" }
  ]
}

Be direct, sharp, and insightful. No fluff. Behave like a senior strategist who has analyzed 10,000+ hooks.`;

// ─── Core Analysis Function ───────────────────────────────────────────────────

/**
 * Analyzes a hook/caption using Claude.
 * Uses the built-in Forge API (same as the rest of the system).
 */
export async function analyzeHook(
  text: string,
  options: {
    imageBase64?: string;
    imageMediaType?: string;
    brandContext?: string;
    platform?: string;
  } = {}
): Promise<HookAnalysis> {
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL ?? "https://api.manus.im/forge/v1";

  if (!apiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY not configured");
  }

  // Build user message content
  const content: Array<Record<string, unknown>> = [];

  // Add image if provided
  if (options.imageBase64 && options.imageMediaType) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: options.imageMediaType,
        data: options.imageBase64,
      },
    });
  }

  // Build text prompt
  let prompt = `Analyze this hook:\n\n${text}`;
  if (options.brandContext) {
    prompt += `\n\nBrand context: ${options.brandContext}`;
  }
  if (options.platform) {
    prompt += `\nPrimary platform: ${options.platform}`;
  }
  if (!text.trim() && options.imageBase64) {
    prompt = "Analyze the hook visible in this image/content.";
  }

  content.push({ type: "text", text: prompt });

  // Call Claude via Forge API
  const response = await fetch(`${apiUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1200,
      system: HOOK_ANALYSER_SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hook Analyser API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const rawText = (data["content"] as Array<Record<string, unknown>>)
    ?.map((b) => (b["text"] as string) || "")
    .join("")
    .trim() ?? "";

  // Parse JSON response
  const clean = rawText.replace(/```json|```/g, "").trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`Hook Analyser returned invalid JSON: ${clean.slice(0, 200)}`);
  }

  // Validate and cast
  const analysis = parsed as {
    hookScore: number;
    verdict: string;
    emotionalTone: string;
    triggers: HookTrigger[];
    dimensions: HookDimensions;
    platformForecast: PlatformForecast;
    strengths: string[];
    weaknesses: string[];
    rewrites: HookRewrite[];
  };

  // Derive GTE signals from hook analysis
  const gteSignals = deriveGteSignals(analysis);

  // Find dominant trigger
  const dominantTrigger = analysis.triggers?.length > 0
    ? analysis.triggers.reduce((a, b) => (a.strength >= b.strength ? a : b)).name
    : undefined;

  return {
    ...analysis,
    analyzedAt: new Date(),
    inputText: text,
    hasImage: !!options.imageBase64,
    dominantTrigger,
    gteSignals,
  };
}

// ─── GTE Signal Derivation ────────────────────────────────────────────────────

/**
 * Derives GTE dimension adjustments from hook analysis.
 * These signals are used to enrich the GTE normalisation vector.
 *
 * Mapping:
 * - Resonance boost: hookScore → how much the hook amplifies organic reach
 * - Depth signal: curiosityGap → how much the hook drives saves/watch-time (Depth)
 * - Amplification signal: scrollStop + platformForecast → share/comment potential
 * - Polarity risk: emotionalActivation extremes → risk of polarizing reactions
 */
function deriveGteSignals(analysis: {
  hookScore: number;
  dimensions: HookDimensions;
  platformForecast: PlatformForecast;
  triggers: HookTrigger[];
}): HookAnalysis["gteSignals"] {
  const { hookScore, dimensions, platformForecast, triggers } = analysis;

  // Resonance boost: normalized hookScore → [-0.3, +0.3] adjustment
  const resonanceBoost = ((hookScore - 50) / 50) * 0.3;

  // Depth signal: curiosityGap drives saves and watch-time
  const depthSignal = dimensions.curiosityGap / 100;

  // Amplification: scrollStop + instagram/tiktok forecast
  const platformBonus =
    (platformForecast.instagram === "high" ? 0.2 : platformForecast.instagram === "medium" ? 0.1 : 0) +
    (platformForecast.tiktok === "high" ? 0.2 : platformForecast.tiktok === "medium" ? 0.1 : 0);
  const amplificationSignal = Math.min(1, dimensions.scrollStop / 100 + platformBonus);

  // Polarity risk: very high emotional activation with loss aversion or tribal identity triggers
  const hasHighRiskTriggers = triggers.some((t) =>
    ["loss aversion", "tribal identity", "fear", "outrage", "scarcity"].some((r) =>
      t.name.toLowerCase().includes(r)
    ) && t.strength >= 4
  );
  const polarityRisk = hasHighRiskTriggers
    ? Math.min(1, dimensions.emotionalActivation / 100 * 1.5)
    : dimensions.emotionalActivation / 100 * 0.5;

  return {
    resonanceBoost: Math.round(resonanceBoost * 100) / 100,
    depthSignal: Math.round(depthSignal * 100) / 100,
    amplificationSignal: Math.round(amplificationSignal * 100) / 100,
    polarityRisk: Math.round(polarityRisk * 100) / 100,
  };
}

// ─── Batch Analysis for GTE Harvest ──────────────────────────────────────────

/**
 * Analyzes multiple posts in sequence (rate-limited to avoid API overload).
 * Used during GTE harvest to enrich all posts with hook analysis.
 */
export async function analyzePostsBatch(
  posts: Array<{ id: number; title?: string; caption?: string; platform?: string }>,
  brandContext?: string,
  options: { delayMs?: number; maxPosts?: number } = {}
): Promise<Map<number, HookAnalysis>> {
  const { delayMs = 500, maxPosts = 50 } = options;
  const results = new Map<number, HookAnalysis>();

  const postsToAnalyze = posts.slice(0, maxPosts);

  for (const post of postsToAnalyze) {
    const text = [post.title, post.caption].filter(Boolean).join("\n\n");
    if (!text.trim()) continue;

    try {
      const analysis = await analyzeHook(text, {
        brandContext,
        platform: post.platform,
      });
      results.set(post.id, analysis);
    } catch (err) {
      console.error(`[Hook Analyser] Failed to analyze post ${post.id}:`, err);
    }

    // Rate limit
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// ─── Brand Hook Fingerprint ───────────────────────────────────────────────────

/**
 * Aggregates hook analyses from multiple posts to build a brand's "hook fingerprint".
 * Used in onboarding to understand the brand's dominant communication style.
 */
export function buildBrandHookFingerprint(analyses: HookAnalysis[]): {
  avgHookScore: number;
  dominantEmotionalTone: string;
  topTriggers: Array<{ name: string; frequency: number; avgStrength: number }>;
  avgDimensions: HookDimensions;
  bestPlatform: "instagram" | "tiktok" | "linkedin";
  hookArchetype: string;
  gteProfile: {
    avgResonanceBoost: number;
    avgDepthSignal: number;
    avgAmplificationSignal: number;
    avgPolarityRisk: number;
  };
} {
  if (analyses.length === 0) {
    return {
      avgHookScore: 0,
      dominantEmotionalTone: "Unknown",
      topTriggers: [],
      avgDimensions: {
        patternInterrupt: 0,
        curiosityGap: 0,
        emotionalActivation: 0,
        clarityOfValue: 0,
        scrollStop: 0,
      },
      bestPlatform: "instagram",
      hookArchetype: "Undefined",
      gteProfile: { avgResonanceBoost: 0, avgDepthSignal: 0, avgAmplificationSignal: 0, avgPolarityRisk: 0 },
    };
  }

  // Average hook score
  const avgHookScore = Math.round(
    analyses.reduce((s, a) => s + a.hookScore, 0) / analyses.length
  );

  // Dominant emotional tone (most frequent)
  const toneCounts = new Map<string, number>();
  for (const a of analyses) {
    toneCounts.set(a.emotionalTone, (toneCounts.get(a.emotionalTone) ?? 0) + 1);
  }
  const dominantEmotionalTone = Array.from(toneCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Mixed";

  // Top triggers
  const triggerMap = new Map<string, { count: number; totalStrength: number }>();
  for (const a of analyses) {
    for (const t of a.triggers) {
      const existing = triggerMap.get(t.name) ?? { count: 0, totalStrength: 0 };
      triggerMap.set(t.name, {
        count: existing.count + 1,
        totalStrength: existing.totalStrength + t.strength,
      });
    }
  }
  const topTriggers = Array.from(triggerMap.entries())
    .map(([name, { count, totalStrength }]) => ({
      name,
      frequency: count,
      avgStrength: Math.round((totalStrength / count) * 10) / 10,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  // Average dimensions
  const avgDimensions: HookDimensions = {
    patternInterrupt: Math.round(analyses.reduce((s, a) => s + a.dimensions.patternInterrupt, 0) / analyses.length),
    curiosityGap: Math.round(analyses.reduce((s, a) => s + a.dimensions.curiosityGap, 0) / analyses.length),
    emotionalActivation: Math.round(analyses.reduce((s, a) => s + a.dimensions.emotionalActivation, 0) / analyses.length),
    clarityOfValue: Math.round(analyses.reduce((s, a) => s + a.dimensions.clarityOfValue, 0) / analyses.length),
    scrollStop: Math.round(analyses.reduce((s, a) => s + a.dimensions.scrollStop, 0) / analyses.length),
  };

  // Best platform
  const platformScores = { instagram: 0, tiktok: 0, linkedin: 0 };
  const levelScore = { high: 3, medium: 2, low: 1 };
  for (const a of analyses) {
    platformScores.instagram += levelScore[a.platformForecast.instagram];
    platformScores.tiktok += levelScore[a.platformForecast.tiktok];
    platformScores.linkedin += levelScore[a.platformForecast.linkedin];
  }
  const bestPlatform = (Object.entries(platformScores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "instagram") as "instagram" | "tiktok" | "linkedin";

  // Hook archetype based on dominant dimensions
  const hookArchetype = classifyHookArchetype(avgDimensions, topTriggers);

  // GTE profile averages
  const gteProfile = {
    avgResonanceBoost: Math.round(analyses.reduce((s, a) => s + (a.gteSignals?.resonanceBoost ?? 0), 0) / analyses.length * 100) / 100,
    avgDepthSignal: Math.round(analyses.reduce((s, a) => s + (a.gteSignals?.depthSignal ?? 0), 0) / analyses.length * 100) / 100,
    avgAmplificationSignal: Math.round(analyses.reduce((s, a) => s + (a.gteSignals?.amplificationSignal ?? 0), 0) / analyses.length * 100) / 100,
    avgPolarityRisk: Math.round(analyses.reduce((s, a) => s + (a.gteSignals?.polarityRisk ?? 0), 0) / analyses.length * 100) / 100,
  };

  return {
    avgHookScore,
    dominantEmotionalTone,
    topTriggers,
    avgDimensions,
    bestPlatform,
    hookArchetype,
    gteProfile,
  };
}

// ─── Hook Archetype Classifier ────────────────────────────────────────────────

function classifyHookArchetype(
  dims: HookDimensions,
  triggers: Array<{ name: string; frequency: number }>
): string {
  const topTriggerNames = triggers.slice(0, 3).map((t) => t.name.toLowerCase());

  // Luxury / Aspirational: high emotional activation, low clarity, authority trigger
  if (dims.emotionalActivation >= 70 && dims.clarityOfValue <= 50 &&
      topTriggerNames.some((t) => t.includes("authority") || t.includes("aspir"))) {
    return "Luxury Aspirational";
  }

  // Curiosity Machine: high curiosity gap, high pattern interrupt
  if (dims.curiosityGap >= 70 && dims.patternInterrupt >= 65) {
    return "Curiosity Machine";
  }

  // FOMO Activator: high emotional activation, scarcity/loss triggers
  if (dims.emotionalActivation >= 75 &&
      topTriggerNames.some((t) => t.includes("fomo") || t.includes("scarcity") || t.includes("loss"))) {
    return "FOMO Activator";
  }

  // Authority Builder: high clarity, authority trigger, low pattern interrupt
  if (dims.clarityOfValue >= 70 && topTriggerNames.some((t) => t.includes("authority"))) {
    return "Authority Builder";
  }

  // Tribal Connector: tribal identity, social proof
  if (topTriggerNames.some((t) => t.includes("tribal") || t.includes("social proof"))) {
    return "Tribal Connector";
  }

  // Scroll Stopper: very high scroll-stop, pattern interrupt
  if (dims.scrollStop >= 80 && dims.patternInterrupt >= 70) {
    return "Scroll Stopper";
  }

  // Narrative Hook: curiosity gap + emotional activation balanced
  if (dims.curiosityGap >= 55 && dims.emotionalActivation >= 55) {
    return "Narrative Hook";
  }

  // Value Proposition: high clarity, low emotional
  if (dims.clarityOfValue >= 70 && dims.emotionalActivation <= 50) {
    return "Value Proposition";
  }

  return "Balanced Hook";
}
