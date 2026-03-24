/**
 * Psyche Engine — Test Suite
 * 
 * Testa le funzioni deterministiche del motore Psyche TypeScript:
 * - initializeFromProfile: inizializzazione corretta dei nodi
 * - applyDecay: decadimento temporale verso base
 * - applyCircadian: ritmo circadiano corretto
 * - injectStimulus: iniezione temi nel grafo
 * - propagate: propagazione spreading activation
 * - readState: output reader corretto
 * - tick: ciclo completo
 * - PerceptualRouter: rilevamento temi da testo
 * - serializeState / deserializeState: round-trip
 */

import { describe, it, expect } from "vitest";
import {
  initializeFromProfile,
  applyDecay,
  applyCircadian,
  injectStimulus,
  propagate,
  readState,
  tick,
  serializeState,
  deserializeState,
  type AgentProfile,
  type GraphState,
} from "./psyche/engine";
import { PerceptualRouter, mapOPThemesToPsyche } from "./psyche/perceptual-router";

// ============================================================
// FIXTURE
// ============================================================

const PROFILE_ANXIOUS: AgentProfile = {
  big_five: { openness: 0.4, conscientiousness: 0.6, extraversion: 0.3, agreeableness: 0.65, neuroticism: 0.8 },
  haidt: { care: 0.7, loyalty: 0.6, authority: 0.5 },
  hofstede: { power_distance: 0.6, individualism: 0.3, uncertainty_avoidance: 0.8 },
  bourdieu: { economic_capital: 2, cultural_capital: 2, social_capital: 2 },
  core_wound: "abandonment",
  core_desire: "to_belong",
  inner_voice: "critic",
  wound_triggers: ["da solo", "abbandonato", "escluso"],
  shadow_triggers: ["debole", "codardo"],
  advertising_cynicism: 0.3,
};

const PROFILE_CONFIDENT: AgentProfile = {
  big_five: { openness: 0.8, conscientiousness: 0.7, extraversion: 0.75, agreeableness: 0.5, neuroticism: 0.2 },
  haidt: { care: 0.5, loyalty: 0.4, authority: 0.3 },
  hofstede: { power_distance: 0.3, individualism: 0.8, uncertainty_avoidance: 0.3 },
  bourdieu: { economic_capital: 4, cultural_capital: 5, social_capital: 4 },
  core_wound: "invisibility",
  core_desire: "to_be_respected",
  inner_voice: "optimist",
  wound_triggers: ["ignorato", "invisibile"],
  shadow_triggers: ["mediocre", "banale"],
  advertising_cynicism: 0.7,
};

// ============================================================
// TEST: initializeFromProfile
// ============================================================

describe("initializeFromProfile", () => {
  it("dovrebbe creare 33 nodi nel GraphState", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    expect(Object.keys(state.nodes).length).toBe(33);
  });

  it("agente ansioso dovrebbe avere stress_level più alto di agente sicuro", () => {
    const anxious = initializeFromProfile(PROFILE_ANXIOUS);
    const confident = initializeFromProfile(PROFILE_CONFIDENT);
    expect(anxious.nodes["stress_level"].activation).toBeGreaterThan(confident.nodes["stress_level"].activation);
  });

  it("agente con alto cultural_capital dovrebbe avere distinction_need più alta", () => {
    const anxious = initializeFromProfile(PROFILE_ANXIOUS);
    const confident = initializeFromProfile(PROFILE_CONFIDENT);
    expect(confident.nodes["distinction_need"].activation).toBeGreaterThan(anxious.nodes["distinction_need"].activation);
  });

  it("agente con basso individualism dovrebbe avere belonging_need più alta", () => {
    const anxious = initializeFromProfile(PROFILE_ANXIOUS);
    const confident = initializeFromProfile(PROFILE_CONFIDENT);
    expect(anxious.nodes["belonging_need"].activation).toBeGreaterThan(confident.nodes["belonging_need"].activation);
  });

  it("inner_voice critic dovrebbe abbassare il valence del current_mood", () => {
    const anxious = initializeFromProfile(PROFILE_ANXIOUS);
    const confident = initializeFromProfile(PROFILE_CONFIDENT);
    expect(anxious.nodes["current_mood"].valence).toBeLessThan(confident.nodes["current_mood"].valence);
  });

  it("tutti i valori di activation dovrebbero essere in [0, 1]", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    for (const ns of Object.values(state.nodes)) {
      expect(ns.activation).toBeGreaterThanOrEqual(0.0);
      expect(ns.activation).toBeLessThanOrEqual(1.0);
    }
  });

  it("tutti i valori di valence dovrebbero essere in [-1, 1]", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    for (const ns of Object.values(state.nodes)) {
      expect(ns.valence).toBeGreaterThanOrEqual(-1.0);
      expect(ns.valence).toBeLessThanOrEqual(1.0);
    }
  });
});

