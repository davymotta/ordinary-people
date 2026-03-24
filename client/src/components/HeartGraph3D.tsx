/**
 * HeartGraph3D — Cuore antropomorfo come grafo luminoso 3D
 *
 * Design:
 * - Nodi: punti luminosi flat con glow (additive blending, sprite-like)
 *   → rosso (#C1622F) e nero/antracite (#1a1a1a) con diverse intensità
 * - Archi: molte linee sottili con propagazione di energia (glow direzionale)
 * - Battito: espansione/contrazione RADIALE dei nodi periferici (non zoom camera)
 * - Energia: impulso luminoso che viaggia lungo gli edge da nodo attivo a nodo target
 */

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// TOPOLOGIA — 32 nodi reali di Psyche 3.0
// Coordinate 3D normalizzate sulla forma del cuore.
// "category": categoria psicologica del nodo
// "type": "red" | "dark" — colore del punto luminoso
//   red  = core + bias (nodi ad alta volatilità)
//   dark = cognitive + social + cultural + emotional + expressive
// ─────────────────────────────────────────────────────────────────────────────
interface NodeDef {
  id: number;
  psycheId: string;
  label: string;
  category: "core" | "emotional" | "cognitive" | "social" | "bias" | "cultural" | "expressive";
  x: number; y: number; z: number;
  type: "red" | "dark";
  size: number;          // raggio base del glow (0.03–0.10)
  radialDist: number;    // 0 = centro, 1 = bordo esterno
  baseActivation: number; // da Karpathy Loop
}

