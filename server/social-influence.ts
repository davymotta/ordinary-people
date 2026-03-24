/**
 * social-influence.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Loop sociale tra agenti: ogni agente può vedere le reazioni dei propri
 * contatti sociali prima di finalizzare la propria risposta.
 *
 * Architettura a due passaggi:
 *   Pass 1 — Reazione individuale (Sistema 1, istintiva, senza influenza sociale)
 *   Pass 2 — Reazione sociale (aggiornamento dopo aver "visto" le reazioni dei contatti)
 *
 * Basato su:
 *   - Cialdini (1984): Social Proof — le persone guardano agli altri per decidere
 *   - Moscovici (1980): Minority Influence — le minoranze attive possono spostare le maggioranze
 *   - Tajfel & Turner (1979): Social Identity Theory — in-group vs out-group
 *   - Bourdieu (1984): il campo sociale filtra quali influenze sono rilevanti
 *
 * Il grafo di influenza è costruito dai socialContacts degli agenti nel DB.
 * Il peso dell'influenza dipende da:
 *   - echoChamberStrength dell'agente (quanto è chiuso nella propria bolla)
 *   - identityDefensiveness (quanto resiste all'influenza esterna)
 *   - distanza sociale (stessa generazione, stesso geo, stessa classe)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Agent } from "../drizzle/schema";
import { socialInfluenceToPsycheStimulus } from "./psyche/world-psyche-bridge";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Pass1Reaction {
  agentId: number;
  agentSlug: string;
  score: number;           // 0-10
  gutReaction: string;     // reazione istintiva Sistema 1
  attractionScore: number; // 0-10
  repulsionScore: number;  // 0-10
  purchaseProbability: number; // 0-1
}

export interface SocialInfluenceContext {
  agentId: number;
  agentSlug: string;
  contactReactions: ContactReaction[];
  socialPressure: number;     // -1 (pressione negativa) a +1 (pressione positiva)
  majoritySignal: "positive" | "negative" | "mixed" | "none";
  influenceWeight: number;    // 0-1, quanto questa pressione pesa sulla reazione finale
}

export interface ContactReaction {
  contactSlug: string;
  contactName: string;
  score: number;
  sentiment: "positive" | "negative" | "neutral";
  socialDistance: number; // 0=molto vicino, 1=distante
  influenceOnAgent: number; // 0-1, peso di questo contatto sull'agente
}

// ─── Grafo di influenza ───────────────────────────────────────────────────────

/**
 * Costruisce il contesto di influenza sociale per ogni agente.
 * Dato il pool di agenti e le loro reazioni Pass 1, calcola:
 * - quali contatti ha ogni agente nel pool
 * - come le loro reazioni creano pressione sociale
 * - quanto questa pressione pesa sulla reazione finale
 */
export function buildSocialInfluenceContexts(
  agents: Agent[],
  pass1Reactions: Pass1Reaction[]
): Map<number, SocialInfluenceContext> {
  const contexts = new Map<number, SocialInfluenceContext>();
  
  // Indice slug → agente e slug → reazione
  const agentBySlug = new Map<string, Agent>();
  const reactionBySlug = new Map<string, Pass1Reaction>();
  
  for (const agent of agents) {
    agentBySlug.set(agent.slug, agent);
  }
  for (const reaction of pass1Reactions) {
    reactionBySlug.set(reaction.agentSlug, reaction);
  }

  for (const agent of agents) {
    const contacts = (agent.socialContacts as string[] | null) ?? [];
    const contactReactions: ContactReaction[] = [];

    for (const contactSlug of contacts) {
      const contactAgent = agentBySlug.get(contactSlug);
      const contactReaction = reactionBySlug.get(contactSlug);
      
      // Solo contatti che sono nel pool di questa simulazione
      if (!contactAgent || !contactReaction) continue;

      const socialDistance = computeSocialDistance(agent, contactAgent);
      const influenceOnAgent = computeInfluenceWeight(agent, contactAgent, socialDistance);

      contactReactions.push({
        contactSlug,
        contactName: `${contactAgent.firstName} ${contactAgent.lastName}`,
        score: contactReaction.score,
        sentiment: contactReaction.score >= 6 ? "positive" : contactReaction.score <= 4 ? "negative" : "neutral",
        socialDistance,
        influenceOnAgent,
      });
    }

    // Calcola la pressione sociale aggregata
    const socialPressure = computeSocialPressure(contactReactions);
    const majoritySignal = computeMajoritySignal(contactReactions);
    
    // Il peso dell'influenza dipende da identityDefensiveness e echoChamberStrength
    // (questi campi sono nell'archetypeProfile, non direttamente nell'agent — usiamo proxy)
    const defensiveness = agent.identityDefensiveness ?? 0.5;
    const influenceWeight = Math.max(0.05, Math.min(0.6, (1 - defensiveness) * 0.6));

    contexts.set(agent.id, {
      agentId: agent.id,
      agentSlug: agent.slug,
      contactReactions,
      socialPressure,
      majoritySignal,
      influenceWeight,
    });
  }

  return contexts;
}