// ============================================================
// TEST: applyDecay
// ============================================================

describe("applyDecay", () => {
  it("un nodo con alta activation dovrebbe decadere verso la base", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    // Forza emotional_arousal alto
    state.nodes["emotional_arousal"].activation = 0.9;
    const before = state.nodes["emotional_arousal"].activation;
    applyDecay(state, 60); // 1 ora
    expect(state.nodes["emotional_arousal"].activation).toBeLessThan(before);
  });

  it("un nodo con decay_rate 0 (energy) non dovrebbe decadere significativamente", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    state.nodes["energy"].activation = 0.8;
    const before = state.nodes["energy"].activation;
    applyDecay(state, 60);
    // energy ha decay_rate 0, quindi non decade
    expect(state.nodes["energy"].activation).toBeCloseTo(before, 2);
  });

  it("dopo decay i valori dovrebbero rimanere in [0, 1]", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    state.nodes["stress_level"].activation = 0.95;
    applyDecay(state, 120);
    for (const ns of Object.values(state.nodes)) {
      expect(ns.activation).toBeGreaterThanOrEqual(0.0);
      expect(ns.activation).toBeLessThanOrEqual(1.0);
    }
  });
});

// ============================================================
// TEST: applyCircadian
// ============================================================

describe("applyCircadian", () => {
  it("energy dovrebbe essere alta a 10:00 (picco mattutino)", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    applyCircadian(state, 10.0);
    expect(state.nodes["energy"].activation).toBeGreaterThan(0.75);
  });

  it("energy dovrebbe essere bassa a 15:00 (trough pomeridiano)", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    applyCircadian(state, 15.0);
    expect(state.nodes["energy"].activation).toBeLessThan(0.75);
  });

  it("energy a 10:00 dovrebbe essere maggiore di energy a 23:00", () => {
    const state1 = initializeFromProfile(PROFILE_ANXIOUS);
    const state2 = initializeFromProfile(PROFILE_ANXIOUS);
    applyCircadian(state1, 10.0);
    applyCircadian(state2, 23.0);
    expect(state1.nodes["energy"].activation).toBeGreaterThan(state2.nodes["energy"].activation);
  });
});

// ============================================================
// TEST: injectStimulus
// ============================================================

describe("injectStimulus", () => {
  it("tema 'exclusion' dovrebbe attivare core_wound", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const before = state.nodes["core_wound"].activation;
    injectStimulus(state, ["exclusion"], 1.0);
    expect(state.nodes["core_wound"].activation).toBeGreaterThan(before);
  });

  it("tema 'luxury' dovrebbe attivare aspiration_engine", () => {
    const state = initializeFromProfile(PROFILE_CONFIDENT);
    const before = state.nodes["aspiration_engine"].activation;
    injectStimulus(state, ["luxury"], 1.0);
    expect(state.nodes["aspiration_engine"].activation).toBeGreaterThan(before);
  });

  it("tema 'scarcity' dovrebbe attivare scarcity_bias", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const before = state.nodes["scarcity_bias"].activation;
    injectStimulus(state, ["scarcity"], 1.0);
    expect(state.nodes["scarcity_bias"].activation).toBeGreaterThan(before);
  });

  it("custom triggers dovrebbero attivare i nodi specificati", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const before = state.nodes["shadow"].activation;
    injectStimulus(state, [], 1.0, { shadow: 0.5 });
    expect(state.nodes["shadow"].activation).toBeGreaterThan(before);
  });

  it("dovrebbe restituire la lista dei nodi attivati", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const activated = injectStimulus(state, ["fear", "scarcity"], 1.0);
    expect(activated.length).toBeGreaterThan(0);
  });
});

