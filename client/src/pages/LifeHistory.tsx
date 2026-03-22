import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";

// ─── Helpers ─────────────────────────────────────────────────────────

const EVENT_TYPE_COLORS: Record<string, string> = {
  historical: "bg-red-100 text-red-800 border-red-200",
  tv_program: "bg-blue-100 text-blue-800 border-blue-200",
  iconic_ad: "bg-amber-100 text-amber-800 border-amber-200",
  cultural_phenomenon: "bg-purple-100 text-purple-800 border-purple-200",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  historical: "Evento Storico",
  tv_program: "Programma TV",
  iconic_ad: "Pubblicità Iconica",
  cultural_phenomenon: "Fenomeno Culturale",
};

const EVENT_TYPE_ICONS: Record<string, string> = {
  historical: "🏛",
  tv_program: "📺",
  iconic_ad: "📢",
  cultural_phenomenon: "🎭",
};

const IMPATTO_COLORS: Record<string, string> = {
  paura: "text-red-600",
  speranza: "text-green-600",
  rabbia: "text-orange-600",
  orgoglio: "text-blue-600",
  lutto: "text-gray-600",
  shock: "text-purple-600",
  gioia: "text-yellow-600",
  indignazione: "text-red-500",
  nostalgia: "text-indigo-500",
  curiosita: "text-teal-600",
  meraviglia: "text-cyan-600",
  tristezza: "text-slate-600",
};

function ValenceBar({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  const pct = Math.round(((value + 1) / 2) * 100);
  const color = value > 0.2 ? "bg-green-500" : value < -0.2 ? "bg-red-500" : "bg-gray-400";
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span>−1</span>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span>+1</span>
    </div>
  );
}

function RelevanceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.8 ? "bg-red-500" : value >= 0.6 ? "bg-amber-500" : "bg-blue-400";
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-400">{pct}%</span>
    </div>
  );
}

// ─── Timeline Item ────────────────────────────────────────────────────

