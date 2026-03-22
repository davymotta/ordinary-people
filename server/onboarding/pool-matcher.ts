/**
 * Pool Matcher
 *
 * Dato il target audience del Brand Profile, interroga il DB degli agenti
 * e costruisce il pool pre-selezionato con la composizione demografica.
 *
 * Logica:
 *   1. Filtra agenti per generazione, genere, geo (se disponibili)
 *   2. Se non ci sono abbastanza agenti nel DB, usa il sampler calibrato
 *      per generare profili sintetici con la distribuzione richiesta
 *   3. Restituisce: lista agentIds + composizione statistica del pool
 */

import { getDb } from "../db";
import { agents } from "../../drizzle/schema";
import { inArray, eq, and, or, sql } from "drizzle-orm";
import type { TargetAudience, DefaultAgentPool } from "./brand-profiler";

// ─── Types ────────────────────────────────────────────────────────────

export interface PoolMatchResult {
  agentIds: number[];
  totalFound: number;
  composition: {
    byGeneration: Record<string, number>;
    byGender: Record<string, number>;
    byGeo: Record<string, number>;
    byArchetype: Record<string, number>;
  };
  coverageScore: number; // 0-1, quanto il pool copre il target richiesto
  notes: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Mappa le generazioni del Brand Profile alle etichette nel DB agenti.
 */
function mapGenerations(generations: string[]): string[] {
  const mapping: Record<string, string> = {
    boomer: "Boomer",
    genx: "Gen X",
    "gen-x": "Gen X",
    millennial: "Millennial",
    genz: "Gen Z",
    "gen-z": "Gen Z",
  };

  return generations
    .map(g => mapping[g.toLowerCase()] ?? g)
    .filter(Boolean);
}

/**
 * Calcola la composizione demografica di un array di agenti.
 */
function computeComposition(agentList: any[]): PoolMatchResult["composition"] {
  const byGeneration: Record<string, number> = {};
  const byGender: Record<string, number> = {};
  const byGeo: Record<string, number> = {};
  const byArchetype: Record<string, number> = {};

  for (const agent of agentList) {
    // Generation
    const gen = agent.generation ?? "unknown";
    byGeneration[gen] = (byGeneration[gen] ?? 0) + 1;

    // Gender
    const gender = agent.gender ?? "unknown";
    byGender[gender] = (byGender[gender] ?? 0) + 1;

    // Geo (Nord/Centro/Sud/Isole)
    const geo = agent.geo ?? "unknown";
    byGeo[geo] = (byGeo[geo] ?? 0) + 1;

    // Archetype
    const archetype = agent.pearsonArchetype ?? "unknown";
    byArchetype[archetype] = (byArchetype[archetype] ?? 0) + 1;
  }

  return { byGeneration, byGender, byGeo, byArchetype };
}

// ─── Main Export ──────────────────────────────────────────────────────

/**
 * Trova gli agenti nel DB che corrispondono al target audience del brand.
 *
 * @param targetAudience Target audience dal Brand Profile
 * @param desiredPool Configurazione del pool desiderato
 * @param maxAgents Numero massimo di agenti da restituire
 */
export async function matchPool(
  targetAudience: TargetAudience,
  desiredPool: DefaultAgentPool,
  maxAgents: number = 100
): Promise<PoolMatchResult> {
  const db = await getDb();
  const notes: string[] = [];

  if (!db) {
    return {
      agentIds: [],
      totalFound: 0,
      composition: { byGeneration: {}, byGender: {}, byGeo: {}, byArchetype: {} },
      coverageScore: 0,
      notes: ["Database non disponibile"],
    };
  }

  // Costruisci le condizioni di filtro
  const primary = targetAudience.primary;
  const mappedGenerations = mapGenerations(primary.generation);

  // Query base: tutti gli agenti
  let query = db.select().from(agents);

  // Applica filtri se ci sono generazioni specifiche
  const matchedAgents = await query;

  // Filtra in memoria per flessibilità
  let filtered = matchedAgents.filter((agent: any) => {
    // Filtro generazione
    if (mappedGenerations.length > 0) {
      if (!mappedGenerations.includes(agent.generation ?? "")) return false;
    }

    // Filtro genere (se non "all")
    if (primary.gender !== "all") {
      const agentGender = agent.gender?.toLowerCase() ?? "";
      const targetGender = primary.gender.toLowerCase();
      if (agentGender !== targetGender && agentGender !== "") {
        // Permetti agenti senza genere specificato
        if (agentGender !== "") return false;
      }
    }

    return true;
  });

  // Se il pool filtrato è troppo piccolo, includi anche il secondario
  if (filtered.length < 10 && targetAudience.secondary) {
    const secondaryGenerations = mapGenerations(targetAudience.secondary.generation);
    const secondaryAgents = matchedAgents.filter((agent: any) => {
      if (secondaryGenerations.length > 0) {
        return secondaryGenerations.includes(agent.generation ?? "");
      }
      return true;
    });

    // Aggiungi agenti secondari non già presenti
    const primaryIds = new Set(filtered.map((a: any) => a.id));
    const additional = secondaryAgents.filter((a: any) => !primaryIds.has(a.id));
    filtered = [...filtered, ...additional];
    notes.push(`Inclusi ${additional.length} agenti dal target secondario per ampliare il pool.`);
  }

  // Se ancora troppo piccolo, usa tutti gli agenti disponibili
  if (filtered.length < 5) {
    filtered = matchedAgents;
    notes.push("Pool troppo piccolo: usati tutti gli agenti disponibili nel DB.");
  }

  // Limita al massimo richiesto
  const selected = filtered.slice(0, maxAgents);

  // Calcola composizione
  const composition = computeComposition(selected);

  // Coverage score: quante generazioni target sono coperte
  const targetGenSet = new Set(mappedGenerations);
  const foundGenSet = new Set(Object.keys(composition.byGeneration));
  const coveredGens = Array.from(targetGenSet).filter(g => foundGenSet.has(g)).length;
  const coverageScore = targetGenSet.size > 0
    ? coveredGens / targetGenSet.size
    : (selected.length > 0 ? 0.5 : 0);

  if (selected.length < desiredPool.totalAgents) {
    notes.push(
      `Trovati ${selected.length} agenti su ${desiredPool.totalAgents} richiesti. ` +
      `Considera di eseguire il seed batch per ampliare il pool.`
    );
  }

  return {
    agentIds: selected.map((a: any) => a.id),
    totalFound: selected.length,
    composition,
    coverageScore,
    notes,
  };
}

/**
 * Genera un riassunto testuale della composizione del pool
 * per mostrarlo nella chat UI.
 */
export function formatPoolSummary(result: PoolMatchResult): string {
  const { totalFound, composition, coverageScore, notes } = result;

  if (totalFound === 0) {
    return "Nessun agente trovato nel pool. Esegui il seed batch per popolare il database.";
  }

  const genLines = Object.entries(composition.byGeneration)
    .sort(([, a], [, b]) => b - a)
    .map(([gen, count]) => `${gen}: ${count} (${Math.round((count / totalFound) * 100)}%)`)
    .join(", ");

  const genderLines = Object.entries(composition.byGender)
    .map(([g, count]) => `${g}: ${Math.round((count / totalFound) * 100)}%`)
    .join(", ");

  const coverageLabel = coverageScore >= 0.8 ? "ottima" : coverageScore >= 0.5 ? "buona" : "parziale";

  let summary = `**${totalFound} agenti selezionati** (copertura target: ${coverageLabel})\n\n`;
  summary += `Distribuzione per generazione: ${genLines}\n`;
  summary += `Distribuzione per genere: ${genderLines}`;

  if (notes.length > 0) {
    summary += `\n\n_Nota: ${notes.join(" ")}_ `;
  }

  return summary;
}
