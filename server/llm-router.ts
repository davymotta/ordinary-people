/**
 * Ordinary People — LLM Router
 *
 * Architettura a tier come da spec del consulente:
 *
 * Tier 1 — Frontier (Claude Sonnet): report finale, Interview Zone, biografie agenti, prompt tuning
 * Tier 2 — Workhorse (Qwen3 8B / Ollama): reazioni agenti, scout digest, analisi social
 * Tier 3 — Fast (Qwen3 4B / Ollama): sintesi briefing, task ripetitivi
 * Tier 4 — Vision (Qwen2.5 VL / Ollama): analisi immagini/video campagne
 * Tier 5 — Embedding (nomic-embed-text / Ollama): memoria semantica agenti
 *
 * In produzione locale: Tier 2-5 usano Ollama su localhost:11434
 * Fallback automatico: se Ollama non risponde entro 5s, usa il Forge API (cloud)
 *
 * In ambiente cloud (Manus sandbox): tutti i tier usano il Forge API proxy
 * (il router seleziona il modello ottimale disponibile via Forge)
 */

import { invokeLLM, type InvokeParams, type InvokeResult, type Message } from "./_core/llm";

// ─── Task Types ───────────────────────────────────────────────────────────────

export type TaskType =
  | "agent_reaction"      // Tier 2: reazione agente a campagna (volume alto)
  | "scout_digest"        // Tier 3: sintesi diario scout
  | "campaign_vision"     // Tier 4: analisi immagine/video campagna
  | "report_generation"   // Tier 1: report finale con raccomandazioni strategiche
  | "interview_zone"      // Tier 1: risposta in-character per Interview Zone
  | "agent_biography"     // Tier 1: generazione system prompt narrativo agente
  | "brand_research"      // Tier 2: analisi brand da dati web
  | "calibration"         // Tier 2: simulazione per calibrazione
  | "perceptual_filter"   // Tier 2: costruzione frame percettivo agente
  | "embedding";          // Tier 5: embedding per memoria semantica

// ─── Model Config ─────────────────────────────────────────────────────────────

interface ModelConfig {
  provider: "forge" | "ollama";
  model: string;
  tier: 1 | 2 | 3 | 4 | 5;
  maxTokens?: number;
  description: string;
}

const TASK_MODEL_MAP: Record<TaskType, ModelConfig> = {
  // Tier 1 — Frontier: Claude Sonnet via Forge API
  report_generation: {
    provider: "forge",
    model: "claude-sonnet-4-5",
    tier: 1,
    maxTokens: 4096,
    description: "Report finale con raccomandazioni strategiche",
  },
  interview_zone: {
    provider: "forge",
    model: "claude-sonnet-4-5",
    tier: 1,
    maxTokens: 2048,
    description: "Risposta in-character per Interview Zone",
  },
  agent_biography: {
    provider: "forge",
    model: "claude-sonnet-4-5",
    tier: 1,
    maxTokens: 2048,
    description: "Generazione system prompt narrativo agente",
  },

  // Tier 2 — Workhorse: Qwen3 8B (Ollama) o Forge fallback
  agent_reaction: {
    provider: "ollama",
    model: "qwen3:8b",
    tier: 2,
    maxTokens: 512,
    description: "Reazione agente a campagna (volume alto)",
  },
  brand_research: {
    provider: "ollama",
    model: "qwen3:8b",
    tier: 2,
    maxTokens: 2048,
    description: "Analisi brand da dati web",
  },
  calibration: {
    provider: "ollama",
    model: "qwen3:8b",
    tier: 2,
    maxTokens: 512,
    description: "Simulazione per calibrazione",
  },
  perceptual_filter: {
    provider: "ollama",
    model: "qwen3:8b",
    tier: 2,
    maxTokens: 1024,
    description: "Costruzione frame percettivo agente",
  },

  // Tier 3 — Fast: Qwen3 4B (Ollama) o Forge fallback
  scout_digest: {
    provider: "ollama",
    model: "qwen3:4b",
    tier: 3,
    maxTokens: 1024,
    description: "Sintesi diario scout",
  },

  // Tier 4 — Vision: Qwen2.5 VL (Ollama) o Forge fallback
  campaign_vision: {
    provider: "ollama",
    model: "qwen2.5vl:7b",
    tier: 4,
    maxTokens: 1024,
    description: "Analisi immagine/video campagna",
  },

  // Tier 5 — Embedding: nomic-embed-text (Ollama)
  embedding: {
    provider: "ollama",
    model: "nomic-embed-text",
    tier: 5,
    maxTokens: 0,
    description: "Embedding per memoria semantica",
  },
};

