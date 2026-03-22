/**
 * Ordinary People — Life History Engine v1.0
 *
 * Carica l'archivio storico-culturale 1950-2025 nel database e genera
 * memorie biografiche per ogni agente basate sulla loro storia vissuta.
 *
 * Principi:
 * - Schuman & Scott (1989): eventi tra 14-24 anni hanno peso 3x (formative years)
 * - Bourdieu: habitus filtra quali eventi sono rilevanti per quale agente
 * - Kahneman: eventi ad alta intensità emotiva creano memorie più durature
 * - McLuhan: il medium è il messaggio — radio, TV, internet cambiano la percezione
 */

import { getDb } from "./db";
import {
  historicalEvents,
  tvPrograms,
  iconicAds,
  culturalPhenomena,
  agentHistoricalExposures,
  agents,
  agentMemories,
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { eq } from "drizzle-orm";
import archiveData from "./historical-archive.json";

// ─── Types ────────────────────────────────────────────────────────────

interface ArchiveEvent {
  id: number;
  anno: number;
  anno_fine?: number | null;
  titolo: string;
  descrizione: string;
  tipo: string;
  portata: string;
  impatto_emotivo: string;
  intensita: number;
  segmenti_piu_colpiti: string[];
  vettore_mediale: string;
  decennio: string;
  geolocalizzazione: string;
  tags: string[];
}

interface ArchiveProgram {
  id: number;
  titolo: string;
  rete: string;
  anni: string;
  anno_inizio: number;
  descrizione: string;
  impatto_culturale: string;
  audience_tipo: string;
  intensita_culturale: number;
  periodo: string;
  tipo: string;
  tags: string[];
}

interface ArchiveAd {
  id: number;
  brand: string;
  prodotto: string;
  slogan: string;
  anno: number;
  rete: string;
  descrizione: string;
  impatto_culturale: string;
  segmento_target: string;
  periodo: string;
  intensita_culturale: number;
  tags: string[];
}

interface ArchivePhenomenon {
  id: number;
  titolo: string;
  descrizione: string;
  periodo: string;
  impatto: string;
  segmenti_coinvolti: string[];
}

// ─── Normalize enum values ────────────────────────────────────────────

const VALID_TIPO = ["politico", "economico", "culturale", "tecnologico", "naturale", "criminalita", "sport", "internazionale", "sociale"];
const VALID_PORTATA = ["globale", "nazionale", "regionale"];
const VALID_IMPATTO = ["paura", "speranza", "rabbia", "orgoglio", "lutto", "shock", "gioia", "indignazione", "nostalgia", "curiosita", "meraviglia", "tristezza"];
const VALID_VETTORE = ["radio", "tv_generalista", "stampa", "internet", "social_media"];

function normalizeTipo(v: string): string {
  const clean = v.toLowerCase().replace(/à/g, 'a').replace(/è/g, 'e').replace(/ì/g, 'i').replace(/ò/g, 'o').replace(/ù/g, 'u');
  return VALID_TIPO.includes(clean) ? clean : "sociale";
}

function normalizePortata(v: string): string {
  const clean = v.toLowerCase();
  return VALID_PORTATA.includes(clean) ? clean : "nazionale";
}

function normalizeImpatto(v: string): string {
  const clean = v.toLowerCase().replace(/à/g, 'a').replace(/è/g, 'e').replace(/ì/g, 'i').replace(/ò/g, 'o').replace(/ù/g, 'u');
  return VALID_IMPATTO.includes(clean) ? clean : "shock";
}

function normalizeVettore(v: string): string {
  const clean = v.toLowerCase();
  return VALID_VETTORE.includes(clean) ? clean : "tv_generalista";
}

// ─── Load archive into DB ─────────────────────────────────────────────

export async function loadArchiveIntoDB(): Promise<{
  events: number;
  programs: number;
  ads: number;
  phenomena: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if already loaded
  const existing = await db.select().from(historicalEvents).limit(1);
  if (existing.length > 0) {
    const evCount = await db.select().from(historicalEvents);
    const progCount = await db.select().from(tvPrograms);
    const adCount = await db.select().from(iconicAds);
    const phenCount = await db.select().from(culturalPhenomena);
    return {
      events: evCount.length,
      programs: progCount.length,
      ads: adCount.length,
      phenomena: phenCount.length,
    };
  }
  
  const archive = archiveData as {
    historical_events: ArchiveEvent[];
    tv_programs: ArchiveProgram[];
    iconic_ads: ArchiveAd[];
    cultural_phenomena: ArchivePhenomenon[];
  };
  
  // Insert historical events in batches
  const BATCH = 50;
  let eventsInserted = 0;
  
  for (let i = 0; i < archive.historical_events.length; i += BATCH) {
    const batch = archive.historical_events.slice(i, i + BATCH);
    await db.insert(historicalEvents).values(
      batch.map(e => ({
        anno: e.anno || 0,
        annoFine: e.anno_fine ?? null,
        titolo: (e.titolo || "").substring(0, 200),
        descrizione: e.descrizione || "",
        tipo: normalizeTipo(e.tipo || "sociale") as any,
        portata: normalizePortata(e.portata || "nazionale") as any,
        impatto_emotivo: normalizeImpatto(e.impatto_emotivo || "shock") as any,
        intensita: Math.min(1, Math.max(0, e.intensita || 0.5)),
        segmentiPiuColpiti: e.segmenti_piu_colpiti || [],
        vettoreMediale: normalizeVettore(e.vettore_mediale || "tv_generalista") as any,
        decennio: e.decennio || "",
        geolocalizzazione: e.geolocalizzazione || "Italia",
        tags: e.tags || [],
      }))
    );
    eventsInserted += batch.length;
  }
  
  // Insert TV programs
  let programsInserted = 0;
  for (let i = 0; i < archive.tv_programs.length; i += BATCH) {
    const batch = archive.tv_programs.slice(i, i + BATCH);
    await db.insert(tvPrograms).values(
      batch.map(p => ({
        titolo: (p.titolo || "").substring(0, 200),
        rete: (p.rete || "RAI1").substring(0, 100),
        anni: (p.anni || "").substring(0, 100),
        annoInizio: p.anno_inizio || 0,
        descrizione: p.descrizione || "",
        impattoculturale: p.impatto_culturale || "",
        audienceTipo: (p.audience_tipo || "").substring(0, 200),
        intensitaCulturale: Math.min(1, Math.max(0, p.intensita_culturale || 0.5)),
        periodo: (p.periodo || "").substring(0, 50),
        tipo: (p.tipo || "varietà").substring(0, 100),
        tags: p.tags || [],
      }))
    );
    programsInserted += batch.length;
  }
  
  // Insert iconic ads
  let adsInserted = 0;
  for (let i = 0; i < archive.iconic_ads.length; i += BATCH) {
    const batch = archive.iconic_ads.slice(i, i + BATCH);
    await db.insert(iconicAds).values(
      batch.map(a => ({
        brand: (a.brand || "").substring(0, 200),
        prodotto: (a.prodotto || "").substring(0, 200),
        slogan: a.slogan && a.slogan !== "None" ? a.slogan.substring(0, 300) : null,
        anno: a.anno || 0,
        rete: a.rete ? a.rete.substring(0, 100) : null,
        descrizione: a.descrizione || "",
        impattoculturale: a.impatto_culturale || "",
        segmentoTarget: a.segmento_target ? a.segmento_target.substring(0, 200) : null,
        periodo: (a.periodo || "").substring(0, 50),
        intensitaCulturale: Math.min(1, Math.max(0, a.intensita_culturale || 0.5)),
        tags: a.tags || [],
      }))
    );
    adsInserted += batch.length;
  }
  
  // Insert cultural phenomena
  let phenomenaInserted = 0;
  for (let i = 0; i < archive.cultural_phenomena.length; i += BATCH) {
    const batch = archive.cultural_phenomena.slice(i, i + BATCH);
    await db.insert(culturalPhenomena).values(
      batch.map(p => ({
        titolo: (p.titolo || "").substring(0, 200),
        descrizione: p.descrizione || "",
        periodo: (p.periodo || "").substring(0, 50),
        impatto: p.impatto || "",
        segmentiCoinvolti: p.segmenti_coinvolti || [],
      }))
    );
    phenomenaInserted += batch.length;
  }
  
  return {
    events: eventsInserted,
    programs: programsInserted,
    ads: adsInserted,
    phenomena: phenomenaInserted,
  };
}

// ─── Biographical Filter ──────────────────────────────────────────────

/**
 * Computes relevance score for an agent-event pair.
 * Based on Schuman & Scott (1989) formative years theory.
 */
export function computeRelevance(
  agentBirthYear: number,
  eventYear: number,
  eventIntensity: number,
  eventSegments: string[],
  agentGeneration: string,
  agentGeo: string,
  agentHabitus: string,
  eventPortata: string,
): { relevance: number; ageAtEvent: number; isFormativeYear: boolean } {
  const ageAtEvent = eventYear - agentBirthYear;
  
  // Agent must be alive and at least 5 years old
  if (ageAtEvent < 5 || ageAtEvent > 90) {
    return { relevance: 0, ageAtEvent, isFormativeYear: false };
  }
  
  // Formative years multiplier (Schuman & Scott: 14-24 years)
  const isFormativeYear = ageAtEvent >= 14 && ageAtEvent <= 24;
  let relevance = eventIntensity;
  
  if (isFormativeYear) {
    relevance *= 3.0; // 3x weight for formative years
  } else if (ageAtEvent >= 5 && ageAtEvent <= 13) {
    relevance *= 1.5; // childhood memories
  } else if (ageAtEvent >= 25 && ageAtEvent <= 45) {
    relevance *= 1.0; // adult years — normal weight
  } else {
    relevance *= 0.7; // older age — less formative
  }
  
  // Geographic match
  if (eventPortata === "regionale") {
    // Regional events only matter if agent is from that region
    relevance *= 0.3; // default low — would need geo matching
  } else if (eventPortata === "nazionale") {
    relevance *= 1.0;
  } else if (eventPortata === "globale") {
    relevance *= 0.9; // global events slightly less personal
  }
  
  // Segment match
  if (eventSegments && eventSegments.length > 0) {
    const segmentMatch = eventSegments.some(seg => {
      const s = seg.toLowerCase();
      return (
        s === "tutti" ||
        s.includes(agentGeneration.toLowerCase()) ||
        s.includes(agentGeo.toLowerCase()) ||
        s.includes(agentHabitus.toLowerCase())
      );
    });
    if (segmentMatch) relevance *= 1.3;
  }
  
  // Normalize to 0-1
  relevance = Math.min(1.0, relevance);
  
  return { relevance, ageAtEvent, isFormativeYear };
}

// ─── Generate Biographical Memories for an Agent ─────────────────────

export async function generateAgentLifeHistory(agentId: number): Promise<{
  exposuresCreated: number;
  memoriesGenerated: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get agent
  const agentRows = await db.select().from(agents).where(eq(agents.id, agentId));
  if (agentRows.length === 0) throw new Error(`Agent ${agentId} not found`);
  const agent = agentRows[0];
  
  // Check if already processed
  const existingExposures = await db
    .select()
    .from(agentHistoricalExposures)
    .where(eq(agentHistoricalExposures.agentId, agentId));
  
  if (existingExposures.length > 0) {
    return { exposuresCreated: 0, memoriesGenerated: 0 };
  }
  
  const birthYear = new Date().getFullYear() - agent.age;
  const habitusData = agent.habitusProfile as Record<string, number> | null;
  const habitus = habitusData ? Object.keys(habitusData).sort((a,b) => (habitusData[b]||0) - (habitusData[a]||0))[0] || "popolare" : "popolare";
  
  // Get all historical events
  const allEvents = await db.select().from(historicalEvents);
  const allPrograms = await db.select().from(tvPrograms);
  const allAds = await db.select().from(iconicAds);
  
  // Filter and score events for this agent
  const relevantEvents: Array<{
    eventId: number;
    eventType: "historical" | "tv_program" | "iconic_ad" | "cultural_phenomenon";
    ageAtEvent: number;
    isFormativeYear: boolean;
    relevanceScore: number;
    title: string;
    description: string;
    emotionalImpact: string;
    intensity: number;
  }> = [];
  
  // Historical events
  for (const event of allEvents) {
    const { relevance, ageAtEvent, isFormativeYear } = computeRelevance(
      birthYear,
      event.anno,
      event.intensita,
      (event.segmentiPiuColpiti as string[]) || [],
      agent.generation,
      agent.geo,
      habitus,
      event.portata,
    );
    
    if (relevance >= 0.3) { // threshold
      relevantEvents.push({
        eventId: event.id,
        eventType: "historical",
        ageAtEvent,
        isFormativeYear,
        relevanceScore: relevance,
        title: event.titolo,
        description: event.descrizione,
        emotionalImpact: event.impatto_emotivo,
        intensity: event.intensita,
      });
    }
  }
  
  // TV programs (if agent was alive during broadcast)
  for (const prog of allPrograms) {
    if (prog.annoInizio === 0) continue;
    const { relevance, ageAtEvent, isFormativeYear } = computeRelevance(
      birthYear,
      prog.annoInizio,
      prog.intensitaCulturale,
      [],
      agent.generation,
      agent.geo,
      habitus,
      "nazionale",
    );
    
    if (relevance >= 0.35) {
      relevantEvents.push({
        eventId: prog.id,
        eventType: "tv_program",
        ageAtEvent,
        isFormativeYear,
        relevanceScore: relevance,
        title: prog.titolo,
        description: prog.descrizione,
        emotionalImpact: "nostalgia",
        intensity: prog.intensitaCulturale,
      });
    }
  }
  
  // Iconic ads
  for (const ad of allAds) {
    if (ad.anno === 0) continue;
    const { relevance, ageAtEvent, isFormativeYear } = computeRelevance(
      birthYear,
      ad.anno,
      ad.intensitaCulturale,
      [],
      agent.generation,
      agent.geo,
      habitus,
      "nazionale",
    );
    
    if (relevance >= 0.4) {
      relevantEvents.push({
        eventId: ad.id,
        eventType: "iconic_ad",
        ageAtEvent,
        isFormativeYear,
        relevanceScore: relevance,
        title: `${ad.brand} — ${ad.prodotto}`,
        description: ad.descrizione,
        emotionalImpact: "nostalgia",
        intensity: ad.intensitaCulturale,
      });
    }
  }
  
  // Sort by relevance, take top 60 events
  relevantEvents.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topEvents = relevantEvents.slice(0, 60);
  
  // Insert exposures
  let exposuresCreated = 0;
  let memoriesGenerated = 0;
  
  // Generate memories for top 15 most relevant events (LLM call)
  const eventsForMemory = topEvents.filter(e => e.relevanceScore >= 0.6).slice(0, 15);
  
  // Build LLM prompt for batch memory generation
  if (eventsForMemory.length > 0) {
    const eventsListText = eventsForMemory.map((e, i) => 
      `${i+1}. [${e.title}] (età: ${e.ageAtEvent} anni, impatto: ${e.emotionalImpact})\n   ${e.description.substring(0, 150)}`
    ).join("\n\n");
    
    const memoryPrompt = `Sei ${agent.firstName} ${agent.lastName}, ${agent.age} anni, ${agent.profession}, nato/a a ${agent.city} (${agent.region}).
Generazione: ${agent.generation}. Istruzione: ${agent.education}. Reddito: ${agent.incomeBand}.

Per ognuno dei seguenti eventi storici che hai vissuto, scrivi una breve memoria autobiografica in prima persona (2-3 frasi max). 
La memoria deve essere autentica, emotivamente vera, e riflettere il tuo background socioculturale.

EVENTI:
${eventsListText}

Rispondi con un JSON array di oggetti con questa struttura esatta:
[{"index": 1, "memory": "...", "valence": 0.5}]
dove valence è da -1 (molto negativo) a +1 (molto positivo).
Rispondi SOLO con il JSON, nessun testo prima o dopo.`;
    
    try {
      const llmResponse = await invokeLLM({
        messages: [
          { role: "system", content: "Sei un essere umano italiano che ricorda eventi della propria vita. Rispondi sempre in italiano, in prima persona, con emozione autentica." },
          { role: "user", content: memoryPrompt },
        ],
      });
      
      const rawContent = llmResponse.choices[0]?.message?.content || "[]";
      const content = typeof rawContent === "string" ? rawContent : "[]";
      
      // Parse memories
      let memories: Array<{ index: number; memory: string; valence: number }> = [];
      try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        memories = JSON.parse(cleaned);
      } catch {
        // If parsing fails, continue without memories
      }
      
      // Insert exposures with memories
      for (let i = 0; i < topEvents.length; i++) {
        const e = topEvents[i];
        const memoryData = memories.find(m => m.index === eventsForMemory.indexOf(e) + 1);
        
        await db.insert(agentHistoricalExposures).values({
          agentId,
          eventId: e.eventId,
          eventType: e.eventType,
          ageAtEvent: e.ageAtEvent,
          isFormativeYear: e.isFormativeYear,
          relevanceScore: e.relevanceScore,
          memoryText: memoryData?.memory || null,
          emotionalValence: memoryData?.valence ?? null,
          memorySaliency: e.isFormativeYear ? Math.min(1, e.relevanceScore * 1.5) : e.relevanceScore,
        });
        exposuresCreated++;
        
        // Also create an agentMemory for formative year events with high relevance
        if (e.isFormativeYear && e.relevanceScore >= 0.7 && memoryData?.memory) {
          await db.insert(agentMemories).values({
            agentId,
            memoryType: "episodic" as const,
            title: e.title.substring(0, 300),
            content: memoryData.memory,
            emotionalValence: memoryData.valence,
            emotionalIntensity: e.intensity,
            importance: Math.min(1, e.relevanceScore),
            tags: [e.eventType, e.emotionalImpact],
            occurredAt: new Date(e.ageAtEvent + birthYear, 0, 1),
          });
          memoriesGenerated++;
        }
      }
    } catch (err) {
      // Insert exposures without memories on LLM error
      for (const e of topEvents) {
        await db.insert(agentHistoricalExposures).values({
          agentId,
          eventId: e.eventId,
          eventType: e.eventType,
          ageAtEvent: e.ageAtEvent,
          isFormativeYear: e.isFormativeYear,
          relevanceScore: e.relevanceScore,
          memoryText: null,
          emotionalValence: null,
          memorySaliency: e.relevanceScore,
        });
        exposuresCreated++;
      }
    }
  } else {
    // Insert all exposures without memories
    for (const e of topEvents) {
      await db.insert(agentHistoricalExposures).values({
        agentId,
        eventId: e.eventId,
        eventType: e.eventType,
        ageAtEvent: e.ageAtEvent,
        isFormativeYear: e.isFormativeYear,
        relevanceScore: e.relevanceScore,
        memoryText: null,
        emotionalValence: null,
        memorySaliency: e.relevanceScore,
      });
      exposuresCreated++;
    }
  }
  
  return { exposuresCreated, memoriesGenerated };
}

