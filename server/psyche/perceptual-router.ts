/**
 * Psyche Perceptual Router — TypeScript Port
 * 
 * Analizza testo libero e produce temi psicologici per il motore Psyche.
 * Zero LLM, zero latenza: solo regex e keyword matching.
 */

import type { AgentProfile } from "./engine";

export interface RoutingResult {
  themes: string[];
  intensity: number;
  triggeredNodes: Record<string, number>;
  detectedKeywords: string[];
}

// ============================================================
// KEYWORD MAPS
// ============================================================

const THEME_KEYWORDS: Record<string, string[]> = {
  // Emotional
  "fear":        ["paura", "rischio", "pericolo", "minaccia", "terrore", "fear", "risk", "danger", "threat"],
  "joy":         ["gioia", "felicità", "entusiasmo", "eccitazione", "joy", "happiness", "excited", "thrilled"],
  "sadness":     ["tristezza", "dolore", "perdita", "lutto", "sad", "grief", "loss", "sorrow"],
  "anger":       ["rabbia", "indignazione", "furioso", "anger", "outrage", "furious", "angry"],
  "disgust":     ["disgusto", "ripugnante", "orribile", "disgust", "repulsive", "horrible"],
  "surprise":    ["sorpresa", "inaspettato", "incredibile", "surprise", "unexpected", "incredible"],
  
  // Social
  "social_proof":        ["tutti", "milioni", "la gente", "everyone", "millions", "people love", "trending", "viral", "popolare", "popular"],
  "exclusion":           ["non per tutti", "solo per chi", "esclusivo", "not for everyone", "exclusive", "elite", "selezionati", "selected few"],
  "inclusion":           ["insieme", "comunità", "uniti", "together", "community", "united", "join us", "famiglia", "family"],
  "conformity_pressure": ["tutti lo fanno", "non restare indietro", "everyone does", "don't miss out", "fomo"],
  
  // Marketing
  "luxury":        ["lusso", "premium", "esclusivo", "artigianale", "luxury", "premium", "exclusive", "artisan", "haute", "prestige", "pregiato"],
  "scarcity":      ["ultimi", "limitato", "esaurito presto", "last", "limited", "selling out", "scarso", "rare", "edizione limitata", "limited edition"],
  "authority":     ["esperti", "clinicamente testato", "approvato", "experts", "clinically tested", "approved", "certificato", "certified", "studiosi"],
  "price_high":    ["costoso", "investimento", "valore", "expensive", "investment", "value", "premium price", "alto costo"],
  "price_low":     ["economico", "risparmio", "offerta", "cheap", "savings", "deal", "sconto", "discount", "conveniente"],
  "humor":         ["divertente", "ridere", "ironia", "funny", "laugh", "irony", "humor", "umorismo", "comico", "scherzoso"],
  "nostalgia":     ["ricordi", "tradizione", "anni", "memories", "tradition", "years ago", "classico", "classic", "vintage", "retro"],
  "innovation":    ["nuovo", "rivoluzionario", "futuro", "new", "revolutionary", "future", "innovativo", "innovative", "breakthrough", "tecnologia"],
  "tradition":     ["tradizione", "storia", "generazioni", "tradition", "history", "generations", "heritage", "radici", "roots"],
  "sustainability":["sostenibile", "ambiente", "verde", "sustainable", "environment", "green", "eco", "pianeta", "planet", "natura"],
  "sexuality":     ["sensuale", "seducente", "sexy", "sensual", "seductive", "desire", "desiderio", "passione", "passion"],
  "family":        ["famiglia", "figli", "genitori", "family", "children", "parents", "casa", "home", "amore", "love"],
  "independence":  ["libertà", "autonomia", "indipendente", "freedom", "autonomy", "independent", "libero", "free", "scelta", "choice"],
  
  // World events
  "economic_threat":   ["crisi", "inflazione", "recessione", "crisis", "inflation", "recession", "disoccupazione", "unemployment", "caro vita"],
  "economic_positive": ["crescita", "ripresa", "prosperità", "growth", "recovery", "prosperity", "boom", "opportunità", "opportunity"],
  "social_crisis":     ["protesta", "conflitto", "tensione sociale", "protest", "conflict", "social tension", "divisione", "division"],
  "political_tension": ["politica", "governo", "elezioni", "politics", "government", "elections", "legge", "law", "decreto"],
  "criticism":         ["critica", "sbagliato", "errore", "criticism", "wrong", "mistake", "fallimento", "failure", "colpa"],
  "validation":        ["bravo", "ottimo", "eccellente", "great", "excellent", "well done", "congratulazioni", "congratulations", "successo"],
};

