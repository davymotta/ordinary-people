/**
 * Ordinary People — Reaction Clustering
 *
 * Post-hoc clustering of agent reactions into 4-6 meaningful segments.
 * "People cluster. There are not infinite opinions — there are 4-6 reaction
 * clusters with internal variance." — Documento 3
 *
 * Uses simple k-means on reaction vectors (score, attention, emotional signature).
 * Returns labeled segments for the report.
 */

export interface ReactionPoint {
  agentId: number;
  agentName: string;
  score: number;           // -1 to +1
  attentionScore?: number; // 0-1
  scrolledPast?: boolean;
  emotionalSignature?: string[];
}

export interface ReactionCluster {
  id: number;
  label: string;           // e.g. "Entusiasti", "Scettici", "Indifferenti"
  description: string;
  agentIds: number[];
  agentCount: number;
  avgScore: number;
  scoreRange: [number, number];
  pct: number;             // % of total agents
  color: string;           // for UI
}

export interface ClusteringResult {
  clusters: ReactionCluster[];
  scrolledCount: number;
  scrolledPct: number;
  processedCount: number;
  processedPct: number;
}

/**
 * Cluster agent reactions into meaningful segments.
 * Uses score-based thresholds (deterministic, no random initialization).
 */
export function clusterReactions(reactions: ReactionPoint[]): ClusteringResult {
  const total = reactions.length;
  if (total === 0) {
    return { clusters: [], scrolledCount: 0, scrolledPct: 0, processedCount: 0, processedPct: 0 };
  }

  const scrolled = reactions.filter(r => r.scrolledPast);
  const processed = reactions.filter(r => !r.scrolledPast);

  // Score-based segmentation (deterministic, interpretable)
  const enthusiasts  = processed.filter(r => r.score >= 0.5);
  const positives    = processed.filter(r => r.score >= 0.1 && r.score < 0.5);
  const ambivalent   = processed.filter(r => r.score >= -0.1 && r.score < 0.1);
  const skeptics     = processed.filter(r => r.score >= -0.5 && r.score < -0.1);
  const opponents    = processed.filter(r => r.score < -0.5);

  const clusters: ReactionCluster[] = [];

  if (enthusiasts.length > 0) {
    clusters.push(buildCluster(1, "Entusiasti", enthusiasts, total,
      "Reazione fortemente positiva. Questi agenti sono già convinti — il messaggio risuona con i loro valori e desideri.",
      "#22c55e"));
  }
  if (positives.length > 0) {
    clusters.push(buildCluster(2, "Positivi", positives, total,
      "Reazione positiva ma non intensa. Aperti al messaggio, ma non ancora pienamente convinti. Il target principale per la razionalizzazione (Livello 3).",
      "#86efac"));
  }
  if (ambivalent.length > 0) {
    clusters.push(buildCluster(3, "Ambivalenti", ambivalent, total,
      "Reazione neutra. Né attratti né respinti. Il messaggio non ha trovato variabili salienti nel loro profilo. Difficili da convertire senza un messaggio più mirato.",
      "#fbbf24"));
  }
  if (skeptics.length > 0) {
    clusters.push(buildCluster(4, "Scettici", skeptics, total,
      "Reazione negativa moderata. Qualcosa nel messaggio attiva resistenza — prezzo, tono, o conflitto con i valori. Recuperabili con un approccio diverso.",
      "#f97316"));
  }
  if (opponents.length > 0) {
    clusters.push(buildCluster(5, "Oppositori", opponents, total,
      "Reazione fortemente negativa. La reazione è identitaria, non informativa — più informazioni non cambieranno l'opinione. Non recuperabili con questo messaggio.",
      "#ef4444"));
  }

  return {
    clusters,
    scrolledCount: scrolled.length,
    scrolledPct: Math.round(scrolled.length / total * 100),
    processedCount: processed.length,
    processedPct: Math.round(processed.length / total * 100),
  };
}

function buildCluster(
  id: number,
  label: string,
  points: ReactionPoint[],
  total: number,
  description: string,
  color: string,
): ReactionCluster {
  const scores = points.map(p => p.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  return {
    id,
    label,
    description,
    agentIds: points.map(p => p.agentId),
    agentCount: points.length,
    avgScore: Math.round(avgScore * 100) / 100,
    scoreRange: [Math.round(minScore * 100) / 100, Math.round(maxScore * 100) / 100],
    pct: Math.round(points.length / total * 100),
    color,
  };
}

/**
 * Generate a natural-language summary of the clustering result for the report.
 */
export function summarizeClusters(result: ClusteringResult, totalAgents: number): string {
  const lines: string[] = [];

  lines.push(`Su ${totalAgents} agenti simulati:`);

  if (result.scrolledPct > 0) {
    lines.push(`- **${result.scrolledPct}%** ha ignorato il messaggio (scroll-past in <2 secondi) — il filtro di attenzione non è stato superato.`);
  }

  for (const cluster of result.clusters) {
    lines.push(`- **${cluster.pct}% ${cluster.label}** (score medio: ${cluster.avgScore > 0 ? "+" : ""}${cluster.avgScore.toFixed(2)}): ${cluster.description}`);
  }

  // Key insight
  const positiveTotal = result.clusters
    .filter(c => c.avgScore > 0)
    .reduce((sum, c) => sum + c.pct, 0);
  const negativeTotal = result.clusters
    .filter(c => c.avgScore < -0.1)
    .reduce((sum, c) => sum + c.pct, 0);

  if (positiveTotal > 50) {
    lines.push(`\n**Insight chiave**: La maggioranza del panel risponde positivamente. Il messaggio è ben calibrato per questo target.`);
  } else if (negativeTotal > 40) {
    lines.push(`\n**Insight chiave**: Forte polarizzazione negativa. Considerare una revisione del tono o del posizionamento.`);
  } else {
    lines.push(`\n**Insight chiave**: Distribuzione bimodale — un segmento positivo e uno negativo. Il messaggio polarizza. Valutare se questo è intenzionale.`);
  }

  return lines.join("\n");
}