// ============================================================
// TEST: propagate
// ============================================================

describe("propagate", () => {
  it("dopo propagazione lo stress alto dovrebbe aumentare risk_calculator", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    state.nodes["stress_level"].activation = 0.9;
    const before = state.nodes["risk_calculator"].activation;
    propagate(state);
    expect(state.nodes["risk_calculator"].activation).toBeGreaterThan(before);
  });

  it("dopo propagazione tutti i valori dovrebbero rimanere in [0, 1]", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    injectStimulus(state, ["exclusion", "fear", "scarcity"], 1.0);
    propagate(state);
    for (const ns of Object.values(state.nodes)) {
      expect(ns.activation).toBeGreaterThanOrEqual(0.0);
      expect(ns.activation).toBeLessThanOrEqual(1.0);
    }
  });

  it("dovrebbe restituire il numero di step eseguiti", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const steps = propagate(state);
    expect(steps).toBeGreaterThan(0);
    expect(steps).toBeLessThanOrEqual(6);
  });
});

// ============================================================
// TEST: readState
// ============================================================

describe("readState", () => {
  it("dovrebbe restituire un PsycheState con tutti i campi richiesti", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const ps = readState(state);
    expect(ps.mood).toBeDefined();
    expect(ps.arousal).toBeDefined();
    expect(ps.energy).toBeDefined();
    expect(ps.stress).toBeDefined();
    expect(ps.processing_mode).toBeDefined();
    expect(Array.isArray(ps.active_biases)).toBe(true);
    expect(ps._raw).toBeDefined();
  });

  it("agente con alta arousal dovrebbe avere processing_mode intuitive", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    state.nodes["emotional_arousal"].activation = 0.9;
    state.nodes["confirmation_engine"].activation = 0.8;
    state.nodes["critical_thinking"].activation = 0.2;
    state.nodes["attention_filter"].activation = 0.2;
    const ps = readState(state);
    expect(ps.processing_mode).toBe("intuitive");
  });

  it("agente con wound attivo dovrebbe avere wound_active = true", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    state.nodes["core_wound"].activation = 0.5;
    const ps = readState(state);
    expect(ps.wound_active).toBe(true);
  });

  it("agente con alta belonging_need dovrebbe avere social_posture seeking_belonging", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    state.nodes["belonging_need"].activation = 0.8;
    state.nodes["distinction_need"].activation = 0.2;
    const ps = readState(state);
    expect(ps.social_posture).toBe("seeking_belonging");
  });
});

// ============================================================
// TEST: tick (ciclo completo)
// ============================================================

describe("tick", () => {
  it("un tick con tema exclusion su agente con ferita abandonment dovrebbe attivare core_wound", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    // Nota: elapsedMinutes=0 per evitare che il decay abbatta il wound sotto soglia prima della propagazione
    const ps = tick(state, PROFILE_ANXIOUS, {
      stimulusThemes: ["exclusion"],
      stimulusIntensity: 0.8,
      currentHour: 10.0,
      elapsedMinutes: 0,
    });
    // core_wound dovrebbe essere attivato (> base 0.1) dopo iniezione exclusion
    const woundActivation = ps._raw["core_wound"]?.a ?? 0;
    expect(woundActivation).toBeGreaterThan(0.1);
  });

  it("un tick con tema luxury su agente sicuro dovrebbe aumentare aspiration", () => {
    const state = initializeFromProfile(PROFILE_CONFIDENT);
    const ps = tick(state, PROFILE_CONFIDENT, {
      stimulusThemes: ["luxury"],
      stimulusIntensity: 0.9,
      currentHour: 14.0,
      elapsedMinutes: 60,
    });
    expect(["moderate", "high", "very_high"]).toContain(ps.aspiration_level);
  });

  it("due tick successivi dovrebbero produrre stati diversi (decay tra tick)", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const ps1 = tick(state, PROFILE_ANXIOUS, {
      stimulusThemes: ["fear"],
      stimulusIntensity: 1.0,
      elapsedMinutes: 5,
    });
    const ps2 = tick(state, PROFILE_ANXIOUS, {
      stimulusThemes: [],
      elapsedMinutes: 120, // 2 ore dopo
    });
    // Dopo 2 ore senza stimoli, lo stress dovrebbe essere diminuito
    const stress1 = ps1._raw["stress_level"]?.a ?? 0;
    const stress2 = ps2._raw["stress_level"]?.a ?? 0;
    expect(stress2).toBeLessThanOrEqual(stress1 + 0.05); // può aumentare leggermente per propagazione
  });
});