// Intensificatori
const INTENSIFIERS = ["molto", "estremamente", "incredibilmente", "assolutamente", "very", "extremely", "incredibly", "absolutely", "super", "ultra"];

// ============================================================
// ROUTER
// ============================================================

export class PerceptualRouter {
  
  route(text: string, profile?: AgentProfile): RoutingResult {
    const lowerText = text.toLowerCase();
    const detectedThemes: string[] = [];
    const detectedKeywords: string[] = [];
    let baseIntensity = 0.5;
    
    // Detect themes
    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
      for (const kw of keywords) {
        if (lowerText.includes(kw.toLowerCase())) {
          if (!detectedThemes.includes(theme)) {
            detectedThemes.push(theme);
          }
          detectedKeywords.push(kw);
          break;
        }
      }
    }
    
    // Adjust intensity based on intensifiers
    for (const intensifier of INTENSIFIERS) {
      if (lowerText.includes(intensifier)) {
        baseIntensity = Math.min(1.0, baseIntensity + 0.1);
      }
    }
    
    // Adjust intensity based on text length (longer = more complex stimulus)
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 50) baseIntensity = Math.min(1.0, baseIntensity + 0.1);
    if (wordCount > 100) baseIntensity = Math.min(1.0, baseIntensity + 0.05);
    
    // Adjust intensity based on punctuation (! = emotional)
    const exclamationCount = (text.match(/!/g) || []).length;
    baseIntensity = Math.min(1.0, baseIntensity + exclamationCount * 0.05);
    
    // Check wound triggers
    const triggeredNodes: Record<string, number> = {};
    if (profile?.wound_triggers) {
      for (const trigger of profile.wound_triggers) {
        if (lowerText.includes(trigger.toLowerCase())) {
          triggeredNodes["core_wound"] = (triggeredNodes["core_wound"] ?? 0) + 0.3;
          baseIntensity = Math.min(1.0, baseIntensity + 0.15);
        }
      }
    }
    
    // Check shadow triggers
    if (profile?.shadow_triggers) {
      for (const trigger of profile.shadow_triggers) {
        if (lowerText.includes(trigger.toLowerCase())) {
          triggeredNodes["shadow"] = (triggeredNodes["shadow"] ?? 0) + 0.35;
        }
      }
    }
    
    // Default theme if nothing detected
    if (detectedThemes.length === 0) {
      detectedThemes.push("social_proof"); // fallback neutro
      baseIntensity = 0.3;
    }
    
    return {
      themes: detectedThemes,
      intensity: Math.round(baseIntensity * 100) / 100,
      triggeredNodes,
      detectedKeywords: Array.from(new Set(detectedKeywords)),
    };
  }
}

// ============================================================
// THEME BRIDGE — OP PerceptualFrame → Psyche themes
// ============================================================

/**
 * Mappa i temi del PerceptualFrame di Ordinary People
 * ai temi del Perceptual Router di Psyche.
 */
export const OP_THEME_TO_PSYCHE: Record<string, string[]> = {
  // Temi OP → temi Psyche
  "luxury":          ["luxury", "distinction"],
  "scarcity":        ["scarcity"],
  "social_proof":    ["social_proof", "conformity_pressure"],
  "authority":       ["authority"],
  "nostalgia":       ["nostalgia", "tradition"],
  "innovation":      ["innovation"],
  "sustainability":  ["sustainability"],
  "family":          ["family", "inclusion"],
  "freedom":         ["independence"],
  "humor":           ["humor"],
  "fear":            ["fear", "economic_threat"],
  "exclusion":       ["exclusion"],
  "inclusion":       ["inclusion", "social_proof"],
  "price_sensitivity":["price_high", "price_low"],
  "status":          ["luxury", "social_proof"],
  "health":          ["sustainability", "authority"],
  "sexuality":       ["sexuality"],
  "tradition":       ["tradition", "nostalgia"],
  "community":       ["inclusion", "social_proof"],
  "aspiration":      ["innovation", "luxury"],
};

export function mapOPThemesToPsyche(opThemes: string[]): string[] {
  const psycheThemes: Set<string> = new Set();
  
  for (const theme of opThemes) {
    const mapped = OP_THEME_TO_PSYCHE[theme.toLowerCase()];
    if (mapped) {
      for (const t of mapped) psycheThemes.add(t);
    } else {
      // Prova il tema direttamente se non c'è mapping
      psycheThemes.add(theme.toLowerCase());
    }
  }
  
  return Array.from(psycheThemes);
}
