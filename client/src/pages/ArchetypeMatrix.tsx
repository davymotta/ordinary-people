import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const BIG_FIVE_DIMS = [
  { key: "openness", label: "Openness", low: "Conventional", high: "Creative" },
  { key: "conscientiousness", label: "Conscientiousness", low: "Spontaneous", high: "Disciplined" },
  { key: "extraversion", label: "Extraversion", low: "Introverted", high: "Outgoing" },
  { key: "agreeableness", label: "Agreeableness", low: "Competitive", high: "Cooperative" },
  { key: "neuroticism", label: "Neuroticism", low: "Stable", high: "Anxious" },
] as const;

const HAIDT_DIMS = [
  { key: "care_harm", label: "Care / Harm" },
  { key: "fairness_cheating", label: "Fairness / Cheating" },
  { key: "loyalty_betrayal", label: "Loyalty / Betrayal" },
  { key: "authority_subversion", label: "Authority / Subversion" },
  { key: "sanctity_degradation", label: "Sanctity / Degradation" },
  { key: "liberty_oppression", label: "Liberty / Oppression" },
] as const;

const ARCHETYPES = [
  { id: "innocent", label: "The Innocent", emoji: "🌸" },
  { id: "orphan", label: "The Regular Person", emoji: "🤝" },
  { id: "hero", label: "The Hero", emoji: "⚔️" },
  { id: "caregiver", label: "The Caregiver", emoji: "💚" },
  { id: "explorer", label: "The Explorer", emoji: "🧭" },
  { id: "rebel", label: "The Rebel", emoji: "🔥" },
  { id: "lover", label: "The Lover", emoji: "💫" },
  { id: "creator", label: "The Creator", emoji: "🎨" },
  { id: "jester", label: "The Jester", emoji: "🃏" },
  { id: "sage", label: "The Sage", emoji: "🦉" },
  { id: "magician", label: "The Magician", emoji: "✨" },
  { id: "ruler", label: "The Ruler", emoji: "👑" },
];

const CULTURAL_CLUSTERS = [
  { id: "northern_europe", label: "Northern Europe", flag: "🇸🇪" },
  { id: "western_europe", label: "Western Europe", flag: "🇩🇪" },
  { id: "southern_europe", label: "Southern Europe", flag: "🇮🇹" },
  { id: "eastern_europe", label: "Eastern Europe", flag: "🇵🇱" },
  { id: "anglo", label: "Anglo-Saxon", flag: "🇺🇸" },
  { id: "latin_america", label: "Latin America", flag: "🇧🇷" },
  { id: "east_asia_confucian", label: "East Asia (Confucian)", flag: "🇨🇳" },
  { id: "south_asia", label: "South Asia", flag: "🇮🇳" },
  { id: "middle_east", label: "Middle East", flag: "🇸🇦" },
  { id: "sub_saharan_africa", label: "Sub-Saharan Africa", flag: "🇳🇬" },
  { id: "nordic_protestant", label: "Nordic Protestant", flag: "🇮🇸" },
  { id: "global_urban", label: "Global Urban / Cosmopolitan", flag: "🌍" },
];

type BFLevel = "L" | "M" | "H";
type HLevel = "H" | "L";

const defaultBigFive = {
  openness: "M" as BFLevel,
  conscientiousness: "M" as BFLevel,
  extraversion: "M" as BFLevel,
  agreeableness: "M" as BFLevel,
  neuroticism: "M" as BFLevel,
};