/**
 * Distanza sociale tra due agenti (0=identici, 1=massima distanza).
 * Basata su: generazione, geo, incomeBand, education.
 * Più due agenti sono simili, più si influenzano a vicenda (echo chamber).
 */
function computeSocialDistance(a: Agent, b: Agent): number {
  let distance = 0;
  let factors = 0;

  // Generazione (peso alto: le persone si fidano di più di chi è della stessa generazione)
  if (a.generation !== b.generation) distance += 0.35;
  factors += 0.35;

  // Geo (peso medio)
  if (a.geo !== b.geo) distance += 0.2;
  factors += 0.2;

  // Istruzione (peso medio)
  const eduLevels = ["licenza_elementare", "licenza_media", "diploma", "laurea_triennale", "laurea_magistrale", "dottorato"];
  const eduA = eduLevels.indexOf(a.education);
  const eduB = eduLevels.indexOf(b.education);
  const eduDiff = Math.abs(eduA - eduB) / (eduLevels.length - 1);
  distance += eduDiff * 0.25;
  factors += 0.25;

  // Reddito (peso medio)
  const incomeA = a.incomeEstimate;
  const incomeB = b.incomeEstimate;
  const maxIncome = 200000;
  const incomeDiff = Math.abs(incomeA - incomeB) / maxIncome;
  distance += Math.min(1, incomeDiff) * 0.2;
  factors += 0.2;

  return distance / factors;
}

/**
 * Peso dell'influenza di contactAgent su agent.
 * Più sono socialmente vicini, più l'influenza è forte.
 * Ma se l'agente ha alta identityDefensiveness, resiste all'influenza.
 */
function computeInfluenceWeight(agent: Agent, contactAgent: Agent, socialDistance: number): number {
  const proximity = 1 - socialDistance; // 0=distanti, 1=vicini
  const defensiveness = agent.identityDefensiveness ?? 0.5;
  
  // L'influenza è proporzionale alla vicinanza e inversamente proporzionale alla defensiveness
  return proximity * (1 - defensiveness * 0.5);
}

/**
 * Pressione sociale aggregata: media pesata delle reazioni dei contatti.
 * Valore tra -1 (tutti negativi) e +1 (tutti positivi).
 */
