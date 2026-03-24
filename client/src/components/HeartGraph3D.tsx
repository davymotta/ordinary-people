import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// NODI del cuore antropomorfo — coordinate normalizzate [-1, 1]
// Estratte fedelmente dall'immagine di riferimento.
// x: asse orizzontale (destra = +), y: asse verticale (su = +), z: profondità
// type: "orange" = nodo arancio grande, "dark" = nodo scuro grande, "small" = nodo piccolo
// ─────────────────────────────────────────────────────────────────────────────
const NODES: Array<{ id: number; x: number; y: number; z: number; type: "orange" | "dark" | "small" }> = [
  // Aorta / sommità sinistra
  { id: 0,  x: -0.25, y:  0.95, z:  0.05, type: "dark" },
  { id: 1,  x: -0.40, y:  0.80, z:  0.10, type: "orange" },
  { id: 2,  x: -0.30, y:  0.70, z: -0.05, type: "small" },
  { id: 3,  x: -0.15, y:  0.85, z:  0.08, type: "small" },
  // Aorta / sommità destra
  { id: 4,  x:  0.10, y:  0.98, z:  0.00, type: "orange" },
  { id: 5,  x:  0.25, y:  0.90, z:  0.05, type: "small" },
  { id: 6,  x:  0.15, y:  0.78, z: -0.05, type: "dark" },
  { id: 7,  x:  0.30, y:  0.75, z:  0.10, type: "small" },
  // Spalla destra (bulge atriale)
  { id: 8,  x:  0.55, y:  0.60, z:  0.08, type: "small" },
  { id: 9,  x:  0.65, y:  0.45, z:  0.05, type: "dark" },
  { id: 10, x:  0.70, y:  0.30, z:  0.00, type: "orange" },
  { id: 11, x:  0.60, y:  0.15, z:  0.05, type: "small" },
  // Fianco destro
  { id: 12, x:  0.75, y:  0.00, z: -0.05, type: "dark" },
  { id: 13, x:  0.65, y: -0.20, z:  0.05, type: "small" },
  { id: 14, x:  0.55, y: -0.40, z:  0.10, type: "orange" },
  // Apice (punta inferiore)
  { id: 15, x:  0.20, y: -0.80, z:  0.00, type: "dark" },
  { id: 16, x:  0.00, y: -0.95, z:  0.05, type: "small" },
  { id: 17, x: -0.20, y: -0.80, z: -0.05, type: "dark" },
  // Fianco sinistro
  { id: 18, x: -0.55, y: -0.40, z:  0.10, type: "orange" },
  { id: 19, x: -0.65, y: -0.20, z:  0.05, type: "small" },
  { id: 20, x: -0.75, y:  0.00, z: -0.05, type: "dark" },
  { id: 21, x: -0.65, y:  0.20, z:  0.05, type: "orange" },
  // Spalla sinistra
  { id: 22, x: -0.60, y:  0.40, z:  0.08, type: "small" },
  { id: 23, x: -0.50, y:  0.55, z:  0.05, type: "dark" },
  // Nodi interni centrali
  { id: 24, x: -0.05, y:  0.60, z:  0.15, type: "dark" },
  { id: 25, x:  0.20, y:  0.50, z:  0.10, type: "orange" },
  { id: 26, x: -0.20, y:  0.35, z:  0.12, type: "small" },
  { id: 27, x:  0.10, y:  0.20, z:  0.20, type: "dark" },
  { id: 28, x: -0.30, y:  0.10, z:  0.15, type: "orange" },
  { id: 29, x:  0.35, y:  0.00, z:  0.10, type: "small" },
  { id: 30, x: -0.10, y: -0.15, z:  0.18, type: "dark" },
  { id: 31, x:  0.25, y: -0.30, z:  0.12, type: "orange" },
  { id: 32, x: -0.25, y: -0.50, z:  0.08, type: "small" },
  { id: 33, x:  0.40, y:  0.35, z: -0.10, type: "small" },
  { id: 34, x: -0.40, y: -0.10, z: -0.12, type: "orange" },
];

