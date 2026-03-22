/**
 * Campaign Ingestion Pipeline — Video Processor
 * Video → ffmpeg (frame + audio) → Vision API + Whisper → Campaign Digest
 *
 * Pipeline:
 * 1. Estrai 6-8 frame rappresentativi con ffmpeg
 * 2. Estrai audio con ffmpeg
 * 3. Trascrivi audio con Whisper (via file_url)
 * 4. Analizza frame con Vision API in parallelo
 * 5. Sintetizza tutto in un Campaign Digest
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { invokeLLM } from "../../_core/llm.js";
import type {
  VisualDigest,
  AudioDigest,
  VideoDigest,
  MessagingDigest,
  CampaignDigest,
  IngestionInput,
} from "../schema.js";

// ─── Frame Extraction ─────────────────────────────────────────────────────────

interface ExtractedFrame {
  path: string;
  timestamp_seconds: number;
  index: number;
}

/**
 * Estrae frame rappresentativi da un video usando ffmpeg.
 * Strategia: frame a 0%, 15%, 30%, 50%, 70%, 85%, 100% della durata.
 */
async function extractKeyFrames(
  videoPath: string,
  outputDir: string,
  frameCount: number = 7
): Promise<ExtractedFrame[]> {
  // Prima ottieni la durata del video
  let durationSeconds = 30; // default
  try {
    const probeOutput = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`,
      { encoding: "utf-8", timeout: 15000 }
    ).trim();
    durationSeconds = parseFloat(probeOutput) || 30;
  } catch {
    // Se ffprobe fallisce, usa la durata default
  }

  const frames: ExtractedFrame[] = [];
  const percentages = [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1.0].slice(0, frameCount);

  for (let i = 0; i < percentages.length; i++) {
    const timestamp = Math.min(percentages[i] * durationSeconds, durationSeconds - 0.1);
    const framePath = path.join(outputDir, `frame_${i.toString().padStart(2, "0")}.jpg`);

    try {
      execSync(
        `ffmpeg -ss ${timestamp.toFixed(2)} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}" -y`,
        { encoding: "utf-8", timeout: 15000, stdio: "pipe" }
      );

      if (fs.existsSync(framePath)) {
        frames.push({ path: framePath, timestamp_seconds: timestamp, index: i });
      }
    } catch {
      // Frame non estratto, continua
    }
  }

  return frames;
}

/**
 * Estrae l'audio da un video usando ffmpeg.
 * Restituisce il path del file audio MP3.
 */
async function extractAudio(videoPath: string, outputDir: string): Promise<string | null> {
  const audioPath = path.join(outputDir, "audio.mp3");
  try {
    execSync(
      `ffmpeg -i "${videoPath}" -vn -acodec mp3 -ar 16000 -ac 1 -ab 64k "${audioPath}" -y`,
      { encoding: "utf-8", timeout: 30000, stdio: "pipe" }
    );
    return fs.existsSync(audioPath) ? audioPath : null;
  } catch {
    return null;
  }
}

// ─── Frame Analysis ───────────────────────────────────────────────────────────

interface FrameAnalysis {
  timestamp: number;
  description: string;
  text_visible: string | null;
  people_visible: boolean;
  product_visible: boolean;
  mood: string;
}

/**
 * Analizza un singolo frame con Vision API.
 * Converte il frame in base64 per inviarlo all'API.
 */
async function analyzeFrame(framePath: string, timestamp: number): Promise<FrameAnalysis> {
  // Leggi il frame come base64
  let imageBase64: string;
  try {
    const imageBuffer = fs.readFileSync(framePath);
    imageBase64 = imageBuffer.toString("base64");
  } catch {
    return {
      timestamp,
      description: "Frame non leggibile",
      text_visible: null,
      people_visible: false,
      product_visible: false,
      mood: "unknown",
    };
  }

  const dataUrl = `data:image/jpeg;base64,${imageBase64}`;

  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "low" as const },
            },
            {
              type: "text",
              text: `Analizza questo frame di un video pubblicitario (timestamp: ${timestamp.toFixed(1)}s).
Rispondi in JSON con questi campi:
{
  "description": "descrizione breve della scena in italiano (max 100 parole)",
  "text_visible": "testo visibile nel frame o null",
  "people_visible": true/false,
  "product_visible": true/false,
  "mood": "mood visivo del frame (es: energetico, calmo, drammatico, gioioso)"
}`,
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

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { timestamp, ...parsed };
    }
  } catch {
    // Fallback
  }

  return {
    timestamp,
    description: `Frame al secondo ${timestamp.toFixed(1)}`,
    text_visible: null,
    people_visible: false,
    product_visible: false,
    mood: "neutral",
  };
}

