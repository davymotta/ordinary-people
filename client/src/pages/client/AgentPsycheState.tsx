/**
 * AgentPsycheState — Visualizzazione stato psicologico Psyche per un agente
 * 
  * Mostra: grafo nodi (33 dimensioni), mood, bias attivi, wound/shadow,
   * vettore di stato, storico esposizioni brand.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ClientLayout } from "@/components/ClientLayout";

// Colori per categoria nodo
const CATEGORY_COLORS: Record<string, string> = {
  core: "#7c3aed",
  emotional: "#db2777",
  cognitive: "#0891b2",
  social: "#059669",
  bias: "#d97706",
  cultural: "#6366f1",
};

const MOOD_COLORS: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-800",
  negative: "bg-rose-100 text-rose-800",
  neutral: "bg-slate-100 text-slate-700",
  mixed: "bg-amber-100 text-amber-800",
  anxious: "bg-orange-100 text-orange-800",
  euphoric: "bg-violet-100 text-violet-800",
  melancholic: "bg-blue-100 text-blue-800",
  irritated: "bg-red-100 text-red-800",
};

function getMoodColor(mood: string): string {
  return MOOD_COLORS[mood] ?? "bg-slate-100 text-slate-700";
}

function ArousalBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[level] ?? "bg-slate-100 text-slate-600"}`}>
      arousal: {level}
    </span>
  );
}

function NodeBar({ nodeId, activation, valence, label, category }: {
  nodeId: string;
  activation: number;
  valence: number;
  label: string;
  category: string;
}) {
  const color = CATEGORY_COLORS[category] ?? "#6b7280";
  const pct = Math.round(activation * 100);
  const valenceLabel = valence > 0.15 ? "+" : valence < -0.15 ? "−" : "~";
  const valenceColor = valence > 0.15 ? "text-emerald-600" : valence < -0.15 ? "text-rose-600" : "text-slate-400";

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-36 text-xs text-slate-600 truncate" title={label}>{label}</div>
      <div className="flex-1 bg-slate-100 rounded-full h-2 relative overflow-hidden">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-8 text-xs text-right text-slate-500">{pct}%</div>
      <div className={`w-4 text-xs font-bold ${valenceColor}`}>{valenceLabel}</div>
    </div>
  );
}

const NODE_CATEGORIES = ["core", "emotional", "cognitive", "social", "bias", "cultural"] as const;

export default function AgentPsycheState() {
  const [selectedBrandAgentId, setSelectedBrandAgentId] = useState<number | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const brandAgentsQuery = trpc.onboarding.listBrandAgents.useQuery();
  const brandAgents = brandAgentsQuery.data ?? [];

  const agentsQuery = trpc.agents.list.useQuery();
  const agents = agentsQuery.data ?? [];

  const psycheStateQuery = trpc.psyche.getAgentState.useQuery(
    { agentId: selectedAgentId!, brandAgentId: selectedBrandAgentId! },
    { enabled: !!(selectedAgentId && selectedBrandAgentId) }
  );

  const stateVectorQuery = trpc.psyche.exportStateVector.useQuery(
    { agentId: selectedAgentId!, brandAgentId: selectedBrandAgentId! },
    { enabled: !!(selectedAgentId && selectedBrandAgentId) }
  );

  const psycheData = psycheStateQuery.data;
  // graphNodes è Record<string, { activation: number; valence: number }> dal router
  const graphNodes = psycheData?.graphNodes as Record<string, { activation: number; valence: number }> | undefined;

  // Topologia nodi (ordine canonico per categoria)
  const NODE_DEFS: { id: string; label: string; category: string }[] = [
    { id: "identity", label: "Identity", category: "core" },
    { id: "shadow", label: "Shadow", category: "core" },
    { id: "core_wound", label: "Core Wound", category: "core" },
    { id: "core_desire", label: "Core Desire", category: "core" },
    { id: "current_mood", label: "Current Mood", category: "emotional" },
    { id: "stress_level", label: "Stress Level", category: "emotional" },
    { id: "energy", label: "Energy", category: "emotional" },
    { id: "emotional_arousal", label: "Emotional Arousal", category: "emotional" },
    { id: "attention_filter", label: "Attention Filter", category: "cognitive" },
    { id: "confirmation_engine", label: "Confirmation Engine", category: "cognitive" },
    { id: "risk_calculator", label: "Risk Calculator", category: "cognitive" },
    { id: "aspiration_engine", label: "Aspiration Engine", category: "cognitive" },
    { id: "critical_thinking", label: "Critical Thinking", category: "cognitive" },
    { id: "inner_voice", label: "Inner Voice", category: "cognitive" },
    { id: "social_standing", label: "Social Standing", category: "social" },
    { id: "belonging_need", label: "Belonging Need", category: "social" },
    { id: "distinction_need", label: "Distinction Need", category: "social" },
    { id: "reference_mirror", label: "Reference Mirror", category: "social" },
    { id: "loss_aversion", label: "Loss Aversion", category: "bias" },
    { id: "bandwagon_bias", label: "Bandwagon Bias", category: "bias" },
    { id: "authority_bias", label: "Authority Bias", category: "bias" },
    { id: "scarcity_bias", label: "Scarcity Bias", category: "bias" },
    { id: "identity_defense", label: "Identity Defense", category: "bias" },
    { id: "halo_effect", label: "Halo Effect", category: "bias" },
    { id: "cultural_lens", label: "Cultural Lens", category: "cultural" },
    { id: "generational_memory", label: "Generational Memory", category: "cultural" },
    { id: "class_consciousness", label: "Class Consciousness", category: "cultural" },
    { id: "moral_foundations", label: "Moral Foundations", category: "cultural" },
    { id: "money_relationship", label: "Money Relationship", category: "cultural" },
    { id: "time_orientation", label: "Time Orientation", category: "cultural" },
    { id: "cultural_decode", label: "Cultural Decode", category: "cultural" },
    { id: "humor_processor", label: "Humor Processor", category: "cultural" },
    { id: "episodic_memory", label: "Episodic Memory", category: "cognitive" },
  ];

  const filteredNodes = activeCategory === "all"
    ? NODE_DEFS
    : NODE_DEFS.filter(n => n.category === activeCategory);

  const ps = psycheData?.psycheState as any;
  const vector = stateVectorQuery.data?.vector;

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Stato Psicologico Agente</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Visualizza il grafo cognitivo interno (Psyche Engine) per ogni agente dopo le simulazioni.
          </p>
        </div>

        {/* Selettori */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Brand</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              value={selectedBrandAgentId ?? ""}
              onChange={(e) => setSelectedBrandAgentId(Number((e.target as HTMLSelectElement).value) || null)}
            >
              <option value="">Seleziona brand...</option>
              {brandAgents.map((b: any) => (
                <option key={b.id} value={b.id}>{b.brandIdentity?.name ?? `Brand #${b.id}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Agente</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              value={selectedAgentId ?? ""}
              onChange={(e) => setSelectedAgentId(Number((e.target as HTMLSelectElement).value) || null)}
            >
              <option value="">Seleziona agente...</option>
              {agents.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name ?? a.slug ?? `Agente #${a.id}`}</option>
              ))}
            </select>
          </div>
        </div>

        {psycheStateQuery.isLoading && (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        )}

        {psycheData && !psycheData.hasState && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-amber-700 font-medium">Nessuno stato Psyche trovato per questo agente.</p>
            <p className="text-amber-600 text-sm mt-1">
              Esegui almeno una simulazione con questo agente per inizializzare il grafo cognitivo.
            </p>
          </div>
        )}

        {psycheData?.hasState && ps && (
          <div className="space-y-6">
            {/* KPI Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Mood</div>
                <span className={`px-2 py-1 rounded-lg text-sm font-semibold ${getMoodColor(ps.mood)}`}>
                  {ps.mood}
                </span>
                <div className="text-xs text-slate-400 mt-1">intensità {Math.round(ps.mood_intensity * 100)}%</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Modalità</div>
                <div className="text-sm font-semibold text-slate-800 capitalize">{ps.processing_mode}</div>
                <div className="text-xs text-slate-400 mt-1">
                  <ArousalBadge level={ps.arousal} />
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Postura Sociale</div>
                <div className="text-sm font-semibold text-slate-800 capitalize">
                  {ps.social_posture.replace(/_/g, " ")}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {ps.self_confidence} fiducia
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Esposizioni Brand</div>
                <div className="text-2xl font-bold text-violet-700">{psycheData.exposureCount ?? 0}</div>
                <div className="text-xs text-slate-400 mt-1">
                  familiarity {Math.round((psycheData.brandFamiliarity ?? 0) * 100)}%
                </div>
              </div>
            </div>

            {/* Alert ferite/shadow/difesa */}
            {(ps.wound_active || ps.shadow_active || ps.defense_active) && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-wrap gap-3">
                {ps.wound_active && (
                  <span className="flex items-center gap-1 text-rose-700 text-sm font-medium">
                    <span className="text-rose-500">⚠</span> Ferita primaria attiva
                  </span>
                )}
                {ps.shadow_active && (
                  <span className="flex items-center gap-1 text-rose-700 text-sm font-medium">
                    <span className="text-rose-500">⚠</span> Shadow attivo
                  </span>
                )}
                {ps.defense_active && (
                  <span className="flex items-center gap-1 text-orange-700 text-sm font-medium">
                    <span className="text-orange-500">🛡</span> Difesa identitaria attiva
                  </span>
                )}
              </div>
            )}

            {/* Bias attivi */}
            {ps.active_biases?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Bias Cognitivi Attivi</div>
                <div className="flex flex-wrap gap-2">
                  {ps.active_biases.map((bias: string) => (
                    <span key={bias} className="px-3 py-1 bg-violet-100 text-violet-800 rounded-full text-xs font-medium">
                      {bias.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Grafo nodi */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Grafo Cognitivo — 32 Nodi</div>
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => setActiveCategory("all")}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${activeCategory === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    Tutti
                  </button>
                  {NODE_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${activeCategory === cat ? "text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      style={activeCategory === cat ? { backgroundColor: CATEGORY_COLORS[cat] } : {}}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {graphNodes ? (
                <div className="space-y-0.5">
                  {filteredNodes.map(node => {
                    const nodeData = graphNodes[node.id];
                    const activation = nodeData?.activation ?? 0;
                    const valence = nodeData?.valence ?? 0;
                    return (
                      <NodeBar
                        key={node.id}
                        nodeId={node.id}
                        activation={activation}
                        valence={valence}
                        label={node.label}
                        category={node.category}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Dati grafo non disponibili.</p>
              )}
            </div>

            {/* Vettore di stato 33D */}
            {vector && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Vettore di Stato 33D (per clustering)
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {vector.map((v: number, i: number) => (
                    <div
                      key={i}
                      className="aspect-square rounded flex items-center justify-center text-xs font-mono"
                      style={{
                        backgroundColor: `rgba(124, 58, 237, ${v})`,
                        color: v > 0.5 ? "white" : "#6b7280",
                      }}
                      title={`${stateVectorQuery.data?.nodeIds?.[i]}: ${v.toFixed(3)}`}
                    >
                      {v.toFixed(2)}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Ogni cella rappresenta l'activation di un nodo. Hover per il nome del nodo.
                </p>
              </div>
            )}

            {/* Episodic Log */}
            {(psycheData as any)?.episodicLog && ((psycheData as any).episodicLog as any[]).length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Memoria Episodica ({((psycheData as any).episodicLog as any[]).length} episodi)
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {((psycheData as any).episodicLog as any[]).slice(-5).reverse().map((ep: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg text-xs">
                      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        ep.woundActive ? "bg-rose-500" : ep.valence > 0.2 ? "bg-emerald-500" : ep.valence < -0.2 ? "bg-red-400" : "bg-slate-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          {ep.themes?.slice(0, 3).map((t: string) => (
                            <span key={t} className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-xs">{t}</span>
                          ))}
                          {ep.woundActive && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-xs">ferita</span>}
                        </div>
                        <div className="text-slate-400 mt-0.5">
                          arousal {(ep.arousal * 100).toFixed(0)}% · valence {ep.valence > 0 ? "+" : ""}{ep.valence.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedAgentId || !selectedBrandAgentId ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">🧠</div>
            <p className="text-slate-600 font-medium">Seleziona un brand e un agente per visualizzare il grafo cognitivo.</p>
            <p className="text-slate-400 text-sm mt-1">
              Il grafo si popola automaticamente dopo ogni simulazione.
            </p>
          </div>
        ) : null}
      </div>
    </ClientLayout>
  );
}
