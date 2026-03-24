/**
 * Psyche Engine — TypeScript Port
 * 
 * Port fedele del motore Python Psyche v1.0.
 * Implementa: initialize_from_profile, apply_decay, apply_circadian,
 * inject_stimulus, propagate, read_state, tick.
 * 
 * Zero dipendenze esterne. Pura algebra lineare su 32 nodi.
 */

import { TOPOLOGY, type NodeDef, type EdgeDef } from "./topology";

// ============================================================
// TYPES
// ============================================================

export interface NodeState {
  activation: number;   // [0, 1]
  valence: number;      // [-1, 1]
  lastStimulus: number; // ultimo delta ricevuto
}

// ─── Episodic Memory ─────────────────────────────────────────────────────────
export interface EpisodicEntry {
  timestamp: string;         // ISO 8601
  themes: string[];          // stimoli che hanno generato l'episodio
  arousal: number;           // arousal al momento della registrazione [0-1]
  valence: number;           // valenza emotiva dell'episodio [-1, 1]
  woundActive: boolean;      // ferita primaria attivata?
  activeBiases: string[];    // bias attivi al momento
  source: string;            // "campaign" | "world_event" | "social" | "manual"
}

export interface GraphState {
  nodes: Record<string, NodeState>;
  stepCount: number;
  timestamp: string;
  episodicLog?: EpisodicEntry[];  // log vettoriale degli episodi ad alto arousal
}

export interface AgentProfile {
  // Big Five [0-1]
  big_five: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
  };
  // Haidt moral foundations [0-1]
  haidt: {
    care: number;
    equality?: number;
    proportionality?: number;
    loyalty: number;
    authority: number;
    purity?: number;
  };
  // Hofstede cultural dimensions [0-1]
  hofstede: {
    power_distance: number;
    individualism: number;
    masculinity?: number;
    uncertainty_avoidance: number;
    long_term_orientation?: number;
    indulgence?: number;
  };
  // Bourdieu capital [1-5]
  bourdieu: {
    economic_capital: number;
    cultural_capital: number;
    social_capital: number;
  };
  // Core psychological parameters
  core_wound: string;       // "inadequacy" | "abandonment" | "invisibility" | "betrayal" | "loss_of_control"
  core_desire: string;      // "to_be_respected" | "to_belong" | "to_be_seen" | "to_be_safe" | "to_be_free"
  inner_voice: string;      // "critic" | "optimist" | "cynic" | "dreamer" | "pragmatist"
  humor_style?: string;
  time_orientation?: string;
  money_narrative?: string;
  wound_triggers?: string[];
  shadow_triggers?: string[];
  // Media
  advertising_cynicism?: number;
  attention_span_seconds?: number;
}

export interface PsycheState {
  mood: string;
  mood_intensity: number;
  arousal: string;
  energy: string;
  stress: string;
  processing_mode: "intuitive" | "analytical";
  active_biases: string[];
  social_posture: "seeking_belonging" | "seeking_distinction" | "balanced";
  self_confidence: string;
  wound_active: boolean;
  shadow_active: boolean;
  defense_active: boolean;
  humor_active: boolean;
  aspiration_level: string;
  risk_perception: string;
  cultural_decode_depth: string;
  propagation_steps: number;
  _raw: Record<string, { a: number; v: number }>;
}

// ============================================================
// PERCEPTION ROUTES
// ============================================================

type PerceptionRoute = [string, number, number]; // [node_id, weight, valence_shift]

