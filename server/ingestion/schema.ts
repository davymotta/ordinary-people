/**
 * Campaign Ingestion Pipeline — Schema TypeScript
 * Struttura del Campaign Digest: il "pacchetto sensoriale" che ogni agente riceve.
 * Gli agenti non vedono mai il file raw — vedono questo documento strutturato.
 */

export type SourceType = "image" | "video" | "text" | "social_link";
export type SourceFormat =
  | "jpeg"
  | "png"
  | "gif"
  | "webp"
  | "mp4"
  | "mov"
  | "avi"
  | "webm"
  | "pdf"
  | "txt"
  | "docx"
  | "instagram_reel"
  | "tiktok"
  | "youtube"
  | "twitter"
  | "unknown";

export interface VisualDigest {
  description: string; // Descrizione visiva dettagliata (composizione, soggetti, ambientazione)
  composition: string; // Struttura compositiva (centered, rule of thirds, ecc.)
  color_palette: string[]; // Palette cromatica dominante
  style: string; // Stile visivo (lifestyle editorial, luxury, streetwear, minimal, massimalista)
  mood: string; // Mood visivo (warm, cold, energetic, calm, nostalgic)
  text_on_image: {
    headline: string | null;
    body: string | null;
    cta: string | null;
    hashtags: string[];
    price: string | null;
  };
  brand_visible: boolean;
  brand_name: string | null;
  logo_placement: string | null;
  people_present: boolean;
  people_description: string | null; // Età apparente, genere, stile, etnia
  product_visible: boolean;
  product_description: string | null;
}

export interface AudioDigest {
  has_audio: boolean;
  voiceover_transcript: string | null;
  music_mood: string | null; // warm, energetic, melancholic, hype, chill, dramatic
  music_energy: number | null; // 0.0–1.0
  music_genre: string | null;
  dialogue: string | null;
  sound_effects: string | null;
  language_detected: string | null; // lingua del parlato rilevata
}

export interface VideoDigest {
  duration_seconds: number;
  format: "vertical_9_16" | "horizontal_16_9" | "square_1_1" | "unknown";
  pacing: string; // slow, medium, fast, jump_cut
  scene_count: number;
  scene_descriptions: string[];
  transitions: string; // soft dissolves, hard cuts, wipes
  native_platform: string | null; // instagram_reel, tiktok, youtube_shorts, tv_spot
  frame_count_analyzed: number;
  has_subtitles: boolean;
  subtitle_text: string | null;
}

export interface MessagingDigest {
  core_message: string; // Il messaggio principale in una frase
  tone: string; // aspirational, warm, ironic, authoritative, playful, nostalgic
  emotional_appeal: string[]; // comfort, self-care, premium, FOMO, belonging, achievement
  persuasion_tactics: string[]; // lifestyle_aspiration, social_proof, scarcity, authority, nostalgia
  target_implied: string; // Chi sembra essere il destinatario dalla campagna stessa
  call_to_action: string | null;
  price_mentioned: boolean;
  price_value: string | null;
  offer_type: string | null; // discount, new_product, seasonal, brand_awareness
}

export interface CampaignDigest {
  campaign_id: string;
  ingested_at: string; // ISO timestamp
  source_type: SourceType;
  source_format: SourceFormat;
  source_url: string | null; // URL originale se da social
  file_name: string | null;

  visual: VisualDigest | null; // null per contenuti solo testuali
  audio: AudioDigest | null; // null per immagini statiche
  video_specific: VideoDigest | null; // null per non-video

  messaging: MessagingDigest;

  context: {
    channel: string | null; // instagram, tiktok, tv, print, outdoor, web
    placement: string | null; // feed, stories, reel, banner, billboard
    client_notes: string | null; // Note del cliente dall'upload
    brand_category: string | null; // fashion, food, automotive, beauty, tech
  };

  // Metadati di qualità del digest
  confidence_score: number; // 0.0–1.0 — quanto il sistema è sicuro del digest
  processing_time_ms: number;
  llm_tokens_used: number;
}

/**
 * Perceptual Frame — il digest filtrato attraverso il profilo di un agente specifico.
 * È ciò che l'agente "vede" soggettivamente.
 */
export interface PerceptualFrame {
  agent_id: string;
  campaign_id: string;
  generated_at: string;

  // Il prompt narrativo che viene iniettato nel system prompt dell'agente
  perceptual_prompt: string;

  // Tratti dell'agente selezionati come salienti per questa campagna
  salient_traits: {
    trait: string;
    value: string;
    relevance: string; // Perché questo tratto è rilevante per questa campagna
  }[];

  // Contesto di consumo simulato
  consumption_context: {
    platform: string; // Dove l'agente "vede" questa campagna
    device: string; // smartphone, TV, desktop
    moment: string; // scrolling_feed, watching_tv, commuting
    attention_level: number; // 0.0–1.0 — quanto è attento in quel momento
  };
}

/**
 * Input per il pipeline di ingestione
 */
export interface IngestionInput {
  campaign_id: string;
  source_type: SourceType;
  source_format: SourceFormat;
  file_path?: string; // Path locale del file uploadato
  file_url?: string; // URL del file (per immagini già su CDN)
  social_url?: string; // URL del post social
  text_content?: string; // Testo incollato direttamente
  client_notes?: string;
  brand_category?: string;
  channel?: string;
}

/**
 * Risultato del pipeline di ingestione
 */
export interface IngestionResult {
  success: boolean;
  digest: CampaignDigest | null;
  error: string | null;
  processing_steps: {
    step: string;
    duration_ms: number;
    success: boolean;
    error?: string;
  }[];
}
