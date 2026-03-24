/**
 * PsycheCalibration — Strumento di calibrazione manuale del grafo Psyche
 * 
 * Permette di:
 * - Selezionare un agente e un brand
 * - Sovrascrivere ferita primaria, shadow, desiderio, inner voice
 * - Iniettare stimoli manuali per testare la risposta del grafo
 * - Visualizzare l'anteprima del [PSYCHE_STATE] che verrebbe iniettato nel prompt LLM
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { LabLayout } from "@/components/LabLayout";

const STIMULUS_THEMES = [
  "luxury", "scarcity", "exclusion", "social_proof", "nostalgia",
  "authority", "fear", "hope", "identity", "belonging",
  "achievement", "freedom", "security", "novelty", "tradition",
  "sustainability", "status", "community", "self_improvement", "humor",
];

const INNER_VOICE_OPTIONS = ["critical", "nurturing", "neutral", "aspirational"] as const;

const WOUND_PRESETS = [
  "inadeguatezza", "abbandono", "tradimento", "umiliazione", "rifiuto",
  "invisibilità", "fallimento", "non meritare amore", "perdita di controllo",
];

const SHADOW_PRESETS = [
  "invidia", "arroganza", "avidità", "aggressività", "dipendenza",
  "manipolazione", "pigrizia", "paura del successo",
];

function SliderField({ label, value, onChange, min = 0, max = 1, step = 0.05 }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span>
        <span className="font-mono font-semibold">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) => onChange(parseFloat((e.target as HTMLInputElement).value))}
        className="w-full accent-violet-600"
      />
    </div>
  );
}

export default function PsycheCalibration() {
  const [selectedBrandAgentId, setSelectedBrandAgentId] = useState<number | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  // Override parametri profilo
  const [coreWound, setCoreWound] = useState("");
  const [coreShadow, setCoreShadow] = useState("");
  const [coreDesire, setCoreDesire] = useState("");
  const [innerVoice, setInnerVoice] = useState<"critical" | "nurturing" | "neutral" | "aspirational">("neutral");

  // Big Five overrides
  const [openness, setOpenness] = useState(0.5);
  const [conscientiousness, setConscientiousness] = useState(0.5);
  const [extraversion, setExtraversion] = useState(0.5);
  const [agreeableness, setAgreeableness] = useState(0.5);
  const [neuroticism, setNeuroticism] = useState(0.5);

  // Stimolo manuale
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [stimulusIntensity, setStimulusIntensity] = useState(0.5);

  const [result, setResult] = useState<any>(null);

  const brandAgentsQuery = trpc.onboarding.listBrandAgents.useQuery();
  const brandAgents = brandAgentsQuery.data ?? [];

  const agentsQuery = trpc.agents.list.useQuery();
  const agents = agentsQuery.data ?? [];

  const calibrateMutation = trpc.psyche.calibrate.useMutation({
    onSuccess: (data) => setResult(data),
  });

  function toggleTheme(theme: string) {
    setSelectedThemes(prev =>
      prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]
    );
  }

  function handleCalibrate() {
    if (!selectedAgentId || !selectedBrandAgentId) return;
    calibrateMutation.mutate({
      agentId: selectedAgentId,
      brandAgentId: selectedBrandAgentId,
      coreWound: coreWound || undefined,
      coreShadow: coreShadow || undefined,
      coreDesire: coreDesire || undefined,
      innerVoice,
      openness,
      conscientiousness,
      extraversion,
      agreeableness,
      neuroticism,
      stimulusThemes: selectedThemes.length > 0 ? selectedThemes : undefined,
      stimulusIntensity,
    });
  }

  const ps = result?.psycheState;

  return (
    <LabLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Psyche Calibration Tool</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Calibra manualmente la personalità psicologica di un agente e visualizza l'anteprima del prompt che verrebbe iniettato nel sistema LLM.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pannello configurazione */}
          <div className="space-y-5">
            {/* Selettori */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Selezione Agente</h2>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Brand</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
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
                <label className="block text-xs text-slate-500 mb-1">Agente</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
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

            {/* Ferite e shadow */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Nucleo Psicologico</h2>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Ferita Primaria</label>
                <input
                  type="text"
                  list="wound-presets"
                  value={coreWound}
                  onInput={(e) => setCoreWound((e.target as HTMLInputElement).value)}
                  placeholder="es. inadeguatezza, abbandono..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <datalist id="wound-presets">
                  {WOUND_PRESETS.map(w => <option key={w} value={w} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Shadow (Sé Rifiutato)</label>
                <input
                  type="text"
                  list="shadow-presets"
                  value={coreShadow}
                  onInput={(e) => setCoreShadow((e.target as HTMLInputElement).value)}
                  placeholder="es. invidia, arroganza..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
                <datalist id="shadow-presets">
                  {SHADOW_PRESETS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Desiderio Primario</label>
                <input
                  type="text"
                  value={coreDesire}
                  onInput={(e) => setCoreDesire((e.target as HTMLInputElement).value)}
                  placeholder="es. riconoscimento, libertà, sicurezza..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Voce Interiore</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={innerVoice}
                  onChange={(e) => setInnerVoice((e.target as HTMLSelectElement).value as any)}
                >
                  {INNER_VOICE_OPTIONS.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Big Five */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Big Five Override</h2>
              <SliderField label="Apertura (Openness)" value={openness} onChange={setOpenness} />
              <SliderField label="Coscienziosità" value={conscientiousness} onChange={setConscientiousness} />
              <SliderField label="Estroversione" value={extraversion} onChange={setExtraversion} />
              <SliderField label="Gradevolezza" value={agreeableness} onChange={setAgreeableness} />
              <SliderField label="Nevroticismo" value={neuroticism} onChange={setNeuroticism} />
            </div>

            {/* Stimolo manuale */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Stimolo Manuale</h2>
              <div className="flex flex-wrap gap-2">
                {STIMULUS_THEMES.map(theme => (
                  <button
                    key={theme}
                    onClick={() => toggleTheme(theme)}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedThemes.includes(theme)
                        ? "bg-violet-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
              {selectedThemes.length > 0 && (
                <SliderField
                  label="Intensità stimolo"
                  value={stimulusIntensity}
                  onChange={setStimulusIntensity}
                />
              )}
            </div>

            <button
              onClick={handleCalibrate}
              disabled={!selectedAgentId || !selectedBrandAgentId || calibrateMutation.isPending}
              className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {calibrateMutation.isPending ? "Calibrazione in corso..." : "Applica Calibrazione"}
            </button>

            {calibrateMutation.isError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-sm">
                Errore: {calibrateMutation.error?.message}
              </div>
            )}
          </div>

          {/* Pannello risultati */}
          <div className="space-y-5">
            {!result && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center h-full flex flex-col items-center justify-center">
                <div className="text-4xl mb-3">🧠</div>
                <p className="text-slate-600 font-medium">Configura i parametri e applica la calibrazione.</p>
                <p className="text-slate-400 text-sm mt-1">
                  Il risultato mostrerà il grafo aggiornato e l'anteprima del prompt LLM.
                </p>
              </div>
            )}

            {ps && (
              <>
                {/* KPI */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <h2 className="text-sm font-semibold text-slate-700 mb-3">Stato Risultante</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500">Mood</div>
                      <div className="font-semibold text-slate-800 capitalize">{ps.mood}</div>
                      <div className="text-xs text-slate-400">intensità {Math.round(ps.mood_intensity * 100)}%</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500">Modalità</div>
                      <div className="font-semibold text-slate-800 capitalize">{ps.processing_mode}</div>
                      <div className="text-xs text-slate-400">arousal: {ps.arousal}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500">Postura Sociale</div>
                      <div className="font-semibold text-slate-800 capitalize">{ps.social_posture?.replace(/_/g, " ")}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500">Ferita / Shadow</div>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {ps.wound_active && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-xs">ferita attiva</span>}
                        {ps.shadow_active && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">shadow attivo</span>}
                        {!ps.wound_active && !ps.shadow_active && <span className="text-xs text-slate-400">nessuno</span>}
                      </div>
                    </div>
                  </div>

                  {ps.active_biases?.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-slate-500 mb-1">Bias Attivi</div>
                      <div className="flex flex-wrap gap-1">
                        {ps.active_biases.map((b: string) => (
                          <span key={b} className="px-2 py-0.5 bg-violet-100 text-violet-800 rounded-full text-xs">{b.replace(/_/g, " ")}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Anteprima prompt */}
                {result.promptPreview && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <h2 className="text-sm font-semibold text-slate-700 mb-3">Anteprima [PSYCHE_STATE] nel Prompt LLM</h2>
                    <pre className="bg-slate-900 text-green-400 rounded-lg p-4 text-xs overflow-auto whitespace-pre-wrap font-mono leading-relaxed">
                      {result.promptPreview}
                    </pre>
                  </div>
                )}

                {/* Nodi grafo top 10 per activation */}
                {result.graphNodes && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <h2 className="text-sm font-semibold text-slate-700 mb-3">Top 10 Nodi per Activation</h2>
                    <div className="space-y-1.5">
                      {Object.entries(result.graphNodes as Record<string, { activation: number; valence: number }>)
                        .sort(([, a], [, b]) => b.activation - a.activation)
                        .slice(0, 10)
                        .map(([nodeId, ns]) => (
                          <div key={nodeId} className="flex items-center gap-2">
                            <div className="w-36 text-xs text-slate-600 truncate">{nodeId.replace(/_/g, " ")}</div>
                            <div className="flex-1 bg-slate-100 rounded-full h-2">
                              <div
                                className="h-2 rounded-full bg-violet-500"
                                style={{ width: `${Math.round(ns.activation * 100)}%` }}
                              />
                            </div>
                            <div className="w-8 text-xs text-right text-slate-500">{Math.round(ns.activation * 100)}%</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </LabLayout>
  );
}
