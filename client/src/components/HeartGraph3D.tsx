/**
 * HeartGraph3D — Cuore anatomico realistico come grafo luminoso 3D
 *
 * 137 nodi distribuiti su silhouette anatomica (ventricoli, atri, aorta,
 * arteria polmonare, vene cave, setto interventricolare).
 * 413 archi con propagazione di energia direzionale.
 *
 * Battito: onda di espansione radiale con delay progressivo centro→esterno.
 * I nodi centrali si espandono per primi, quelli periferici con ritardo
 * proporzionale alla distanza, simulando un'onda di pressione reale.
 */

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// TIPI
// ─────────────────────────────────────────────────────────────────────────────
interface NodeDef {
  id: number;
  x: number; y: number; z: number;
  type: "red" | "dark";
  size: number;
  radialDist: number;
}
type EdgeType = "strong" | "light" | "cross";

// ─────────────────────────────────────────────────────────────────────────────
// DATI — generati proceduralmente da gen_heart_nodes.py
// 137 nodi, 413 archi — cuore anatomico realistico
// ─────────────────────────────────────────────────────────────────────────────
const NODES: NodeDef[] = [
  { id:  0, x: 0.2182, y: 0.1482, z: 0.0108, type:"red",  size:0.045, radialDist:0.240 },
  { id:  1, x: 0.1688, y: 0.0760, z: 0.1058, type:"dark", size:0.032, radialDist:0.194 },
  { id:  2, x: 0.0840, y: 0.0355, z: 0.1465, type:"dark", size:0.032, radialDist:0.157 },
  { id:  3, x:-0.0310, y:-0.0372, z: 0.2039, type:"red",  size:0.045, radialDist:0.191 },
  { id:  4, x:-0.1293, y:-0.0824, z: 0.1911, type:"dark", size:0.032, radialDist:0.223 },
  { id:  5, x:-0.2289, y:-0.1472, z: 0.1563, type:"dark", size:0.032, radialDist:0.285 },
  { id:  6, x:-0.2730, y:-0.1993, z: 0.1384, type:"red",  size:0.045, radialDist:0.332 },
  { id:  7, x:-0.3236, y:-0.2410, z: 0.0975, type:"dark", size:0.032, radialDist:0.377 },
  { id:  8, x:-0.3249, y:-0.3132, z: 0.0399, type:"dark", size:0.032, radialDist:0.412 },
  { id:  9, x:-0.3433, y:-0.3604, z: 0.0055, type:"red",  size:0.045, radialDist:0.453 },
  { id: 10, x:-0.3050, y:-0.3789, z:-0.0405, type:"dark", size:0.032, radialDist:0.444 },
  { id: 11, x:-0.2878, y:-0.4338, z:-0.0733, type:"dark", size:0.032, radialDist:0.478 },
  { id: 12, x:-0.2575, y:-0.4707, z:-0.0926, type:"red",  size:0.045, radialDist:0.495 },
  { id: 13, x:-0.1977, y:-0.5063, z:-0.0848, type:"dark", size:0.032, radialDist:0.500 },
  { id: 14, x:-0.1515, y:-0.5421, z:-0.0837, type:"dark", size:0.032, radialDist:0.517 },
  { id: 15, x:-0.1073, y:-0.5700, z:-0.0871, type:"red",  size:0.045, radialDist:0.533 },
  { id: 16, x:-0.0804, y:-0.6061, z:-0.0669, type:"dark", size:0.032, radialDist:0.559 },
  { id: 17, x:-0.0853, y:-0.6143, z:-0.0243, type:"dark", size:0.032, radialDist:0.564 },
  { id: 18, x: 0.0496, y: 0.0584, z: 0.0572, type:"dark", size:0.030, radialDist:0.087 },
  { id: 19, x:-0.0305, y:-0.0233, z: 0.0995, type:"dark", size:0.030, radialDist:0.097 },
  { id: 20, x:-0.1228, y:-0.0759, z: 0.1293, type:"dark", size:0.030, radialDist:0.176 },
  { id: 21, x:-0.2061, y:-0.1335, z: 0.1098, type:"dark", size:0.030, radialDist:0.245 },
  { id: 22, x:-0.2674, y:-0.2059, z: 0.0502, type:"dark", size:0.030, radialDist:0.310 },
  { id: 23, x:-0.2850, y:-0.2711, z: 0.0091, type:"dark", size:0.030, radialDist:0.358 },
  { id: 24, x:-0.2490, y:-0.3330, z:-0.0464, type:"dark", size:0.030, radialDist:0.380 },
  { id: 25, x:-0.2192, y:-0.3937, z:-0.0543, type:"dark", size:0.030, radialDist:0.413 },
  { id: 26, x:-0.1698, y:-0.4538, z:-0.0628, type:"dark", size:0.030, radialDist:0.437 },
  { id: 27, x:-0.0929, y:-0.5116, z:-0.0481, type:"dark", size:0.030, radialDist:0.470 },
  { id: 28, x:-0.0527, y:-0.5656, z:-0.0180, type:"dark", size:0.030, radialDist:0.515 },
  { id: 29, x: 0.0258, y:-0.5985, z: 0.0125, type:"dark", size:0.030, radialDist:0.543 },
  { id: 30, x: 0.0948, y:-0.6068, z: 0.0301, type:"dark", size:0.030, radialDist:0.560 },
  { id: 31, x: 0.1680, y:-0.5803, z: 0.0320, type:"dark", size:0.030, radialDist:0.547 },
  { id: 32, x: 0.2210, y:-0.5419, z: 0.0316, type:"dark", size:0.030, radialDist:0.524 },
  { id: 33, x: 0.2791, y:-0.4932, z: 0.0392, type:"dark", size:0.030, radialDist:0.507 },
  { id: 34, x: 0.3162, y:-0.4321, z: 0.0568, type:"dark", size:0.030, radialDist:0.488 },
  { id: 35, x: 0.3667, y:-0.3701, z: 0.0780, type:"dark", size:0.030, radialDist:0.476 },
  { id: 36, x: 0.4056, y:-0.3052, z: 0.0962, type:"dark", size:0.030, radialDist:0.461 },
  { id: 37, x: 0.4321, y:-0.2393, z: 0.1098, type:"dark", size:0.030, radialDist:0.450 },
  { id: 38, x: 0.4482, y:-0.1699, z: 0.1178, type:"dark", size:0.030, radialDist:0.434 },
  { id: 39, x: 0.4528, y:-0.1000, z: 0.1201, type:"dark", size:0.030, radialDist:0.421 },
  { id: 40, x: 0.4462, y:-0.0298, z: 0.1168, type:"dark", size:0.030, radialDist:0.407 },
  { id: 41, x: 0.4288, y: 0.0388, z: 0.1083, type:"dark", size:0.030, radialDist:0.393 },
  { id: 42, x: 0.4012, y: 0.1048, z: 0.0952, type:"dark", size:0.030, radialDist:0.378 },
  { id: 43, x: 0.3639, y: 0.1672, z: 0.0781, type:"dark", size:0.030, radialDist:0.362 },
  { id: 44, x: 0.3175, y: 0.2249, z: 0.0578, type:"dark", size:0.030, radialDist:0.344 },
  { id: 45, x: 0.2628, y: 0.2768, z: 0.0350, type:"dark", size:0.030, radialDist:0.325 },
  { id: 46, x: 0.2006, y: 0.3220, z: 0.0104, type:"dark", size:0.030, radialDist:0.306 },
  { id: 47, x: 0.1319, y: 0.3594, z:-0.0153, type:"dark", size:0.030, radialDist:0.285 },
  { id: 48, x: 0.0578, y: 0.3882, z:-0.0411, type:"dark", size:0.030, radialDist:0.265 },
  // Apice
  { id: 49, x:-0.0988, y:-0.8024, z: 0.0191, type:"dark", size:0.028, radialDist:0.731 },
  { id: 50, x:-0.0096, y:-0.9508, z: 0.0512, type:"dark", size:0.028, radialDist:0.861 },
  { id: 51, x: 0.0499, y:-0.9539, z:-0.0426, type:"dark", size:0.028, radialDist:0.862 },
  { id: 52, x: 0.1234, y:-0.8011, z: 0.0268, type:"dark", size:0.028, radialDist:0.730 },
  { id: 53, x: 0.0051, y:-0.8485, z: 0.1192, type:"red",  size:0.038, radialDist:0.773 },
  // Atrio destro
  { id: 54, x: 0.6920, y: 0.5200, z: 0.0500, type:"dark", size:0.030, radialDist:0.762 },
  { id: 55, x: 0.6920, y: 0.3200, z: 0.0500, type:"dark", size:0.030, radialDist:0.680 },
  { id: 56, x: 0.5920, y: 0.2200, z: 0.1300, type:"dark", size:0.030, radialDist:0.591 },
  { id: 57, x: 0.4920, y: 0.3200, z: 0.1300, type:"dark", size:0.030, radialDist:0.533 },
  { id: 58, x: 0.4920, y: 0.5200, z: 0.1300, type:"dark", size:0.030, radialDist:0.574 },
  { id: 59, x: 0.5920, y: 0.6200, z: 0.0500, type:"dark", size:0.030, radialDist:0.671 },
  { id: 60, x: 0.6920, y: 0.7200, z: 0.0500, type:"dark", size:0.030, radialDist:0.785 },
  { id: 61, x: 0.5920, y: 0.7200, z: 0.0500, type:"dark", size:0.030, radialDist:0.718 },
  { id: 62, x: 0.4920, y: 0.7200, z: 0.0500, type:"dark", size:0.030, radialDist:0.651 },
  { id: 63, x: 0.4220, y: 0.5200, z: 0.0600, type:"red",  size:0.055, radialDist:0.529 },
  // Atrio sinistro
  { id: 64, x:-0.2800, y: 0.4800, z:-0.1000, type:"dark", size:0.028, radialDist:0.518 },
  { id: 65, x:-0.4800, y: 0.4800, z:-0.1200, type:"dark", size:0.028, radialDist:0.652 },
  { id: 66, x:-0.4800, y: 0.2800, z:-0.1200, type:"dark", size:0.028, radialDist:0.572 },
  { id: 67, x:-0.2800, y: 0.2800, z:-0.1200, type:"dark", size:0.028, radialDist:0.420 },
  { id: 68, x:-0.2800, y: 0.6800, z:-0.1600, type:"dark", size:0.028, radialDist:0.659 },
  { id: 69, x:-0.4800, y: 0.6800, z:-0.1600, type:"dark", size:0.028, radialDist:0.793 },
  { id: 70, x:-0.3800, y: 0.5800, z:-0.1600, type:"dark", size:0.028, radialDist:0.663 },
  { id: 71, x:-0.3800, y: 0.3800, z:-0.1400, type:"dark", size:0.028, radialDist:0.533 },
  { id: 72, x:-0.2800, y: 0.4800, z:-0.1000, type:"red",  size:0.048, radialDist:0.518 },
  // Aorta
  { id: 73, x:-0.0800, y: 0.1800, z: 0.0500, type:"dark", size:0.035, radialDist:0.193 },
  { id: 74, x:-0.1200, y: 0.3800, z: 0.0200, type:"dark", size:0.035, radialDist:0.381 },
  { id: 75, x:-0.1000, y: 0.5800, z:-0.0200, type:"dark", size:0.035, radialDist:0.556 },
  { id: 76, x:-0.0500, y: 0.7500, z:-0.0500, type:"dark", size:0.035, radialDist:0.715 },
  { id: 77, x: 0.0500, y: 0.8800, z:-0.0600, type:"red",  size:0.050, radialDist:0.835 },
  { id: 78, x: 0.1800, y: 0.9500, z:-0.0400, type:"dark", size:0.035, radialDist:0.899 },
  { id: 79, x: 0.3200, y: 0.9800, z:-0.0200, type:"dark", size:0.035, radialDist:0.929 },
  { id: 80, x: 0.4500, y: 0.9200, z: 0.0000, type:"red",  size:0.050, radialDist:0.893 },
  // Arteria polmonare
  { id: 81, x: 0.2500, y: 0.2200, z: 0.2200, type:"dark", size:0.032, radialDist:0.344 },
  { id: 82, x: 0.2200, y: 0.4200, z: 0.2000, type:"dark", size:0.032, radialDist:0.479 },
  { id: 83, x: 0.1800, y: 0.6000, z: 0.1600, type:"dark", size:0.032, radialDist:0.601 },
  { id: 84, x: 0.1000, y: 0.7200, z: 0.1200, type:"dark", size:0.032, radialDist:0.693 },
  { id: 85, x:-0.0200, y: 0.8000, z: 0.0800, type:"red",  size:0.042, radialDist:0.762 },
  { id: 86, x: 0.3000, y: 0.7800, z: 0.1000, type:"dark", size:0.032, radialDist:0.761 },
  { id: 87, x: 0.4800, y: 0.7200, z: 0.0800, type:"dark", size:0.032, radialDist:0.793 },
  // Vena cava superiore
  { id: 88, x: 0.5500, y: 0.6800, z: 0.0200, type:"dark", size:0.030, radialDist:0.762 },
  { id: 89, x: 0.5800, y: 0.8200, z: 0.0000, type:"dark", size:0.030, radialDist:0.862 },
  { id: 90, x: 0.5600, y: 0.9600, z:-0.0200, type:"dark", size:0.030, radialDist:0.979 },
  // Vena cava inferiore
  { id: 91, x: 0.5000, y: 0.2800, z: 0.0000, type:"dark", size:0.030, radialDist:0.558 },
  { id: 92, x: 0.5200, y: 0.1200, z: 0.0200, type:"dark", size:0.030, radialDist:0.527 },
  // Setto interventricolare
  { id: 93, x: 0.0800, y: 0.1200, z: 0.1600, type:"dark", size:0.032, radialDist:0.184 },
  { id: 94, x: 0.0600, y:-0.0200, z: 0.1400, type:"dark", size:0.032, radialDist:0.141 },
  { id: 95, x: 0.0400, y:-0.1600, z: 0.1200, type:"dark", size:0.032, radialDist:0.176 },
  { id: 96, x: 0.0200, y:-0.3000, z: 0.1000, type:"dark", size:0.032, radialDist:0.270 },
  { id: 97, x: 0.0100, y:-0.4400, z: 0.0800, type:"dark", size:0.032, radialDist:0.395 },
  { id: 98, x: 0.0050, y:-0.5800, z: 0.0600, type:"dark", size:0.032, radialDist:0.526 },
  { id: 99, x: 0.0020, y:-0.7200, z: 0.0500, type:"red",  size:0.038, radialDist:0.656 },
  // Nodi interni LV
  { id:100, x: 0.0496, y: 0.0584, z: 0.0572, type:"dark", size:0.028, radialDist:0.087 },
  { id:101, x:-0.0305, y:-0.0233, z: 0.0995, type:"dark", size:0.028, radialDist:0.097 },
  { id:102, x:-0.1228, y:-0.0759, z: 0.1293, type:"dark", size:0.028, radialDist:0.176 },
  { id:103, x:-0.2061, y:-0.1335, z: 0.1098, type:"dark", size:0.028, radialDist:0.245 },
  { id:104, x:-0.2674, y:-0.2059, z: 0.0502, type:"dark", size:0.028, radialDist:0.310 },
  { id:105, x:-0.2850, y:-0.2711, z: 0.0091, type:"dark", size:0.028, radialDist:0.358 },
  { id:106, x:-0.2490, y:-0.3330, z:-0.0464, type:"dark", size:0.028, radialDist:0.380 },
  { id:107, x:-0.2192, y:-0.3937, z:-0.0543, type:"dark", size:0.028, radialDist:0.413 },
  { id:108, x:-0.0929, y:-0.5116, z:-0.0481, type:"dark", size:0.028, radialDist:0.470 },
  { id:109, x:-0.0527, y:-0.5656, z:-0.0180, type:"dark", size:0.028, radialDist:0.515 },
  // Nodi interni RV
  { id:110, x: 0.2000, y:-0.1000, z: 0.1200, type:"dark", size:0.028, radialDist:0.226 },
  { id:111, x: 0.1500, y:-0.2000, z: 0.1400, type:"dark", size:0.028, radialDist:0.249 },
  { id:112, x: 0.1000, y:-0.3000, z: 0.1600, type:"dark", size:0.028, radialDist:0.310 },
  { id:113, x: 0.0500, y:-0.4000, z: 0.1400, type:"dark", size:0.028, radialDist:0.383 },
  { id:114, x: 0.0200, y:-0.5000, z: 0.1200, type:"dark", size:0.028, radialDist:0.470 },
  // Nodi base (giunzione atri-ventricoli)
  { id:115, x: 0.1000, y: 0.2000, z: 0.0500, type:"red",  size:0.042, radialDist:0.219 },
  { id:116, x:-0.0500, y: 0.2500, z: 0.0200, type:"dark", size:0.030, radialDist:0.245 },
  { id:117, x: 0.2500, y: 0.3000, z: 0.0300, type:"dark", size:0.030, radialDist:0.326 },
  { id:118, x: 0.0000, y: 0.3500, z:-0.0200, type:"dark", size:0.030, radialDist:0.320 },
  { id:119, x:-0.1500, y: 0.3000, z:-0.0500, type:"dark", size:0.030, radialDist:0.320 },
  // Nodi LV inferiore
  { id:120, x:-0.0500, y:-0.3500, z: 0.0500, type:"dark", size:0.028, radialDist:0.315 },
  { id:121, x: 0.0500, y:-0.4500, z: 0.0600, type:"dark", size:0.028, radialDist:0.408 },
  { id:122, x:-0.0500, y:-0.5500, z: 0.0400, type:"dark", size:0.028, radialDist:0.503 },
  { id:123, x: 0.0800, y:-0.6500, z: 0.0500, type:"red",  size:0.038, radialDist:0.597 },
  // Nodi RV superiore
  { id:124, x: 0.3500, y: 0.1000, z: 0.1500, type:"dark", size:0.028, radialDist:0.366 },
  { id:125, x: 0.3000, y: 0.2500, z: 0.1200, type:"dark", size:0.028, radialDist:0.356 },
  { id:126, x: 0.3500, y: 0.3500, z: 0.1000, type:"dark", size:0.028, radialDist:0.406 },
  { id:127, x: 0.4000, y: 0.4500, z: 0.0800, type:"dark", size:0.028, radialDist:0.467 },
  // Extra border nodes
  { id:128, x:-0.3800, y: 0.0000, z: 0.0500, type:"dark", size:0.032, radialDist:0.383 },
  { id:129, x:-0.3500, y:-0.1500, z: 0.0800, type:"dark", size:0.032, radialDist:0.378 },
  { id:130, x: 0.1500, y:-0.7000, z: 0.0400, type:"dark", size:0.032, radialDist:0.643 },
  { id:131, x: 0.2500, y:-0.6000, z: 0.0400, type:"dark", size:0.032, radialDist:0.587 },
  { id:132, x: 0.3500, y:-0.5000, z: 0.0500, type:"dark", size:0.032, radialDist:0.535 },
  { id:133, x: 0.4500, y:-0.4000, z: 0.0600, type:"dark", size:0.032, radialDist:0.506 },
  { id:134, x: 0.5000, y:-0.3000, z: 0.0700, type:"dark", size:0.032, radialDist:0.509 },
  { id:135, x: 0.5200, y:-0.2000, z: 0.0800, type:"dark", size:0.032, radialDist:0.490 },
  { id:136, x: 0.5300, y:-0.1000, z: 0.0900, type:"dark", size:0.032, radialDist:0.480 },
];