const NODES: NodeDef[] = [
  // ── CORE (rosso intenso — cuore del grafo, posizioni centrali alte) ──
  { id:  0, psycheId: "identity",    label: "Identity",    category: "core",      x: -0.05, y:  0.55, z:  0.18, type: "red",  size: 0.088, radialDist: 0.40, baseActivation: 0.455 },
  { id:  1, psycheId: "shadow",      label: "Shadow",      category: "core",      x:  0.18, y:  0.62, z:  0.10, type: "red",  size: 0.062, radialDist: 0.48, baseActivation: 0.130 },
  { id:  2, psycheId: "core_wound",  label: "Core Wound",  category: "core",      x: -0.22, y:  0.38, z:  0.22, type: "red",  size: 0.055, radialDist: 0.35, baseActivation: 0.098 },
  { id:  3, psycheId: "core_desire", label: "Core Desire", category: "core",      x:  0.10, y:  0.42, z:  0.20, type: "red",  size: 0.072, radialDist: 0.38, baseActivation: 0.260 },

  // ── EMOTIONAL (antracite medio — strato medio del cuore) ──
  { id:  4, psycheId: "current_mood",      label: "Mood",          category: "emotional", x: -0.32, y:  0.22, z:  0.15, type: "dark", size: 0.068, radialDist: 0.42, baseActivation: 0.325 },
  { id:  5, psycheId: "stress_level",      label: "Stress",        category: "emotional", x:  0.30, y:  0.18, z:  0.12, type: "dark", size: 0.055, radialDist: 0.40, baseActivation: 0.130 },
  { id:  6, psycheId: "energy",            label: "Energy",        category: "emotional", x: -0.12, y:  0.18, z:  0.25, type: "dark", size: 0.072, radialDist: 0.28, baseActivation: 0.455 },
  { id:  7, psycheId: "emotional_arousal", label: "Arousal",       category: "emotional", x:  0.14, y:  0.08, z:  0.22, type: "dark", size: 0.055, radialDist: 0.22, baseActivation: 0.130 },

  // ── COGNITIVE (antracite chiaro — strato interno) ──
  { id:  8, psycheId: "attention_filter",    label: "Attention",    category: "cognitive", x: -0.08, y: -0.05, z:  0.20, type: "dark", size: 0.062, radialDist: 0.18, baseActivation: 0.325 },
  { id:  9, psycheId: "confirmation_engine", label: "Confirmation", category: "cognitive", x:  0.22, y: -0.08, z:  0.15, type: "dark", size: 0.055, radialDist: 0.28, baseActivation: 0.260 },
  { id: 10, psycheId: "risk_calculator",     label: "Risk",         category: "cognitive", x: -0.28, y: -0.12, z:  0.18, type: "dark", size: 0.055, radialDist: 0.35, baseActivation: 0.195 },
  { id: 11, psycheId: "aspiration_engine",   label: "Aspiration",   category: "cognitive", x:  0.05, y: -0.18, z:  0.22, type: "dark", size: 0.062, radialDist: 0.25, baseActivation: 0.195 },
  { id: 12, psycheId: "critical_thinking",   label: "System 2",     category: "cognitive", x: -0.18, y: -0.28, z:  0.15, type: "dark", size: 0.055, radialDist: 0.35, baseActivation: 0.260 },
  { id: 13, psycheId: "inner_voice",         label: "Inner Voice",  category: "cognitive", x:  0.28, y: -0.22, z:  0.10, type: "dark", size: 0.062, radialDist: 0.42, baseActivation: 0.325 },
  { id: 14, psycheId: "episodic_memory",     label: "Memory",       category: "cognitive", x: -0.38, y: -0.05, z:  0.12, type: "dark", size: 0.048, radialDist: 0.45, baseActivation: 0.100 },

  // ── SOCIAL (antracite — bordo superiore) ──
  { id: 15, psycheId: "social_standing",  label: "Social Standing", category: "social",    x: -0.48, y:  0.52, z:  0.08, type: "dark", size: 0.062, radialDist: 0.72, baseActivation: 0.325 },
  { id: 16, psycheId: "belonging_need",   label: "Belonging",       category: "social",    x:  0.38, y:  0.48, z:  0.05, type: "dark", size: 0.055, radialDist: 0.68, baseActivation: 0.260 },
  { id: 17, psycheId: "distinction_need", label: "Distinction",     category: "social",    x: -0.58, y:  0.32, z:  0.05, type: "dark", size: 0.048, radialDist: 0.78, baseActivation: 0.195 },
  { id: 18, psycheId: "reference_mirror", label: "Ref. Mirror",     category: "social",    x:  0.48, y:  0.28, z:  0.00, type: "dark", size: 0.055, radialDist: 0.72, baseActivation: 0.260 },

  // ── BIAS (rosso scuro — bordo esterno, alta volatilità) ──
  { id: 19, psycheId: "loss_aversion",    label: "Loss Aversion",   category: "bias",      x:  0.62, y:  0.08, z: -0.05, type: "red",  size: 0.048, radialDist: 0.88, baseActivation: 0.050 },
  { id: 20, psycheId: "bandwagon_bias",   label: "Bandwagon",       category: "bias",      x:  0.72, y: -0.08, z:  0.00, type: "red",  size: 0.048, radialDist: 0.92, baseActivation: 0.050 },
  { id: 21, psycheId: "authority_bias",   label: "Authority",       category: "bias",      x:  0.68, y: -0.28, z:  0.05, type: "red",  size: 0.048, radialDist: 0.88, baseActivation: 0.050 },
  { id: 22, psycheId: "scarcity_bias",    label: "Scarcity",        category: "bias",      x:  0.55, y: -0.45, z:  0.08, type: "red",  size: 0.048, radialDist: 0.82, baseActivation: 0.050 },
  { id: 23, psycheId: "identity_defense", label: "ID Defense",      category: "bias",      x: -0.62, y: -0.08, z: -0.05, type: "red",  size: 0.055, radialDist: 0.88, baseActivation: 0.050 },
  { id: 24, psycheId: "halo_effect",      label: "Halo Effect",     category: "bias",      x: -0.72, y:  0.12, z:  0.00, type: "red",  size: 0.048, radialDist: 0.92, baseActivation: 0.050 },

  // ── CULTURAL (antracite scuro — bordo sinistro) ──
  { id: 25, psycheId: "cultural_lens",       label: "Cultural Lens",  category: "cultural",  x: -0.68, y:  0.38, z:  0.05, type: "dark", size: 0.062, radialDist: 0.85, baseActivation: 0.390 },
  { id: 26, psycheId: "class_consciousness",  label: "Class",          category: "cultural",  x: -0.75, y:  0.18, z: -0.05, type: "dark", size: 0.055, radialDist: 0.92, baseActivation: 0.260 },
  { id: 27, psycheId: "generational_memory",  label: "Generation",     category: "cultural",  x: -0.55, y: -0.35, z:  0.08, type: "dark", size: 0.048, radialDist: 0.80, baseActivation: 0.195 },
  { id: 28, psycheId: "moral_foundations",    label: "Morality",       category: "cultural",  x: -0.42, y: -0.52, z:  0.05, type: "dark", size: 0.048, radialDist: 0.75, baseActivation: 0.130 },
  { id: 29, psycheId: "cultural_decode",      label: "Cultural Decode",category: "cultural",  x: -0.28, y: -0.62, z:  0.00, type: "dark", size: 0.055, radialDist: 0.82, baseActivation: 0.325 },

  // ── EXPRESSIVE (rosso tenue — apice e punta) ──
  { id: 30, psycheId: "humor_processor",   label: "Humor",           category: "expressive", x:  0.20, y: -0.55, z:  0.10, type: "dark", size: 0.055, radialDist: 0.78, baseActivation: 0.195 },
  { id: 31, psycheId: "money_relationship", label: "Money",           category: "expressive", x:  0.05, y: -0.72, z:  0.05, type: "dark", size: 0.048, radialDist: 0.88, baseActivation: 0.130 },
  { id: 32, psycheId: "time_orientation",   label: "Time",            category: "expressive", x: -0.10, y: -0.88, z:  0.00, type: "dark", size: 0.048, radialDist: 0.95, baseActivation: 0.195 },
];