// ─────────────────────────────────────────────────────────────────────────────
// ARCHI — connessioni tra nodi (ispirate alla rete dell'immagine)
// ─────────────────────────────────────────────────────────────────────────────
const EDGES: Array<[number, number, "strong" | "light"]> = [
  // Contorno esterno
  [0, 1, "strong"], [1, 2, "strong"], [2, 3, "strong"], [3, 0, "strong"],
  [3, 4, "strong"], [4, 5, "strong"], [5, 6, "strong"], [6, 7, "strong"],
  [7, 8, "strong"], [8, 9, "strong"], [9, 10, "strong"], [10, 11, "strong"],
  [11, 12, "strong"], [12, 13, "strong"], [13, 14, "strong"],
  [14, 15, "strong"], [15, 16, "strong"], [16, 17, "strong"],
  [17, 18, "strong"], [18, 19, "strong"], [19, 20, "strong"],
  [20, 21, "strong"], [21, 22, "strong"], [22, 23, "strong"],
  [23, 1, "strong"],
  // Connessioni interne forti (neri nell'immagine)
  [24, 25, "strong"], [25, 27, "strong"], [27, 30, "strong"],
  [30, 32, "strong"], [32, 17, "strong"], [31, 15, "strong"],
  [28, 21, "strong"], [26, 23, "strong"], [24, 6, "strong"],
  [25, 10, "strong"], [27, 29, "strong"], [29, 14, "strong"],
  [28, 20, "strong"], [30, 18, "strong"],
  // Connessioni leggere (arancio/bronzo nell'immagine)
  [0, 24, "light"], [3, 24, "light"], [4, 25, "light"], [6, 25, "light"],
  [7, 33, "light"], [8, 33, "light"], [9, 33, "light"], [10, 33, "light"],
  [11, 29, "light"], [12, 29, "light"], [13, 31, "light"], [14, 31, "light"],
  [15, 32, "light"], [16, 32, "light"], [17, 30, "light"], [18, 34, "light"],
  [19, 34, "light"], [20, 34, "light"], [21, 28, "light"], [22, 28, "light"],
  [23, 26, "light"], [1, 26, "light"], [2, 26, "light"],
  [24, 26, "light"], [25, 33, "light"], [26, 28, "light"],
  [27, 31, "light"], [28, 30, "light"], [29, 31, "light"],
  [30, 34, "light"], [31, 32, "light"], [33, 29, "light"],
  [34, 32, "light"], [24, 27, "light"], [25, 26, "light"],
  [27, 28, "light"], [26, 30, "light"], [33, 27, "light"],
];

// ─────────────────────────────────────────────────────────────────────────────
// Colori del design system
// ─────────────────────────────────────────────────────────────────────────────
const COLOR_ORANGE = new THREE.Color("#C1622F");
const COLOR_DARK   = new THREE.Color("#2C2C2C");
const COLOR_SMALL  = new THREE.Color("#7A5C4A");
const COLOR_EDGE_STRONG = new THREE.Color("#2C2C2C");
const COLOR_EDGE_LIGHT  = new THREE.Color("#C1622F");