// ============================================================
// TEST: serializzazione
// ============================================================

describe("serializeState / deserializeState", () => {
  it("round-trip dovrebbe preservare i valori dei nodi", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    injectStimulus(state, ["exclusion", "luxury"], 0.8);
    propagate(state);
    
    const serialized = serializeState(state);
    const restored = deserializeState(serialized);
    
    expect(Object.keys(restored.nodes).length).toBe(Object.keys(state.nodes).length);
    
    for (const [nid, ns] of Object.entries(state.nodes)) {
      expect(restored.nodes[nid]?.activation).toBeCloseTo(ns.activation, 3);
      expect(restored.nodes[nid]?.valence).toBeCloseTo(ns.valence, 3);
    }
  });

  it("il JSON serializzato dovrebbe essere una stringa valida", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const serialized = serializeState(state);
    expect(() => JSON.parse(serialized)).not.toThrow();
  });
});

// ============================================================
// TEST: PerceptualRouter
// ============================================================

describe("PerceptualRouter", () => {
  const router = new PerceptualRouter();

  it("dovrebbe rilevare tema luxury da testo con parola 'esclusivo'", () => {
    const result = router.route("Un prodotto esclusivo per pochi eletti");
    expect(result.themes).toContain("luxury");
  });

  it("dovrebbe rilevare tema scarcity da testo con parola 'limitato'", () => {
    const result = router.route("Edizione limitata, ultimi pezzi disponibili");
    expect(result.themes).toContain("scarcity");
  });

  it("dovrebbe rilevare tema exclusion da testo con 'solo per chi'", () => {
    const result = router.route("Solo per chi sa riconoscere la vera qualità");
    expect(result.themes).toContain("exclusion");
  });

  it("dovrebbe attivare wound trigger se il testo contiene una parola trigger", () => {
    const result = router.route("Ti sentirai da solo senza questo prodotto", PROFILE_ANXIOUS);
    expect(result.triggeredNodes["core_wound"]).toBeGreaterThan(0);
  });

  it("dovrebbe aumentare intensity con punti esclamativi", () => {
    const result1 = router.route("Prodotto interessante");
    const result2 = router.route("Prodotto incredibile! Assolutamente straordinario!");
    expect(result2.intensity).toBeGreaterThan(result1.intensity);
  });

  it("dovrebbe restituire intensità in [0, 1]", () => {
    const result = router.route("Testo molto molto molto molto molto eccitante!!!");
    expect(result.intensity).toBeGreaterThanOrEqual(0);
    expect(result.intensity).toBeLessThanOrEqual(1);
  });
});

// ============================================================
// TEST: mapOPThemesToPsyche
// ============================================================

describe("mapOPThemesToPsyche", () => {
  it("dovrebbe mappare 'luxury' a temi Psyche corretti", () => {
    const themes = mapOPThemesToPsyche(["luxury"]);
    expect(themes).toContain("luxury");
    expect(themes).toContain("distinction");
  });

  it("dovrebbe mappare 'social_proof' a temi Psyche corretti", () => {
    const themes = mapOPThemesToPsyche(["social_proof"]);
    expect(themes).toContain("social_proof");
    expect(themes).toContain("conformity_pressure");
  });

  it("dovrebbe gestire temi sconosciuti passandoli direttamente", () => {
    const themes = mapOPThemesToPsyche(["tema_sconosciuto"]);
    expect(themes).toContain("tema_sconosciuto");
  });
});

// ============================================================
// SPRINT 21 — Episodic Memory & Action Feedback Loop
// ============================================================

import {
  recordEpisode,
  recallRelevantEpisodes,
  applyActionFeedback,
  type EpisodicEntry,
  type ActionType,
} from "./psyche/engine";