// ─────────────────────────────────────────────────────────────────────────────
// ARCHI — molti più edge per densità visiva
// ─────────────────────────────────────────────────────────────────────────────
type EdgeType = "strong" | "light" | "cross";
const EDGES: Array<[number, number, EdgeType]> = [
  // ── CORE ↔ CORE (backbone identitario) ──
  [0, 1, "strong"], [0, 2, "strong"], [0, 3, "strong"],
  [1, 2, "light"],  [1, 3, "light"],  [2, 3, "strong"],

  // ── CORE ↔ EMOTIONAL (regolazione emotiva) ──
  [0, 4, "strong"], [0, 6, "strong"], [0, 7, "strong"],
  [2, 4, "light"],  [2, 5, "strong"], [3, 6, "strong"],
  [3, 7, "light"],  [1, 5, "light"],

  // ── EMOTIONAL ↔ COGNITIVE (elaborazione) ──
  [4, 8, "strong"], [4, 10, "light"], [4, 14, "light"],
  [5, 9, "strong"], [5, 12, "light"],
  [6, 8, "strong"], [6, 11, "light"], [6, 13, "light"],
  [7, 8, "strong"], [7, 9, "light"],  [7, 11, "light"],

  // ── COGNITIVE ↔ COGNITIVE (rete interna) ──
  [8, 9, "strong"],  [8, 10, "strong"], [8, 11, "strong"],
  [9, 12, "light"],  [9, 13, "strong"], [10, 12, "strong"],
  [11, 12, "light"], [11, 13, "light"], [12, 13, "strong"],
  [13, 14, "light"], [10, 14, "light"],

  // ── CORE ↔ SOCIAL (identità sociale) ──
  [0, 15, "strong"], [0, 16, "strong"],
  [1, 17, "light"],  [3, 16, "strong"], [3, 18, "light"],

  // ── SOCIAL ↔ COGNITIVE (confronto sociale) ──
  [15, 9, "light"],  [15, 12, "light"], [16, 11, "light"],
  [17, 10, "light"], [18, 13, "light"],

  // ── BIAS ↔ EMOTIONAL (trigger automatici) ──
  [19, 5, "strong"], [19, 7, "strong"],
  [20, 4, "light"],  [20, 6, "light"],
  [21, 5, "light"],  [22, 7, "strong"],
  [23, 2, "strong"], [24, 4, "light"],

  // ── BIAS ↔ COGNITIVE (distorsioni cognitive) ──
  [19, 10, "strong"], [20, 9, "light"],
  [21, 12, "light"],  [22, 8, "strong"],
  [23, 12, "strong"], [24, 9, "light"],

  // ── CULTURAL ↔ CORE (condizionamento culturale) ──
  [25, 0, "strong"], [25, 2, "strong"],
  [26, 0, "light"],  [29, 3, "light"],

  // ── CULTURAL ↔ SOCIAL (identità collettiva) ──
  [25, 15, "strong"], [26, 17, "strong"],
  [27, 15, "light"],  [28, 16, "light"], [29, 18, "light"],

  // ── CULTURAL ↔ COGNITIVE (decodifica simbolica) ──
  [25, 8, "light"],  [27, 14, "light"],
  [28, 12, "light"], [29, 9, "light"],

  // ── EXPRESSIVE ↔ EMOTIONAL (espressione) ──
  [30, 4, "light"],  [30, 7, "light"],
  [31, 5, "strong"], [31, 10, "light"],
  [32, 6, "light"],  [32, 14, "light"],

  // ── EXPRESSIVE ↔ CORE (espressione identitaria) ──
  [30, 1, "light"], [31, 3, "light"], [32, 0, "light"],

  // ── Cross-link lunghi (propagazione lunga distanza) ──
  [0, 19, "cross"],  [0, 23, "cross"],
  [3, 22, "cross"],  [6, 20, "cross"],
  [8, 19, "cross"],  [12, 23, "cross"],
  [15, 25, "cross"], [16, 29, "cross"],
  [25, 19, "cross"], [26, 24, "cross"],
  [27, 22, "cross"], [28, 21, "cross"],
  [30, 20, "cross"], [31, 22, "cross"],
  [32, 29, "cross"],
];