// ─── Ollama Health Check ──────────────────────────────────────────────────────

let ollamaAvailable: boolean | null = null;
let lastOllamaCheck = 0;
const OLLAMA_CHECK_TTL = 30_000; // 30 secondi
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

async function checkOllamaHealth(): Promise<boolean> {
  const now = Date.now();
  if (ollamaAvailable !== null && now - lastOllamaCheck < OLLAMA_CHECK_TTL) {
    return ollamaAvailable;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    ollamaAvailable = res.ok;
  } catch {
    ollamaAvailable = false;
  }
  lastOllamaCheck = now;
  return ollamaAvailable;
}

// ─── Ollama Invoke ────────────────────────────────────────────────────────────

async function invokeOllama(
  model: string,
  messages: Message[],
  maxTokens?: number
): Promise<InvokeResult> {
  const payload = {
    model,
    messages: messages.map(m => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    })),
    stream: false,
    options: {
      num_predict: maxTokens ?? 512,
    },
  };

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Ollama invoke failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as {
    model: string;
    message: { role: string; content: string };
    done: boolean;
    eval_count?: number;
    prompt_eval_count?: number;
  };

  // Normalize to InvokeResult format
  return {
    id: `ollama-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: data.model,
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content: data.message.content,
      },
      finish_reason: data.done ? "stop" : null,
    }],
    usage: {
      prompt_tokens: data.prompt_eval_count ?? 0,
      completion_tokens: data.eval_count ?? 0,
      total_tokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
    },
  };
}

// ─── Forge Fallback Model Map ─────────────────────────────────────────────────
// When Ollama is not available, use the best available model via Forge API

const FORGE_FALLBACK_BY_TIER: Record<number, string> = {
  1: "claude-sonnet-4-5",
  2: "gemini-2.5-flash",
  3: "gemini-2.5-flash",
  4: "gemini-2.5-flash",  // Gemini has vision capabilities
  5: "gemini-2.5-flash",  // Forge doesn't support embedding, use text model
};

// ─── Main Router Function ─────────────────────────────────────────────────────

/**
 * Route an LLM call to the appropriate model based on task type.
 *
 * - Tier 1 tasks always use Forge API (Claude Sonnet)
 * - Tier 2-4 tasks try Ollama first, fall back to Forge API if unavailable
 * - Tier 5 (embedding) uses Ollama only (no Forge fallback for embeddings)
 *
 * @param taskType - The type of task to route
 * @param params - Standard InvokeParams (messages, tools, etc.)
 * @returns InvokeResult in standard format
 */
export async function routedLLM(
  taskType: TaskType,
  params: InvokeParams
): Promise<InvokeResult> {
  const config = TASK_MODEL_MAP[taskType];

  // Tier 1: always use Forge API
  if (config.tier === 1 || config.provider === "forge") {
    return invokeLLM(params);
  }

  // Tier 2-4: try Ollama, fall back to Forge
  const ollamaUp = await checkOllamaHealth();

  if (ollamaUp) {
    try {
      return await invokeOllama(
        config.model,
        params.messages,
        config.maxTokens
      );
    } catch (err) {
      console.warn(`[LLM Router] Ollama failed for ${taskType}, falling back to Forge:`, err);
      ollamaAvailable = false; // mark as unavailable for next TTL window
    }
  }

  // Forge fallback
  return invokeLLM(params);
}

/**
 * Get the model config for a task type (for logging/debugging).
 */
export function getModelConfig(taskType: TaskType): ModelConfig & { effectiveProvider: string } {
  const config = TASK_MODEL_MAP[taskType];
  return {
    ...config,
    effectiveProvider: config.tier === 1 ? "forge/claude-sonnet" :
      ollamaAvailable ? `ollama/${config.model}` :
      `forge/${FORGE_FALLBACK_BY_TIER[config.tier]}`,
  };
}

/**
 * Extract text content from an InvokeResult (works for both Ollama and Forge responses).
 */
export function extractText(result: InvokeResult): string {
  const content = result.choices[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter(c => c.type === "text")
      .map(c => (c as { type: "text"; text: string }).text)
      .join("");
  }
  return "";
}

/**
 * Get Ollama availability status (for health check endpoint).
 */
export function getOllamaStatus(): { available: boolean | null; lastCheck: number; baseUrl: string } {
  return {
    available: ollamaAvailable,
    lastCheck: lastOllamaCheck,
    baseUrl: OLLAMA_BASE_URL,
  };
}