const EDGES: Array<[number, number, EdgeType]> = [
  // Contorno LV esterno
  [0,1,"strong"],[1,2,"strong"],[2,3,"strong"],[3,4,"strong"],[4,5,"strong"],
  [5,6,"strong"],[6,7,"strong"],[7,8,"strong"],[8,9,"strong"],[9,10,"strong"],
  [10,11,"strong"],[11,12,"strong"],[12,13,"strong"],[13,14,"strong"],[14,15,"strong"],
  [15,16,"strong"],[16,17,"strong"],
  // Strato medio LV
  [18,19,"strong"],[19,20,"strong"],[20,21,"strong"],[21,22,"strong"],[22,23,"strong"],
  [23,24,"strong"],[24,25,"strong"],[25,26,"strong"],[26,27,"strong"],[27,28,"strong"],
  [28,29,"strong"],[29,30,"strong"],[30,31,"strong"],[31,32,"strong"],[32,33,"strong"],
  [33,34,"strong"],[34,35,"strong"],[35,36,"strong"],[36,37,"strong"],[37,38,"strong"],
  [38,39,"strong"],[39,40,"strong"],[40,41,"strong"],[41,42,"strong"],[42,43,"strong"],
  [43,44,"strong"],[44,45,"strong"],[45,46,"strong"],[46,47,"strong"],[47,48,"strong"],
  // Cross LV esterno→medio
  [0,18,"light"],[1,19,"light"],[2,20,"light"],[3,21,"light"],[4,22,"light"],
  [5,23,"light"],[6,24,"light"],[7,25,"light"],[8,26,"light"],[9,27,"light"],
  [10,28,"light"],[11,29,"light"],[12,30,"light"],[13,31,"light"],[14,32,"light"],
  [15,33,"light"],[16,34,"light"],[17,35,"light"],
  // Apice
  [17,49,"strong"],[49,50,"strong"],[50,51,"strong"],[51,52,"strong"],[52,30,"strong"],
  [49,53,"light"],[50,53,"light"],[51,53,"light"],[52,53,"light"],
  [28,49,"light"],[29,50,"light"],[30,51,"light"],[31,52,"light"],
  // Atrio destro
  [54,55,"strong"],[55,56,"strong"],[56,57,"strong"],[57,58,"strong"],[58,59,"strong"],
  [59,60,"strong"],[60,61,"strong"],[61,62,"strong"],[62,63,"strong"],[63,57,"strong"],
  [54,63,"light"],[55,63,"light"],[58,63,"light"],[59,63,"light"],
  [54,88,"strong"],[55,91,"strong"],[56,92,"strong"],
  // Atrio sinistro
  [64,65,"strong"],[65,66,"strong"],[66,67,"strong"],[67,64,"strong"],
  [68,69,"strong"],[69,70,"strong"],[70,71,"strong"],[71,72,"strong"],[72,64,"strong"],
  [64,72,"light"],[65,69,"light"],[66,71,"light"],[67,72,"light"],
  // Aorta
  [73,74,"strong"],[74,75,"strong"],[75,76,"strong"],[76,77,"strong"],
  [77,78,"strong"],[78,79,"strong"],[79,80,"strong"],
  [73,115,"strong"],[73,116,"light"],[74,116,"light"],[75,119,"light"],
  // Arteria polmonare
  [81,82,"strong"],[82,83,"strong"],[83,84,"strong"],[84,85,"strong"],
  [84,86,"strong"],[86,87,"strong"],[87,63,"light"],[85,72,"light"],
  [81,93,"light"],[81,124,"light"],
  // Vene cave
  [88,89,"strong"],[89,90,"strong"],[88,63,"strong"],[91,63,"strong"],[92,63,"light"],
  // Setto
  [93,94,"strong"],[94,95,"strong"],[95,96,"strong"],[96,97,"strong"],
  [97,98,"strong"],[98,99,"strong"],
  [93,115,"light"],[94,101,"light"],[95,110,"light"],[96,111,"light"],
  [97,112,"light"],[98,113,"light"],[99,114,"light"],
  // Nodi interni LV
  [100,101,"strong"],[101,102,"strong"],[102,103,"strong"],[103,104,"strong"],
  [104,105,"strong"],[105,106,"strong"],[106,107,"strong"],[107,108,"strong"],
  [108,109,"strong"],
  [100,18,"light"],[101,19,"light"],[102,20,"light"],[103,21,"light"],
  [104,22,"light"],[105,23,"light"],[106,24,"light"],[107,25,"light"],
  [108,27,"light"],[109,28,"light"],
  // Nodi interni RV
  [110,111,"strong"],[111,112,"strong"],[112,113,"strong"],[113,114,"strong"],
  [110,40,"light"],[111,39,"light"],[112,38,"light"],[113,37,"light"],[114,36,"light"],
  [110,124,"light"],[111,125,"light"],[112,126,"light"],[113,127,"light"],
  // Base (giunzione)
  [115,116,"strong"],[116,118,"strong"],[118,119,"strong"],[117,115,"strong"],
  [115,73,"light"],[116,74,"light"],[117,81,"light"],[118,72,"light"],[119,64,"light"],
  [115,47,"light"],[116,48,"light"],[117,46,"light"],[118,47,"light"],
  // LV inferiore
  [120,121,"strong"],[121,122,"strong"],[122,123,"strong"],[123,99,"strong"],
  [120,96,"light"],[121,97,"light"],[122,98,"light"],
  [120,27,"light"],[121,28,"light"],[122,29,"light"],[123,30,"light"],
  // RV superiore
  [124,125,"strong"],[125,126,"strong"],[126,127,"strong"],[127,63,"light"],
  [124,42,"light"],[125,43,"light"],[126,44,"light"],[127,45,"light"],
  // Border extra
  [128,129,"strong"],[129,7,"light"],[128,6,"light"],
  [130,131,"strong"],[131,132,"strong"],[132,133,"strong"],[133,134,"strong"],
  [134,135,"strong"],[135,136,"strong"],
  [130,31,"light"],[131,32,"light"],[132,33,"light"],[133,34,"light"],
  [134,35,"light"],[135,36,"light"],[136,37,"light"],
  // Cross-link lunghi (effetto grafo cognitivo)
  [0,115,"cross"],[3,101,"cross"],[6,104,"cross"],[9,107,"cross"],
  [12,108,"cross"],[15,109,"cross"],[17,122,"cross"],
  [18,93,"cross"],[19,94,"cross"],[20,95,"cross"],
  [48,118,"cross"],[47,119,"cross"],[46,116,"cross"],
  [73,116,"cross"],[74,118,"cross"],[75,119,"cross"],
  [63,117,"cross"],[63,115,"cross"],[63,125,"cross"],
  [85,75,"cross"],[86,79,"cross"],[87,80,"cross"],
  [88,87,"cross"],[89,80,"cross"],[90,79,"cross"],
  [53,99,"cross"],[53,123,"cross"],[50,122,"cross"],
  [128,103,"cross"],[129,104,"cross"],
  [136,38,"cross"],[135,37,"cross"],[134,36,"cross"],
  [72,119,"cross"],[64,116,"cross"],[65,75,"cross"],
  [100,115,"cross"],[101,116,"cross"],[102,119,"cross"],
  [110,93,"cross"],[111,94,"cross"],[112,95,"cross"],
  [120,101,"cross"],[121,102,"cross"],[122,103,"cross"],
  [124,117,"cross"],[125,115,"cross"],[126,116,"cross"],
  [81,125,"cross"],[82,126,"cross"],[83,127,"cross"],
  [55,57,"cross"],[56,58,"cross"],[59,61,"cross"],
  [67,71,"cross"],[68,70,"cross"],[66,68,"cross"],
  [73,100,"cross"],[74,101,"cross"],[75,102,"cross"],
  [77,85,"cross"],[78,86,"cross"],[79,87,"cross"],
  [91,57,"cross"],[92,56,"cross"],
  [96,120,"cross"],[97,121,"cross"],[98,122,"cross"],
  [113,121,"cross"],[114,122,"cross"],
  [127,57,"cross"],[126,58,"cross"],
  [48,117,"cross"],[47,115,"cross"],[46,125,"cross"],
  [43,124,"cross"],[44,125,"cross"],[45,126,"cross"],
  [1,100,"cross"],[2,101,"cross"],[4,102,"cross"],[5,103,"cross"],
  [7,104,"cross"],[8,105,"cross"],[10,106,"cross"],[11,107,"cross"],
  [13,108,"cross"],[14,109,"cross"],
];

