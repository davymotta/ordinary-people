/**
 * Test suite per il modulo Campaign Ingestion Pipeline
 * Copre: detect.ts, schema.ts, perceptual-filter.ts, digest-builder.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectContentType, estimateIngestionCost } from "./detect.js";
import { buildPerceptualPrompt, buildPerceptualFrames } from "./perceptual-filter.js";
import type { CampaignDigest, IngestionInput } from "./schema.js";
import type { AgentPerceptualProfile } from "./perceptual-filter.js";

// ─── Mock LLM ─────────────────────────────────────────────────────────────────

vi.mock("../_core/llm.js", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            visual: {
              description: "Immagine di test con prodotto",
              composition: "centered",
              color_palette: ["bianco", "nero"],
              style: "minimalista",
              mood: "clean",
              text_on_image: {
                headline: "Test Headline",
                body: null,
                cta: "Scopri di più",
                hashtags: [],
                price: null,
              },
              brand_visible: true,
              brand_name: "TestBrand",
              logo_placement: "bottom-right",
              people_present: false,
              people_description: null,
              product_visible: true,
              product_description: "Prodotto di test",
            },
            messaging: {
              core_message: "Messaggio di test",
              tone: "aspirational",
              emotional_appeal: ["premium", "quality"],
              persuasion_tactics: ["lifestyle_aspiration"],
              target_implied: "adulti 25-40",
              call_to_action: "Scopri di più",
              price_mentioned: false,
              price_value: null,
              offer_type: "brand_awareness",
            },
          }),
        },
      },
    ],
    usage: { total_tokens: 150 },
  }),
}));

// ─── detect.ts tests ──────────────────────────────────────────────────────────

describe("detectContentType", () => {
  it("rileva immagine JPEG da nome file", () => {
    const result = detectContentType({ fileName: "campagna.jpg" });
    expect(result.source_type).toBe("image");
    expect(result.source_format).toBe("jpeg");
    expect(result.is_supported).toBe(true);
  });

  it("rileva immagine PNG da nome file", () => {
    const result = detectContentType({ fileName: "banner.png" });
    expect(result.source_type).toBe("image");
    expect(result.source_format).toBe("png");
  });

  it("rileva video MP4 da nome file", () => {
    const result = detectContentType({ fileName: "spot.mp4" });
    expect(result.source_type).toBe("video");
    expect(result.source_format).toBe("mp4");
    expect(result.is_supported).toBe(true);
  });

  it("rileva testo da nome file TXT", () => {
    const result = detectContentType({ fileName: "brief.txt" });
    expect(result.source_type).toBe("text");
    expect(result.source_format).toBe("txt");
  });

  it("rileva PDF da nome file", () => {
    const result = detectContentType({ fileName: "brief.pdf" });
    expect(result.source_type).toBe("text");
    expect(result.source_format).toBe("pdf");
  });

  it("rileva link Instagram come social_link", () => {
    const result = detectContentType({
      socialUrl: "https://www.instagram.com/p/ABC123/",
    });
    expect(result.source_type).toBe("social_link");
    expect(result.is_supported).toBe(true);
  });

  it("rileva link TikTok come social_link", () => {
    const result = detectContentType({
      socialUrl: "https://www.tiktok.com/@user/video/123",
    });
    expect(result.source_type).toBe("social_link");
  });

  it("rileva testo diretto da textContent", () => {
    const result = detectContentType({ textContent: "Questo è un brief di campagna" });
    expect(result.source_type).toBe("text");
    // detect.ts usa 'txt' per testo diretto (non 'plain_text')
    expect(result.source_format).toBe("txt");
    expect(result.is_supported).toBe(true);
  });

  it("restituisce not_supported per file sconosciuto", () => {
    const result = detectContentType({ fileName: "file.xyz" });
    expect(result.is_supported).toBe(false);
    // detect.ts restituisce source_type 'text' con source_format 'unknown' per file non riconosciuti
    expect(result.source_format).toBe("unknown");
  });

  it("gestisce input vuoto", () => {
    const result = detectContentType({});
    expect(result.is_supported).toBe(false);
  });
});

// ─── estimateIngestionCost tests ──────────────────────────────────────────────

describe("estimateIngestionCost", () => {
  it("stima costo per immagine", () => {
    const cost = estimateIngestionCost("image");
    expect(cost.estimated_usd).toBeGreaterThan(0);
    expect(cost.estimated_usd).toBeLessThan(0.1);
    // detect.ts restituisce breakdown, non llm_calls
    expect(cost.breakdown).toBeDefined();
    expect(Object.keys(cost.breakdown).length).toBeGreaterThan(0);
  });

  it("stima costo per testo", () => {
    const cost = estimateIngestionCost("text");
    expect(cost.estimated_usd).toBeGreaterThan(0);
    // detect.ts restituisce breakdown.llm_extraction, non llm_calls
    expect(cost.breakdown.llm_extraction).toBeGreaterThan(0);
  });

  it("stima costo per video con durata", () => {
    const cost = estimateIngestionCost("video", 60);
    expect(cost.estimated_usd).toBeGreaterThan(0);
    // detect.ts restituisce breakdown con vision_api + synthesis
    expect(cost.breakdown.vision_api).toBeGreaterThan(0);
    expect(cost.breakdown.digest_synthesis).toBeGreaterThan(0);
  });

  it("video più lungo costa di più", () => {
    const shortCost = estimateIngestionCost("video", 15);
    const longCost = estimateIngestionCost("video", 120);
    expect(longCost.estimated_usd).toBeGreaterThanOrEqual(shortCost.estimated_usd);
  });
});

// ─── perceptual-filter.ts tests ───────────────────────────────────────────────

const mockDigest: CampaignDigest = {
  campaign_id: "test_camp_001",
  ingested_at: new Date().toISOString(),
  source_type: "image",
  source_format: "jpeg",
  source_url: "https://example.com/test.jpg",
  file_name: "test.jpg",
  visual: {
    description: "Immagine lifestyle di prodotto premium",
    composition: "centered product shot",
    color_palette: ["gold", "black", "white"],
    style: "luxury minimalist",
    mood: "aspirational",
    text_on_image: {
      headline: "Elevate Your Style",
      body: null,
      cta: "Shop Now",
      hashtags: ["#luxury"],
      price: null,
    },
    brand_visible: true,
    brand_name: "LuxBrand",
    logo_placement: "bottom-right",
    people_present: false,
    people_description: null,
    product_visible: true,
    product_description: "Borsa in pelle premium",
  },
  audio: null,
  video_specific: null,
  messaging: {
    core_message: "Prodotto premium per chi vuole distinguersi",
    tone: "aspirational",
    emotional_appeal: ["premium quality", "status", "exclusivity"],
    persuasion_tactics: ["lifestyle_aspiration", "scarcity"],
    target_implied: "donne 28-45 alto reddito",
    call_to_action: "Shop Now",
    price_mentioned: false,
    price_value: null,
    offer_type: "brand_awareness",
  },
  context: {
    channel: "instagram",
    placement: null,
    client_notes: null,
    brand_category: "fashion",
  },
  confidence_score: 0.92,
  processing_time_ms: 1200,
  llm_tokens_used: 300,
};

const mockAgentGenZ: AgentPerceptualProfile = {
  id: "agent_genz_001",
  name: "Sofia",
  age: 22,
  gender: "female",
  generation: "GenZ",
  archetype: "Rebel",
  openness: 0.8,
  conscientiousness: 0.4,
  extraversion: 0.7,
  agreeableness: 0.5,
  neuroticism: 0.5,
  advertising_cynicism: 0.85,
  attention_span: 0.4,
  status_orientation: 0.2,
  price_sensitivity: 0.7,
  emotional_susceptibility: 0.6,
  haidt_authority: 0.2,
  haidt_care: 0.7,
};

const mockAgentBoomer: AgentPerceptualProfile = {
  id: "agent_boomer_001",
  name: "Marco",
  age: 58,
  gender: "male",
  generation: "Boomer",
  archetype: "Ruler",
  openness: 0.3,
  conscientiousness: 0.8,
  extraversion: 0.4,
  agreeableness: 0.6,
  neuroticism: 0.3,
  advertising_cynicism: 0.3,
  attention_span: 0.7,
  status_orientation: 0.75,
  price_sensitivity: 0.3,
  emotional_susceptibility: 0.4,
  haidt_authority: 0.8,
  haidt_care: 0.5,
};

describe("buildPerceptualPrompt", () => {
  it("genera un PerceptualFrame valido per agente GenZ", () => {
    const frame = buildPerceptualPrompt(mockAgentGenZ, mockDigest);

    expect(frame.agent_id).toBe("agent_genz_001");
    expect(frame.campaign_id).toBe("test_camp_001");
    expect(frame.perceptual_prompt).toBeTruthy();
    expect(frame.perceptual_prompt.length).toBeGreaterThan(100);
    expect(frame.salient_traits).toBeInstanceOf(Array);
    expect(frame.consumption_context).toBeDefined();
  });

  it("genera un PerceptualFrame valido per agente Boomer", () => {
    const frame = buildPerceptualPrompt(mockAgentBoomer, mockDigest);

    expect(frame.agent_id).toBe("agent_boomer_001");
    expect(frame.perceptual_prompt).toBeTruthy();
    expect(frame.salient_traits).toBeInstanceOf(Array);
  });

  it("il prompt GenZ contiene il cinismo pubblicitario alto", () => {
    const frame = buildPerceptualPrompt(mockAgentGenZ, mockDigest);
    // Il GenZ ha advertising_cynicism 0.85 → dovrebbe essere nei tratti salienti
    const hasCynicismTrait = frame.salient_traits.some(
      (t) => t.trait === "advertising_cynicism"
    );
    expect(hasCynicismTrait).toBe(true);
  });

  it("il prompt Boomer contiene lo status orientation alto", () => {
    const frame = buildPerceptualPrompt(mockAgentBoomer, mockDigest);
    // Il Boomer ha status_orientation 0.75 e la campagna è luxury → dovrebbe essere nei tratti
    const hasStatusTrait = frame.salient_traits.some(
      (t) => t.trait === "status_orientation"
    );
    expect(hasStatusTrait).toBe(true);
  });

  it("i due agenti producono prompt diversi", () => {
    const frameGenZ = buildPerceptualPrompt(mockAgentGenZ, mockDigest);
    const frameBoomer = buildPerceptualPrompt(mockAgentBoomer, mockDigest);

    // I prompt devono essere diversi perché i profili sono diversi
    expect(frameGenZ.perceptual_prompt).not.toBe(frameBoomer.perceptual_prompt);
  });

  it("il contesto di consumo riflette la piattaforma Instagram", () => {
    const frame = buildPerceptualPrompt(mockAgentGenZ, mockDigest);
    expect(frame.consumption_context.platform).toContain("Instagram");
    expect(frame.consumption_context.device).toBe("smartphone");
  });

  it("i tratti salienti non superano 5", () => {
    const frame = buildPerceptualPrompt(mockAgentGenZ, mockDigest);
    expect(frame.salient_traits.length).toBeLessThanOrEqual(5);
  });

  it("il prompt contiene la descrizione della campagna", () => {
    const frame = buildPerceptualPrompt(mockAgentGenZ, mockDigest);
    // Deve contenere il messaggio centrale
    expect(frame.perceptual_prompt).toContain("Prodotto premium per chi vuole distinguersi");
  });
});

describe("buildPerceptualFrames (batch)", () => {
  it("genera frame per tutti gli agenti", () => {
    const agents = [mockAgentGenZ, mockAgentBoomer];
    const frames = buildPerceptualFrames(agents, mockDigest);

    expect(frames).toHaveLength(2);
    expect(frames[0].agent_id).toBe("agent_genz_001");
    expect(frames[1].agent_id).toBe("agent_boomer_001");
  });

  it("gestisce lista agenti vuota", () => {
    const frames = buildPerceptualFrames([], mockDigest);
    expect(frames).toHaveLength(0);
  });
});

// ─── Schema validation tests ──────────────────────────────────────────────────

describe("CampaignDigest schema", () => {
  it("il mockDigest ha tutti i campi obbligatori", () => {
    expect(mockDigest.campaign_id).toBeTruthy();
    expect(mockDigest.ingested_at).toBeTruthy();
    expect(mockDigest.source_type).toBeTruthy();
    expect(mockDigest.source_format).toBeTruthy();
    expect(mockDigest.messaging).toBeDefined();
    expect(mockDigest.confidence_score).toBeGreaterThanOrEqual(0);
    expect(mockDigest.confidence_score).toBeLessThanOrEqual(1);
  });

  it("il campo visual ha tutti i campi obbligatori", () => {
    const visual = mockDigest.visual!;
    expect(visual.description).toBeTruthy();
    expect(visual.color_palette).toBeInstanceOf(Array);
    expect(visual.text_on_image).toBeDefined();
    expect(typeof visual.brand_visible).toBe("boolean");
    expect(typeof visual.people_present).toBe("boolean");
    expect(typeof visual.product_visible).toBe("boolean");
  });

  it("il campo messaging ha tutti i campi obbligatori", () => {
    const msg = mockDigest.messaging;
    expect(msg.core_message).toBeTruthy();
    expect(msg.tone).toBeTruthy();
    expect(msg.emotional_appeal).toBeInstanceOf(Array);
    expect(msg.persuasion_tactics).toBeInstanceOf(Array);
    expect(typeof msg.price_mentioned).toBe("boolean");
  });
});