export const PERCEPTION_ROUTES: Record<string, PerceptionRoute[]> = {
  // Emotional states
  "fear":        [["stress_level", 0.4, 0.0], ["risk_calculator", 0.4, 0.0], ["emotional_arousal", 0.3, -0.3]],
  "joy":         [["current_mood", 0.4, 0.6], ["energy", 0.2, 0.0], ["emotional_arousal", 0.2, 0.4]],
  "sadness":     [["current_mood", 0.3, -0.5], ["energy", -0.2, 0.0], ["stress_level", 0.2, 0.0]],
  "anger":       [["emotional_arousal", 0.5, -0.2], ["identity_defense", 0.3, 0.0], ["stress_level", 0.3, 0.0]],
  "disgust":     [["moral_foundations", 0.4, -0.3], ["identity_defense", 0.3, 0.0], ["shadow", 0.2, 0.0]],
  "surprise":    [["attention_filter", 0.4, 0.0], ["emotional_arousal", 0.3, 0.0]],
  
  // Social themes
  "social_proof":       [["bandwagon_bias", 0.4, 0.0], ["belonging_need", 0.3, 0.0], ["reference_mirror", 0.3, 0.0]],
  "exclusion":          [["core_wound", 0.5, 0.0], ["identity_defense", 0.4, 0.0], ["stress_level", 0.3, 0.0]],
  "inclusion":          [["belonging_need", 0.4, 0.2], ["current_mood", 0.3, 0.3], ["bandwagon_bias", 0.2, 0.0]],
  "conformity_pressure":[["belonging_need", 0.4, 0.0], ["bandwagon_bias", 0.3, 0.0], ["distinction_need", 0.2, 0.0]],
  
  // Marketing themes
  "luxury":       [["aspiration_engine", 0.4, 0.0], ["class_consciousness", 0.3, 0.0], ["distinction_need", 0.3, 0.0]],
  "scarcity":     [["scarcity_bias", 0.5, 0.0], ["risk_calculator", 0.2, 0.0], ["emotional_arousal", 0.2, 0.0]],
  "authority":    [["authority_bias", 0.5, 0.0], ["cultural_lens", 0.2, 0.0]],
  "price_high":   [["money_relationship", 0.5, 0.0], ["risk_calculator", 0.3, 0.0], ["loss_aversion", 0.2, 0.0]],
  "price_low":    [["money_relationship", 0.3, 0.0], ["aspiration_engine", -0.1, 0.0]],
  "humor":        [["humor_processor", 0.5, 0.0], ["current_mood", 0.2, 0.3]],
  "nostalgia":    [["generational_memory", 0.5, 0.3], ["current_mood", 0.2, 0.4]],
  "innovation":   [["aspiration_engine", 0.3, 0.0], ["attention_filter", 0.3, 0.0], ["risk_calculator", 0.2, 0.0]],
  "tradition":    [["generational_memory", 0.3, 0.2], ["cultural_lens", 0.2, 0.0], ["belonging_need", 0.2, 0.0]],
  "sustainability":[["moral_foundations", 0.3, 0.3], ["class_consciousness", 0.2, 0.0]],
  "sexuality":    [["moral_foundations", 0.3, -0.3], ["emotional_arousal", 0.3, 0.0], ["shadow", 0.2, 0.0]],
  "family":       [["belonging_need", 0.3, 0.0], ["current_mood", 0.2, 0.3], ["core_desire", 0.2, 0.0]],
  "independence": [["distinction_need", 0.3, 0.0], ["aspiration_engine", 0.2, 0.0], ["core_desire", 0.2, 0.0]],
  
  // World events
  "economic_threat":    [["risk_calculator", 0.5, 0.0], ["stress_level", 0.4, 0.0], ["money_relationship", 0.3, 0.0], ["aspiration_engine", -0.2, 0.0]],
  "economic_positive":  [["aspiration_engine", 0.4, 0.0], ["current_mood", 0.3, 0.4], ["risk_calculator", -0.2, 0.0]],
  "social_crisis":      [["stress_level", 0.4, 0.0], ["moral_foundations", 0.3, -0.3], ["belonging_need", 0.3, 0.0]],
  "political_tension":  [["identity_defense", 0.4, 0.0], ["moral_foundations", 0.3, 0.0], ["stress_level", 0.3, 0.0]],
  "personal_loss":      [["stress_level", 0.5, 0.0], ["current_mood", 0.4, -0.6], ["core_wound", 0.3, 0.0]],
  "personal_success":   [["social_standing", 0.4, 0.0], ["current_mood", 0.3, 0.5], ["aspiration_engine", 0.3, 0.0]],
  "criticism":          [["identity_defense", 0.4, 0.0], ["core_wound", 0.3, 0.0], ["stress_level", 0.2, 0.0]],
  "validation":         [["social_standing", 0.4, 0.0], ["current_mood", 0.3, 0.4], ["belonging_need", -0.1, 0.0]],
};

// ============================================================
// INITIALIZE FROM PROFILE
// ============================================================

