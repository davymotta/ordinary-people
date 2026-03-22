/**
 * Campaign Ingestion Pipeline — Perceptual Filter
 *
 * Il cuore differenziante di Ordinary People.
 * Prende il Campaign Digest (oggettivo) e lo filtra attraverso il profilo
 * di un agente specifico, generando il "pacchetto percettivo" soggettivo.
 *
 * Un agente Gen Z non "vede" la stessa campagna come un Boomer —
 * non perché l'immagine è diversa, ma perché il filtro percettivo è diverso.
 *
 * Principio: il filtro non inietta TUTTI i tratti dell'agente nel prompt.
 * Seleziona i tratti SALIENTI per questa specifica campagna.
 * Una campagna nostalgia attiva i tratti generazionali.
 * Una campagna luxury attiva i tratti Bourdieu.
 * Una campagna politica attiva i Haidt.
 */

import type { CampaignDigest, PerceptualFrame } from "./schema.js";

// ─── Agent Profile Types ──────────────────────────────────────────────────────

/**
 * Profilo minimo dell'agente necessario per il filtro percettivo.
 * Compatibile con sia i vecchi agenti (personas) che i nuovi (archetype-engine).
 */
export interface AgentPerceptualProfile {
  id: string;
  name: string;

  // Demografici
  age?: number;
  gender?: string;
  geo?: string; // città/regione
  generation?: string; // GenZ, Millennial, GenX, Boomer, Silent

  // Big Five (0.0 - 1.0)
  openness?: number;
  conscientiousness?: number;
  extraversion?: number;
  agreeableness?: number;
  neuroticism?: number;

  // Pearson Archetype
  archetype?: string; // Hero, Caregiver, Rebel, Creator, ecc.

  // Haidt Moral Foundations (0.0 - 1.0)
  haidt_care?: number;
  haidt_fairness?: number;
  haidt_loyalty?: number;
  haidt_authority?: number;
  haidt_purity?: number;
  haidt_liberty?: number;

  // Hofstede / Bourdieu
  hofstede_cluster?: string;
  bourdieu_class?: string; // working, lower_middle, middle, upper_middle, upper

  // Parametri Mirofish
  advertising_cynicism?: number; // 0.0 - 1.0
  attention_span?: number; // 0.0 - 1.0
  media_diet?: Record<string, number>; // { instagram: 0.8, tv: 0.2 }

  // Valori Inglehart-Welzel
  inglehart_values?: string; // survival, traditional, secular, self_expression

  // Psicografia
  status_orientation?: number; // 0.0 - 1.0
  novelty_seeking?: number; // 0.0 - 1.0
  price_sensitivity?: number; // 0.0 - 1.0
  risk_aversion?: number; // 0.0 - 1.0
  emotional_susceptibility?: number; // 0.0 - 1.0
  authority_trust?: number; // 0.0 - 1.0
  conformism_index?: number; // 0.0 - 1.0
}

// ─── Salience Detection ───────────────────────────────────────────────────────

/**
 * Determina quali tratti dell'agente sono SALIENTI per questa campagna.
 * Non tutti i tratti sono rilevanti per ogni campagna.
 * Questo è il cuore dell'intelligenza del filtro.
 */