// ─────────────────────────────────────────────────────────────────────────────
// Colori
// ─────────────────────────────────────────────────────────────────────────────
const COL_RED       = new THREE.Color("#C1622F");
const COL_DARK      = new THREE.Color("#1C1C1C");
const COL_GLOW_RED  = new THREE.Color("#E8541A");
const COL_GLOW_DARK = new THREE.Color("#3a3a3a");

// ─────────────────────────────────────────────────────────────────────────────
// Shader nodi (punti luminosi flat)
// ─────────────────────────────────────────────────────────────────────────────
const VERT_GLOW = /* glsl */`
  attribute float aSize;
  attribute float aIntensity;
  varying float vIntensity;
  void main() {
    vIntensity = aIntensity;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (500.0 / -mvPos.z);
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
    float core  = smoothstep(0.10, 0.0, d);
    float inner = smoothstep(0.25, 0.0, d) * 0.70;
    float outer = smoothstep(0.50, 0.08, d) * 0.30;
    float alpha = (core + inner + outer) * (0.45 + vIntensity * 0.55);
    vec3 col = mix(uColor, uGlowColor, vIntensity * 0.55);
    gl_FragColor = vec4(col, alpha);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Shader archi (propagazione energia)
// ─────────────────────────────────────────────────────────────────────────────
const VERT_EDGE = /* glsl */`
  attribute float aProgress;
  attribute float aEnergy;
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
  uniform float uPulseHead;
  varying float vProgress;
  varying float vEnergy;
  void main() {
    float baseAlpha = 0.22;
    float dist  = abs(vProgress - uPulseHead);
    float pulse = exp(-dist * dist * 45.0) * vEnergy;
    float trail = 0.0;
    if (vProgress < uPulseHead) {
      float td = uPulseHead - vProgress;
      trail = exp(-td * td * 10.0) * vEnergy * 0.45;
    }
    float alpha = baseAlpha + (pulse + trail) * 0.88;
    vec3 col = mix(uBaseColor, uGlowColor, pulse + trail * 0.4);
    gl_FragColor = vec4(col, alpha);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Stato runtime
// ─────────────────────────────────────────────────────────────────────────────
interface NodeState {
  intensity: number;
  targetIntensity: number;
  pulseTimer: number;
}
interface EdgeState {
  pulseHead: number;
  energy: number;
  active: boolean;
  direction: number;
  cooldown: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scena
// ─────────────────────────────────────────────────────────────────────────────
function HeartGraphScene() {
  const clockRef = useRef(0);

  const nodeStates = useRef<NodeState[]>(
    NODES.map(() => ({
      intensity: 0.3 + Math.random() * 0.4,
      targetIntensity: 0.3 + Math.random() * 0.4,
      pulseTimer: Math.random() * 3,
    }))
  );

  const edgeStates = useRef<EdgeState[]>(
    EDGES.map(() => ({
      pulseHead: 0,
      energy: 0,
      active: false,
      direction: 1,
      cooldown: Math.random() * 2.5,
    }))
  );

  // ── Geometria nodi ──
  const { nodeGeo, nodeMatRed, nodeMatDark, redNodeIds, darkNodeIds } = useMemo(() => {
    const redNodes  = NODES.filter((n) => n.type === "red");
    const darkNodes = NODES.filter((n) => n.type === "dark");
    const redIds    = redNodes.map((n) => n.id);
    const darkIds   = darkNodes.map((n) => n.id);

    function buildGeo(nodes: NodeDef[]) {
      const pos  = new Float32Array(nodes.length * 3);
      const sz   = new Float32Array(nodes.length);
      const ints = new Float32Array(nodes.length);
      nodes.forEach((n, i) => {
        pos[i*3]=n.x; pos[i*3+1]=n.y; pos[i*3+2]=n.z;
        sz[i]=n.size; ints[i]=0.5;
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position",   new THREE.BufferAttribute(pos, 3));
      g.setAttribute("aSize",      new THREE.BufferAttribute(sz, 1));
      g.setAttribute("aIntensity", new THREE.BufferAttribute(ints, 1));
      return g;
    }

    const gRed  = buildGeo(redNodes);
    const gDark = buildGeo(darkNodes);

    const mRed = new THREE.ShaderMaterial({
      vertexShader: VERT_GLOW, fragmentShader: FRAG_GLOW,
      uniforms: { uColor:{value:COL_RED}, uGlowColor:{value:COL_GLOW_RED} },
      transparent:true, blending:THREE.NormalBlending, depthWrite:false,
    });
    const mDark = new THREE.ShaderMaterial({
      vertexShader: VERT_GLOW, fragmentShader: FRAG_GLOW,
      uniforms: { uColor:{value:COL_DARK}, uGlowColor:{value:COL_GLOW_DARK} },
      transparent:true, blending:THREE.NormalBlending, depthWrite:false,
    });

    return { nodeGeo:{red:gRed,dark:gDark}, nodeMatRed:mRed, nodeMatDark:mDark,
             redNodeIds:redIds, darkNodeIds:darkIds };
  }, []);

  // ── Geometria archi ──
  const edgeObjects = useMemo(() => {
    return EDGES.map(([a, b, type]) => {
      const nA = NODES[a], nB = NODES[b];
      const N = 16;
      const pos  = new Float32Array(N*2*3);
      const prog = new Float32Array(N*2);
      const eng  = new Float32Array(N*2);
      for (let i=0;i<N;i++) {
        const t0=i/N, t1=(i+1)/N;
        pos[(i*2)*3]   =nA.x+(nB.x-nA.x)*t0;
        pos[(i*2)*3+1] =nA.y+(nB.y-nA.y)*t0;
        pos[(i*2)*3+2] =nA.z+(nB.z-nA.z)*t0;
        pos[(i*2+1)*3]  =nA.x+(nB.x-nA.x)*t1;
        pos[(i*2+1)*3+1]=nA.y+(nB.y-nA.y)*t1;
        pos[(i*2+1)*3+2]=nA.z+(nB.z-nA.z)*t1;
        prog[i*2]=t0; prog[i*2+1]=t1;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position",  new THREE.BufferAttribute(pos,3));
      g.setAttribute("aProgress", new THREE.BufferAttribute(prog,1));
      g.setAttribute("aEnergy",   new THREE.BufferAttribute(eng,1));
      const baseCol = type==="strong"
        ? new THREE.Color("#7A3A1A")
        : type==="cross"
          ? new THREE.Color("#C1622F")
          : new THREE.Color("#5A2A10");
      const mat = new THREE.ShaderMaterial({
        vertexShader:VERT_EDGE, fragmentShader:FRAG_EDGE,
        uniforms:{ uBaseColor:{value:baseCol}, uGlowColor:{value:COL_GLOW_RED}, uPulseHead:{value:-1.0} },
        transparent:true, blending:THREE.NormalBlending, depthWrite:false,
      });
      return { lines:new THREE.LineSegments(g,mat), geo:g, mat, nodeA:a, nodeB:b };
    });
  }, []);

  // Posizioni originali per battito radiale
  const origPos = useMemo(() =>
    NODES.map((n) => new THREE.Vector3(n.x, n.y, n.z)), []);

  useFrame((_, delta) => {
    clockRef.current += delta;
    const t = clockRef.current;
    const ns = nodeStates.current;
    const es = edgeStates.current;

    // ── Battito cardiaco lub-dub 68 BPM ──
    const bpm = 68;
    const cycle = (t * bpm / 60) % 1;
    let heartbeat = 0;
    if      (cycle < 0.06) heartbeat = Math.sin((cycle/0.06)*Math.PI)*0.22;
    else if (cycle < 0.14) heartbeat = -Math.sin(((cycle-0.06)/0.08)*Math.PI)*0.07;
    else if (cycle < 0.22) heartbeat = Math.sin(((cycle-0.14)/0.08)*Math.PI)*0.12;

    // ── Aggiorna intensità nodi (pulsazione individuale) ──
    ns.forEach((s) => {
      s.pulseTimer -= delta;
      if (s.pulseTimer <= 0) {
        s.targetIntensity = 0.2 + Math.random() * 0.8;
        s.pulseTimer = 0.6 + Math.random() * 2.2;
      }
      s.intensity += (s.targetIntensity - s.intensity) * delta * 2.8;
    });

    // ── Onda radiale con delay progressivo ──
    // I nodi centrali (radialDist≈0) si espandono subito,
    // quelli periferici con un ritardo proporzionale a radialDist.
    // Usiamo un "wave front" che si propaga dal centro verso l'esterno.
    // waveFront va da 0 a 1 durante il ciclo di battito.
    // Un nodo si espande quando waveFront >= radialDist.
    const WAVE_SPEED = 3.5; // unità radiali al secondo
    // Fase dell'onda: avanza durante il ciclo di sistole
    const wavePhase = Math.max(0, cycle < 0.22 ? cycle / 0.22 : 0);
    const waveFront = wavePhase * WAVE_SPEED; // 0 → 3.5 durante sistole

    // Aggiorna posizioni nodi rossi
    const rPosArr = nodeGeo.red.attributes.position as THREE.BufferAttribute;
    const rIntArr = nodeGeo.red.attributes.aIntensity as THREE.BufferAttribute;
    redNodeIds.forEach((nodeId, idx) => {
      const orig = origPos[nodeId];
      const len = orig.length();
      const radial = NODES[nodeId].radialDist;
      // Delay radiale: il nodo si espande solo quando l'onda lo raggiunge
      const nodeActivation = Math.max(0, waveFront - radial);
      const expansion = Math.min(nodeActivation, 1.0) * heartbeat * radial * 0.20;
      if (len > 0.001) {
        rPosArr.array[idx*3]   = orig.x + (orig.x/len)*expansion;
        rPosArr.array[idx*3+1] = orig.y + (orig.y/len)*expansion;
        rPosArr.array[idx*3+2] = orig.z + (orig.z/len)*expansion;
      }
      const radialPulse = radial * Math.min(nodeActivation,1) * heartbeat * 2.0;
      rIntArr.array[idx] = Math.min(1.0, ns[nodeId].intensity + radialPulse);
    });
    rPosArr.needsUpdate = true;
    rIntArr.needsUpdate = true;

    // Aggiorna posizioni nodi scuri
    const dPosArr = nodeGeo.dark.attributes.position as THREE.BufferAttribute;
    const dIntArr = nodeGeo.dark.attributes.aIntensity as THREE.BufferAttribute;
    darkNodeIds.forEach((nodeId, idx) => {
      const orig = origPos[nodeId];
      const len = orig.length();
      const radial = NODES[nodeId].radialDist;
      const nodeActivation = Math.max(0, waveFront - radial);
      const expansion = Math.min(nodeActivation, 1.0) * heartbeat * radial * 0.20;
      if (len > 0.001) {
        dPosArr.array[idx*3]   = orig.x + (orig.x/len)*expansion;
        dPosArr.array[idx*3+1] = orig.y + (orig.y/len)*expansion;
        dPosArr.array[idx*3+2] = orig.z + (orig.z/len)*expansion;
      }
      const radialPulse = radial * Math.min(nodeActivation,1) * heartbeat * 1.6;
      dIntArr.array[idx] = Math.min(1.0, ns[nodeId].intensity + radialPulse);
    });
    dPosArr.needsUpdate = true;
    dIntArr.needsUpdate = true;

    // ── Propagazione energia archi ──
    es.forEach((estate, i) => {
      const { nodeA, nodeB, mat, geo } = edgeObjects[i];
      if (!estate.active) {
        estate.cooldown -= delta;
        if (estate.cooldown <= 0) {
          const intA = ns[nodeA].intensity;
          const intB = ns[nodeB].intensity;
          estate.active    = true;
          estate.direction = intA >= intB ? 1 : -1;
          estate.pulseHead = estate.direction > 0 ? 0 : 1;
          estate.energy    = 0.4 + Math.random() * 0.6;
          estate.cooldown  = 0;
        }
      } else {
        const speed = 1.0 + Math.random() * 0.4;
        estate.pulseHead += estate.direction * delta * speed;
        mat.uniforms.uPulseHead.value = estate.pulseHead;
        const eAttr = geo.attributes.aEnergy as THREE.BufferAttribute;
        for (let v=0;v<eAttr.count;v++) eAttr.array[v]=estate.energy;
        eAttr.needsUpdate = true;
        if (estate.pulseHead > 1.2 || estate.pulseHead < -0.2) {
          estate.active = false;
          estate.energy = 0;
          estate.pulseHead = 0;
          estate.cooldown = 0.2 + Math.random() * 2.5;
          mat.uniforms.uPulseHead.value = -2.0;
          const dest = estate.direction > 0 ? nodeB : nodeA;
          ns[dest].targetIntensity = 0.65 + Math.random() * 0.35;
          ns[dest].pulseTimer = 0.4 + Math.random() * 1.2;
        }
      }
    });
  });

  return (
    <group>
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 0.5, 2]} intensity={0.2} color="#ff5020" />
      {edgeObjects.map((obj, i) => (
        <primitive key={`e${i}`} object={obj.lines} />
      ))}
      <points geometry={nodeGeo.red}  material={nodeMatRed}  />
      <points geometry={nodeGeo.dark} material={nodeMatDark} />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────
interface HeartGraph3DProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export default function HeartGraph3D({ className="", width="100%", height="100%" }: HeartGraph3DProps) {
  return (
    <div className={className} style={{width, height, cursor:"grab"}}
         aria-label="Grafo psicologico animato a forma di cuore anatomico">
      <Canvas camera={{position:[0,0,2.8], fov:46}}
              gl={{antialias:true, alpha:true}}
              style={{background:"transparent"}} dpr={[1,2]}>
        <HeartGraphScene />
        <OrbitControls enableZoom={false} enablePan={false}
          autoRotate autoRotateSpeed={0.4}
          minPolarAngle={Math.PI*0.15} maxPolarAngle={Math.PI*0.85}
          rotateSpeed={0.55} dampingFactor={0.07} enableDamping />
      </Canvas>
    </div>
  );
}