// ─────────────────────────────────────────────────────────────────────────────
// Componente interno: il grafo animato
// ─────────────────────────────────────────────────────────────────────────────
function HeartGraphScene() {
  const groupRef = useRef<THREE.Group>(null!);
  const timeRef  = useRef(0);

  // Geometrie e materiali nodi
  const nodeMeshes = useMemo(() => {
    return NODES.map((n) => {
      const size = n.type === "orange" ? 0.055 : n.type === "dark" ? 0.048 : 0.028;
      const color = n.type === "orange" ? COLOR_ORANGE : n.type === "dark" ? COLOR_DARK : COLOR_SMALL;
      const geo = new THREE.SphereGeometry(size, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.1,
        emissive: color,
        emissiveIntensity: 0.08,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(n.x, n.y, n.z);
      mesh.userData = { baseX: n.x, baseY: n.y, baseZ: n.z, type: n.type, nodeId: n.id };
      return mesh;
    });
  }, []);

  // Linee degli archi
  const edgeLines = useMemo(() => {
    return EDGES.map(([a, b, strength]) => {
      const nA = NODES[a];
      const nB = NODES[b];
      const points = [
        new THREE.Vector3(nA.x, nA.y, nA.z),
        new THREE.Vector3(nB.x, nB.y, nB.z),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const color = strength === "strong" ? COLOR_EDGE_STRONG : COLOR_EDGE_LIGHT;
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: strength === "strong" ? 0.55 : 0.22,
      });
      const line = new THREE.Line(geo, mat);
      line.userData = { nodeA: a, nodeB: b, strength };
      return line;
    });
  }, []);

  // Aggiornamento frame: battito + pulsazione nodi
  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    // ── Battito cardiaco: scala globale con forma a doppio picco ──
    // Simula il classico "lub-dub" del battito
    const bpm = 68; // battiti al minuto
    const phase = (t * bpm / 60) % 1; // [0, 1] per ogni ciclo
    let heartbeat = 0;
    if (phase < 0.08) {
      // Primo picco (lub): rapida espansione
      heartbeat = Math.sin((phase / 0.08) * Math.PI) * 0.12;
    } else if (phase < 0.18) {
      // Breve contrazione
      heartbeat = -Math.sin(((phase - 0.08) / 0.10) * Math.PI) * 0.04;
    } else if (phase < 0.28) {
      // Secondo picco (dub): espansione più morbida
      heartbeat = Math.sin(((phase - 0.18) / 0.10) * Math.PI) * 0.07;
    } else {
      // Diastole: ritorno lento a riposo
      heartbeat = 0;
    }

    const globalScale = 1.0 + heartbeat;
    if (groupRef.current) {
      groupRef.current.scale.setScalar(globalScale);
    }

    // ── Pulsazione individuale dei nodi colorati ──
    nodeMeshes.forEach((mesh) => {
      const { type, nodeId } = mesh.userData;
      if (type === "orange" || type === "dark") {
        // Ogni nodo ha una fase leggermente diversa (effetto "propagazione")
        const offset = (nodeId * 0.37) % 1;
        const pulsePhase = (phase + offset) % 1;
        let pulse = 0;
        if (pulsePhase < 0.12) {
          pulse = Math.sin((pulsePhase / 0.12) * Math.PI) * (type === "orange" ? 0.35 : 0.20);
        }
        const baseScale = 1.0 + pulse;
        mesh.scale.setScalar(baseScale);

        // Intensità emissiva pulsante
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.08 + pulse * 0.6;
      }
    });

    // ── Aggiornamento posizioni archi in sync con scala nodi ──
    // (le linee seguono i nodi automaticamente perché sono nel gruppo)
  });

  // Costruzione scena
  const { scene } = useThree();
  useMemo(() => {
    // Pulizia sicura: rimuovi solo oggetti del grafo, non luci/camera
    // (gestito dal gruppo ref)
  }, []);

  return (
    <group ref={groupRef}>
      {/* Luci */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 2]} intensity={0.8} color="#fff8f0" />
      <pointLight position={[-2, 1, 1]} intensity={0.4} color="#C1622F" />

      {/* Archi */}
      {edgeLines.map((line, i) => (
        <primitive key={`edge-${i}`} object={line} />
      ))}

      {/* Nodi */}
      {nodeMeshes.map((mesh, i) => (
        <primitive key={`node-${i}`} object={mesh} />
      ))}
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
        camera={{ position: [0, 0, 2.8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, 2]}
      >
        <HeartGraphScene />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.6}
          minPolarAngle={Math.PI * 0.25}
          maxPolarAngle={Math.PI * 0.75}
          rotateSpeed={0.7}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>
    </div>
  );
}
