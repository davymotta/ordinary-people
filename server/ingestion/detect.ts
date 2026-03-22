/**
 * Campaign Ingestion Pipeline — Content Type Detector
 * Rileva il tipo di contenuto dall'upload e lo instrada al processor corretto.
 */

import type { SourceType, SourceFormat } from "./schema.js";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "avi", "webm", "mkv", "m4v", "3gp", "flv"]);
const TEXT_EXTENSIONS = new Set(["txt", "pdf", "doc", "docx", "md", "rtf"]);

const SOCIAL_PATTERNS = [
  { pattern: /instagram\.com\/(p|reel|tv)\//i, format: "instagram_reel" as SourceFormat },
  { pattern: /tiktok\.com\/@.+\/video\//i, format: "tiktok" as SourceFormat },
  { pattern: /youtube\.com\/(watch|shorts)/i, format: "youtube" as SourceFormat },
  { pattern: /youtu\.be\//i, format: "youtube" as SourceFormat },
  { pattern: /twitter\.com\/.+\/status\//i, format: "twitter" as SourceFormat },
  { pattern: /x\.com\/.+\/status\//i, format: "twitter" as SourceFormat },
];

export interface DetectionResult {
  source_type: SourceType;
  source_format: SourceFormat;
  mime_type: string | null;
  is_supported: boolean;
  error: string | null;
}

/**
 * Rileva il tipo di contenuto da un URL social
 */
export function detectFromSocialUrl(url: string): DetectionResult {
  for (const { pattern, format } of SOCIAL_PATTERNS) {
    if (pattern.test(url)) {
      return {
        source_type: "social_link",
        source_format: format,
        mime_type: null,
        is_supported: true,
        error: null,
      };
    }
  }
  return {
    source_type: "social_link",
    source_format: "unknown",
    mime_type: null,
    is_supported: false,
    error: `URL social non riconosciuto: ${url}`,
  };
}

/**
 * Rileva il tipo di contenuto da un nome di file
 */
export function detectFromFileName(fileName: string): DetectionResult {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (IMAGE_EXTENSIONS.has(ext)) {
    const formatMap: Record<string, SourceFormat> = {
      jpg: "jpeg",
      jpeg: "jpeg",
      png: "png",
      gif: "gif",
      webp: "webp",
    };
    return {
      source_type: "image",
      source_format: formatMap[ext] ?? "jpeg",
      mime_type: `image/${ext === "jpg" ? "jpeg" : ext}`,
      is_supported: true,
      error: null,
    };
  }

  if (VIDEO_EXTENSIONS.has(ext)) {
    const formatMap: Record<string, SourceFormat> = {
      mp4: "mp4",
      mov: "mov",
      avi: "avi",
      webm: "webm",
    };
    return {
      source_type: "video",
      source_format: formatMap[ext] ?? "mp4",
      mime_type: `video/${ext}`,
      is_supported: true,
      error: null,
    };
  }

  if (TEXT_EXTENSIONS.has(ext)) {
    const formatMap: Record<string, SourceFormat> = {
      txt: "txt",
      pdf: "pdf",
      doc: "docx",
      docx: "docx",
      md: "txt",
    };
    return {
      source_type: "text",
      source_format: formatMap[ext] ?? "txt",
      mime_type: ext === "pdf" ? "application/pdf" : "text/plain",
      is_supported: true,
      error: null,
    };
  }

  return {
    source_type: "text",
    source_format: "unknown",
    mime_type: null,
    is_supported: false,
    error: `Formato file non supportato: .${ext}`,
  };
}

/**
 * Rileva il tipo di contenuto da un MIME type
 */
export function detectFromMimeType(mimeType: string): DetectionResult {
  if (mimeType.startsWith("image/")) {
    const rawFormat = mimeType.split("/")[1];
    const format = (rawFormat === "jpg" ? "jpeg" : rawFormat) as SourceFormat;
    return {
      source_type: "image",
      source_format: format,
      mime_type: mimeType,
      is_supported: true,
      error: null,
    };
  }

  if (mimeType.startsWith("video/")) {
    const format = mimeType.split("/")[1] as SourceFormat;
    return {
      source_type: "video",
      source_format: format,
      mime_type: mimeType,
      is_supported: true,
      error: null,
    };
  }

  if (mimeType === "application/pdf") {
    return {
      source_type: "text",
      source_format: "pdf",
      mime_type: mimeType,
      is_supported: true,
      error: null,
    };
  }

  if (mimeType.startsWith("text/")) {
    return {
      source_type: "text",
      source_format: "txt",
      mime_type: mimeType,
      is_supported: true,
      error: null,
    };
  }

  return {
    source_type: "text",
    source_format: "unknown",
    mime_type: mimeType,
    is_supported: false,
    error: `MIME type non supportato: ${mimeType}`,
  };
}

/**
 * Detector principale — combina tutte le strategie
 */
export function detectContentType(params: {
  fileName?: string;
  mimeType?: string;
  socialUrl?: string;
  textContent?: string;
}): DetectionResult {
  // 1. Se è un URL social, priorità massima
  if (params.socialUrl) {
    return detectFromSocialUrl(params.socialUrl);
  }

  // 2. Se c'è un MIME type, usalo
  if (params.mimeType && params.mimeType !== "application/octet-stream") {
    const result = detectFromMimeType(params.mimeType);
    if (result.is_supported) return result;
  }

  // 3. Se c'è un nome file, usa l'estensione
  if (params.fileName) {
    const result = detectFromFileName(params.fileName);
    if (result.is_supported) return result;
  }

  // 4. Se c'è solo testo, è testo
  if (params.textContent) {
    return {
      source_type: "text",
      source_format: "txt",
      mime_type: "text/plain",
      is_supported: true,
      error: null,
    };
  }

  return {
    source_type: "text",
    source_format: "unknown",
    mime_type: null,
    is_supported: false,
    error: "Impossibile determinare il tipo di contenuto",
  };
}

/**
 * Stima il costo di ingestione in USD
 */
export function estimateIngestionCost(sourceType: SourceType, durationSeconds?: number): {
  estimated_usd: number;
  breakdown: Record<string, number>;
} {
  switch (sourceType) {
    case "image":
      return {
        estimated_usd: 0.01,
        breakdown: { vision_api: 0.01 },
      };
    case "video": {
      const frames = 6;
      const duration = durationSeconds ?? 30;
      const whisperCost = (duration / 60) * 0.006; // $0.006/min
      const visionCost = frames * 0.01;
      const synthesisCost = 0.02;
      return {
        estimated_usd: whisperCost + visionCost + synthesisCost,
        breakdown: {
          frame_extraction: 0,
          vision_api: visionCost,
          whisper_transcription: whisperCost,
          digest_synthesis: synthesisCost,
        },
      };
    }
    case "text":
      return {
        estimated_usd: 0.005,
        breakdown: { llm_extraction: 0.005 },
      };
    case "social_link":
      return {
        estimated_usd: 0.015,
        breakdown: { scraping: 0, vision_api: 0.01, llm_extraction: 0.005 },
      };
  }
}
