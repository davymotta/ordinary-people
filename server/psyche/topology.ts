/**
 * Psyche Graph Topology v1.0 — TypeScript Port
 * 
 * 32 nodi psicologici, 68 edge di influenza.
 * Struttura fissa: non cambia tra agenti.
 * Lo stato (activation, valence) è nell'oggetto GraphState.
 */

export interface NodeDef {
  id: string;
  category: "core" | "emotional" | "cognitive" | "social" | "bias" | "cultural";
  label: string;
  base_activation: number;
  base_valence?: number;
  decay_rate: number;
  volatility: number;
  circadian?: boolean;
}

export interface EdgeDef {
  from: string;
  to: string;
  weight: number;
  type: "excitatory" | "inhibitory";
  condition?: string;
}

export interface Topology {
  nodes: NodeDef[];
  edges: EdgeDef[];
}

// ============================================================
// NODES
// ============================================================

export const NODES: NodeDef[] = [
  // CORE
  { id: "identity",      category: "core",      label: "Identity (Self-concept)",    base_activation: 0.7,  decay_rate: 0.01, volatility: 0.05 },
  { id: "shadow",        category: "core",      label: "Shadow (Rejected Self)",     base_activation: 0.2,  decay_rate: 0.05, volatility: 0.15 },
  { id: "core_wound",    category: "core",      label: "Core Wound",                 base_activation: 0.15, decay_rate: 0.03, volatility: 0.20 },
  { id: "core_desire",   category: "core",      label: "Core Desire",                base_activation: 0.4,  decay_rate: 0.02, volatility: 0.10 },

  // EMOTIONAL
  { id: "current_mood",     category: "emotional", label: "Current Mood",            base_activation: 0.5,  base_valence: 0.0,  decay_rate: 0.08, volatility: 0.30 },
  { id: "stress_level",     category: "emotional", label: "Accumulated Stress",      base_activation: 0.2,  decay_rate: 0.06, volatility: 0.25 },
  { id: "energy",           category: "emotional", label: "Energy Level",            base_activation: 0.7,  decay_rate: 0.00, volatility: 0.10, circadian: true },
  { id: "emotional_arousal",category: "emotional", label: "Emotional Arousal",       base_activation: 0.2,  decay_rate: 0.15, volatility: 0.50 },

  // COGNITIVE
  { id: "attention_filter",   category: "cognitive", label: "Attention Filter",      base_activation: 0.5,  decay_rate: 0.10, volatility: 0.20 },
  { id: "confirmation_engine",category: "cognitive", label: "Confirmation Engine",   base_activation: 0.4,  decay_rate: 0.05, volatility: 0.30 },
  { id: "risk_calculator",    category: "cognitive", label: "Risk Calculator",       base_activation: 0.3,  decay_rate: 0.08, volatility: 0.35 },
  { id: "aspiration_engine",  category: "cognitive", label: "Aspiration Engine",     base_activation: 0.3,  decay_rate: 0.07, volatility: 0.25 },
  { id: "critical_thinking",  category: "cognitive", label: "Critical Thinking",     base_activation: 0.4,  decay_rate: 0.05, volatility: 0.20 },
  { id: "inner_voice",        category: "cognitive", label: "Inner Voice",           base_activation: 0.5,  decay_rate: 0.02, volatility: 0.10 },

  // SOCIAL
  { id: "social_standing",  category: "social", label: "Perceived Social Standing",  base_activation: 0.5,  decay_rate: 0.06, volatility: 0.20 },
  { id: "belonging_need",   category: "social", label: "Belonging Need",             base_activation: 0.4,  decay_rate: 0.05, volatility: 0.25 },
  { id: "distinction_need", category: "social", label: "Distinction Need",           base_activation: 0.3,  decay_rate: 0.05, volatility: 0.20 },
  { id: "reference_mirror", category: "social", label: "Reference Mirror",           base_activation: 0.4,  decay_rate: 0.04, volatility: 0.15 },

  // BIAS
  { id: "loss_aversion",    category: "bias", label: "Loss Aversion",                base_activation: 0.0,  decay_rate: 0.12, volatility: 0.40 },
  { id: "bandwagon_bias",   category: "bias", label: "Bandwagon / Conformity",       base_activation: 0.0,  decay_rate: 0.10, volatility: 0.35 },
  { id: "authority_bias",   category: "bias", label: "Authority Responsiveness",     base_activation: 0.0,  decay_rate: 0.08, volatility: 0.25 },
  { id: "scarcity_bias",    category: "bias", label: "Scarcity Response",            base_activation: 0.0,  decay_rate: 0.15, volatility: 0.40 },
  { id: "identity_defense", category: "bias", label: "Identity Defense",             base_activation: 0.0,  decay_rate: 0.10, volatility: 0.45 },
  { id: "halo_effect",      category: "bias", label: "Halo Effect",                  base_activation: 0.0,  decay_rate: 0.10, volatility: 0.30 },

  // CULTURAL
  { id: "cultural_lens",       category: "cultural", label: "Cultural Lens",         base_activation: 0.5,  decay_rate: 0.01, volatility: 0.05 },
  { id: "generational_memory", category: "cultural", label: "Generational Memory",   base_activation: 0.3,  decay_rate: 0.02, volatility: 0.15 },
  { id: "class_consciousness",  category: "cultural", label: "Class Consciousness",  base_activation: 0.3,  decay_rate: 0.02, volatility: 0.10 },
  { id: "moral_foundations",    category: "cultural", label: "Moral Foundations",    base_activation: 0.5,  decay_rate: 0.02, volatility: 0.15 },
  { id: "money_relationship",   category: "cultural", label: "Money Relationship",   base_activation: 0.4,  decay_rate: 0.02, volatility: 0.10 },
  { id: "time_orientation",     category: "cultural", label: "Time Orientation",     base_activation: 0.5,  decay_rate: 0.01, volatility: 0.05 },
  { id: "cultural_decode",      category: "cultural", label: "Cultural Decode",      base_activation: 0.4,  decay_rate: 0.05, volatility: 0.20 },
  { id: "humor_processor",      category: "cultural", label: "Humor Processor",      base_activation: 0.2,  decay_rate: 0.10, volatility: 0.35 },
];