// ─────────────────────────────────────────────────────────────────────────────
// Colori
// ─────────────────────────────────────────────────────────────────────────────
const COL_RED       = new THREE.Color("#C1622F");
const COL_DARK      = new THREE.Color("#1C1C1C");
const COL_GLOW_RED  = new THREE.Color("#E8541A");
const COL_GLOW_DARK = new THREE.Color("#3a3a3a");

// ─────────────────────────────────────────────────────────────────────────────
// Shader per punto luminoso flat (glow additivo)
// ─────────────────────────────────────────────────────────────────────────────
const VERT_GLOW = /* glsl */`
  attribute float aSize;
  attribute float aIntensity;
  varying float vIntensity;
  void main() {
    vIntensity = aIntensity;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (480.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const FRAG_GLOW = /* glsl */`
  uniform vec3 uColor;
  uniform vec3 uGlowColor;
  varying float vIntensity;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    // Core solido (punto duro al centro)
    float core = smoothstep(0.12, 0.0, d);
    // Alone interno
    float inner = smoothstep(0.28, 0.0, d) * 0.75;
    // Glow esterno sfumato
    float outer = smoothstep(0.5, 0.08, d) * 0.35;
    float totalAlpha = (core + inner + outer) * (0.5 + vIntensity * 0.5);
    // Su sfondo chiaro: colore scuro con alone
    vec3 col = mix(uColor, uGlowColor, vIntensity * 0.5);
    gl_FragColor = vec4(col, totalAlpha);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Shader per edge con propagazione energia (glow direzionale)