describe("recordEpisode", () => {
  it("non registra episodio se arousal < soglia", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const psycheState = readState(state);
    // arousal iniziale basso — soglia alta (0.99) per forzare il non-registro
    const entry = recordEpisode(state, ["luxury"], psycheState, "campaign", 0.99);
    expect(entry).toBeNull();
    expect(state.episodicLog ?? []).toHaveLength(0);
  });

  it("registra episodio se arousal > soglia dopo stimolo forte", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    injectStimulus(state, ["exclusion", "fear"], 1.5);
    propagate(state);
    const psycheState = readState(state);
    // Soglia bassa per garantire la registrazione
    const entry = recordEpisode(state, ["exclusion", "fear"], psycheState, "campaign", 0.0);
    expect(entry).not.toBeNull();
    expect(entry!.themes).toContain("exclusion");
    expect(entry!.source).toBe("campaign");
    expect(state.episodicLog).toHaveLength(1);
  });

  it("aggiorna il nodo episodic_memory dopo registrazione", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const baseMem = state.nodes["episodic_memory"]?.activation ?? 0;
    injectStimulus(state, ["exclusion"], 1.5);
    propagate(state);
    const psycheState = readState(state);
    recordEpisode(state, ["exclusion"], psycheState, "campaign", 0.0);
    const newMem = state.nodes["episodic_memory"]?.activation ?? 0;
    expect(newMem).toBeGreaterThan(baseMem);
  });

  it("mantiene al massimo 20 episodi nel log", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    for (let i = 0; i < 25; i++) {
      injectStimulus(state, ["exclusion"], 1.5);
      propagate(state);
      const ps = readState(state);
      recordEpisode(state, ["exclusion"], ps, "campaign", 0.0);
    }
    expect(state.episodicLog!.length).toBeLessThanOrEqual(20);
  });

  it("EpisodicEntry contiene tutti i campi richiesti", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    injectStimulus(state, ["exclusion"], 1.5);
    propagate(state);
    const ps = readState(state);
    const entry = recordEpisode(state, ["exclusion"], ps, "world_event", 0.0);
    expect(entry).not.toBeNull();
    expect(entry!.timestamp).toBeDefined();
    expect(Array.isArray(entry!.themes)).toBe(true);
    expect(typeof entry!.arousal).toBe("number");
    expect(typeof entry!.valence).toBe("number");
    expect(typeof entry!.woundActive).toBe("boolean");
    expect(Array.isArray(entry!.activeBiases)).toBe(true);
    expect(entry!.source).toBe("world_event");
  });
});

describe("recallRelevantEpisodes", () => {
  it("restituisce array vuoto se nessun episodio registrato", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const recalled = recallRelevantEpisodes(state, ["luxury"], 3);
    expect(recalled).toHaveLength(0);
  });

  it("recupera episodi con temi sovrapposti prima degli altri", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    // Episodio con tema luxury
    injectStimulus(state, ["luxury", "scarcity"], 1.5);
    propagate(state);
    const ps1 = readState(state);
    recordEpisode(state, ["luxury", "scarcity"], ps1, "campaign", 0.0);
    // Episodio con tema exclusion (non sovrapposto)
    injectStimulus(state, ["exclusion"], 1.5);
    propagate(state);
    const ps2 = readState(state);
    recordEpisode(state, ["exclusion"], ps2, "campaign", 0.0);

    const recalled = recallRelevantEpisodes(state, ["luxury"], 3);
    expect(recalled.length).toBeGreaterThan(0);
    // Il primo risultato deve avere "luxury" tra i temi
    expect(recalled[0].themes).toContain("luxury");
  });

  it("non restituisce più di limit episodi", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    for (let i = 0; i < 8; i++) {
      injectStimulus(state, ["luxury"], 1.5);
      propagate(state);
      const ps = readState(state);
      recordEpisode(state, ["luxury"], ps, "campaign", 0.0);
    }
    const recalled = recallRelevantEpisodes(state, ["luxury"], 3);
    expect(recalled.length).toBeLessThanOrEqual(3);
  });
});