// ============================================================
// EDGES
// ============================================================

export const EDGES: EdgeDef[] = [
  // Core → Emotional
  { from: "core_wound",    to: "stress_level",      weight: 0.6,  type: "excitatory", condition: "core_wound.activation > 0.3" },
  { from: "core_wound",    to: "emotional_arousal", weight: 0.5,  type: "excitatory", condition: "core_wound.activation > 0.3" },
  { from: "core_desire",   to: "aspiration_engine", weight: 0.5,  type: "excitatory" },
  { from: "shadow",        to: "identity_defense",  weight: 0.7,  type: "excitatory", condition: "shadow.activation > 0.3" },
  { from: "identity",      to: "identity_defense",  weight: 0.4,  type: "excitatory" },

  // Emotional → Cognitive
  { from: "stress_level",      to: "risk_calculator",    weight: 0.5, type: "excitatory" },
  { from: "stress_level",      to: "attention_filter",   weight: 0.4, type: "inhibitory" },
  { from: "stress_level",      to: "critical_thinking",  weight: 0.3, type: "inhibitory" },
  { from: "emotional_arousal", to: "confirmation_engine",weight: 0.5, type: "excitatory" },
  { from: "emotional_arousal", to: "critical_thinking",  weight: 0.4, type: "inhibitory" },
  { from: "energy",            to: "critical_thinking",  weight: 0.4, type: "excitatory" },
  { from: "energy",            to: "attention_filter",   weight: 0.3, type: "excitatory" },
  { from: "current_mood",      to: "aspiration_engine",  weight: 0.3, type: "excitatory" },
  { from: "current_mood",      to: "risk_calculator",    weight: 0.2, type: "inhibitory" },

  // Cognitive → Bias
  { from: "risk_calculator",   to: "loss_aversion",    weight: 0.6, type: "excitatory", condition: "risk_calculator.activation > 0.5" },
  { from: "confirmation_engine",to: "identity_defense", weight: 0.4, type: "excitatory" },
  { from: "aspiration_engine", to: "halo_effect",      weight: 0.3, type: "excitatory" },
  { from: "critical_thinking", to: "loss_aversion",    weight: 0.3, type: "inhibitory" },
  { from: "critical_thinking", to: "bandwagon_bias",   weight: 0.3, type: "inhibitory" },
  { from: "critical_thinking", to: "scarcity_bias",    weight: 0.3, type: "inhibitory" },

  // Social → Bias
  { from: "belonging_need",   to: "bandwagon_bias",   weight: 0.5, type: "excitatory" },
  { from: "distinction_need", to: "bandwagon_bias",   weight: 0.4, type: "inhibitory" },
  { from: "social_standing",  to: "identity_defense", weight: 0.3, type: "inhibitory" },
  { from: "reference_mirror", to: "bandwagon_bias",   weight: 0.3, type: "excitatory" },

  // Cultural → Bias
  { from: "cultural_lens",      to: "authority_bias",     weight: 0.4, type: "excitatory" },
  { from: "class_consciousness", to: "distinction_need",  weight: 0.4, type: "excitatory" },
  { from: "moral_foundations",  to: "identity_defense",   weight: 0.3, type: "excitatory" },

  // Bias → Emotional (feedback loops)
  { from: "loss_aversion",    to: "stress_level",      weight: 0.3, type: "excitatory" },
  { from: "identity_defense", to: "emotional_arousal", weight: 0.4, type: "excitatory" },
  { from: "identity_defense", to: "current_mood",      weight: 0.3, type: "inhibitory" },

  // Social loops
  { from: "social_standing",  to: "belonging_need",    weight: 0.4, type: "inhibitory" },
  { from: "social_standing",  to: "distinction_need",  weight: 0.2, type: "excitatory" },
  { from: "belonging_need",   to: "reference_mirror",  weight: 0.3, type: "excitatory" },

  // Cultural loops
  { from: "generational_memory", to: "cultural_lens",    weight: 0.3, type: "excitatory" },
  { from: "cultural_decode",     to: "critical_thinking",weight: 0.3, type: "excitatory" },
  { from: "humor_processor",     to: "current_mood",     weight: 0.4, type: "excitatory" },
  { from: "humor_processor",     to: "stress_level",     weight: 0.2, type: "inhibitory" },

  // Money & Time
  { from: "money_relationship", to: "risk_calculator",   weight: 0.3, type: "excitatory" },
  { from: "money_relationship", to: "aspiration_engine", weight: 0.2, type: "excitatory" },
  { from: "time_orientation",   to: "aspiration_engine", weight: 0.2, type: "excitatory" },

  // Aspiration vs Risk (ambivalence)
  { from: "aspiration_engine", to: "risk_calculator",    weight: 0.2, type: "inhibitory" },
  { from: "risk_calculator",   to: "aspiration_engine",  weight: 0.2, type: "inhibitory" },

  // Inner voice → mood modulation
  { from: "inner_voice", to: "current_mood",  weight: 0.15, type: "excitatory" },
  { from: "inner_voice", to: "stress_level",  weight: 0.10, type: "excitatory" },

  // Halo effect
  { from: "halo_effect", to: "confirmation_engine", weight: 0.3, type: "excitatory" },
  { from: "halo_effect", to: "risk_calculator",     weight: 0.2, type: "inhibitory" },

  // Scarcity
  { from: "scarcity_bias", to: "emotional_arousal", weight: 0.3, type: "excitatory" },
  { from: "scarcity_bias", to: "risk_calculator",   weight: 0.2, type: "excitatory" },

  // Authority
  { from: "authority_bias", to: "confirmation_engine", weight: 0.3, type: "excitatory" },
  { from: "authority_bias", to: "critical_thinking",   weight: 0.2, type: "inhibitory" },

  // Bandwagon
  { from: "bandwagon_bias", to: "belonging_need",   weight: 0.2, type: "inhibitory" },
  { from: "bandwagon_bias", to: "current_mood",     weight: 0.2, type: "excitatory" },

  // Identity defense → confirmation loop
  { from: "identity_defense", to: "confirmation_engine", weight: 0.4, type: "excitatory" },
  { from: "identity_defense", to: "attention_filter",    weight: 0.3, type: "inhibitory" },

  // Core wound → social
  { from: "core_wound", to: "belonging_need",   weight: 0.3, type: "excitatory", condition: "core_wound.activation > 0.3" },
  { from: "core_wound", to: "social_standing",  weight: 0.3, type: "inhibitory", condition: "core_wound.activation > 0.3" },

  // Core desire → social
  { from: "core_desire", to: "belonging_need",   weight: 0.2, type: "excitatory" },
  { from: "core_desire", to: "distinction_need", weight: 0.2, type: "excitatory" },

  // Cultural decode
  { from: "attention_filter", to: "cultural_decode", weight: 0.3, type: "excitatory" },
  { from: "cultural_lens",    to: "cultural_decode", weight: 0.4, type: "excitatory" },
];

export const TOPOLOGY: Topology = { nodes: NODES, edges: EDGES };