// ─── Audio Transcription ──────────────────────────────────────────────────────

/**
 * Trascrive l'audio usando il file_url nell'LLM.
 * Nota: richiede che il file audio sia accessibile via URL.
 * Per ora usa una descrizione testuale se non disponibile.
 */
async function transcribeAudio(
  audioPath: string
): Promise<{ transcript: string | null; language: string | null }> {
  // Verifica che il file esista e abbia contenuto
  try {
    const stats = fs.statSync(audioPath);
    if (stats.size < 1000) {
      // File troppo piccolo, probabilmente silenzio
      return { transcript: null, language: null };
    }
  } catch {
    return { transcript: null, language: null };
  }

  // Per ora restituiamo null - la trascrizione audio richiede
  // un endpoint Whisper dedicato che non è disponibile nel LLM standard.
  // In produzione, questo chiamerebbe l'API Whisper di OpenAI.
  return { transcript: null, language: "it" };
}

// ─── Video Synthesis ──────────────────────────────────────────────────────────

/**
 * Sintetizza l'analisi di tutti i frame in un Campaign Digest completo.
 */
async function synthesizeVideoDigest(
  frames: FrameAnalysis[],
  audioTranscript: string | null,
  durationSeconds: number,
  input: IngestionInput
): Promise<{
  visual: VisualDigest;
  audio: AudioDigest;
  video_specific: VideoDigest;
  messaging: MessagingDigest;
  tokens_used: number;
}> {
  const framesDescription = frames
    .map((f) => `[${f.timestamp.toFixed(1)}s] ${f.description}${f.text_visible ? ` | Testo: "${f.text_visible}"` : ""}`)
    .join("\n");

  const systemPrompt = `Sei un analista esperto di comunicazione visiva e advertising.
Sintetizzi l'analisi frame-by-frame di un video pubblicitario in un Campaign Digest strutturato.
Il tuo output deve essere un JSON valido e preciso — niente testo extra, solo JSON.`;

  const userPrompt = `Sintetizza questa analisi frame-by-frame di un video pubblicitario in un Campaign Digest.

DURATA: ${durationSeconds.toFixed(1)} secondi
FRAME ANALIZZATI:
${framesDescription}

${audioTranscript ? `TRASCRIZIONE AUDIO:\n${audioTranscript}\n` : ""}
${input.client_notes ? `NOTE DEL CLIENTE: ${input.client_notes}` : ""}
${input.brand_category ? `CATEGORIA BRAND: ${input.brand_category}` : ""}
${input.channel ? `CANALE PREVISTO: ${input.channel}` : ""}

Restituisci ESATTAMENTE questo JSON:

{
  "visual": {
    "description": "descrizione narrativa del video in italiano (cosa succede, progressione visiva)",
    "composition": "stile di ripresa dominante (es: close-up, wide shot, montaggio rapido)",
    "color_palette": ["colore1", "colore2"],
    "style": "stile visivo (es: lifestyle, documentary, animation, product showcase)",
    "mood": "mood dominante del video",
    "text_on_image": {
      "headline": "headline principale se presente o null",
      "body": null,
      "cta": "CTA finale se presente o null",
      "hashtags": [],
      "price": null
    },
    "brand_visible": true/false,
    "brand_name": "nome brand se visibile o null",
    "logo_placement": "dove appare il logo o null",
    "people_present": true/false,
    "people_description": "descrizione persone nel video o null",
    "product_visible": true/false,
    "product_description": "descrizione prodotto/servizio o null"
  },
  "audio": {
    "has_audio": true,
    "voiceover_transcript": ${audioTranscript ? `"${audioTranscript.replace(/"/g, "'")}"` : "null"},
    "music_mood": "mood della musica (es: warm acoustic, energetic electronic, dramatic orchestral) o null",
    "music_energy": 0.6,
    "music_genre": "genere musicale o null",
    "dialogue": "dialogo se presente o null",
    "sound_effects": "effetti sonori notevoli o null",
    "language_detected": "lingua del parlato o null"
  },
  "video_specific": {
    "duration_seconds": ${durationSeconds.toFixed(0)},
    "format": "${durationSeconds <= 60 ? "vertical_9_16" : "horizontal_16_9"}",
    "pacing": "ritmo del montaggio (slow/medium/fast/jump_cut)",
    "scene_count": ${frames.length},
    "scene_descriptions": ${JSON.stringify(frames.map((f) => f.description))},
    "transitions": "tipo di transizioni (soft dissolves, hard cuts, wipes)",
    "native_platform": "piattaforma nativa dedotta (instagram_reel, tiktok, youtube_shorts, tv_spot) o null",
    "frame_count_analyzed": ${frames.length},
    "has_subtitles": false,
    "subtitle_text": null
  },
  "messaging": {
    "core_message": "il messaggio principale in una frase",
    "tone": "tono (es: aspirational, warm, ironic, authoritative, playful, nostalgic)",
    "emotional_appeal": ["lista leve emotive"],
    "persuasion_tactics": ["lista tattiche persuasive"],
    "target_implied": "chi sembra essere il destinatario",
    "call_to_action": "CTA principale o null",
    "price_mentioned": false,
    "price_value": null,
    "offer_type": "tipo offerta o null"
  }
}`;

  const result = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
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

  let parsed: {
    visual: VisualDigest;
    audio: AudioDigest;
    video_specific: VideoDigest;
    messaging: MessagingDigest;
  };

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Nessun JSON trovato");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    // Fallback minimale
    parsed = {
      visual: {
        description: `Video pubblicitario di ${durationSeconds.toFixed(0)} secondi`,
        composition: "unknown",
        color_palette: [],
        style: "unknown",
        mood: "neutral",
        text_on_image: { headline: null, body: null, cta: null, hashtags: [], price: null },
        brand_visible: false,
        brand_name: null,
        logo_placement: null,
        people_present: frames.some((f) => f.people_visible),
        people_description: null,
        product_visible: frames.some((f) => f.product_visible),
        product_description: null,
      },
      audio: {
        has_audio: true,
        voiceover_transcript: audioTranscript,
        music_mood: null,
        music_energy: null,
        music_genre: null,
        dialogue: null,
        sound_effects: null,
        language_detected: null,
      },
      video_specific: {
        duration_seconds: durationSeconds,
        format: "unknown",
        pacing: "medium",
        scene_count: frames.length,
        scene_descriptions: frames.map((f) => f.description),
        transitions: "unknown",
        native_platform: null,
        frame_count_analyzed: frames.length,
        has_subtitles: false,
        subtitle_text: null,
      },
      messaging: {
        core_message: "Video pubblicitario",
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

  return {
    ...parsed,
    tokens_used: result.usage?.total_tokens ?? 0,
  };
}

// ─── Main Video Processor ─────────────────────────────────────────────────────

/**
 * Processa un video e genera il Campaign Digest completo.
 * Richiede ffmpeg installato nel sistema.
 */
export async function buildVideoDigest(
  input: IngestionInput,
  videoPath: string
): Promise<CampaignDigest> {
  const startTime = Date.now();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "op-video-"));

  try {
    // 1. Ottieni durata video
    let durationSeconds = 30;
    try {
      const probeOutput = execSync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${videoPath}"`,
        { encoding: "utf-8", timeout: 15000 }
      ).trim();
      durationSeconds = parseFloat(probeOutput) || 30;
    } catch {
      // usa default
    }

    // 2. Estrai frame chiave
    const frameFiles = await extractKeyFrames(videoPath, tmpDir, 7);

    // 3. Estrai audio
    const audioPath = await extractAudio(videoPath, tmpDir);

    // 4. Analizza frame in parallelo (max 7 chiamate Vision API)
    const frameAnalyses = await Promise.all(
      frameFiles.map((f) => analyzeFrame(f.path, f.timestamp_seconds))
    );

    // 5. Trascrivi audio
    const { transcript } = audioPath
      ? await transcribeAudio(audioPath)
      : { transcript: null };

    // 6. Sintetizza tutto in un digest
    const { visual, audio, video_specific, messaging, tokens_used } =
      await synthesizeVideoDigest(frameAnalyses, transcript, durationSeconds, input);

    return {
      campaign_id: input.campaign_id,
      ingested_at: new Date().toISOString(),
      source_type: "video",
      source_format: input.source_format,
      source_url: input.file_url ?? null,
      file_name: input.file_path?.split("/").pop() ?? null,

      visual,
      audio,
      video_specific,

      messaging,

      context: {
        channel: input.channel ?? null,
        placement: null,
        client_notes: input.client_notes ?? null,
        brand_category: input.brand_category ?? null,
      },

      confidence_score: frameFiles.length >= 4 ? 0.8 : 0.6,
      processing_time_ms: Date.now() - startTime,
      llm_tokens_used: tokens_used,
    };
  } finally {
    // Pulisci i file temporanei
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignora errori di cleanup
    }
  }
}
