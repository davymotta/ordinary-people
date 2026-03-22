/**
 * Campaign Ingestion Pipeline — Digest Builder
 * Orchestratore centrale: riceve l'input, instrada al processor corretto,
 * restituisce il Campaign Digest standardizzato.
 *
 * Flusso:
 * IngestionInput → detectContentType → processor → CampaignDigest
 */

import { detectContentType } from "./detect.js";
import { buildImageDigest } from "./processors/image.js";
import { buildTextDigest } from "./processors/text.js";
import { buildVideoDigest } from "./processors/video.js";
import type { IngestionInput, IngestionResult, CampaignDigest } from "./schema.js";

/**
 * Entry point principale del pipeline di ingestione.
 * Accetta qualsiasi tipo di input e restituisce un Campaign Digest standardizzato.
 */
export async function ingestCampaign(input: IngestionInput): Promise<IngestionResult> {
  const startTime = Date.now();
  const steps: IngestionResult["processing_steps"] = [];

  try {
    // ── Step 1: Detect content type ──────────────────────────────────────────
    const stepStart = Date.now();
    const detection = detectContentType({
      fileName: input.file_path?.split("/").pop(),
      mimeType: undefined,
      socialUrl: input.social_url,
      textContent: input.text_content,
    });

    steps.push({
      step: "content_detection",
      duration_ms: Date.now() - stepStart,
      success: detection.is_supported,
      error: detection.error ?? undefined,
    });

    if (!detection.is_supported) {
      return {
        success: false,
        digest: null,
        error: detection.error ?? "Tipo di contenuto non supportato",
        processing_steps: steps,
      };
    }

    // Aggiorna l'input con il tipo rilevato se non specificato
    const enrichedInput: IngestionInput = {
      ...input,
      source_type: input.source_type ?? detection.source_type,
      source_format: input.source_format ?? detection.source_format,
    };

    // ── Step 2: Route to appropriate processor ───────────────────────────────
    const processStart = Date.now();
    let digest: CampaignDigest;

    switch (detection.source_type) {
      case "image": {
        // Richiede un URL pubblico o un path locale
        const imageUrl = input.file_url ?? input.file_path;
        if (!imageUrl) {
          return {
            success: false,
            digest: null,
            error: "Immagine richiede un URL o un path di file",
            processing_steps: steps,
          };
        }
        digest = await buildImageDigest(enrichedInput, imageUrl);
        break;
      }

      case "text": {
        // Può essere testo diretto, o il path di un file
        const textContent = input.text_content ?? "";
        if (!textContent && !input.file_path) {
          return {
            success: false,
            digest: null,
            error: "Contenuto testuale non fornito",
            processing_steps: steps,
          };
        }
        // Se è un file, leggi il contenuto
        let finalText = textContent;
        if (!finalText && input.file_path) {
          try {
            const { readFileSync } = await import("fs");
            finalText = readFileSync(input.file_path, "utf-8");
          } catch {
            return {
              success: false,
              digest: null,
              error: `Impossibile leggere il file: ${input.file_path}`,
              processing_steps: steps,
            };
          }
        }
        digest = await buildTextDigest(enrichedInput, finalText);
        break;
      }

      case "video": {
        const videoPath = input.file_path ?? input.file_url;
        if (!videoPath) {
          return {
            success: false,
            digest: null,
            error: "Video richiede un path di file",
            processing_steps: steps,
          };
        }
        digest = await buildVideoDigest(enrichedInput, videoPath);
        break;
      }

      case "social_link": {
        // Per l'MVP, i link social non sono supportati direttamente.
        // Il cliente deve scaricare il contenuto e caricarlo come file.
        return {
          success: false,
          digest: null,
          error:
            "Link social non ancora supportati direttamente. Scarica il contenuto e caricalo come file immagine o video.",
          processing_steps: steps,
        };
      }

      default: {
        return {
          success: false,
          digest: null,
          error: `Tipo di contenuto non gestito: ${detection.source_type}`,
          processing_steps: steps,
        };
      }
    }

    steps.push({
      step: `process_${detection.source_type}`,
      duration_ms: Date.now() - processStart,
      success: true,
    });

    return {
      success: true,
      digest,
      error: null,
      processing_steps: steps,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    steps.push({
      step: "error",
      duration_ms: Date.now() - startTime,
      success: false,
      error: errorMessage,
    });

    return {
      success: false,
      digest: null,
      error: `Errore durante l'ingestione: ${errorMessage}`,
      processing_steps: steps,
    };
  }
}

/**
 * Versione semplificata per uso diretto con testo
 */
export async function ingestTextCampaign(params: {
  campaign_id: string;
  text: string;
  channel?: string;
  brand_category?: string;
  client_notes?: string;
}): Promise<CampaignDigest | null> {
  const result = await ingestCampaign({
    campaign_id: params.campaign_id,
    source_type: "text",
    source_format: "txt",
    text_content: params.text,
    channel: params.channel,
    brand_category: params.brand_category,
    client_notes: params.client_notes,
  });
  return result.digest;
}

/**
 * Versione semplificata per uso diretto con immagine URL
 */
export async function ingestImageCampaign(params: {
  campaign_id: string;
  image_url: string;
  channel?: string;
  brand_category?: string;
  client_notes?: string;
}): Promise<CampaignDigest | null> {
  const result = await ingestCampaign({
    campaign_id: params.campaign_id,
    source_type: "image",
    source_format: "jpeg",
    file_url: params.image_url,
    channel: params.channel,
    brand_category: params.brand_category,
    client_notes: params.client_notes,
  });
  return result.digest;
}