function detectSalientTraits(
  agent: AgentPerceptualProfile,
  digest: CampaignDigest
): { trait: string; value: string; relevance: string }[] {
  const salient: { trait: string; value: string; relevance: string }[] = [];
  const { messaging, visual, video_specific } = digest;

  // ── Cinismo pubblicitario (sempre rilevante) ──────────────────────────────
  if (agent.advertising_cynicism !== undefined) {
    const cynicism = agent.advertising_cynicism;
    if (cynicism > 0.7) {
      salient.push({
        trait: "advertising_cynicism",
        value: `alto (${(cynicism * 100).toFixed(0)}%)`,
        relevance: "Tendi a smontare i meccanismi persuasivi della pubblicità",
      });
    } else if (cynicism < 0.3) {
      salient.push({
        trait: "advertising_cynicism",
        value: `basso (${(cynicism * 100).toFixed(0)}%)`,
        relevance: "Sei relativamente aperto ai messaggi pubblicitari",
      });
    }
  }

  // ── Generazione / età (rilevante per formato e durata) ───────────────────
  if (agent.generation || agent.age) {
    const gen = agent.generation ?? deriveGeneration(agent.age);
    if (gen) {
      const isNativeDigital = ["GenZ", "Millennial"].includes(gen);
      const isVideo = digest.source_type === "video";
      const isShortVideo = isVideo && (video_specific?.duration_seconds ?? 60) <= 30;

      if (isNativeDigital && isShortVideo) {
        salient.push({
          trait: "generation",
          value: gen,
          relevance: "I contenuti brevi e verticali sono il tuo formato nativo",
        });
      } else if (!isNativeDigital && isShortVideo) {
        salient.push({
          trait: "generation",
          value: gen,
          relevance: "I video brevissimi ti sembrano frettolosi — preferisci contenuti più sostanziali",
        });
      } else if (gen === "Boomer" || gen === "Silent") {
        salient.push({
          trait: "generation",
          value: gen,
          relevance: "Il tuo frame di riferimento culturale è diverso da quello delle generazioni più giovani",
        });
      }
    }
  }

  // ── Openness (rilevante per creatività e originalità) ────────────────────
  if (agent.openness !== undefined) {
    const appeals = messaging.emotional_appeal ?? [];
    const isCreative = messaging.tone?.includes("ironic") ||
      messaging.tone?.includes("playful") ||
      visual?.style?.includes("massimalista") ||
      visual?.style?.includes("avant-garde");

    if (agent.openness > 0.7 && isCreative) {
      salient.push({
        trait: "openness",
        value: `alta (${(agent.openness * 100).toFixed(0)}%)`,
        relevance: "Apprezzi la creatività e l'originalità visiva",
      });
    } else if (agent.openness < 0.3) {
      salient.push({
        trait: "openness",
        value: `bassa (${(agent.openness * 100).toFixed(0)}%)`,
        relevance: "Preferisci messaggi diretti e chiari rispetto a quelli creativi/ambigui",
      });
    }
  }

  // ── Status orientation (rilevante per campagne luxury/premium) ───────────
  if (agent.status_orientation !== undefined) {
    const isLuxury =
      visual?.style?.toLowerCase().includes("luxury") ||
      visual?.style?.toLowerCase().includes("premium") ||
      messaging.tone?.includes("aspirational") ||
      messaging.emotional_appeal?.includes("premium quality");

    if (isLuxury) {
      if (agent.status_orientation > 0.6) {
        salient.push({
          trait: "status_orientation",
          value: `alta (${(agent.status_orientation * 100).toFixed(0)}%)`,
          relevance: "Il posizionamento premium risuona con la tua aspirazione allo status",
        });
      } else if (agent.status_orientation < 0.3) {
        salient.push({
          trait: "status_orientation",
          value: `bassa (${(agent.status_orientation * 100).toFixed(0)}%)`,
          relevance: "Il posizionamento premium ti sembra ostentazione, non valore reale",
        });
      }
    }
  }

  // ── Price sensitivity (rilevante per campagne con prezzo/offerta) ─────────
  if (agent.price_sensitivity !== undefined && messaging.price_mentioned) {
    if (agent.price_sensitivity > 0.7) {
      salient.push({
        trait: "price_sensitivity",
        value: `alta (${(agent.price_sensitivity * 100).toFixed(0)}%)`,
        relevance: "Il prezzo è un fattore decisivo nelle tue valutazioni",
      });
    }
  }

  // ── Haidt Authority (rilevante per campagne con endorsement/autorità) ─────
  if (agent.haidt_authority !== undefined) {
    const hasAuthority =
      messaging.persuasion_tactics?.includes("authority") ||
      messaging.persuasion_tactics?.includes("expert_endorsement") ||
      messaging.persuasion_tactics?.includes("celebrity");

    if (hasAuthority) {
      if (agent.haidt_authority > 0.7) {
        salient.push({
          trait: "haidt_authority",
          value: `alta (${(agent.haidt_authority * 100).toFixed(0)}%)`,
          relevance: "Le figure di autorità e gli endorsement aumentano la tua fiducia nel brand",
        });
      } else if (agent.haidt_authority < 0.3) {
        salient.push({
          trait: "haidt_authority",
          value: `bassa (${(agent.haidt_authority * 100).toFixed(0)}%)`,
          relevance: "Gli endorsement ti lasciano freddo — preferisci giudicare da solo",
        });
      }
    }
  }

  // ── Haidt Care (rilevante per campagne con valori sociali/ambientali) ─────
  if (agent.haidt_care !== undefined) {
    const hasCare =
      messaging.emotional_appeal?.some((a) =>
        ["solidarity", "care", "community", "environment", "social"].includes(a.toLowerCase())
      );

    if (hasCare && agent.haidt_care > 0.7) {
      salient.push({
        trait: "haidt_care",
        value: `alta (${(agent.haidt_care * 100).toFixed(0)}%)`,
        relevance: "I valori di cura e solidarietà risuonano profondamente con te",
      });
    }
  }

  // ── Archetype (sempre rilevante per il frame narrativo) ──────────────────
  if (agent.archetype) {
    const archetypeFrames: Record<string, string> = {
      Hero: "Valuti se il brand ti aiuta a superare sfide e raggiungere obiettivi",
      Caregiver: "Valuti se il brand si prende cura delle persone e della comunità",
      Rebel: "Valuti se il brand sfida le convenzioni o è solo conformismo mascherato",
      Creator: "Valuti l'originalità e la qualità creativa della campagna",
      Ruler: "Valuti il prestigio, la qualità e il posizionamento del brand",
      Sage: "Valuti l'autenticità delle informazioni e la credibilità del brand",
      Innocent: "Valuti la semplicità, l'autenticità e i valori positivi del brand",
      Explorer: "Valuti se il brand apre nuove possibilità e avventure",
      Lover: "Valuti la bellezza, il desiderio e la connessione emotiva del brand",
      Jester: "Valuti l'umorismo, la leggerezza e il divertimento del brand",
      Everyman: "Valuti se il brand è accessibile, onesto e per tutti",
      Magician: "Valuti se il brand promette trasformazione e risultati straordinari",
    };

    const frame = archetypeFrames[agent.archetype];
    if (frame) {
      salient.push({
        trait: "archetype",
        value: agent.archetype,
        relevance: frame,
      });
    }
  }

  // ── Emotional susceptibility (rilevante per campagne emotive) ────────────
  if (agent.emotional_susceptibility !== undefined) {
    const isEmotional =
      messaging.emotional_appeal?.length > 2 ||
      messaging.tone?.includes("warm") ||
      messaging.tone?.includes("nostalgic");

    if (isEmotional) {
      if (agent.emotional_susceptibility > 0.7) {
        salient.push({
          trait: "emotional_susceptibility",
          value: `alta (${(agent.emotional_susceptibility * 100).toFixed(0)}%)`,
          relevance: "Sei particolarmente sensibile alle leve emotive della comunicazione",
        });
      } else if (agent.emotional_susceptibility < 0.3) {
        salient.push({
          trait: "emotional_susceptibility",
          value: `bassa (${(agent.emotional_susceptibility * 100).toFixed(0)}%)`,
          relevance: "Sei razionale nelle tue valutazioni — le leve emotive ti lasciano relativamente freddo",
        });
      }
    }
  }

  // Limita a max 5 tratti salienti per non sovraccaricare il prompt
  return salient.slice(0, 5);
}

