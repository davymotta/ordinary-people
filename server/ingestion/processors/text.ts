/**
 * Campaign Ingestion Pipeline — Text Processor
 * Testo/PDF/Brief → LLM → Campaign Digest
 * Gestisce brief di campagna, copy pubblicitario, documenti strategici.
 */

import { invokeLLM } from "../../_core/llm.js";
import type {
  MessagingDigest,
  VisualDigest,
  CampaignDigest,
  IngestionInput,
} from "../schema.js";

/**
 * Estrae il Campaign Digest da un testo (brief, copy, documento).
 */
export async function processText(
  input: IngestionInput,
  textContent: string
): Promise<{ visual: VisualDigest | null; messaging: MessagingDigest; tokens_used: number }> {
  const systemPrompt = `Sei un analista esperto di comunicazione e strategia pubblicitaria.
Analizzi brief di campagna, copy pubblicitari e documenti strategici per estrarne le informazioni chiave.
Il tuo output deve essere un JSON valido e preciso — niente testo extra, solo JSON.`;

  const userPrompt = `Analizza questo testo pubblicitario/brief di campagna e produci un Campaign Digest in JSON.

TESTO DA ANALIZZARE:
---
${textContent.slice(0, 8000)}
---

Restituisci ESATTAMENTE questo JSON (compila tutti i campi, usa null se non applicabile):

{
  "visual": {
    "description": "descrizione visiva se il testo la menziona, altrimenti null",
    "composition": null,
    "color_palette": [],
    "style": "stile visivo menzionato o dedotto dal tone of voice",
    "mood": "mood generale del testo",
    "text_on_image": {
      "headline": "headline principale se presente o null",
      "body": "body copy se presente o null",
      "cta": "call to action se presente o null",
      "hashtags": [],
      "price": null
    },
    "brand_visible": false,
    "brand_name": "nome brand se menzionato o null",
    "logo_placement": null,
    "people_present": false,
    "people_description": "descrizione target/testimonial se menzionati o null",
    "product_visible": false,
    "product_description": "descrizione prodotto/servizio se presente o null"
  },
  "messaging": {
    "core_message": "il messaggio principale in una frase",
    "tone": "tono di voce (es: aspirational, warm, ironic, authoritative, playful, nostalgic, urgente)",
    "emotional_appeal": ["lista di leve emotive usate"],
    "persuasion_tactics": ["lista di tattiche persuasive identificate"],
    "target_implied": "target dichiarato o dedotto dal testo",
    "call_to_action": "CTA principale o null",
    "price_mentioned": false,
    "price_value": null,
    "offer_type": "tipo offerta (discount/new_product/seasonal/brand_awareness/event) o null"
  }
}

${input.client_notes ? `Note del cliente: ${input.client_notes}` : ""}
${input.brand_category ? `Categoria brand: ${input.brand_category}` : ""}
${input.channel ? `Canale previsto: ${input.channel}` : ""}`;

  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
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

  let parsed: { visual: VisualDigest | null; messaging: MessagingDigest };
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Nessun JSON trovato nella risposta");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    // Fallback: estrai almeno il messaggio principale
    parsed = {
      visual: null,
      messaging: {
        core_message: textContent.slice(0, 200),
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
 * Costruisce il Campaign Digest completo per un testo
 */
export async function buildTextDigest(
  input: IngestionInput,
  textContent: string
): Promise<CampaignDigest> {
  const startTime = Date.now();

  const { visual, messaging, tokens_used } = await processText(input, textContent);

  return {
    campaign_id: input.campaign_id,
    ingested_at: new Date().toISOString(),
    source_type: "text",
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

    confidence_score: 0.9, // Il testo è il formato più affidabile
    processing_time_ms: Date.now() - startTime,
    llm_tokens_used: tokens_used,
  };
}