// ─────────────────────────────────────────────────────────────────────────────
const VERT_EDGE = /* glsl */`
  attribute float aProgress;   // 0 = nodo A, 1 = nodo B
  attribute float aEnergy;     // 0–1: quanto energia sta passando
  varying float vProgress;
  varying float vEnergy;
  void main() {
    vProgress = aProgress;
    vEnergy = aEnergy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG_EDGE = /* glsl */`
  uniform vec3 uBaseColor;
  uniform vec3 uGlowColor;
  uniform float uPulseHead;  // posizione testa impulso 0–1
  varying float vProgress;
  varying float vEnergy;
  void main() {
    // Opacità base dell'arco
    float baseAlpha = 0.30;
    // Impulso: alone gaussiano attorno alla testa
    float dist = abs(vProgress - uPulseHead);
    float pulse = exp(-dist * dist * 50.0) * vEnergy;
    // Scia dietro la testa
    float trail = 0.0;
    if (vProgress < uPulseHead) {
      float trailDist = uPulseHead - vProgress;
      trail = exp(-trailDist * trailDist * 12.0) * vEnergy * 0.5;
    }
    float alpha = baseAlpha + (pulse + trail) * 0.9;
    vec3 col = mix(uBaseColor, uGlowColor, pulse + trail * 0.5);
    gl_FragColor = vec4(col, alpha);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Stato runtime per ogni nodo
// ─────────────────────────────────────────────────────────────────────────────
interface NodeState {
  intensity: number;       // 0–1 luminosità corrente
  targetIntensity: number; // 0–1 obiettivo
  phase: number;           // fase personale [0, 2π]
  pulseTimer: number;      // timer per pulsazione individuale
}

// Stato runtime per ogni edge
interface EdgeState {
  pulseHead: number;   // 0–1 posizione testa impulso
  energy: number;      // 0–1 energia corrente
  active: boolean;     // sta propagando?
  direction: number;   // +1 A→B, -1 B→A
  cooldown: number;    // secondi prima del prossimo impulso
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente scena
// ─────────────────────────────────────────────────────────────────────────────
function HeartGraphScene() {
  const clockRef = useRef(0);

  // Stato nodi
  const nodeStates = useRef<NodeState[]>(
    NODES.map((n) => ({
      intensity: 0.3 + Math.random() * 0.4,
      targetIntensity: 0.3 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      pulseTimer: Math.random() * 3,
    }))
  );

  // Stato edge
  const edgeStates = useRef<EdgeState[]>(
    EDGES.map(() => ({
      pulseHead: 0,
      energy: 0,
      active: false,
      direction: 1,
      cooldown: 0.5 + Math.random() * 4,
    }))
  );

  // ── Geometria nodi (Points con shader) ──
  const { nodeGeo, nodeMatRed, nodeMatDark } = useMemo(() => {
    const redNodes  = NODES.filter((n) => n.type === "red");
    const darkNodes = NODES.filter((n) => n.type === "dark");

    function buildPointsGeo(nodes: NodeDef[]) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(nodes.length * 3);
      const sizes = new Float32Array(nodes.length);
      const intensities = new Float32Array(nodes.length);
      nodes.forEach((n, i) => {
        pos[i * 3]     = n.x;
        pos[i * 3 + 1] = n.y;
        pos[i * 3 + 2] = n.z;
        sizes[i]       = n.size;
        intensities[i] = 0.5;
      });
      geo.setAttribute("position",   new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("aSize",      new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute("aIntensity", new THREE.BufferAttribute(intensities, 1));
      return geo;
    }

    const geoRed  = buildPointsGeo(redNodes);
    const geoDark = buildPointsGeo(darkNodes);

    const matRed = new THREE.ShaderMaterial({
      vertexShader: VERT_GLOW,
      fragmentShader: FRAG_GLOW,
      uniforms: {
        uColor:     { value: COL_RED },
        uGlowColor: { value: COL_GLOW_RED },
      },
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      alphaTest: 0.01,
    });

    const matDark = new THREE.ShaderMaterial({
      vertexShader: VERT_GLOW,
      fragmentShader: FRAG_GLOW,
      uniforms: {
        uColor:     { value: COL_DARK },
        uGlowColor: { value: COL_GLOW_DARK },
      },
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      alphaTest: 0.01,
    });

    return {
      nodeGeo: { red: geoRed, dark: geoDark },
      nodeMatRed: matRed,
      nodeMatDark: matDark,
      redNodes,
      darkNodes,
    };
  }, []);

  // Mappa nodeId → indice nei rispettivi array red/dark
  const redNodeIds  = useMemo(() => NODES.filter((n) => n.type === "red").map((n) => n.id), []);
  const darkNodeIds = useMemo(() => NODES.filter((n) => n.type === "dark").map((n) => n.id), []);

  // ── Geometria edge (LineSegments con shader) ──
  const edgeObjects = useMemo(() => {
    return EDGES.map(([a, b, type], idx) => {
      const nA = NODES[a];
      const nB = NODES[b];
      // Suddividi ogni edge in N segmenti per animare la testa dell'impulso
      const N = 20;
      const positions = new Float32Array(N * 2 * 3);
      const progress  = new Float32Array(N * 2);
      const energies  = new Float32Array(N * 2);

      for (let i = 0; i < N; i++) {
        const t0 = i / N;
        const t1 = (i + 1) / N;
        // Punto A del segmento
        positions[(i * 2)     * 3 + 0] = nA.x + (nB.x - nA.x) * t0;
        positions[(i * 2)     * 3 + 1] = nA.y + (nB.y - nA.y) * t0;
        positions[(i * 2)     * 3 + 2] = nA.z + (nB.z - nA.z) * t0;
        // Punto B del segmento
        positions[(i * 2 + 1) * 3 + 0] = nA.x + (nB.x - nA.x) * t1;
        positions[(i * 2 + 1) * 3 + 1] = nA.y + (nB.y - nA.y) * t1;
        positions[(i * 2 + 1) * 3 + 2] = nA.z + (nB.z - nA.z) * t1;
        progress[i * 2]     = t0;
        progress[i * 2 + 1] = t1;
        energies[i * 2]     = 0;
        energies[i * 2 + 1] = 0;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position",  new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("aProgress", new THREE.BufferAttribute(progress, 1));
      geo.setAttribute("aEnergy",   new THREE.BufferAttribute(energies, 1));

      const baseColor = type === "strong"
        ? new THREE.Color("#8B5A3A")
        : type === "cross"
          ? new THREE.Color("#C1622F")
          : new THREE.Color("#7A4A2A");

      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT_EDGE,
        fragmentShader: FRAG_EDGE,
        uniforms: {
          uBaseColor:  { value: baseColor },
          uGlowColor:  { value: COL_GLOW_RED },
          uPulseHead:  { value: -1.0 },
        },
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
      });

      const lines = new THREE.LineSegments(geo, mat);
      return { lines, geo, mat, nodeA: a, nodeB: b };
    });
  }, []);

  // ── Posizioni originali dei nodi (per battito radiale) ──
  const origPositions = useMemo(() =>
    NODES.map((n) => new THREE.Vector3(n.x, n.y, n.z)), []);

  // ── Refs per i Points objects ──
  const pointsRedRef  = useRef<THREE.Points>(null!);
  const pointsDarkRef = useRef<THREE.Points>(null!);

  // ── Loop animazione ──
  useFrame((_, delta) => {
    clockRef.current += delta;
    const t = clockRef.current;

    const ns = nodeStates.current;
    const es = edgeStates.current;

    // ── 1. Battito cardiaco radiale ──
    // Forma lub-dub: due picchi ravvicinati ogni ~0.88s (68 BPM)
    const bpm = 68;
    const cycle = (t * bpm / 60) % 1; // [0,1] per ciclo
    let heartbeat = 0;
    if (cycle < 0.06) {
      heartbeat = Math.sin((cycle / 0.06) * Math.PI) * 0.18;
    } else if (cycle < 0.14) {
      heartbeat = -Math.sin(((cycle - 0.06) / 0.08) * Math.PI) * 0.06;
    } else if (cycle < 0.22) {
      heartbeat = Math.sin(((cycle - 0.14) / 0.08) * Math.PI) * 0.10;
    }
    // Applica espansione radiale: i nodi periferici si spostano verso l'esterno
    // proporzionalmente alla loro distanza dal centro
    NODES.forEach((n, i) => {
      const orig = origPositions[i];
      const radial = n.radialDist;
      // Vettore dal centro al nodo (normalizzato)
      const len = orig.length();
      if (len < 0.001) return;
      const dir = orig.clone().divideScalar(len);
      // Spostamento radiale: più esterno = più si muove
      const displacement = heartbeat * radial * 0.22;
      // Aggiorna posizione nel buffer geometry
      // (gestiamo tramite i Points objects)
    });

    // ── 2. Aggiornamento intensità nodi ──
    ns.forEach((state, i) => {
      state.pulseTimer -= delta;
      if (state.pulseTimer <= 0) {
        // Nuova pulsazione casuale
        state.targetIntensity = 0.25 + Math.random() * 0.75;
        state.pulseTimer = 0.8 + Math.random() * 2.5;
      }
      // Lerp verso target
      state.intensity += (state.targetIntensity - state.intensity) * delta * 2.5;
    });

    // Aggiorna attributo aIntensity per nodi rossi
    const redIntArr = nodeGeo.red.attributes.aIntensity as THREE.BufferAttribute;
    redNodeIds.forEach((nodeId, idx) => {
      const state = ns[nodeId];
      // Battito: i nodi periferici pulsano di più
      const radialPulse = NODES[nodeId].radialDist * heartbeat * 2.5;
      redIntArr.array[idx] = Math.min(1.0, state.intensity + radialPulse);
    });
    redIntArr.needsUpdate = true;

    // Aggiorna attributo aIntensity per nodi scuri
    const darkIntArr = nodeGeo.dark.attributes.aIntensity as THREE.BufferAttribute;
    darkNodeIds.forEach((nodeId, idx) => {
      const state = ns[nodeId];
      const radialPulse = NODES[nodeId].radialDist * heartbeat * 2.0;
      darkIntArr.array[idx] = Math.min(1.0, state.intensity + radialPulse);
    });
    darkIntArr.needsUpdate = true;

    // ── 3. Battito radiale: sposta posizioni nodi ──
    const redPosArr  = nodeGeo.red.attributes.position as THREE.BufferAttribute;
    const darkPosArr = nodeGeo.dark.attributes.position as THREE.BufferAttribute;

    redNodeIds.forEach((nodeId, idx) => {
      const orig = origPositions[nodeId];
      const len = orig.length();
      if (len < 0.001) return;
      const radial = NODES[nodeId].radialDist;
      const disp = heartbeat * radial * 0.18;
      redPosArr.array[idx * 3]     = orig.x + (orig.x / len) * disp;
      redPosArr.array[idx * 3 + 1] = orig.y + (orig.y / len) * disp;
      redPosArr.array[idx * 3 + 2] = orig.z + (orig.z / len) * disp;
    });
    redPosArr.needsUpdate = true;

    darkNodeIds.forEach((nodeId, idx) => {
      const orig = origPositions[nodeId];
      const len = orig.length();
      if (len < 0.001) return;
      const radial = NODES[nodeId].radialDist;
      const disp = heartbeat * radial * 0.18;
      darkPosArr.array[idx * 3]     = orig.x + (orig.x / len) * disp;
      darkPosArr.array[idx * 3 + 1] = orig.y + (orig.y / len) * disp;
      darkPosArr.array[idx * 3 + 2] = orig.z + (orig.z / len) * disp;
    });
    darkPosArr.needsUpdate = true;

    // ── 4. Propagazione energia lungo gli edge ──
    es.forEach((estate, i) => {
      const { nodeA, nodeB } = edgeObjects[i];
      const mat = edgeObjects[i].mat;

      if (!estate.active) {
        estate.cooldown -= delta;
        if (estate.cooldown <= 0) {
          // Attiva impulso: parte dal nodo più luminoso
          const intA = ns[nodeA].intensity;
          const intB = ns[nodeB].intensity;
          estate.active    = true;
          estate.direction = intA >= intB ? 1 : -1;
          estate.pulseHead = estate.direction > 0 ? 0 : 1;
          estate.energy    = 0.5 + Math.random() * 0.5;
          estate.cooldown  = 0;
        }
      } else {
        // Avanza la testa dell'impulso
        const speed = 1.2 + Math.random() * 0.5;
        estate.pulseHead += estate.direction * delta * speed;

        // Aggiorna uniform
        mat.uniforms.uPulseHead.value = estate.pulseHead;
        mat.uniforms.uGlowColor.value = EDGES[i][2] === "cross"
          ? COL_GLOW_DARK
          : COL_GLOW_RED;

        // Aggiorna energy attribute (tutti i vertici dell'edge)
        const energyAttr = edgeObjects[i].geo.attributes.aEnergy as THREE.BufferAttribute;
        for (let v = 0; v < energyAttr.count; v++) {
          energyAttr.array[v] = estate.energy;
        }
        energyAttr.needsUpdate = true;

        // Fine impulso
        if (estate.pulseHead > 1.2 || estate.pulseHead < -0.2) {
          estate.active    = false;
          estate.energy    = 0;
          estate.pulseHead = 0;
          estate.cooldown  = 0.3 + Math.random() * 3.5;
          mat.uniforms.uPulseHead.value = -2.0; // fuori range = invisibile

          // Accendi il nodo destinazione
          const destNode = estate.direction > 0 ? nodeB : nodeA;
          ns[destNode].targetIntensity = 0.7 + Math.random() * 0.3;
          ns[destNode].pulseTimer = 0.5 + Math.random() * 1.5;
        }
      }
    });
  });

  return (
    <group>
      {/* Luci ambientali */}
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 3]} intensity={0.3} color="#ff6030" />

      {/* Edge */}
      {edgeObjects.map((obj, i) => (
        <primitive key={`edge-${i}`} object={obj.lines} />
      ))}

      {/* Nodi rossi */}
      <points ref={pointsRedRef} geometry={nodeGeo.red} material={nodeMatRed} />

      {/* Nodi scuri */}
      <points ref={pointsDarkRef} geometry={nodeGeo.dark} material={nodeMatDark} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente pubblico
// ─────────────────────────────────────────────────────────────────────────────
interface HeartGraph3DProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export default function HeartGraph3D({
  className = "",
  width = "100%",
  height = "100%",
}: HeartGraph3DProps) {
  return (
    <div
      className={className}
      style={{ width, height, cursor: "grab" }}
      aria-label="Grafo psicologico animato a forma di cuore"
    >
      <Canvas
        camera={{ position: [0, 0, 2.6], fov: 48 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, 2]}
      >
        <HeartGraphScene />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.8}
          rotateSpeed={0.6}
          dampingFactor={0.07}
          enableDamping
        />
      </Canvas>
    </div>
  );
}