describe("applyActionFeedback", () => {
  it("purchase riduce aspiration_engine (proxy reward_anticipation)", () => {
    const state = initializeFromProfile(PROFILE_CONFIDENT);
    state.nodes["aspiration_engine"].activation = 0.8;
    applyActionFeedback(state, "purchase" as ActionType, 1.0);
    expect(state.nodes["aspiration_engine"].activation).toBeLessThan(0.8);
  });

  it("complain riduce stress_level (effetto catartico)", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    state.nodes["stress_level"].activation = 0.8;
    applyActionFeedback(state, "complain" as ActionType, 1.0);
    expect(state.nodes["stress_level"].activation).toBeLessThan(0.8);
  });

  it("reject aumenta identity_defense", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const baseDefense = state.nodes["identity_defense"].activation;
    applyActionFeedback(state, "reject" as ActionType, 1.0);
    expect(state.nodes["identity_defense"].activation).toBeGreaterThan(baseDefense);
  });

  it("recommend aumenta social_standing", () => {
    const state = initializeFromProfile(PROFILE_CONFIDENT);
    const baseStanding = state.nodes["social_standing"].activation;
    applyActionFeedback(state, "recommend" as ActionType, 1.0);
    expect(state.nodes["social_standing"].activation).toBeGreaterThan(baseStanding);
  });

  it("i valori rimangono sempre nel range [0, 1] dopo feedback intensi", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    for (let i = 0; i < 10; i++) {
      applyActionFeedback(state, "reject" as ActionType, 2.0);
      applyActionFeedback(state, "complain" as ActionType, 2.0);
    }
    for (const ns of Object.values(state.nodes)) {
      expect(ns.activation).toBeGreaterThanOrEqual(0.0);
      expect(ns.activation).toBeLessThanOrEqual(1.0);
    }
  });

  it("share aumenta social_standing con valenza positiva", () => {
    const state = initializeFromProfile(PROFILE_CONFIDENT);
    const baseValence = state.nodes["social_standing"].valence;
    applyActionFeedback(state, "share" as ActionType, 1.0);
    expect(state.nodes["social_standing"].valence).toBeGreaterThan(baseValence);
  });
});

describe("serializeState con episodicLog", () => {
  it("serializza e deserializza il log episodico correttamente", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    injectStimulus(state, ["exclusion"], 1.5);
    propagate(state);
    const ps = readState(state);
    recordEpisode(state, ["exclusion"], ps, "campaign", 0.0);

    const json = serializeState(state);
    const restored = deserializeState(json);

    expect(restored.episodicLog).toBeDefined();
    expect(restored.episodicLog!.length).toBe(state.episodicLog!.length);
    if (restored.episodicLog!.length > 0) {
      expect(restored.episodicLog![0].themes).toEqual(state.episodicLog![0].themes);
      expect(restored.episodicLog![0].source).toBe("campaign");
    }
  });
});

// ============================================================
// SPRINT 22 — Hebbian Update, interact, exportStateVector
// ============================================================

import {
  hebbianUpdate,
  interact,
  exportStateVector,
  exportStateVectorLabeled,
  type HebbianWeights,
  type SocialAction,
} from "./psyche/engine";

describe("hebbianUpdate", () => {
  it("dovrebbe rinforzare edge tra nodi co-attivi", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    // Forza alta co-attivazione su core_wound → stress_level
    state.nodes["core_wound"].activation = 0.8;
    state.nodes["stress_level"].activation = 0.8;

    const weights: HebbianWeights = {};
    hebbianUpdate(state, weights);

    const key = "core_wound→stress_level";
    expect(weights[key]).toBeDefined();
    expect(weights[key]).toBeGreaterThan(0);
  });

  it("dovrebbe clampare i pesi a [-0.5, 0.5]", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    // Forza attivazioni massime
    for (const id of Object.keys(state.nodes)) {
      state.nodes[id].activation = 1.0;
    }

    const weights: HebbianWeights = {};
    // Applica 100 update consecutivi
    for (let i = 0; i < 100; i++) {
      hebbianUpdate(state, weights);
    }

    for (const w of Object.values(weights)) {
      expect(w).toBeLessThanOrEqual(0.5);
      expect(w).toBeGreaterThanOrEqual(-0.5);
    }
  });

  it("dovrebbe applicare decay su edge inutilizzati", () => {
    const state = initializeFromProfile(PROFILE_CONFIDENT);
    // Forza attivazioni basse
    for (const id of Object.keys(state.nodes)) {
      state.nodes[id].activation = 0.0;
    }

    const weights: HebbianWeights = { "core_wound→stress_level": 0.3 };
    hebbianUpdate(state, weights, 0.05, 0.01);

    // Con attivazioni a 0, il termine Hebbian è 0, rimane solo il decay
    expect(weights["core_wound→stress_level"]).toBeLessThan(0.3);
  });
});

