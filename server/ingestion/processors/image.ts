/**
 * Campaign Ingestion Pipeline — Image Processor
 * Immagine → Vision API (Claude/GPT-4o) → Campaign Digest
 */

import { invokeLLM } from "../../_core/llm.js";
import type { VisualDigest, MessagingDigest, CampaignDigest, IngestionInput } from "../schema.js";

/**
 * Processa un'immagine statica e genera il Campaign Digest.
 * Supporta JPEG, PNG, GIF, WebP.
 * L'immagine può essere passata come URL o come base64.
 */
export async function processImage(
  input: IngestionInput,
  imageUrl: string
): Promise<{ visual: VisualDigest; messaging: MessagingDigest; tokens_used: number }> {
  const startTime = Date.now();

  const systemPrompt = `Sei un analista esperto di comunicazione visiva e advertising. 
Analizzi immagini di campagne pubblicitarie e produci un Campaign Digest strutturato.
Il tuo output deve essere un JSON valido e preciso — niente testo extra, solo JSON.`;

  const userPrompt = `Analizza questa immagine pubblicitaria e produci un Campaign Digest in JSON.

Restituisci ESATTAMENTE questo JSON (compila tutti i campi, usa null se non applicabile):

{
  "visual": {
    "description": "descrizione visiva dettagliata in italiano (composizione, soggetti, ambientazione, atmosfera)",
    "composition": "struttura compositiva (es: centered subject, rule of thirds, full bleed)",
    "color_palette": ["colore1", "colore2", "colore3"],
    "style": "stile visivo (es: lifestyle editorial, luxury, streetwear, minimal, massimalista, ironico)",
    "mood": "mood visivo (es: warm, cold, energetic, calm, nostalgic, aspirational)",
    "text_on_image": {
      "headline": "testo principale se presente o null",
      "body": "corpo testo se presente o null",
      "cta": "call to action se presente o null",
      "hashtags": ["#hashtag1"],
      "price": "prezzo se visibile o null"
    },
    "brand_visible": true/false,
    "brand_name": "nome brand se visibile o null",
    "logo_placement": "posizione logo (es: bottom right, subtle) o null",
    "people_present": true/false,
    "people_description": "descrizione persone (età apparente, genere, stile) o null",
    "product_visible": true/false,
    "product_description": "descrizione prodotto o null"
  },
  "messaging": {
    "core_message": "il messaggio principale in una frase",
    "tone": "tono (es: aspirational, warm, ironic, authoritative, playful, nostalgic)",
    "emotional_appeal": ["comfort", "self-care"],
    "persuasion_tactics": ["lifestyle_aspiration", "social_proof"],
    "target_implied": "chi sembra essere il destinatario dalla campagna stessa",
    "call_to_action": "CTA o null",
    "price_mentioned": true/false,
    "price_value": "valore prezzo o null",
    "offer_type": "tipo offerta (discount/new_product/seasonal/brand_awareness) o null"
  }
}

${input.client_notes ? `Note del cliente: ${input.client_notes}` : ""}
${input.brand_category ? `Categoria brand: ${input.brand_category}` : ""}`;

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: imageUrl, detail: "high" as const },
          },
          {
            type: "text",
            text: userPrompt,
          },
        ],
      },
    ],
  });

  const rawContent = result.choices?.[0]?.message?.content;
  const responseText =
    typeof rawContent === "string"
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent
            .filter((c) => c.type === "text")
            .map((c) => (c as { type: "text"; text: string }).text)
            .join("")
        : "";

  // Estrai il JSON dalla risposta
  let parsed: { visual: VisualDigest; messaging: MessagingDigest };
  try {
    // Cerca il JSON nella risposta (potrebbe avere testo prima/dopo)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Nessun JSON trovato nella risposta");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    // Fallback: crea un digest minimale
    parsed = {
      visual: {
        description: "Immagine pubblicitaria",
        composition: "unknown",
        color_palette: [],
        style: "unknown",
        mood: "neutral",
        text_on_image: { headline: null, body: null, cta: null, hashtags: [], price: null },
        brand_visible: false,
        brand_name: null,
        logo_placement: null,
        people_present: false,
        people_description: null,
        product_visible: false,
        product_description: null,
      },
      messaging: {
        core_message: "Campagna pubblicitaria",
        tone: "neutral",
        emotional_appeal: [],
        persuasion_tactics: [],
        target_implied: "pubblico generale",
        call_to_action: null,
        price_mentioned: false,
        price_value: null,
        offer_type: null,
      },
    };
  }

  const tokensUsed = result.usage?.total_tokens ?? 0;

  return {
    visual: parsed.visual,
    messaging: parsed.messaging,
    tokens_used: tokensUsed,
  };
}

/**
 * Costruisce il Campaign Digest completo per un'immagine
 */
export async function buildImageDigest(
  input: IngestionInput,
  imageUrl: string
): Promise<CampaignDigest> {
  const startTime = Date.now();

  const { visual, messaging, tokens_used } = await processImage(input, imageUrl);

  return {
    campaign_id: input.campaign_id,
    ingested_at: new Date().toISOString(),
    source_type: "image",
    source_format: input.source_format,
    source_url: input.file_url ?? null,
    file_name: input.file_path?.split("/").pop() ?? null,

    visual,
    audio: null,
    video_specific: null,

    messaging,

    context: {
      channel: input.channel ?? null,
      placement: null,
      client_notes: input.client_notes ?? null,
      brand_category: input.brand_category ?? null,
    },

    confidence_score: 0.85,
    processing_time_ms: Date.now() - startTime,
    llm_tokens_used: tokens_used,
  };
}