// ─── Platform Context ─────────────────────────────────────────────────────────

/**
 * Determina il contesto di consumo dell'agente per questa campagna.
 * Dove e come l'agente "vede" questa campagna.
 */
function buildConsumptionContext(
  agent: AgentPerceptualProfile,
  digest: CampaignDigest
): PerceptualFrame["consumption_context"] {
  const channel = digest.context.channel?.toLowerCase() ?? "";
  const nativePlatform = digest.video_specific?.native_platform?.toLowerCase() ?? "";
  const gen = agent.generation ?? deriveGeneration(agent.age);

  // Determina la piattaforma di consumo
  let platform = "feed social";
  let device = "smartphone";
  let moment = "scrolling_feed";
  let attentionLevel = 0.5;

  // Mappa canale → piattaforma
  if (channel.includes("instagram") || nativePlatform.includes("instagram")) {
    platform = "Instagram";
    device = "smartphone";
    moment = "scrolling_feed";
    attentionLevel = gen === "GenZ" ? 0.4 : 0.5;
  } else if (channel.includes("tiktok") || nativePlatform.includes("tiktok")) {
    platform = "TikTok";
    device = "smartphone";
    moment = "scrolling_feed";
    attentionLevel = gen === "GenZ" ? 0.6 : 0.3;
  } else if (channel.includes("tv") || nativePlatform.includes("tv")) {
    platform = "televisione";
    device = "TV";
    moment = "watching_tv";
    attentionLevel = gen === "Boomer" || gen === "Silent" ? 0.7 : 0.4;
  } else if (channel.includes("youtube")) {
    platform = "YouTube";
    device = gen === "GenZ" ? "smartphone" : "desktop";
    moment = "watching_video";
    attentionLevel = 0.6;
  } else if (channel.includes("print") || channel.includes("magazine")) {
    platform = "rivista/giornale";
    device = "carta stampata";
    moment = "reading";
    attentionLevel = 0.8;
  } else if (channel.includes("outdoor") || channel.includes("billboard")) {
    platform = "affissione stradale";
    device = "visione diretta";
    moment = "commuting";
    attentionLevel = 0.3;
  } else if (digest.source_type === "text") {
    platform = "email/newsletter";
    device = gen === "GenZ" ? "smartphone" : "desktop";
    moment = "reading";
    attentionLevel = 0.7;
  }

  // Modifica attention level in base al profilo
  if (agent.attention_span !== undefined) {
    attentionLevel = (attentionLevel + agent.attention_span) / 2;
  }

  return {
    platform,
    device,
    moment,
    attention_level: Math.min(1.0, Math.max(0.0, attentionLevel)),
  };
}