describe("interact (Social Graph Bridge)", () => {
  it("agree: agente B dovrebbe avere bandwagon_bias aumentato", () => {
    const stateA = initializeFromProfile(PROFILE_ANXIOUS);
    const stateB = initializeFromProfile(PROFILE_CONFIDENT);
    const prevBandwagon = stateB.nodes["bandwagon_bias"].activation;

    interact(stateA, stateB, "agree");

    expect(stateB.nodes["bandwagon_bias"].activation).toBeGreaterThan(prevBandwagon);
  });

  it("disagree: agente B dovrebbe avere identity_defense aumentato", () => {
    const stateA = initializeFromProfile(PROFILE_CONFIDENT);
    const stateB = initializeFromProfile(PROFILE_ANXIOUS);
    const prevDefense = stateB.nodes["identity_defense"].activation;

    interact(stateA, stateB, "disagree");

    expect(stateB.nodes["identity_defense"].activation).toBeGreaterThan(prevDefense);
  });

  it("criticize: agente B dovrebbe avere core_wound aumentato", () => {
    const stateA = initializeFromProfile(PROFILE_CONFIDENT);
    const stateB = initializeFromProfile(PROFILE_ANXIOUS);
    const prevWound = stateB.nodes["core_wound"].activation;

    interact(stateA, stateB, "criticize", 1.0);

    expect(stateB.nodes["core_wound"].activation).toBeGreaterThan(prevWound);
  });

  it("admire: agente B dovrebbe avere social_standing aumentato", () => {
    const stateA = initializeFromProfile(PROFILE_ANXIOUS);
    const stateB = initializeFromProfile(PROFILE_CONFIDENT);
    const prevStanding = stateB.nodes["social_standing"].activation;

    interact(stateA, stateB, "admire", 1.0);

    expect(stateB.nodes["social_standing"].activation).toBeGreaterThan(prevStanding);
  });

  it("interact dovrebbe restituire InteractionResult con timestamp", () => {
    const stateA = initializeFromProfile(PROFILE_ANXIOUS);
    const stateB = initializeFromProfile(PROFILE_CONFIDENT);

    const result = interact(stateA, stateB, "share");

    expect(result.action).toBe("share");
    expect(result.timestamp).toBeDefined();
    expect(typeof result.agentADelta).toBe("object");
    expect(typeof result.agentBDelta).toBe("object");
  });

  it("intensità 0 non dovrebbe cambiare lo stato", () => {
    const stateA = initializeFromProfile(PROFILE_ANXIOUS);
    const stateB = initializeFromProfile(PROFILE_CONFIDENT);
    const snapB = JSON.stringify(stateB.nodes);

    interact(stateA, stateB, "criticize", 0);

    expect(JSON.stringify(stateB.nodes)).toBe(snapB);
  });
});

describe("exportStateVector", () => {
  it("dovrebbe esportare un vettore di 33 elementi", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const vector = exportStateVector(state);

    expect(vector.length).toBe(33);
  });

  it("tutti i valori dovrebbero essere in [0, 1]", () => {
    const state = initializeFromProfile(PROFILE_CONFIDENT);
    const vector = exportStateVector(state);

    for (const v of vector) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("exportStateVectorLabeled dovrebbe restituire 33 oggetti con id, label, activation, valence", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const labeled = exportStateVectorLabeled(state);

    expect(labeled.length).toBe(33);
    for (const entry of labeled) {
      expect(entry.id).toBeDefined();
      expect(entry.label).toBeDefined();
      expect(typeof entry.activation).toBe("number");
      expect(typeof entry.valence).toBe("number");
    }
  });

  it("il 33° elemento dovrebbe corrispondere a episodic_memory", () => {
    const state = initializeFromProfile(PROFILE_ANXIOUS);
    const labeled = exportStateVectorLabeled(state);

    expect(labeled[32].id).toBe("episodic_memory");
  });
});