const defaultHaidt = {
  care_harm: "H" as HLevel,
  fairness_cheating: "H" as HLevel,
  loyalty_betrayal: "L" as HLevel,
  authority_subversion: "L" as HLevel,
  sanctity_degradation: "L" as HLevel,
  liberty_oppression: "H" as HLevel,
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function ArchetypeMatrix() {
  const [bigFive, setBigFive] = useState(defaultBigFive);
  const [archetypeId, setArchetypeId] = useState("hero");
  const [haidt, setHaidt] = useState(defaultHaidt);
  const [culturalClusterId, setCulturalClusterId] = useState("southern_europe");
  const [generateLLMPrompt, setGenerateLLMPrompt] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"builder" | "profiles">("builder");

  const statsQuery = trpc.archetypeMatrix.stats.useQuery();
  const profilesQuery = trpc.archetypeMatrix.listProfiles.useQuery({ limit: 20, offset: 0 });
  const seedMutation = trpc.archetypeMatrix.seed.useMutation({
    onSuccess: () => {
      statsQuery.refetch();
    }
  });
  const generateMutation = trpc.archetypeMatrix.generateProfile.useMutation({
    onSuccess: (data) => {
      setLastResult(data);
      profilesQuery.refetch();
      statsQuery.refetch();
    }
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      bigFive,
      archetypeId,
      haidt,
      culturalClusterId,
      generateLLMPrompt,
    });
  };

  const stats = statsQuery.data;
  const isSeeded = stats && stats.clustersCount > 0;

  const bfLevelColor = (level: BFLevel) => {
    if (level === "H") return "bg-[#ff6b35] text-white";
    if (level === "M") return "bg-[#2a2a2a] text-[#c8c8c8]";
    return "bg-[#1a1a1a] text-[#666]";
  };

  const hLevelColor = (level: HLevel) => {
    if (level === "H") return "bg-[#ff6b35] text-white";
    return "bg-[#1a1a1a] text-[#666]";
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Motore Combinatorio Archetipi</h1>
            <p className="text-[#666] text-sm">
              Big Five × Pearson/Jung × Haidt × Hofstede — fino a 20.000 profili plausibili
            </p>
          </div>
          <div className="flex items-center gap-3">
            {stats && (
              <div className="flex gap-4 text-xs text-[#666]">
                <span className="text-[#ff6b35] font-mono">{stats.clustersCount} cluster</span>
                <span className="text-[#ff6b35] font-mono">{stats.archetypesCount} archetipi</span>
                <span className="text-[#ff6b35] font-mono">{stats.foundationsCount} fondamenti</span>
                <span className="text-[#ff6b35] font-mono">{stats.profilesCount} profili generati</span>
              </div>
            )}
            {!isSeeded && (
              <button
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="px-4 py-2 bg-[#ff6b35] text-white text-sm font-medium rounded-lg hover:bg-[#e55a25] disabled:opacity-50 transition-colors"
              >
                {seedMutation.isPending ? "Inizializzando..." : "Inizializza Matrice"}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#111] rounded-lg p-1 w-fit">
          {(["builder", "profiles"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                activeTab === tab
                  ? "bg-[#ff6b35] text-white font-medium"
                  : "text-[#666] hover:text-white"
              }`}
            >
              {tab === "builder" ? "Costruttore Profilo" : `Profili Generati (${stats?.profilesCount ?? 0})`}
            </button>
          ))}
        </div>

        {activeTab === "builder" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Axes */}
            <div className="lg:col-span-2 space-y-6">

              {/* Big Five */}
              <div className="bg-[#111] border border-[#222] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#ff6b35] uppercase tracking-wider mb-4">
                  Asse 1 — Big Five / OCEAN
                </h2>
                <div className="space-y-3">
                  {BIG_FIVE_DIMS.map(dim => (
                    <div key={dim.key} className="flex items-center gap-3">
                      <span className="text-[#888] text-xs w-36 shrink-0">{dim.label}</span>
                      <span className="text-[#444] text-xs w-20 text-right shrink-0">{dim.low}</span>
                      <div className="flex gap-1">
                        {(["L", "M", "H"] as BFLevel[]).map(level => (
                          <button
                            key={level}
                            onClick={() => setBigFive(prev => ({ ...prev, [dim.key]: level }))}
                            className={`w-8 h-8 text-xs font-bold rounded transition-all ${
                              bigFive[dim.key] === level
                                ? bfLevelColor(level)
                                : "bg-[#1a1a1a] text-[#444] hover:bg-[#222]"
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                      <span className="text-[#444] text-xs w-20 shrink-0">{dim.high}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pearson Archetypes */}
              <div className="bg-[#111] border border-[#222] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#ff6b35] uppercase tracking-wider mb-4">
                  Asse 2 — Archetipo Pearson/Jung
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {ARCHETYPES.map(arch => (
                    <button
                      key={arch.id}
                      onClick={() => setArchetypeId(arch.id)}
                      className={`p-3 rounded-lg text-left transition-all ${
                        archetypeId === arch.id
                          ? "bg-[#ff6b35] text-white"
                          : "bg-[#1a1a1a] text-[#888] hover:bg-[#222] hover:text-white"
                      }`}
                    >
                      <div className="text-lg mb-1">{arch.emoji}</div>
                      <div className="text-xs font-medium leading-tight">{arch.label.replace("The ", "")}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Haidt Moral Foundations */}
              <div className="bg-[#111] border border-[#222] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#ff6b35] uppercase tracking-wider mb-4">
                  Asse 3 — Fondamenti Morali di Haidt
                </h2>
                <div className="space-y-3">
                  {HAIDT_DIMS.map(dim => (
                    <div key={dim.key} className="flex items-center gap-3">
                      <span className="text-[#888] text-xs flex-1">{dim.label}</span>
                      <div className="flex gap-1">
                        {(["H", "L"] as HLevel[]).map(level => (
                          <button
                            key={level}
                            onClick={() => setHaidt(prev => ({ ...prev, [dim.key]: level }))}
                            className={`w-12 h-8 text-xs font-bold rounded transition-all ${
                              haidt[dim.key] === level
                                ? hLevelColor(level)
                                : "bg-[#1a1a1a] text-[#444] hover:bg-[#222]"
                            }`}
                          >
                            {level === "H" ? "Alto" : "Basso"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cultural Cluster */}
              <div className="bg-[#111] border border-[#222] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#ff6b35] uppercase tracking-wider mb-4">
                  Asse 4 — Cluster Culturale Hofstede
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CULTURAL_CLUSTERS.map(cluster => (
                    <button
                      key={cluster.id}
                      onClick={() => setCulturalClusterId(cluster.id)}
                      className={`p-3 rounded-lg text-left transition-all ${
                        culturalClusterId === cluster.id
                          ? "bg-[#ff6b35] text-white"
                          : "bg-[#1a1a1a] text-[#888] hover:bg-[#222] hover:text-white"
                      }`}
                    >
                      <div className="text-lg mb-1">{cluster.flag}</div>
                      <div className="text-xs font-medium leading-tight">{cluster.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Generate + Result */}
            <div className="space-y-4">
              {/* Profile ID Preview */}
              <div className="bg-[#111] border border-[#222] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#ff6b35] uppercase tracking-wider mb-3">
                  Profilo Corrente
                </h2>
                <div className="font-mono text-xs text-[#888] space-y-1">
                  <div>
                    <span className="text-[#444]">BF: </span>
                    <span className="text-white">
                      {bigFive.openness}{bigFive.conscientiousness}{bigFive.extraversion}{bigFive.agreeableness}{bigFive.neuroticism}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#444]">Arch: </span>
                    <span className="text-white">{ARCHETYPES.find(a => a.id === archetypeId)?.label}</span>
                  </div>
                  <div>
                    <span className="text-[#444]">Haidt: </span>
                    <span className="text-white">
                      {haidt.care_harm}{haidt.fairness_cheating}{haidt.loyalty_betrayal}{haidt.authority_subversion}{haidt.sanctity_degradation}{haidt.liberty_oppression}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#444]">Cluster: </span>
                    <span className="text-white">{CULTURAL_CLUSTERS.find(c => c.id === culturalClusterId)?.label}</span>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="bg-[#111] border border-[#222] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#ff6b35] uppercase tracking-wider mb-3">
                  Opzioni
                </h2>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateLLMPrompt}
                    onChange={e => setGenerateLLMPrompt(e.target.checked)}
                    className="w-4 h-4 accent-[#ff6b35]"
                  />
                  <span className="text-[#888] text-sm">Genera System Prompt LLM</span>
                </label>
                <p className="text-[#444] text-xs mt-2">
                  Richiede una chiamata LLM (~2s). Il profilo viene salvato con il prompt narrativo completo.
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !isSeeded}
                className="w-full py-3 bg-[#ff6b35] text-white font-semibold rounded-xl hover:bg-[#e55a25] disabled:opacity-50 transition-colors"
              >
                {generateMutation.isPending
                  ? "Generando..."
                  : !isSeeded
                  ? "Prima inizializza la matrice"
                  : "Genera Profilo"}
              </button>

              {/* Result */}
              {lastResult && (
                <div className={`bg-[#111] border rounded-xl p-5 ${
                  lastResult.isValid ? "border-green-800" : "border-yellow-800"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${lastResult.isValid ? "bg-green-500" : "bg-yellow-500"}`} />
                    <span className="text-sm font-medium text-white">
                      {lastResult.isValid ? "Profilo Coerente" : "Profilo con Avvisi"}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-[#888] mb-3 break-all">
                    {lastResult.archetypeProfileId}
                  </div>

                  {lastResult.violations?.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-yellow-500 font-medium mb-1">Violazioni coerenza:</div>
                      {lastResult.violations.map((v: any, i: number) => (
                        <div key={i} className="text-xs text-[#666] pl-2 border-l border-yellow-800">
                          [{v.severity}] {v.description}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#444]">Activity Level</span>
                      <span className="text-white">{lastResult.mirofishParams?.activityLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#444]">Sentiment Bias</span>
                      <span className={lastResult.mirofishParams?.sentimentBias >= 0 ? "text-green-400" : "text-red-400"}>
                        {lastResult.mirofishParams?.sentimentBias > 0 ? "+" : ""}{lastResult.mirofishParams?.sentimentBias}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#444]">Stance</span>
                      <span className="text-[#ff6b35]">{lastResult.mirofishParams?.stance}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#444]">Influence Weight</span>
                      <span className="text-white">{lastResult.mirofishParams?.influenceWeight}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#444]">Echo Chamber</span>
                      <span className="text-white">{lastResult.mirofishParams?.echoChamberStrength}</span>
                    </div>
                  </div>

                  {lastResult.systemPrompt && (
                    <div className="mt-3 pt-3 border-t border-[#222]">
                      <div className="text-xs text-[#ff6b35] font-medium mb-2">System Prompt Generato:</div>
                      <div className="text-xs text-[#666] leading-relaxed max-h-40 overflow-y-auto">
                        {lastResult.systemPrompt}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "profiles" && (
          <div className="space-y-3">
            {profilesQuery.isLoading && (
              <div className="text-[#444] text-sm">Caricamento profili...</div>
            )}
            {profilesQuery.data?.length === 0 && (
              <div className="text-[#444] text-sm text-center py-12">
                Nessun profilo generato ancora. Usa il Costruttore Profilo per creare il primo.
              </div>
            )}
            {profilesQuery.data?.map(profile => (
              <div key={profile.id} className="bg-[#111] border border-[#222] rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-xs text-[#ff6b35] mb-1">{profile.archetypeProfileId}</div>
                    <div className="flex gap-3 text-xs text-[#666]">
                      <span>BF: {profile.openness}{profile.conscientiousness}{profile.extraversion}{profile.agreeableness}{profile.neuroticism}</span>
                      <span>Arch: {profile.archetypeId}</span>
                      <span>Cluster: {profile.culturalClusterId}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs shrink-0">
                    <span className={`px-2 py-1 rounded ${
                      profile.stance === "supportive" ? "bg-green-900 text-green-300" :
                      profile.stance === "opposing" ? "bg-red-900 text-red-300" :
                      profile.stance === "observer" ? "bg-blue-900 text-blue-300" :
                      "bg-[#1a1a1a] text-[#666]"
                    }`}>{profile.stance}</span>
                    {profile.hasCoherenceViolations && (
                      <span className="px-2 py-1 rounded bg-yellow-900 text-yellow-300">⚠ avvisi</span>
                    )}
                    {profile.systemPrompt && (
                      <span className="px-2 py-1 rounded bg-purple-900 text-purple-300">LLM</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-[#444]">
                  <span>Activity: {profile.activityLevel}</span>
                  <span>Bias: {profile.sentimentBias > 0 ? "+" : ""}{profile.sentimentBias}</span>
                  <span>Influence: {profile.influenceWeight}</span>
                  <span>Echo: {profile.echoChamberStrength}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