function computeSocialPressure(contactReactions: ContactReaction[]): number {
  if (contactReactions.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const cr of contactReactions) {
    const normalizedScore = (cr.score - 5) / 5; // -1 a +1
    weightedSum += normalizedScore * cr.influenceOnAgent;
    totalWeight += cr.influenceOnAgent;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Segnale di maggioranza: se la maggioranza dei contatti è positiva/negativa/mista.
 */
function computeMajoritySignal(contactReactions: ContactReaction[]): "positive" | "negative" | "mixed" | "none" {
  if (contactReactions.length === 0) return "none";

  const positive = contactReactions.filter(cr => cr.sentiment === "positive").length;
  const negative = contactReactions.filter(cr => cr.sentiment === "negative").length;
  const total = contactReactions.length;

  if (positive / total > 0.6) return "positive";
  if (negative / total > 0.6) return "negative";
  return "mixed";
}

// ─── Aggiornamento Pass 2 ─────────────────────────────────────────────────────

/**
 * Aggiorna il punteggio di un agente dopo aver visto le reazioni dei contatti.
 * Implementa l'influenza sociale secondo Cialdini (Social Proof) e
 * Moscovici (Minority Influence).
 *
 * La formula è:
 *   finalScore = pass1Score + (socialPressure * influenceWeight * 5)
 *
 * Il delta massimo è ±3 punti (influenza forte ma non determinante).
 */
export function applysocialInfluence(
  pass1Score: number,
  context: SocialInfluenceContext
): { finalScore: number; socialDelta: number; socialNarrative: string } {
  if (context.contactReactions.length === 0) {
    return {
      finalScore: pass1Score,
      socialDelta: 0,
      socialNarrative: "",
    };
  }

  // Delta sociale: pressione × peso × range massimo (3 punti)
  const rawDelta = context.socialPressure * context.influenceWeight * 3;
  
  // Clamp: il delta non può superare ±3 punti
  const socialDelta = Math.max(-3, Math.min(3, rawDelta));
  
  // Score finale: clamp tra 0 e 10
  const finalScore = Math.max(0, Math.min(10, pass1Score + socialDelta));

  // Narrativa dell'influenza sociale (per il report)
  const socialNarrative = buildSocialNarrative(context, socialDelta);

  return { finalScore, socialDelta, socialNarrative };
}

/**
 * Costruisce una narrativa testuale dell'influenza sociale (per il report).
 */
function buildSocialNarrative(context: SocialInfluenceContext, socialDelta: number): string {
  if (context.contactReactions.length === 0) return "";

  const positiveContacts = context.contactReactions.filter(cr => cr.sentiment === "positive");
  const negativeContacts = context.contactReactions.filter(cr => cr.sentiment === "negative");

  if (Math.abs(socialDelta) < 0.3) {
    return `Le reazioni dei miei contatti (${context.contactReactions.length} persone) non hanno cambiato la mia opinione.`;
  }

  if (socialDelta > 0 && positiveContacts.length > 0) {
    const names = positiveContacts.slice(0, 2).map(cr => cr.contactName).join(", ");
    return `Ho visto che ${names} ha reagito positivamente. Questo mi ha fatto riconsiderare la mia posizione iniziale verso l'alto.`;
  }

  if (socialDelta < 0 && negativeContacts.length > 0) {
    const names = negativeContacts.slice(0, 2).map(cr => cr.contactName).join(", ");
    return `Ho visto che ${names} ha reagito negativamente. Questo mi ha fatto dubitare della mia reazione iniziale.`;
  }

  return `Le opinioni dei miei contatti erano contrastanti — ho mantenuto la mia posizione.`;
}

// ─── Prompt per Pass 2 ───────────────────────────────────────────────────────

/**
 * Costruisce il prompt per il Pass 2 (reazione sociale).
 * Mostra all'agente le reazioni dei suoi contatti e chiede di aggiornare la propria.
 */
export function buildSocialInfluencePrompt(
  context: SocialInfluenceContext,
  pass1GutReaction: string
): string {
  if (context.contactReactions.length === 0) return "";

  const contactLines = context.contactReactions
    .slice(0, 5) // Mostra al massimo 5 contatti
    .map(cr => {
      const sentimentIcon = cr.sentiment === "positive" ? "👍" : cr.sentiment === "negative" ? "👎" : "😐";
      return `- ${cr.contactName}: ${sentimentIcon} (punteggio ${cr.score}/10)`;
    })
    .join("\n");

  const majorityDesc = context.majoritySignal === "positive"
    ? "La maggioranza dei tuoi contatti ha reagito positivamente."
    : context.majoritySignal === "negative"
    ? "La maggioranza dei tuoi contatti ha reagito negativamente."
    : "Le reazioni dei tuoi contatti sono miste.";

  return `
Hai appena visto le reazioni di alcune persone che conosci a questa stessa campagna:

${contactLines}

${majorityDesc}

La tua reazione iniziale era: "${pass1GutReaction}"

Ora che hai visto come hanno reagito le persone che conosci, la tua opinione cambia?
Rispondi nel formato JSON richiesto, aggiornando il tuo score e la tua reflection se necessario.
Sii onesto: potresti confermare la tua posizione, lasciarti influenzare, o resistere consapevolmente alla pressione sociale.
`.trim();
}

// ─── Psyche Social Stimulus ─────────────────────────────────────────────────

/**
 * Restituisce lo stimolo Psyche corrispondente al contesto di influenza sociale.
 * Usato dal Campaign Engine Pass 2 per aggiornare il grafo cognitivo dell'agente
 * dopo aver visto le reazioni dei contatti.
 *
 * Bowlby: le reazioni degli altri attivano il sistema di attaccamento.
 * Cialdini: la social proof modifica la valutazione del rischio.
 */
export function getPsycheSocialStimulus(
  context: SocialInfluenceContext
): { themes: string[]; stimulusStrength: number } | null {
  if (context.contactReactions.length === 0) return null;

  // Determina il tipo di influenza dominante
  const signal = context.majoritySignal;
  const pressure = context.socialPressure;

  if (Math.abs(pressure) < 0.15) {
    // Pressione mista/neutra — conformity lieve
    const stimulus = socialInfluenceToPsycheStimulus("conformity", 0.2);
    return { themes: stimulus.themes, stimulusStrength: stimulus.stimulusStrength };
  }

  if (signal === "positive") {
    const stimulus = socialInfluenceToPsycheStimulus("social_proof", Math.abs(pressure) * 0.6);
    return { themes: stimulus.themes, stimulusStrength: stimulus.stimulusStrength };
  }

  if (signal === "negative") {
    const stimulus = socialInfluenceToPsycheStimulus("peer_pressure", Math.abs(pressure) * 0.6);
    return { themes: stimulus.themes, stimulusStrength: stimulus.stimulusStrength };
  }

  // Mixed: uncertainty + conformity
  const stimulus = socialInfluenceToPsycheStimulus("disagreement", 0.3);
  return { themes: stimulus.themes, stimulusStrength: stimulus.stimulusStrength };
}

// ─── Statistiche di influenza sociale ────────────────────────────────────────

export interface SocialInfluenceStats {
  totalAgentsInfluenced: number;
  averageDelta: number;
  positiveShifts: number;   // agenti che sono migliorati grazie all'influenza sociale
  negativeShifts: number;   // agenti che sono peggiorati
  neutralShifts: number;    // agenti non influenzati
  echoChambersDetected: number; // cluster di agenti che si sono influenzati a vicenda
}

export function computeSocialInfluenceStats(
  pass1Reactions: Pass1Reaction[],
  finalScores: Map<number, number>
): SocialInfluenceStats {
  let totalDelta = 0;
  let positiveShifts = 0;
  let negativeShifts = 0;
  let neutralShifts = 0;
  let agentsInfluenced = 0;

  for (const reaction of pass1Reactions) {
    const finalScore = finalScores.get(reaction.agentId);
    if (finalScore === undefined) continue;

    const delta = finalScore - reaction.score;
    totalDelta += Math.abs(delta);

    if (Math.abs(delta) < 0.3) {
      neutralShifts++;
    } else if (delta > 0) {
      positiveShifts++;
      agentsInfluenced++;
    } else {
      negativeShifts++;
      agentsInfluenced++;
    }
  }

  return {
    totalAgentsInfluenced: agentsInfluenced,
    averageDelta: pass1Reactions.length > 0 ? totalDelta / pass1Reactions.length : 0,
    positiveShifts,
    negativeShifts,
    neutralShifts,
    echoChambersDetected: Math.floor(agentsInfluenced / 3), // stima semplificata
  };
}