// ─── Get Agent Life Timeline ──────────────────────────────────────────

export async function getAgentLifeTimeline(agentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const exposures = await db
    .select()
    .from(agentHistoricalExposures)
    .where(eq(agentHistoricalExposures.agentId, agentId));
  
  // Enrich with event data
  type ExposureRow = typeof exposures[number];
  const enriched = await Promise.all(
    exposures.map(async (exp: ExposureRow) => {
      let eventData: { titolo: string; descrizione: string; anno?: number; tipo?: string; impatto?: string } | null = null;
      
      if (exp.eventType === "historical") {
        const rows = await db.select().from(historicalEvents).where(eq(historicalEvents.id, exp.eventId));
        if (rows[0]) eventData = { titolo: rows[0].titolo, descrizione: rows[0].descrizione, anno: rows[0].anno, tipo: rows[0].tipo, impatto: rows[0].impatto_emotivo };
      } else if (exp.eventType === "tv_program") {
        const rows = await db.select().from(tvPrograms).where(eq(tvPrograms.id, exp.eventId));
        if (rows[0]) eventData = { titolo: rows[0].titolo, descrizione: rows[0].descrizione, anno: rows[0].annoInizio, tipo: "tv", impatto: "nostalgia" };
      } else if (exp.eventType === "iconic_ad") {
        const rows = await db.select().from(iconicAds).where(eq(iconicAds.id, exp.eventId));
        if (rows[0]) eventData = { titolo: `${rows[0].brand} — ${rows[0].prodotto}`, descrizione: rows[0].descrizione, anno: rows[0].anno, tipo: "pubblicità", impatto: "nostalgia" };
      }
      
      return { ...exp, eventData };
    })
  );
  
  // Sort by year
  type EnrichedExposure = ExposureRow & { eventData: { titolo: string; descrizione: string; anno?: number; tipo?: string; impatto?: string } | null };
  return (enriched as EnrichedExposure[])
    .filter(e => e.eventData)
    .sort((a, b) => (a.eventData?.anno || 0) - (b.eventData?.anno || 0));
}

// ─── Get Archive Stats ────────────────────────────────────────────────

export async function getArchiveStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [evCount, progCount, adCount, phenCount] = await Promise.all([
    db.select().from(historicalEvents),
    db.select().from(tvPrograms),
    db.select().from(iconicAds),
    db.select().from(culturalPhenomena),
  ]);
  
  return {
    totalEvents: evCount.length,
    totalPrograms: progCount.length,
    totalAds: adCount.length,
    totalPhenomena: phenCount.length,
    isLoaded: evCount.length > 0,
  };
}