function TimelineItem({ item, isLast }: { item: any; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const typeColor = EVENT_TYPE_COLORS[item.eventType] || "bg-gray-100 text-gray-800 border-gray-200";
  const typeIcon = EVENT_TYPE_ICONS[item.eventType] || "📌";
  const impattoColor = IMPATTO_COLORS[item.eventData?.impatto || ""] || "text-gray-600";

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-base flex-shrink-0 ${
          item.isFormativeYear ? "border-amber-400 bg-amber-50" : "border-gray-300 bg-white"
        }`}>
          {typeIcon}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
      </div>

      {/* Content */}
      <div className={`flex-1 mb-6 rounded-xl border p-4 ${
        item.isFormativeYear ? "border-amber-200 bg-amber-50/30" : "border-gray-200 bg-white"
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${typeColor}`}>
                {EVENT_TYPE_LABELS[item.eventType]}
              </span>
              {item.isFormativeYear && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  ⭐ Anno Formativo
                </span>
              )}
              {item.eventData?.tipo && (
                <span className="text-xs text-gray-500 capitalize">{item.eventData.tipo}</span>
              )}
            </div>
            <h4 className="font-semibold text-gray-900 text-sm leading-snug">
              {item.eventData?.titolo || "—"}
            </h4>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-bold text-gray-700">{item.eventData?.anno || "?"}</div>
            <div className="text-xs text-gray-500">età {item.ageAtEvent} anni</div>
          </div>
        </div>

        {/* Relevance + valence */}
        <div className="flex items-center gap-4 mb-2">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Rilevanza</div>
            <RelevanceBar value={item.relevanceScore} />
          </div>
          {item.emotionalValence !== null && (
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-0.5">Valenza emotiva</div>
              <ValenceBar value={item.emotionalValence} />
            </div>
          )}
          {item.eventData?.impatto && (
            <div className={`text-xs font-medium capitalize ${impattoColor}`}>
              {item.eventData.impatto}
            </div>
          )}
        </div>

        {/* Memory text */}
        {item.memoryText && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-xs text-gray-400 mb-1 font-medium">💭 Memoria in prima persona</div>
            <p className="text-sm text-gray-700 italic leading-relaxed">"{item.memoryText}"</p>
          </div>
        )}

        {/* Description (collapsible) */}
        {item.eventData?.descrizione && (
          <div className="mt-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              {expanded ? "▲ Nascondi descrizione" : "▼ Mostra descrizione"}
            </button>
            {expanded && (
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                {item.eventData.descrizione}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Archive Stats Card ───────────────────────────────────────────────

function ArchiveStatsCard({ stats, onLoad, loading }: {
  stats: any;
  onLoad: () => void;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Archivio Storico-Culturale</h3>
          <p className="text-xs text-gray-500 mt-0.5">Italia 1950–2025</p>
        </div>
        {!stats?.isLoaded && (
          <button
            onClick={onLoad}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Caricamento..." : "Carica Archivio"}
          </button>
        )}
        {stats?.isLoaded && (
          <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-800 rounded-full border border-green-200">
            ✓ Caricato
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Eventi Storici", value: stats?.totalEvents || 0, icon: "🏛", color: "text-red-600" },
          { label: "Programmi TV", value: stats?.totalPrograms || 0, icon: "📺", color: "text-blue-600" },
          { label: "Pubblicità Iconiche", value: stats?.totalAds || 0, icon: "📢", color: "text-amber-600" },
          { label: "Fenomeni Culturali", value: stats?.totalPhenomena || 0, icon: "🎭", color: "text-purple-600" },
        ].map(item => (
          <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {!stats?.isLoaded && (
        <p className="mt-3 text-xs text-gray-500 text-center">
          Carica l'archivio per abilitare la generazione delle memorie biografiche degli agenti.
        </p>
      )}
    </div>
  );
}

// ─── Agent Selector ───────────────────────────────────────────────────

function AgentSelector({ agents, selectedId, onSelect }: {
  agents: any[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Seleziona Agente</h3>
      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {agents.map(agent => (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
              selectedId === agent.id
                ? "bg-blue-50 border border-blue-200 text-blue-900"
                : "hover:bg-gray-50 border border-transparent text-gray-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                agent.generation === "Boomer" ? "bg-amber-500" :
                agent.generation === "GenX" ? "bg-blue-500" :
                agent.generation === "Millennial" ? "bg-green-500" :
                agent.generation === "GenZ" ? "bg-purple-500" : "bg-gray-500"
              }`}>
                {agent.firstName[0]}{agent.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{agent.firstName} {agent.lastName}</div>
                <div className="text-xs text-gray-500">{agent.age} anni · {agent.city} · {agent.generation}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function LifeHistory() {
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingOne, setGeneratingOne] = useState(false);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterFormative, setFilterFormative] = useState(false);
  const [generationResults, setGenerationResults] = useState<any[] | null>(null);

  const { data: archiveStats, refetch: refetchStats } = trpc.lifeHistory.archiveStats.useQuery();
  const { data: agents } = trpc.agents.list.useQuery();
  const { data: timeline, refetch: refetchTimeline, isLoading: timelineLoading } = trpc.lifeHistory.getTimeline.useQuery(
    { agentId: selectedAgentId! },
    { enabled: selectedAgentId !== null }
  );

  const loadArchive = trpc.lifeHistory.loadArchive.useMutation();
  const generateForAgent = trpc.lifeHistory.generateForAgent.useMutation();
  const generateForAll = trpc.lifeHistory.generateForAll.useMutation();

  const handleLoadArchive = async () => {
    setLoadingArchive(true);
    try {
      await loadArchive.mutateAsync();
      await refetchStats();
    } finally {
      setLoadingArchive(false);
    }
  };

  const handleGenerateForAgent = async () => {
    if (!selectedAgentId) return;
    setGeneratingOne(true);
    try {
      await generateForAgent.mutateAsync({ agentId: selectedAgentId });
      await refetchTimeline();
    } finally {
      setGeneratingOne(false);
    }
  };

  const handleGenerateForAll = async () => {
    setGeneratingAll(true);
    setGenerationResults(null);
    try {
      const results = await generateForAll.mutateAsync();
      setGenerationResults(results);
    } finally {
      setGeneratingAll(false);
    }
  };

  // Filter timeline
  const filteredTimeline = timeline?.filter(item => {
    if (filterType !== "all" && item.eventType !== filterType) return false;
    if (filterFormative && !item.isFormativeYear) return false;
    return true;
  }) || [];

  const selectedAgent = agents?.find(a => a.id === selectedAgentId);
  const formativeCount = timeline?.filter(t => t.isFormativeYear).length || 0;
  const withMemoryCount = timeline?.filter(t => t.memoryText).length || 0;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Life History Engine</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ogni agente ha vissuto 50+ anni di storia italiana. Qui puoi esplorare la sua memoria biografica.
          </p>
        </div>

        {/* Archive stats + actions */}
        <div className="mb-6 space-y-4">
          <ArchiveStatsCard
            stats={archiveStats}
            onLoad={handleLoadArchive}
            loading={loadingArchive}
          />

          {archiveStats?.isLoaded && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Generazione Memorie Biografiche</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    L'LLM analizza la storia di ogni agente e genera memorie in prima persona per gli eventi più rilevanti.
                  </p>
                </div>
                <button
                  onClick={handleGenerateForAll}
                  disabled={generatingAll || !agents?.length}
                  className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {generatingAll ? "Generazione in corso..." : "Genera per tutti gli agenti"}
                </button>
              </div>

              {generationResults && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {generationResults.map(r => (
                    <div key={r.agentId} className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-xs font-medium text-gray-700 truncate">{r.name}</div>
                      <div className="text-sm font-bold text-blue-600">{r.exposuresCreated}</div>
                      <div className="text-xs text-gray-400">esposizioni</div>
                      <div className="text-sm font-bold text-amber-600">{r.memoriesGenerated}</div>
                      <div className="text-xs text-gray-400">memorie</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main content: agent selector + timeline */}
        {agents && agents.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left: agent selector */}
            <div className="lg:col-span-1">
              <AgentSelector
                agents={agents}
                selectedId={selectedAgentId}
                onSelect={setSelectedAgentId}
              />
            </div>

            {/* Right: timeline */}
            <div className="lg:col-span-3">
              {selectedAgentId === null ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="text-4xl mb-3">👤</div>
                  <h3 className="font-semibold text-gray-700 mb-1">Seleziona un agente</h3>
                  <p className="text-sm text-gray-500">Scegli un agente dalla lista per esplorare la sua storia vissuta.</p>
                </div>
              ) : (
                <div>
                  {/* Agent header */}
                  {selectedAgent && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="font-bold text-gray-900">
                            {selectedAgent.firstName} {selectedAgent.lastName}
                          </h2>
                          <p className="text-sm text-gray-500">
                            {selectedAgent.age} anni · {selectedAgent.profession} · {selectedAgent.city} ({selectedAgent.geo}) · {selectedAgent.generation}
                          </p>
                          {timeline && (
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              <span><strong className="text-gray-900">{timeline.length}</strong> esposizioni totali</span>
                              <span><strong className="text-amber-600">{formativeCount}</strong> anni formativi</span>
                              <span><strong className="text-blue-600">{withMemoryCount}</strong> memorie generate</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleGenerateForAgent}
                          disabled={generatingOne}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {generatingOne ? "Generazione..." : "Genera storia"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Filters */}
                  {timeline && timeline.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-medium text-gray-500">Filtra:</span>
                      {["all", "historical", "tv_program", "iconic_ad"].map(type => (
                        <button
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            filterType === type
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                          }`}
                        >
                          {type === "all" ? "Tutti" : EVENT_TYPE_LABELS[type]}
                        </button>
                      ))}
                      <button
                        onClick={() => setFilterFormative(!filterFormative)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          filterFormative
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-white text-gray-600 border-gray-300 hover:border-amber-400"
                        }`}
                      >
                        ⭐ Solo Anni Formativi
                      </button>
                      <span className="text-xs text-gray-400 ml-auto">{filteredTimeline.length} elementi</span>
                    </div>
                  )}

                  {/* Timeline */}
                  {timelineLoading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                      <div className="text-2xl mb-2">⏳</div>
                      <p className="text-sm text-gray-500">Caricamento timeline...</p>
                    </div>
                  ) : filteredTimeline.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                      <div className="text-4xl mb-3">📭</div>
                      <h3 className="font-semibold text-gray-700 mb-1">Nessuna memoria trovata</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {timeline && timeline.length === 0
                          ? "Clicca 'Genera storia' per costruire la memoria biografica di questo agente."
                          : "Nessun elemento corrisponde ai filtri selezionati."}
                      </p>
                      {archiveStats?.isLoaded && timeline?.length === 0 && (
                        <button
                          onClick={handleGenerateForAgent}
                          disabled={generatingOne}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {generatingOne ? "Generazione..." : "Genera storia di vita"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="relative">
                        {filteredTimeline.map((item, idx) => (
                          <TimelineItem
                            key={item.id}
                            item={item}
                            isLast={idx === filteredTimeline.length - 1}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="font-semibold text-gray-700 mb-1">Nessun agente trovato</h3>
            <p className="text-sm text-gray-500">Vai su Agenti e inizializza i 10 agenti prototipo prima di usare il Life History Engine.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