export function initializeFromProfile(profile: AgentProfile): GraphState {
  const nodes: Record<string, NodeState> = {};
  
  for (const nodeDef of TOPOLOGY.nodes) {
    nodes[nodeDef.id] = {
      activation: nodeDef.base_activation,
      valence: nodeDef.base_valence ?? 0.0,
      lastStimulus: 0.0,
    };
  }
  
  const bf = profile.big_five;
  const haidt = profile.haidt;
  const hof = profile.hofstede;
  const bou = profile.bourdieu;
  
  // Big Five → nodi cognitivi/emotivi
  nodes["attention_filter"].activation = 0.3 + bf.openness * 0.4;
  nodes["critical_thinking"].activation = 0.2 + bf.conscientiousness * 0.4;
  nodes["emotional_arousal"].activation = 0.1 + bf.neuroticism * 0.3;
  nodes["stress_level"].activation = 0.1 + bf.neuroticism * 0.25;
  nodes["current_mood"].valence = (bf.extraversion - 0.5) * 0.4 + (0.5 - bf.neuroticism) * 0.3;
  nodes["risk_calculator"].activation = 0.15 + bf.neuroticism * 0.3;
  nodes["aspiration_engine"].activation = 0.2 + bf.openness * 0.2 + bf.extraversion * 0.15;
  
  // Haidt → fondamenti morali e bias
  nodes["moral_foundations"].activation = (haidt.care + haidt.loyalty + haidt.authority) / 3 * 0.8;
  nodes["authority_bias"].activation = haidt.authority * 0.3;
  nodes["bandwagon_bias"].activation = (haidt.loyalty - 0.5) * 0.2;
  
  // Hofstede → dimensioni culturali
  nodes["cultural_lens"].activation = 0.3 + hof.uncertainty_avoidance * 0.3;
  nodes["belonging_need"].activation = 0.2 + (1 - hof.individualism) * 0.4;
  nodes["distinction_need"].activation = 0.1 + hof.individualism * 0.3;
  nodes["authority_bias"].activation = Math.max(
    nodes["authority_bias"].activation,
    hof.power_distance * 0.4
  );
  
  // Bourdieu → classe e standing
  const classPos = (bou.economic_capital + bou.cultural_capital + bou.social_capital) / 15;
  nodes["social_standing"].activation = 0.2 + classPos * 0.6;
  nodes["class_consciousness"].activation = 0.2 + bou.cultural_capital / 5 * 0.4;
  nodes["distinction_need"].activation = Math.max(
    nodes["distinction_need"].activation,
    bou.cultural_capital / 5 * 0.35
  );
  
  // Core wound → attivazione base bassa ma presente
  nodes["core_wound"].activation = 0.1;
  nodes["core_desire"].activation = 0.35;
  
  // Inner voice → tono di base del mood
  const voiceMoodMap: Record<string, number> = {
    "critic": -0.15,
    "optimist": 0.2,
    "cynic": -0.2,
    "dreamer": 0.15,
    "pragmatist": 0.0,
  };
  nodes["current_mood"].valence += voiceMoodMap[profile.inner_voice] ?? 0.0;
  
  // Advertising cynicism → scarcity response negativa
  if (profile.advertising_cynicism !== undefined) {
    nodes["scarcity_bias"].activation = -profile.advertising_cynicism * 0.2;
  }
  
  // Clamp all values
  for (const ns of Object.values(nodes)) {
    ns.activation = Math.max(0.0, Math.min(1.0, ns.activation));
    ns.valence = Math.max(-1.0, Math.min(1.0, ns.valence));
  }
  
  return {
    nodes,
    stepCount: 0,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// TEMPORAL DECAY
// ============================================================

export function applyDecay(state: GraphState, elapsedMinutes: number = 5.0): void {
  for (const nodeDef of TOPOLOGY.nodes) {
    const ns = state.nodes[nodeDef.id];
    if (!ns) continue;
    
    const decayFactor = 1.0 - nodeDef.decay_rate * (elapsedMinutes / 60.0);
    const base = nodeDef.base_activation;
    
    // Decay toward base activation
    ns.activation = base + (ns.activation - base) * Math.max(0.0, decayFactor);
    ns.valence *= Math.max(0.0, 1.0 - nodeDef.decay_rate * (elapsedMinutes / 60.0) * 0.5);
    
    // Clamp
    ns.activation = Math.max(0.0, Math.min(1.0, ns.activation));
    ns.valence = Math.max(-1.0, Math.min(1.0, ns.valence));
  }
}

// ============================================================
// CIRCADIAN RHYTHM
// ============================================================

export function applyCircadian(state: GraphState, currentHour: number): void {
  // Curva circadiana: picco a 10:00, trough a 15:00, recupero a 17:00, calo da 21:00
  let energyLevel: number;
  
  if (currentHour >= 6 && currentHour < 10) {
    energyLevel = 0.4 + (currentHour - 6) / 4 * 0.4; // 0.4 → 0.8
  } else if (currentHour >= 10 && currentHour < 13) {
    energyLevel = 0.8 + (currentHour - 10) / 3 * 0.1; // 0.8 → 0.9
  } else if (currentHour >= 13 && currentHour < 15) {
    energyLevel = 0.9 - (currentHour - 13) / 2 * 0.3; // 0.9 → 0.6
  } else if (currentHour >= 15 && currentHour < 17) {
    energyLevel = 0.6 + (currentHour - 15) / 2 * 0.15; // 0.6 → 0.75
  } else if (currentHour >= 17 && currentHour < 21) {
    energyLevel = 0.75 - (currentHour - 17) / 4 * 0.25; // 0.75 → 0.5
  } else if (currentHour >= 21) {
    energyLevel = 0.5 - (currentHour - 21) / 3 * 0.3; // 0.5 → 0.2
  } else {
    energyLevel = 0.3; // notte
  }
  
  state.nodes["energy"].activation = Math.max(0.1, Math.min(1.0, energyLevel));
}

// ============================================================
// INJECT STIMULUS
// ============================================================

export function injectStimulus(
  state: GraphState,
  themes: string[],
  intensity: number = 1.0,
  customTriggers?: Record<string, number>
): string[] {
  const activated: Set<string> = new Set();
  
  for (const theme of themes) {
    const routes = PERCEPTION_ROUTES[theme];
    if (!routes) continue;
    
    for (const [nodeId, weight, valenceShift] of routes) {
      const ns = state.nodes[nodeId];
      if (!ns) continue;
      
      const delta = weight * intensity;
      ns.activation = Math.max(0.0, Math.min(1.0, ns.activation + delta));
      
      if (valenceShift !== 0) {
        ns.valence = Math.max(-1.0, Math.min(1.0, ns.valence + valenceShift * intensity * 0.5));
      }
      
      ns.lastStimulus = delta;
      activated.add(nodeId);
    }
  }
  
  // Custom triggers (wound/shadow keywords)
  if (customTriggers) {
    for (const [nodeId, delta] of Object.entries(customTriggers)) {
      const ns = state.nodes[nodeId];
      if (!ns) continue;
      ns.activation = Math.max(0.0, Math.min(1.0, ns.activation + delta * intensity));
      ns.lastStimulus = delta * intensity;
      activated.add(nodeId);
    }
  }
  
  return Array.from(activated);
}

// ============================================================
// SPREADING ACTIVATION
// ============================================================

function checkCondition(condition: string | undefined, state: GraphState): boolean {
  if (!condition) return true;
  
  try {
    if (condition.includes(">")) {
      const [left, right] = condition.split(">");
      const [nodeId, attr] = left.trim().split(".");
      const ns = state.nodes[nodeId];
      if (!ns) return false;
      const val = attr === "activation" ? ns.activation : ns.valence;
      return val > parseFloat(right.trim());
    }
    if (condition.includes("<")) {
      const [left, right] = condition.split("<");
      const [nodeId, attr] = left.trim().split(".");
      const ns = state.nodes[nodeId];
      if (!ns) return false;
      const val = attr === "activation" ? ns.activation : ns.valence;
      return val < parseFloat(right.trim());
    }
  } catch {
    // ignore parse errors
  }
  return true;
}

export function propagate(
  state: GraphState,
  maxSteps: number = 6,
  convergenceThreshold: number = 0.01,
  decayPerStep: number = 0.12
): number {
  const nodeDefMap: Record<string, NodeDef> = {};
  for (const nd of TOPOLOGY.nodes) nodeDefMap[nd.id] = nd;
  
  for (let step = 0; step < maxSteps; step++) {
    const prevActivations: Record<string, number> = {};
    for (const [nid, ns] of Object.entries(state.nodes)) {
      prevActivations[nid] = ns.activation;
    }
    
    const deltas: Record<string, number> = {};
    const valenceDeltas: Record<string, number> = {};
    for (const nid of Object.keys(state.nodes)) {
      deltas[nid] = 0.0;
      valenceDeltas[nid] = 0.0;
    }
    
    for (const edge of TOPOLOGY.edges) {
      const src = state.nodes[edge.from];
      const tgt = state.nodes[edge.to];
      if (!src || !tgt) continue;
      
      if (!checkCondition(edge.condition, state)) continue;
      
      const weight = edge.weight;
      const delta = edge.type === "inhibitory"
        ? -Math.abs(src.activation * weight)
        : src.activation * weight;
      
      deltas[edge.to] += delta;
      
      if (Math.abs(src.valence) > 0.1) {
        valenceDeltas[edge.to] += src.valence * Math.abs(weight) * 0.3;
      }
    }
    
    // Apply deltas with damping
    for (const [nid, ns] of Object.entries(state.nodes)) {
      ns.activation += (deltas[nid] ?? 0) * 0.3;
      ns.valence += (valenceDeltas[nid] ?? 0) * 0.2;
      
      // Per-step decay toward base
      const base = nodeDefMap[nid]?.base_activation ?? 0.5;
      ns.activation += (base - ns.activation) * decayPerStep;
      
      // Clamp
      ns.activation = Math.max(0.0, Math.min(1.0, ns.activation));
      ns.valence = Math.max(-1.0, Math.min(1.0, ns.valence));
    }
    
    // Check convergence
    let maxDelta = 0;
    for (const nid of Object.keys(state.nodes)) {
      maxDelta = Math.max(maxDelta, Math.abs(state.nodes[nid].activation - prevActivations[nid]));
    }
    
    state.stepCount = step + 1;
    if (maxDelta < convergenceThreshold) break;
  }
  
  return state.stepCount;
}

// ============================================================
// STATE READER
// ============================================================

function level(activation: number): string {
  if (activation < 0.2) return "dormant";
  if (activation < 0.4) return "low";
  if (activation < 0.6) return "moderate";
  if (activation < 0.8) return "high";
  return "very_high";
}

function valenceLabel(valence: number): string {
  if (valence < -0.5) return "very_negative";
  if (valence < -0.15) return "negative";
  if (valence < 0.15) return "neutral";
  if (valence < 0.5) return "positive";
  return "very_positive";
}

export function readState(state: GraphState): PsycheState {
  const n = state.nodes;
  
  const moodLabel = valenceLabel(n["current_mood"]?.valence ?? 0);
  const arousalLevel = level(n["emotional_arousal"]?.activation ?? 0);
  
  const system1Strength = (n["emotional_arousal"]?.activation ?? 0) + (n["confirmation_engine"]?.activation ?? 0);
  const system2Strength = (n["critical_thinking"]?.activation ?? 0) + (n["attention_filter"]?.activation ?? 0);
  const processingMode: "intuitive" | "analytical" = system1Strength > system2Strength ? "intuitive" : "analytical";
  
  const activeBiases: string[] = [];
  if ((n["loss_aversion"]?.activation ?? 0) > 0.3) activeBiases.push("loss_averse");
  if ((n["bandwagon_bias"]?.activation ?? 0) > 0.3) activeBiases.push("conformist");
  else if ((n["bandwagon_bias"]?.activation ?? 0) < -0.2) activeBiases.push("contrarian");
  if ((n["identity_defense"]?.activation ?? 0) > 0.3) activeBiases.push("defensive");
  if ((n["halo_effect"]?.activation ?? 0) > 0.3) activeBiases.push("halo_positive");
  if ((n["authority_bias"]?.activation ?? 0) > 0.3) activeBiases.push("authority_responsive");
  if ((n["scarcity_bias"]?.activation ?? 0) > 0.3) activeBiases.push("scarcity_reactive");
  if ((n["confirmation_engine"]?.activation ?? 0) > 0.6) activeBiases.push("confirmation_seeking");
  
  let socialPosture: "seeking_belonging" | "seeking_distinction" | "balanced";
  const belongingA = n["belonging_need"]?.activation ?? 0;
  const distinctionA = n["distinction_need"]?.activation ?? 0;
  if (belongingA > distinctionA + 0.15) socialPosture = "seeking_belonging";
  else if (distinctionA > belongingA + 0.15) socialPosture = "seeking_distinction";
  else socialPosture = "balanced";
  
  const woundActive = (n["core_wound"]?.activation ?? 0) > 0.35;
  const shadowActive = (n["shadow"]?.activation ?? 0) > 0.35;
  
  const raw: Record<string, { a: number; v: number }> = {};
  for (const [nid, ns] of Object.entries(state.nodes)) {
    raw[nid] = { a: Math.round(ns.activation * 1000) / 1000, v: Math.round(ns.valence * 1000) / 1000 };
  }
  
  return {
    mood: moodLabel,
    mood_intensity: Math.round((n["current_mood"]?.activation ?? 0) * 100) / 100,
    arousal: arousalLevel,
    energy: level(n["energy"]?.activation ?? 0),
    stress: level(n["stress_level"]?.activation ?? 0),
    processing_mode: processingMode,
    active_biases: activeBiases,
    social_posture: socialPosture,
    self_confidence: level(n["social_standing"]?.activation ?? 0),
    wound_active: woundActive,
    shadow_active: shadowActive,
    defense_active: (n["identity_defense"]?.activation ?? 0) > 0.35,
    humor_active: (n["humor_processor"]?.activation ?? 0) > 0.35,
    aspiration_level: level(n["aspiration_engine"]?.activation ?? 0),
    risk_perception: level(n["risk_calculator"]?.activation ?? 0),
    cultural_decode_depth: level(n["cultural_decode"]?.activation ?? 0),
    propagation_steps: state.stepCount,
    _raw: raw,
  };
}

// ============================================================
// STATE TO PROMPT
// ============================================================

export function stateToPrompt(psycheState: PsycheState, profile: AgentProfile): string {
  const lines = ["[PSYCHE_STATE]"];
  lines.push(`Mood: ${psycheState.mood} (intensity: ${psycheState.mood_intensity})`);
  lines.push(`Energy: ${psycheState.energy}`);
  lines.push(`Stress: ${psycheState.stress}`);
  lines.push(`Emotional arousal: ${psycheState.arousal}`);
  lines.push(`Processing mode: ${psycheState.processing_mode}`);
  
  if (psycheState.active_biases.length > 0) {
    lines.push(`Active cognitive biases: ${psycheState.active_biases.join(", ")}`);
  }
  
  lines.push(`Social posture: ${psycheState.social_posture}`);
  lines.push(`Self-confidence: ${psycheState.self_confidence}`);
  
  if (psycheState.wound_active) {
    lines.push(`⚠ Core wound (${profile.core_wound}) is activated — responses may be emotionally charged`);
  }
  if (psycheState.shadow_active) {
    lines.push(`⚠ Shadow is activated — strong aversion likely`);
  }
  if (psycheState.defense_active) {
    lines.push(`⚠ Identity defense is active — resistant to challenges`);
  }
  if (psycheState.humor_active) {
    lines.push(`Humor (${profile.humor_style ?? "unknown"}) is activated — may use humor as deflection or connection`);
  }
  
  lines.push(`Inner voice type: ${profile.inner_voice}`);
  lines.push(`Aspiration level: ${psycheState.aspiration_level}`);
  lines.push(`Risk perception: ${psycheState.risk_perception}`);
  lines.push("[/PSYCHE_STATE]");
  
  return lines.join("\n");
}

// ============================================================
// EPISODIC MEMORY
// ============================================================

/**
 * Registra un episodio nella memoria episodica dell'agente.
 * Viene chiamata automaticamente dal tick() quando l'arousal supera la soglia.
 * La memoria episodica influenza il nodo episodic_memory del grafo.
 */
export function recordEpisode(
  state: GraphState,
  themes: string[],
  psycheState: PsycheState,
  source: string = "campaign",
  arousalThreshold: number = 0.55
): EpisodicEntry | null {
  const arousalVal = state.nodes["emotional_arousal"]?.activation ?? 0;
  if (arousalVal < arousalThreshold) return null;

  const entry: EpisodicEntry = {
    timestamp: new Date().toISOString(),
    themes,
    arousal: Math.round(arousalVal * 1000) / 1000,
    valence: Math.round((state.nodes["current_mood"]?.valence ?? 0) * 1000) / 1000,
    woundActive: psycheState.wound_active,
    activeBiases: [...psycheState.active_biases],
    source,
  };

  if (!state.episodicLog) state.episodicLog = [];
  state.episodicLog.push(entry);

  // Mantieni al massimo 20 episodi (rimuovi i più vecchi)
  if (state.episodicLog.length > 20) {
    state.episodicLog = state.episodicLog.slice(-20);
  }

  // Aggiorna il nodo episodic_memory nel grafo
  const emNode = state.nodes["episodic_memory"];
  if (emNode) {
    // L'attivazione del nodo episodic_memory cresce con episodi ad alto arousal
    const boost = arousalVal * 0.3;
    emNode.activation = Math.min(1.0, emNode.activation + boost);
    // La valenza del nodo riflette la valenza media degli ultimi 5 episodi
    const recent = state.episodicLog.slice(-5);
    const avgValence = recent.reduce((s, e) => s + e.valence, 0) / recent.length;
    emNode.valence = Math.max(-1.0, Math.min(1.0, avgValence));
  }

  return entry;
}

/**
 * Recupera gli episodi rilevanti per un set di temi (similarity matching).
 * Usato per il "priming" — se un tema corrente è già stato vissuto,
 * l'agente risponde con maggiore intensità.
 */
export function recallRelevantEpisodes(
  state: GraphState,
  themes: string[],
  limit: number = 3
): EpisodicEntry[] {
  if (!state.episodicLog || state.episodicLog.length === 0) return [];
  
  const themeSet = new Set(themes);
  const scored = state.episodicLog.map(ep => {
    const overlap = ep.themes.filter(t => themeSet.has(t)).length;
    const recency = new Date(ep.timestamp).getTime();
    return { ep, score: overlap * 10 + recency / 1e12 };
  });
  
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.ep);
}

// ============================================================
// ACTION FEEDBACK LOOP
// ============================================================

export type ActionType =
  | "purchase"        // acquisto → reward_anticipation up, aspiration_engine down
  | "share"           // condivisione → social_standing up, belonging_need down
  | "ignore"          // ignora → attention_filter up, aspiration_engine unchanged
  | "reject"          // rifiuto → identity_defense up, core_wound risk
  | "complain"        // lamentela → catarsi: stress down, fairness_monitor up
  | "recommend"       // raccomandazione → social_standing up, trust_calibrator up
  | "bookmark"        // salva per dopo → aspiration_engine up, risk_calculator down
  | "return"          // reso → loss_aversion up, trust_calibrator down
;

const ACTION_FEEDBACK: Record<ActionType, Array<[string, number, number]>> = {
  // [nodeId, activationDelta, valenceDelta]
  purchase:   [["reward_anticipation", -0.2, 0.0], ["aspiration_engine", -0.1, 0.0], ["social_standing", +0.1, +0.2]],
  share:      [["social_standing", +0.2, +0.3], ["belonging_need", -0.1, 0.0], ["trust_calibrator", +0.1, 0.0]],
  ignore:     [["attention_filter", +0.1, 0.0], ["current_mood", 0.0, -0.05]],
  reject:     [["identity_defense", +0.2, 0.0], ["core_wound", +0.1, -0.2], ["stress_level", +0.1, 0.0]],
  complain:   [["stress_level", -0.2, 0.0], ["fairness_monitor", +0.2, -0.2], ["current_mood", 0.0, +0.1]],
  recommend:  [["social_standing", +0.3, +0.3], ["trust_calibrator", +0.2, +0.2], ["belonging_need", -0.1, 0.0]],
  bookmark:   [["aspiration_engine", +0.15, +0.1], ["risk_calculator", -0.1, 0.0]],
  return:     [["loss_aversion", +0.2, -0.1], ["trust_calibrator", -0.2, -0.3], ["stress_level", +0.1, 0.0]],
};

/**
 * Applica il feedback di un'azione dell'agente al grafo Psyche.
 * Simula l'effetto psicologico post-azione (catarsi, rinforzo, rimpianto).
 */
export function applyActionFeedback(
  state: GraphState,
  action: ActionType,
  intensity: number = 1.0
): void {
  const effects = ACTION_FEEDBACK[action];
  if (!effects) return;

  for (const [nodeId, activationDelta, valenceDelta] of effects) {
    const ns = state.nodes[nodeId];
    if (!ns) continue;
    ns.activation = Math.max(0.0, Math.min(1.0, ns.activation + activationDelta * intensity));
    if (valenceDelta !== 0) {
      ns.valence = Math.max(-1.0, Math.min(1.0, ns.valence + valenceDelta * intensity));
    }
  }
}

// ============================================================
// MAIN TICK
// ============================================================

export interface TickOptions {
  stimulusThemes?: string[];
  stimulusIntensity?: number;
  customTriggers?: Record<string, number>;
  currentHour?: number;
  elapsedMinutes?: number;
}

export function tick(
  state: GraphState,
  profile: AgentProfile,
  options: TickOptions = {}
): PsycheState {
  const {
    stimulusThemes,
    stimulusIntensity = 1.0,
    customTriggers,
    currentHour,
    elapsedMinutes = 5.0,
  } = options;
  
  // 1. Temporal decay
  applyDecay(state, elapsedMinutes);
  
  // 2. Circadian rhythm
  if (currentHour !== undefined) {
    applyCircadian(state, currentHour);
  }
  
  // 3. Inject stimulus
  const activatedNodes: string[] = [];
  if (stimulusThemes && stimulusThemes.length > 0) {
    const activated = injectStimulus(state, stimulusThemes, stimulusIntensity, customTriggers);
    activatedNodes.push(...activated);
  }
  
  // 4. Propagate
  propagate(state);
  
  // 5. Read state
  state.timestamp = new Date().toISOString();
  const psycheState = readState(state);

  // 6. Episodic memory — registra episodio se arousal > soglia
  if (stimulusThemes && stimulusThemes.length > 0) {
    recordEpisode(state, stimulusThemes, psycheState, "campaign");
  }

  // 7. Episodic priming — se ci sono episodi rilevanti, boost lieve al nodo episodic_memory
  if (stimulusThemes && stimulusThemes.length > 0) {
    const relevant = recallRelevantEpisodes(state, stimulusThemes, 3);
    if (relevant.length > 0) {
      const emNode = state.nodes["episodic_memory"];
      if (emNode) {
        // Priming: episodi rilevanti aumentano l'attivazione del nodo
        const primingBoost = Math.min(0.15, relevant.length * 0.05);
        emNode.activation = Math.min(1.0, emNode.activation + primingBoost);
      }
    }
  }
  
  return psycheState;
}

// ============================================================
// SERIALIZATION
// ============================================================

export function serializeState(state: GraphState): string {
  return JSON.stringify({
    nodes: Object.fromEntries(
      Object.entries(state.nodes).map(([id, ns]) => [
        id,
        { a: Math.round(ns.activation * 10000) / 10000, v: Math.round(ns.valence * 10000) / 10000 }
      ])
    ),
    stepCount: state.stepCount,
    timestamp: state.timestamp,
    episodicLog: state.episodicLog ?? [],
  });
}

export function deserializeState(json: string): GraphState {
  const raw = JSON.parse(json);
  const nodes: Record<string, NodeState> = {};
  
  for (const [id, vals] of Object.entries(raw.nodes as Record<string, { a: number; v: number }>)) {
    nodes[id] = { activation: vals.a, valence: vals.v, lastStimulus: 0.0 };
  }
  
  return {
    nodes,
    stepCount: raw.stepCount ?? 0,
    timestamp: raw.timestamp ?? new Date().toISOString(),
    episodicLog: (raw.episodicLog as EpisodicEntry[]) ?? [],
  };
}

// ============================================================
// HEBBIAN EDGE WEIGHTS
// ============================================================

/**
 * Mappa dei pesi Hebbian per edge (from→to).
 * Persiste nel GraphState come campo opzionale.
 */
export type HebbianWeights = Record<string, number>; // key: "from→to"

function hebbianKey(from: string, to: string): string {
  return `${from}→${to}`;
}

/**
 * hebbianUpdate — rinforza gli edge dove entrambi i nodi
 * erano attivi durante la propagazione (Hebb: "neurons that fire together, wire together").
 * 
 * @param state     GraphState corrente
 * @param weights   Mappa dei pesi Hebbian da aggiornare in-place
 * @param lr        Learning rate (default 0.05)
 * @param decay     Decay rate per edge inutilizzati (default 0.01)
 */
export function hebbianUpdate(
  state: GraphState,
  weights: HebbianWeights,
  lr: number = 0.05,
  decay: number = 0.01
): void {
  for (const edge of TOPOLOGY.edges) {
    const src = state.nodes[edge.from];
    const tgt = state.nodes[edge.to];
    if (!src || !tgt) continue;

    const key = hebbianKey(edge.from, edge.to);
    const current = weights[key] ?? 0.0;

    // Hebbian rule: Δw = lr * src.activation * tgt.activation
    const coactivation = src.activation * tgt.activation;
    const delta = lr * coactivation - decay * current;

    // Clamp a [-0.5, 0.5] per non dominare i pesi base
    weights[key] = Math.max(-0.5, Math.min(0.5, current + delta));
  }
}

/**
 * applyHebbianWeights — applica i pesi Hebbian durante la propagazione.
 * Modifica i delta di attivazione in base ai pesi appresi.
 */
export function applyHebbianWeights(
  state: GraphState,
  weights: HebbianWeights,
  deltas: Record<string, number>
): void {
  for (const edge of TOPOLOGY.edges) {
    const src = state.nodes[edge.from];
    if (!src) continue;

    const key = hebbianKey(edge.from, edge.to);
    const hebbW = weights[key] ?? 0.0;
    if (Math.abs(hebbW) < 0.001) continue;

    // Il peso Hebbian modula il delta: percorsi rinforzati diventano più "scivolosi"
    const additionalDelta = src.activation * hebbW * 0.15;
    deltas[edge.to] = (deltas[edge.to] ?? 0) + additionalDelta;
  }
}

// ============================================================
// SOCIAL GRAPH BRIDGE — interact()
// ============================================================

export type SocialAction =
  | "agree"        // accordo → rinforza bandwagon, belonging
  | "disagree"     // disaccordo → attiva identity_defense
  | "admire"       // ammirazione → boost social_standing del target
  | "criticize"    // critica → attiva core_wound del target
  | "share"        // condivisione → social_proof + reference_mirror
  | "ignore";      // ignoranza → lieve boost distinction_need

export interface InteractionResult {
  agentADelta: Record<string, number>;  // delta nodi per agente A
  agentBDelta: Record<string, number>;  // delta nodi per agente B
  action: SocialAction;
  timestamp: string;
}

/**
 * interact — simula un'interazione sociale tra due agenti.
 * Aggiorna i GraphState di entrambi in-place.
 * 
 * @param stateA    GraphState dell'agente A (iniziatore)
 * @param stateB    GraphState dell'agente B (ricevente)
 * @param action    Tipo di interazione sociale
 * @param intensity Intensità dell'interazione [0-1], default 0.5
 */
export function interact(
  stateA: GraphState,
  stateB: GraphState,
  action: SocialAction,
  intensity: number = 0.5
): InteractionResult {
  const deltaA: Record<string, number> = {};
  const deltaB: Record<string, number> = {};

  const applyDelta = (
    state: GraphState,
    deltas: Record<string, number>,
    nodeId: string,
    delta: number
  ) => {
    const ns = state.nodes[nodeId];
    if (!ns) return;
    const prev = ns.activation;
    ns.activation = Math.max(0.0, Math.min(1.0, ns.activation + delta * intensity));
    deltas[nodeId] = ns.activation - prev;
  };

  switch (action) {
    case "agree":
      // A: si sente validato → boost belonging, mood positivo
      applyDelta(stateA, deltaA, "belonging_need", -0.1);      // soddisfatto → cala il bisogno
      applyDelta(stateA, deltaA, "current_mood", 0.15);
      applyDelta(stateA, deltaA, "social_standing", 0.1);
      // B: accordo → rinforza bandwagon, riduce identity_defense
      applyDelta(stateB, deltaB, "bandwagon_bias", 0.2);
      applyDelta(stateB, deltaB, "identity_defense", -0.1);
      applyDelta(stateB, deltaB, "reference_mirror", 0.15);
      break;

    case "disagree":
      // A: esprime disaccordo → lieve stress, boost critical_thinking
      applyDelta(stateA, deltaA, "stress_level", 0.1);
      applyDelta(stateA, deltaA, "critical_thinking", 0.1);
      applyDelta(stateA, deltaA, "distinction_need", 0.1);
      // B: riceve disaccordo → attiva identity_defense, core_wound
      applyDelta(stateB, deltaB, "identity_defense", 0.3);
      applyDelta(stateB, deltaB, "core_wound", 0.15);
      applyDelta(stateB, deltaB, "stress_level", 0.2);
      applyDelta(stateB, deltaB, "emotional_arousal", 0.2);
      break;

    case "admire":
      // A: esprime ammirazione → lieve boost aspiration
      applyDelta(stateA, deltaA, "aspiration_engine", 0.1);
      applyDelta(stateA, deltaA, "halo_effect", 0.15);
      // B: riceve ammirazione → boost social_standing, mood positivo
      applyDelta(stateB, deltaB, "social_standing", 0.25);
      applyDelta(stateB, deltaB, "current_mood", 0.2);
      applyDelta(stateB, deltaB, "belonging_need", -0.1);
      break;

    case "criticize":
      // A: critica → lieve boost identity, stress
      applyDelta(stateA, deltaA, "identity_defense", 0.1);
      applyDelta(stateA, deltaA, "stress_level", 0.1);
      // B: riceve critica → attiva core_wound, identity_defense, stress
      applyDelta(stateB, deltaB, "core_wound", 0.25);
      applyDelta(stateB, deltaB, "identity_defense", 0.35);
      applyDelta(stateB, deltaB, "stress_level", 0.25);
      applyDelta(stateB, deltaB, "social_standing", -0.15);
      break;

    case "share":
      // A: condivide → social_proof, boost belonging
      applyDelta(stateA, deltaA, "belonging_need", 0.1);
      applyDelta(stateA, deltaA, "reference_mirror", 0.1);
      // B: riceve condivisione → social_proof, reference_mirror
      applyDelta(stateB, deltaB, "bandwagon_bias", 0.15);
      applyDelta(stateB, deltaB, "reference_mirror", 0.2);
      applyDelta(stateB, deltaB, "attention_filter", 0.1);
      break;

    case "ignore":
      // A: ignora → boost distinction_need
      applyDelta(stateA, deltaA, "distinction_need", 0.1);
      // B: viene ignorato → lieve attivazione core_wound
      applyDelta(stateB, deltaB, "core_wound", 0.1);
      applyDelta(stateB, deltaB, "belonging_need", 0.15);
      applyDelta(stateB, deltaB, "social_standing", -0.1);
      break;
  }

  return {
    agentADelta: deltaA,
    agentBDelta: deltaB,
    action,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// STATE VECTOR EXPORT (33D)
// ============================================================

/**
 * exportStateVector — esporta lo stato del grafo come vettore numerico 33D.
 * Ordine: stesso ordine di TOPOLOGY.nodes (stabile).
 * Utile per clustering, heatmap, confronto pre/post campagna.
 */
export function exportStateVector(state: GraphState): number[] {
  return TOPOLOGY.nodes.map(nd => {
    const ns = state.nodes[nd.id];
    return ns ? Math.round(ns.activation * 10000) / 10000 : 0.0;
  });
}

/**
 * exportStateVectorLabeled — versione con etichette per debug e UI.
 */
export function exportStateVectorLabeled(state: GraphState): Array<{ id: string; label: string; activation: number; valence: number }> {
  return TOPOLOGY.nodes.map(nd => {
    const ns = state.nodes[nd.id];
    return {
      id: nd.id,
      label: nd.label,
      activation: ns ? Math.round(ns.activation * 10000) / 10000 : 0.0,
      valence: ns ? Math.round(ns.valence * 10000) / 10000 : 0.0,
    };
  });
}
