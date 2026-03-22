import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

type Generation = "silent" | "boomer" | "genx" | "millennial" | "genz" | "alpha";
type Gender = "male" | "female";
type PoliticalOrientation = "progressive" | "moderate" | "conservative";
type Urbanization = "rural" | "suburban" | "urban" | "metro";

interface SamplingOptions {
  count: number;
  culturalCluster?: string;
  generation?: Generation;
  gender?: Gender;
  politicalOrientation?: PoliticalOrientation;
  urbanization?: Urbanization;
  seed?: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DistributionBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-right text-gray-400 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color} transition-all duration-500`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="w-8 text-gray-300 shrink-0">{pct}%</span>
    </div>
  );
}

function BigFiveBar({ trait, levels }: { trait: string; levels: { low: number; medium: number; high: number } }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-gray-300 capitalize">{trait}</div>
      <div className="flex gap-1 h-4">
        <div
          className="bg-blue-600 rounded-l text-[10px] flex items-center justify-center text-white"
          style={{ width: `${levels.low}%` }}
          title={`Low: ${levels.low}%`}
        >
          {levels.low > 8 ? `${levels.low}%` : ""}
        </div>
        <div
          className="bg-gray-500 text-[10px] flex items-center justify-center text-white"
          style={{ width: `${levels.medium}%` }}
          title={`Medium: ${levels.medium}%`}
        >
          {levels.medium > 8 ? `${levels.medium}%` : ""}
        </div>
        <div
          className="bg-purple-600 rounded-r text-[10px] flex items-center justify-center text-white"
          style={{ width: `${levels.high}%` }}
          title={`High: ${levels.high}%`}
        >
          {levels.high > 8 ? `${levels.high}%` : ""}
        </div>
      </div>
    </div>
  );
}

function HaidtRadar({ avg }: { avg: Record<string, number> }) {
  const foundations = [
    { key: "care", label: "Care", color: "text-pink-400" },
    { key: "equality", label: "Equality", color: "text-blue-400" },
    { key: "proportionality", label: "Proport.", color: "text-cyan-400" },
    { key: "loyalty", label: "Loyalty", color: "text-yellow-400" },
    { key: "authority", label: "Authority", color: "text-orange-400" },
    { key: "purity", label: "Purity", color: "text-purple-400" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {foundations.map(f => (
        <div key={f.key} className="text-center">
          <div className={`text-xs font-medium ${f.color}`}>{f.label}</div>
          <div className="text-lg font-bold text-white">{(avg[f.key] * 100).toFixed(0)}</div>
          <div className="w-full bg-gray-800 rounded-full h-1.5 mt-1">
            <div
              className="h-1.5 rounded-full bg-current transition-all"
              style={{ width: `${avg[f.key] * 100}%`, color: "inherit" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileCard({ profile }: { profile: any }) {
  const [expanded, setExpanded] = useState(false);

  const archetypeEmoji: Record<string, string> = {
    innocent: "🌸", everyman: "👤", hero: "⚔️", caregiver: "💝",
    explorer: "🧭", rebel: "🔥", lover: "💕", creator: "🎨",
    jester: "🃏", sage: "📚", magician: "✨", ruler: "👑",
  };

  const generationColor: Record<string, string> = {
    silent: "text-gray-400", boomer: "text-yellow-400", genx: "text-blue-400",
    millennial: "text-green-400", genz: "text-purple-400", alpha: "text-pink-400",
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-500 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{archetypeEmoji[profile.pearson_archetype?.primary] ?? "👤"}</span>
            <div>
              <div className="text-sm font-semibold text-white capitalize">
                {profile.pearson_archetype?.primary ?? "—"}
                {profile.pearson_archetype?.secondary && (
                  <span className="text-xs text-gray-400 ml-1">+ {profile.pearson_archetype.secondary}</span>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {profile.gender} · {profile.age_2026}y ·{" "}
                <span className={generationColor[profile.generation] ?? "text-gray-400"}>
                  {profile.generation}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-gray-400">{profile.country_code}</div>
          <div className="text-xs text-gray-500 capitalize">{profile.urbanization}</div>
        </div>
      </div>

      {/* Big Five mini bars */}
      <div className="mt-2 grid grid-cols-5 gap-1">
        {(["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"] as const).map(trait => {
          const level = profile.big_five?.levels?.[trait];
          const raw = profile.big_five?.raw?.[trait] ?? 0.5;
          const color = level === "high" ? "bg-purple-500" : level === "low" ? "bg-blue-600" : "bg-gray-500";
          return (
            <div key={trait} title={`${trait}: ${(raw * 100).toFixed(0)} (${level})`}>
              <div className="text-[9px] text-gray-500 text-center truncate">{trait.slice(0, 3).toUpperCase()}</div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${raw * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Mirofish params */}
      <div className="mt-2 flex flex-wrap gap-1">
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          profile.mirofish?.stance === "supportive" ? "bg-green-900 text-green-300" :
          profile.mirofish?.stance === "opposing" ? "bg-red-900 text-red-300" :
          profile.mirofish?.stance === "observer" ? "bg-gray-700 text-gray-300" :
          "bg-yellow-900 text-yellow-300"
        }`}>
          {profile.mirofish?.stance ?? "neutral"}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
          act: {((profile.mirofish?.activity_level ?? 0) * 100).toFixed(0)}%
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
          echo: {((profile.mirofish?.echo_chamber_strength ?? 0) * 100).toFixed(0)}%
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          (profile.mirofish?.sentiment_bias ?? 0) > 0.2 ? "bg-green-900 text-green-300" :
          (profile.mirofish?.sentiment_bias ?? 0) < -0.2 ? "bg-red-900 text-red-300" :
          "bg-gray-700 text-gray-300"
        }`}>
          bias: {profile.mirofish?.sentiment_bias > 0 ? "+" : ""}{(profile.mirofish?.sentiment_bias ?? 0).toFixed(2)}
        </span>
      </div>

      {/* Bourdieu */}
      <div className="mt-1 text-[10px] text-gray-500">
        {profile.bourdieu?.class_position?.replace(/_/g, " ")} · {profile.bourdieu?.education_level} · Q{profile.bourdieu?.income_quintile}
      </div>

      {/* Coherence */}
      <div className="mt-1 flex items-center gap-1">
        <div className="text-[10px] text-gray-500">coherence</div>
        <div className="flex-1 bg-gray-700 rounded-full h-1">
          <div
            className={`h-1 rounded-full ${
              (profile.coherence_score ?? 1) >= 0.8 ? "bg-green-500" :
              (profile.coherence_score ?? 1) >= 0.6 ? "bg-yellow-500" : "bg-red-500"
            }`}
            style={{ width: `${(profile.coherence_score ?? 1) * 100}%` }}
          />
        </div>
        <div className="text-[10px] text-gray-400">{((profile.coherence_score ?? 1) * 100).toFixed(0)}%</div>
      </div>

      {/* Expand button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
      >
        {expanded ? "▲ meno" : "▼ dettagli"}
      </button>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-700 space-y-1 text-[10px] text-gray-400">
          <div>
            <span className="text-gray-500">Haidt: </span>
            care {(profile.haidt?.care * 100).toFixed(0)} | eq {(profile.haidt?.equality * 100).toFixed(0)} | loy {(profile.haidt?.loyalty * 100).toFixed(0)} | auth {(profile.haidt?.authority * 100).toFixed(0)} | pur {(profile.haidt?.purity * 100).toFixed(0)}
          </div>
          <div>
            <span className="text-gray-500">Hofstede: </span>
            PDI {profile.hofstede?.power_distance} | IDV {profile.hofstede?.individualism} | MAS {profile.hofstede?.masculinity} | UAI {profile.hofstede?.uncertainty_avoidance}
          </div>
          <div>
            <span className="text-gray-500">Inglehart: </span>
            trad/sec {profile.inglehart_welzel?.traditional_secular?.toFixed(1)} | surv/self {profile.inglehart_welzel?.survival_selfexpression?.toFixed(1)}
          </div>
          <div>
            <span className="text-gray-500">Media: </span>
            {profile.media_diet?.dominant_medium?.replace(/_/g, " ")} · cynicism {((profile.media_diet?.advertising_cynicism ?? 0) * 100).toFixed(0)}% · attn {profile.media_diet?.attention_span_seconds}s
          </div>
          <div>
            <span className="text-gray-500">Platforms: </span>
            {profile.media_diet?.platforms?.join(", ")}
          </div>
          <div>
            <span className="text-gray-500">Political: </span>
            {(profile.haidt?.political_orientation * 100).toFixed(0)}/100 ({
              profile.haidt?.political_orientation < 0.35 ? "progressive" :
              profile.haidt?.political_orientation > 0.65 ? "conservative" : "moderate"
            })
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalibratedSamplerPage() {
  const [options, setOptions] = useState<SamplingOptions>({ count: 50 });
  const [activeTab, setActiveTab] = useState<"stats" | "profiles">("stats");
  const [batchResult, setBatchResult] = useState<any>(null);
  const [statsResult, setStatsResult] = useState<any>(null);
  const [singleProfile, setSingleProfile] = useState<any>(null);

  const { data: clusters } = trpc.calibratedSampler.listClusters.useQuery();

  const sampleBatchMutation = trpc.calibratedSampler.sampleBatch.useMutation({
    onSuccess: (data) => {
      setBatchResult(data);
      setStatsResult(data.stats);
      setActiveTab("profiles");
    },
  });

  const batchStatsMutation = trpc.calibratedSampler.batchStats.useMutation({
    onSuccess: (data) => {
      setStatsResult(data);
      setActiveTab("stats");
    },
  });

  const sampleOneMutation = trpc.calibratedSampler.sampleOne.useMutation({
    onSuccess: (data) => {
      setSingleProfile(data);
    },
  });

  const isLoading = sampleBatchMutation.isPending || batchStatsMutation.isPending || sampleOneMutation.isPending;

  const generations: Generation[] = ["silent", "boomer", "genx", "millennial", "genz", "alpha"];
  const genders: Gender[] = ["male", "female"];
  const politicalOrientations: PoliticalOrientation[] = ["progressive", "moderate", "conservative"];
  const urbanizations: Urbanization[] = ["rural", "suburban", "urban", "metro"];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Calibrated Sampler</h1>
          <p className="text-gray-400 text-sm mt-1">
            Generazione statistica di profili psicologici realistici — Big Five (N=307k), Pearson/PMAI, Haidt, Hofstede, Inglehart-Welzel, Bourdieu
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Controls */}
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
              <h2 className="text-sm font-semibold text-gray-200 mb-3">Parametri di Sampling</h2>

              {/* Count */}
              <div className="space-y-1 mb-3">
                <label className="text-xs text-gray-400">Numero profili: {options.count}</label>
                <input
                  type="range" min={10} max={500} step={10}
                  value={options.count}
                  onChange={e => setOptions(o => ({ ...o, count: Number(e.target.value) }))}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>10</span><span>500</span>
                </div>
              </div>

              {/* Cultural Cluster */}
              <div className="space-y-1 mb-3">
                <label className="text-xs text-gray-400">Cluster Culturale</label>
                <select
                  value={options.culturalCluster ?? ""}
                  onChange={e => setOptions(o => ({ ...o, culturalCluster: e.target.value || undefined }))}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white"
                >
                  <option value="">Tutti i cluster</option>
                  {clusters?.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.countries})</option>
                  ))}
                </select>
              </div>

              {/* Generation */}
              <div className="space-y-1 mb-3">
                <label className="text-xs text-gray-400">Generazione</label>
                <div className="flex flex-wrap gap-1">
                  {generations.map(g => (
                    <button
                      key={g}
                      onClick={() => setOptions(o => ({ ...o, generation: o.generation === g ? undefined : g }))}
                      className={`text-[10px] px-2 py-1 rounded transition-colors ${
                        options.generation === g
                          ? "bg-purple-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-1 mb-3">
                <label className="text-xs text-gray-400">Genere</label>
                <div className="flex gap-1">
                  {genders.map(g => (
                    <button
                      key={g}
                      onClick={() => setOptions(o => ({ ...o, gender: o.gender === g ? undefined : g }))}
                      className={`text-[10px] px-2 py-1 rounded transition-colors ${
                        options.gender === g
                          ? "bg-blue-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Political Orientation */}
              <div className="space-y-1 mb-3">
                <label className="text-xs text-gray-400">Orientamento Politico</label>
                <div className="flex gap-1">
                  {politicalOrientations.map(p => (
                    <button
                      key={p}
                      onClick={() => setOptions(o => ({ ...o, politicalOrientation: o.politicalOrientation === p ? undefined : p }))}
                      className={`text-[10px] px-2 py-1 rounded transition-colors ${
                        options.politicalOrientation === p
                          ? "bg-orange-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Urbanization */}
              <div className="space-y-1 mb-4">
                <label className="text-xs text-gray-400">Urbanizzazione</label>
                <div className="flex gap-1">
                  {urbanizations.map(u => (
                    <button
                      key={u}
                      onClick={() => setOptions(o => ({ ...o, urbanization: o.urbanization === u ? undefined : u }))}
                      className={`text-[10px] px-2 py-1 rounded transition-colors ${
                        options.urbanization === u
                          ? "bg-green-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => batchStatsMutation.mutate({ count: options.count, culturalCluster: options.culturalCluster, generation: options.generation })}
                  disabled={isLoading}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {batchStatsMutation.isPending ? "Calcolo..." : "Calcola Statistiche"}
                </button>
                <button
                  onClick={() => sampleBatchMutation.mutate(options)}
                  disabled={isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {sampleBatchMutation.isPending ? `Generando ${options.count} profili...` : `Genera ${options.count} Profili`}
                </button>
                <button
                  onClick={() => sampleOneMutation.mutate(options)}
                  disabled={isLoading}
                  className="w-full bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {sampleOneMutation.isPending ? "Generando..." : "Profilo Singolo"}
                </button>
              </div>
            </div>

            {/* Single Profile Preview */}
            {singleProfile && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 mb-2">Profilo Singolo</h3>
                <ProfileCard profile={singleProfile} />
              </div>
            )}
          </div>

          {/* Right: Stats + Profiles */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("stats")}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === "stats" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Distribuzione Statistica
              </button>
              <button
                onClick={() => setActiveTab("profiles")}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === "profiles" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Profili ({batchResult?.count ?? 0})
              </button>
            </div>

            {/* Stats Tab */}
            {activeTab === "stats" && (
              <div className="space-y-4">
                {!statsResult ? (
                  <div className="bg-gray-900 rounded-xl p-8 border border-gray-700 text-center">
                    <div className="text-gray-500 text-sm">
                      Clicca "Calcola Statistiche" per vedere la distribuzione del campione
                    </div>
                    <div className="text-gray-600 text-xs mt-2">
                      Il sampler usa dati empirici reali: Big Five norms (N=307k), PMAI, WVS Wave 7, Hofstede 2015
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Summary */}
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 md:col-span-2">
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-white">{statsResult.total}</div>
                          <div className="text-xs text-gray-400">Profili</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-400">{(statsResult.avg_coherence_score * 100).toFixed(0)}%</div>
                          <div className="text-xs text-gray-400">Coerenza media</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-400">{(statsResult.avg_activity_level * 100).toFixed(0)}%</div>
                          <div className="text-xs text-gray-400">Activity level</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-orange-400">{(statsResult.avg_echo_chamber * 100).toFixed(0)}%</div>
                          <div className="text-xs text-gray-400">Echo chamber</div>
                        </div>
                      </div>
                    </div>

                    {/* Big Five Distribution */}
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                      <h3 className="text-xs font-semibold text-gray-300 mb-3">Big Five Distribution</h3>
                      <div className="space-y-2">
                        {Object.entries(statsResult.big_five_distribution ?? {}).map(([trait, levels]: [string, any]) => (
                          <BigFiveBar key={trait} trait={trait} levels={levels} />
                        ))}
                      </div>
                      <div className="mt-2 flex gap-3 text-[10px]">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>Low</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block"></span>Medium</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-600 inline-block"></span>High</span>
                      </div>
                      <div className="mt-1 text-[10px] text-gray-600">
                        Atteso: 16% low / 68% medium / 16% high (±1 SD)
                      </div>
                    </div>

                    {/* Archetype Distribution */}
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                      <h3 className="text-xs font-semibold text-gray-300 mb-3">Archetipi Pearson (PMAI)</h3>
                      <div className="space-y-1">
                        {Object.entries(statsResult.archetype_distribution ?? {})
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([archetype, pct]) => (
                            <DistributionBar
                              key={archetype}
                              label={archetype}
                              pct={pct as number}
                              color="bg-purple-500"
                            />
                          ))}
                      </div>
                    </div>

                    {/* Generation Distribution */}
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                      <h3 className="text-xs font-semibold text-gray-300 mb-3">Generazioni</h3>
                      <div className="space-y-1">
                        {Object.entries(statsResult.generation_distribution ?? {})
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([gen, pct]) => (
                            <DistributionBar key={gen} label={gen} pct={pct as number} color="bg-green-500" />
                          ))}
                      </div>
                    </div>

                    {/* Class Distribution */}
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                      <h3 className="text-xs font-semibold text-gray-300 mb-3">Classi Bourdieu</h3>
                      <div className="space-y-1">
                        {Object.entries(statsResult.class_distribution ?? {})
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([cls, pct]) => (
                            <DistributionBar
                              key={cls}
                              label={cls.replace(/_/g, " ")}
                              pct={pct as number}
                              color="bg-yellow-500"
                            />
                          ))}
                      </div>
                    </div>

                    {/* Haidt Foundations */}
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                      <h3 className="text-xs font-semibold text-gray-300 mb-3">Fondamenti Morali Haidt (media)</h3>
                      <HaidtRadar avg={statsResult.avg_haidt ?? {}} />
                      <div className="mt-3 text-[10px] text-gray-500">
                        Orientamento politico medio: {(statsResult.avg_haidt?.political_orientation * 100).toFixed(0)}/100
                        ({statsResult.avg_haidt?.political_orientation < 0.35 ? "progressivo" :
                          statsResult.avg_haidt?.political_orientation > 0.65 ? "conservatore" : "moderato"})
                      </div>
                    </div>

                    {/* Gender Distribution */}
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
                      <h3 className="text-xs font-semibold text-gray-300 mb-3">Genere</h3>
                      <div className="space-y-1">
                        {Object.entries(statsResult.gender_distribution ?? {}).map(([g, pct]) => (
                          <DistributionBar key={g} label={g} pct={pct as number} color="bg-blue-500" />
                        ))}
                      </div>
                      <div className="mt-2 text-[10px] text-gray-600">
                        Atteso: 51% female / 49% male (distribuzione globale)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profiles Tab */}
            {activeTab === "profiles" && (
              <div>
                {!batchResult ? (
                  <div className="bg-gray-900 rounded-xl p-8 border border-gray-700 text-center">
                    <div className="text-gray-500 text-sm">
                      Clicca "Genera Profili" per vedere i profili individuali
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto pr-1">
                    {batchResult.profiles.map((profile: any) => (
                      <ProfileCard key={profile.id} profile={profile} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