// ─── Perceptual Prompt Builder ────────────────────────────────────────────────

/**
 * Genera il prompt percettivo completo per un agente.
 * Questo è il blocco di testo che viene iniettato nel system prompt dell'agente
 * prima di chiedergli la reazione alla campagna.
 */
export function buildPerceptualPrompt(
  agent: AgentPerceptualProfile,
  digest: CampaignDigest
): PerceptualFrame {
  const salientTraits = detectSalientTraits(agent, digest);
  const consumptionContext = buildConsumptionContext(agent, digest);

  // ── Costruisci la descrizione della campagna ──────────────────────────────
  const campaignDescription = buildCampaignDescription(digest);

  // ── Costruisci il contesto di piattaforma ─────────────────────────────────
  const platformContext = buildPlatformContext(consumptionContext, digest);

  // ── Costruisci il blocco dei tratti salienti ──────────────────────────────
  const traitsBlock =
    salientTraits.length > 0
      ? `\nDati i tuoi tratti rilevanti per questa campagna:\n${salientTraits
          .map((t) => `- **${t.trait}** (${t.value}): ${t.relevance}`)
          .join("\n")}`
      : "";

  // ── Assembla il prompt percettivo completo ────────────────────────────────
  const reactionPrompt = `${platformContext}

${campaignDescription}
${traitsBlock}

Reagisci a questo contenuto come faresti naturalmente. Considera:
1. Ti fermi o scorri via? (Stop/Scroll)
2. Qual è la tua reazione immediata, viscerale?
3. Cosa pensi del brand/prodotto dopo averlo visto?
4. Condivideresti? Commenteresti? Compreresti?
5. C'è qualcosa che ti disturba o ti convince particolarmente?

Rispondi in prima persona, con il tuo carattere autentico.`;

  return {
    agent_id: agent.id,
    campaign_id: digest.campaign_id,
    generated_at: new Date().toISOString(),
    perceptual_prompt: reactionPrompt,
    salient_traits: salientTraits,
    consumption_context: consumptionContext,
  };
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function buildCampaignDescription(digest: CampaignDigest): string {
  const parts: string[] = [];

  // Descrizione visiva
  if (digest.visual) {
    parts.push(`**Quello che vedi:** ${digest.visual.description}`);

    if (digest.visual.text_on_image.headline) {
      parts.push(`**Headline:** "${digest.visual.text_on_image.headline}"`);
    }
    if (digest.visual.text_on_image.cta) {
      parts.push(`**CTA:** "${digest.visual.text_on_image.cta}"`);
    }
    if (digest.visual.brand_name) {
      parts.push(`**Brand:** ${digest.visual.brand_name}`);
    }
  }

  // Descrizione audio/video
  if (digest.audio?.has_audio) {
    if (digest.audio.voiceover_transcript) {
      parts.push(`**Voiceover:** "${digest.audio.voiceover_transcript.slice(0, 200)}"`);
    }
    if (digest.audio.music_mood) {
      parts.push(`**Musica:** ${digest.audio.music_mood}`);
    }
  }

  if (digest.video_specific) {
    parts.push(
      `**Formato video:** ${digest.video_specific.duration_seconds}s, ritmo ${digest.video_specific.pacing}`
    );
  }

  // Messaggio e tono
  parts.push(`**Messaggio centrale:** ${digest.messaging.core_message}`);
  parts.push(`**Tono:** ${digest.messaging.tone}`);

  if (digest.messaging.emotional_appeal?.length > 0) {
    parts.push(`**Leve emotive:** ${digest.messaging.emotional_appeal.join(", ")}`);
  }

  return parts.join("\n");
}

function buildPlatformContext(
  ctx: PerceptualFrame["consumption_context"],
  digest: CampaignDigest
): string {
  const momentDescriptions: Record<string, string> = {
    scrolling_feed: `Stai scorrendo il tuo feed su ${ctx.platform}`,
    watching_tv: `Stai guardando la TV`,
    watching_video: `Stai guardando un video su ${ctx.platform}`,
    reading: `Stai leggendo su ${ctx.platform}`,
    commuting: `Stai camminando per strada`,
  };

  const moment = momentDescriptions[ctx.moment] ?? `Stai usando ${ctx.platform}`;
  const attentionDesc =
    ctx.attention_level > 0.7
      ? "con piena attenzione"
      : ctx.attention_level > 0.4
        ? "con attenzione moderata"
        : "distrattamente, quasi in automatico";

  return `${moment} ${attentionDesc}. Appare questo contenuto sponsorizzato${digest.context.brand_category ? ` di un brand di ${digest.context.brand_category}` : ""}:`;
}

function deriveGeneration(age?: number): string | null {
  if (!age) return null;
  if (age <= 27) return "GenZ";
  if (age <= 43) return "Millennial";
  if (age <= 59) return "GenX";
  if (age <= 77) return "Boomer";
  return "Silent";
}

// ─── Batch Processing ─────────────────────────────────────────────────────────

/**
 * Genera i frame percettivi per un gruppo di agenti.
 * Usato dal Campaign Testing Engine per preparare le reazioni.
 */
export function buildPerceptualFrames(
  agents: AgentPerceptualProfile[],
  digest: CampaignDigest
): PerceptualFrame[] {
  return agents.map((agent) => buildPerceptualPrompt(agent, digest));
}
