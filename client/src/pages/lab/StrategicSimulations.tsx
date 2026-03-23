/**
 * Ordinary People — Simulazioni Strategiche
 *
 * UI per le 5 simulazioni multi-touchpoint:
 * 1. Journey Simulation (funnel multi-touchpoint)
 * 2. Retargeting Decay Analysis (frequency response curve)
 * 3. Media Mix Optimization (allocazione budget per piattaforma)
 * 4. Competitive Response (interferenza competitiva)
 * 5. Content Calendar Optimization (sequenza ottimale contenuti)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { LabLayout } from "@/components/LabLayout";
import {
  Route,
  RefreshCw,
  BarChart2,
  Swords,
  CalendarDays,
  Plus,
  Trash2,
  Play,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SimType = "journey" | "retargeting" | "media_mix" | "competitive" | "content_calendar";

interface TouchpointForm {
  campaignId: number | "";
  channel: string;
  delayDays: number;
  label: string;
  objective: "awareness" | "consideration" | "conversion" | "recovery";
}

const CHANNELS = ["instagram", "tiktok", "facebook", "youtube", "email", "tv", "ooh"];
const OBJECTIVES = ["awareness", "consideration", "conversion", "recovery"] as const;

const SIM_TYPES: Array<{ type: SimType; label: string; icon: React.ReactNode; description: string }> = [
  {
    type: "journey",
    label: "Journey Simulation",
    icon: <Route className="w-5 h-5" />,
    description: "Simula un funnel multi-touchpoint sugli stessi agenti in sequenza. Ogni agente mantiene il suo stato tra i touchpoint.",
  },
  {
    type: "retargeting",
    label: "Retargeting Decay",
    icon: <RefreshCw className="w-5 h-5" />,
    description: "Misura la curva di frequency response. Trova la frequenza ottimale prima che il retargeting diventi irritante.",
  },
  {
    type: "media_mix",
    label: "Media Mix",
    icon: <BarChart2 className="w-5 h-5" />,
    description: "Testa scenari di allocazione budget per piattaforma. Ottimizza il reach per segmento demografico.",
  },
  {
    type: "competitive",
    label: "Competitive Response",
    icon: <Swords className="w-5 h-5" />,
    description: "Simula l'interferenza competitiva. Misura l'effetto anchoring del competitor sulla tua campagna.",
  },
  {
    type: "content_calendar",
    label: "Content Calendar",
    icon: <CalendarDays className="w-5 h-5" />,
    description: "Ottimizza la sequenza del calendario editoriale. Massimizza il sentiment cumulativo nel tempo.",
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StrategicSimulations() {
  const [selectedType, setSelectedType] = useState<SimType>("journey");
  const [activeSimId, setActiveSimId] = useState<number | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  // Shared fields
  const [simName, setSimName] = useState("");
  const [brandAgentId, setBrandAgentId] = useState<number | "">("");

  // Journey fields
  const [touchpoints, setTouchpoints] = useState<TouchpointForm[]>([
    { campaignId: "", channel: "instagram", delayDays: 0, label: "Awareness", objective: "awareness" },
    { campaignId: "", channel: "instagram", delayDays: 7, label: "Consideration", objective: "consideration" },
    { campaignId: "", channel: "instagram", delayDays: 14, label: "Conversion", objective: "conversion" },
  ]);

  // Retargeting fields
  const [retargetingCampaignId, setRetargetingCampaignId] = useState<number | "">("");
  const [maxExposures, setMaxExposures] = useState(10);
  const [intervalDays, setIntervalDays] = useState(2);

  // Media Mix fields
  const [mediaMixCampaignId, setMediaMixCampaignId] = useState<number | "">("");
  type MixScenario = { name: string; allocation: Record<string, number> };
  const [mediaMixScenarios, setMediaMixScenarios] = useState<MixScenario[]>([
    { name: "Instagram Heavy", allocation: { instagram: 0.7, tiktok: 0.2, facebook: 0.1 } as Record<string, number> },
    { name: "TikTok First", allocation: { tiktok: 0.6, instagram: 0.3, facebook: 0.1 } as Record<string, number> },
    { name: "Balanced Mix", allocation: { instagram: 0.4, tiktok: 0.3, facebook: 0.2, youtube: 0.1 } as Record<string, number> },
  ]);

  // Competitive fields
  const [clientCampaignId, setClientCampaignId] = useState<number | "">("");
  const [competitorCampaignId, setCompetitorCampaignId] = useState<number | "">("");

  // Content Calendar fields
  const [calendarItems, setCalendarItems] = useState<Array<{ campaignId: number | ""; label: string }>>([
    { campaignId: "", label: "Post 1" },
    { campaignId: "", label: "Post 2" },
    { campaignId: "", label: "Post 3" },
  ]);

  // Queries
  const campaignsQuery = trpc.campaigns?.list?.useQuery?.() ?? { data: [] };
  const brandAgentsQuery = trpc.onboarding?.listBrandAgents?.useQuery?.() ?? { data: [] };
  const campaigns = (campaignsQuery.data as any[]) ?? [];
  const brandAgents = (brandAgentsQuery.data as any[]) ?? [];

  // Simulation status polling
  const simQuery = trpc.strategicSimulations.getSimulation.useQuery(
    { id: activeSimId! },
    { enabled: pollingEnabled && activeSimId !== null, refetchInterval: 3000 }
  );
  const simData = simQuery.data as any;

  // Mutations
  const runJourneyMutation = trpc.strategicSimulations.runJourney.useMutation({
    onSuccess: (data) => { setActiveSimId(data.simulationId); setPollingEnabled(true); },
  });
  const runRetargetingMutation = trpc.strategicSimulations.runRetargetingDecay.useMutation({
    onSuccess: (data) => { setActiveSimId(data.simulationId); setPollingEnabled(true); },
  });
  const runMediaMixMutation = trpc.strategicSimulations.runMediaMix.useMutation({
    onSuccess: (data) => { setActiveSimId(data.simulationId); setPollingEnabled(true); },
  });
  const runCompetitiveMutation = trpc.strategicSimulations.runCompetitiveResponse.useMutation({
    onSuccess: (data) => { setActiveSimId(data.simulationId); setPollingEnabled(true); },
  });
  const runCalendarMutation = trpc.strategicSimulations.runContentCalendar.useMutation({
    onSuccess: (data) => { setActiveSimId(data.simulationId); setPollingEnabled(true); },
  });

  // Stop polling when complete
  if (pollingEnabled && simData?.status === "complete") {
    setPollingEnabled(false);
  }

  const isRunning = pollingEnabled || simData?.status === "running";
  const isComplete = simData?.status === "complete";
  const isFailed = simData?.status === "failed";

  function handleRun() {
    const name = simName || `${selectedType} — ${new Date().toLocaleDateString("it-IT")}`;
    const baid = brandAgentId !== "" ? Number(brandAgentId) : undefined;

    if (selectedType === "journey") {
      const validTPs = touchpoints.filter(tp => tp.campaignId !== "");
      if (validTPs.length < 2) { alert("Aggiungi almeno 2 touchpoint con una campagna selezionata."); return; }
      runJourneyMutation.mutate({
        name,
        brandAgentId: baid,
        touchpoints: validTPs.map(tp => ({
          campaignId: Number(tp.campaignId),
          channel: tp.channel,
          delayDays: tp.delayDays,
          label: tp.label,
          objective: tp.objective,
        })),
      });
    } else if (selectedType === "retargeting") {
      if (retargetingCampaignId === "") { alert("Seleziona una campagna."); return; }
      runRetargetingMutation.mutate({
        name,
        brandAgentId: baid,
        campaignId: Number(retargetingCampaignId),
        maxExposures,
        intervalDays,
      });
    } else if (selectedType === "media_mix") {
      if (mediaMixCampaignId === "") { alert("Seleziona una campagna."); return; }
      runMediaMixMutation.mutate({
        name,
        brandAgentId: baid,
        campaignId: Number(mediaMixCampaignId),
        scenarios: mediaMixScenarios,
      });
    } else if (selectedType === "competitive") {
      if (clientCampaignId === "" || competitorCampaignId === "") { alert("Seleziona entrambe le campagne."); return; }
      runCompetitiveMutation.mutate({
        name,
        brandAgentId: baid,
        clientCampaignId: Number(clientCampaignId),
        competitorCampaignId: Number(competitorCampaignId),
      });
    } else if (selectedType === "content_calendar") {
      const validItems = calendarItems.filter(i => i.campaignId !== "");
      if (validItems.length < 2) { alert("Aggiungi almeno 2 contenuti."); return; }
      runCalendarMutation.mutate({
        name,
        brandAgentId: baid,
        contentItems: validItems.map(i => ({ campaignId: Number(i.campaignId), label: i.label })),
      });
    }
  }

  const selectedSim = SIM_TYPES.find(s => s.type === selectedType)!;

  return (
    <LabLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Route className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Simulazioni Strategiche</h1>
              <p className="text-sm text-muted-foreground">Multi-touchpoint • Temporal Decay • Competitive Response</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mt-3">
            Le simulazioni strategiche trasformano Ordinary People da testing tool a simulatore strategico.
            Ogni agente mantiene il proprio stato tra le esposizioni — familiarità, saturazione, irritazione —
            secondo il modello di decay esponenziale di Ebbinghaus.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left: Simulation Type Selector + Config */}
          <div className="col-span-5 space-y-4">
            {/* Type selector */}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Tipo di Simulazione</p>
              <div className="space-y-2">
                {SIM_TYPES.map(sim => (
                  <button
                    key={sim.type}
                    onClick={() => { setSelectedType(sim.type); setActiveSimId(null); setPollingEnabled(false); }}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                      selectedType === sim.type
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-background hover:border-primary/30 hover:bg-primary/5 text-foreground"
                    )}
                  >
                    <span className={cn("mt-0.5 shrink-0", selectedType === sim.type ? "text-primary" : "text-muted-foreground")}>
                      {sim.icon}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{sim.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{sim.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Common config */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configurazione</p>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome simulazione</label>
                <input
                  type="text"
                  value={simName}
                  onChange={e => setSimName(e.target.value)}
                  placeholder={`${selectedSim.label} — ${new Date().toLocaleDateString("it-IT")}`}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {brandAgents.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Brand Agent (opzionale)</label>
                  <select
                    value={brandAgentId}
                    onChange={e => setBrandAgentId(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">— Nessun brand agent —</option>
                    {brandAgents.map((ba: any) => (
                      <option key={ba.id} value={ba.id}>{ba.brandName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Right: Simulation-specific config + Results */}
          <div className="col-span-7 space-y-4">
            {/* Simulation-specific config */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-primary">{selectedSim.icon}</span>
                <p className="font-semibold text-sm">{selectedSim.label}</p>
              </div>

              {selectedType === "journey" && (
                <JourneyConfig
                  touchpoints={touchpoints}
                  setTouchpoints={setTouchpoints}
                  campaigns={campaigns}
                />
              )}
              {selectedType === "retargeting" && (
                <RetargetingConfig
                  campaignId={retargetingCampaignId}
                  setCampaignId={setRetargetingCampaignId}
                  maxExposures={maxExposures}
                  setMaxExposures={setMaxExposures}
                  intervalDays={intervalDays}
                  setIntervalDays={setIntervalDays}
                  campaigns={campaigns}
                />
              )}
              {selectedType === "media_mix" && (
                <MediaMixConfig
                  campaignId={mediaMixCampaignId}
                  setCampaignId={setMediaMixCampaignId}
                  scenarios={mediaMixScenarios}
                  setScenarios={setMediaMixScenarios}
                  campaigns={campaigns}
                />
              )}
              {selectedType === "competitive" && (
                <CompetitiveConfig
                  clientCampaignId={clientCampaignId}
                  setClientCampaignId={setClientCampaignId}
                  competitorCampaignId={competitorCampaignId}
                  setCompetitorCampaignId={setCompetitorCampaignId}
                  campaigns={campaigns}
                />
              )}
              {selectedType === "content_calendar" && (
                <ContentCalendarConfig
                  items={calendarItems}
                  setItems={setCalendarItems}
                  campaigns={campaigns}
                />
              )}

              {/* Run button */}
              <div className="mt-4 pt-4 border-t border-border">
                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all",
                    isRunning
                      ? "bg-primary/30 text-primary/60 cursor-not-allowed"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Simulazione in corso...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Avvia Simulazione
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results */}
            {activeSimId && (
              <SimulationResults
                simData={simData}
                isRunning={isRunning}
                isComplete={isComplete}
                isFailed={isFailed}
                simType={selectedType}
              />
            )}
          </div>
        </div>
      </div>
    </LabLayout>
  );
}

// ─── Journey Config ───────────────────────────────────────────────────────────

function JourneyConfig({
  touchpoints,
  setTouchpoints,
  campaigns,
}: {
  touchpoints: TouchpointForm[];
  setTouchpoints: (tps: TouchpointForm[]) => void;
  campaigns: any[];
}) {
  function update(idx: number, field: keyof TouchpointForm, value: any) {
    const updated = touchpoints.map((tp, i) => i === idx ? { ...tp, [field]: value } : tp);
    setTouchpoints(updated);
  }

  function addTouchpoint() {
    setTouchpoints([...touchpoints, {
      campaignId: "",
      channel: "instagram",
      delayDays: (touchpoints[touchpoints.length - 1]?.delayDays ?? 0) + 7,
      label: `Touchpoint ${touchpoints.length + 1}`,
      objective: "consideration",
    }]);
  }

  function removeTouchpoint(idx: number) {
    setTouchpoints(touchpoints.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Definisci la sequenza di touchpoint del funnel. Ogni agente mantiene il proprio stato tra i touchpoint.</p>
      {touchpoints.map((tp, idx) => (
        <div key={idx} className="rounded-lg border border-border bg-background p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary">Touchpoint {idx + 1}</span>
            {touchpoints.length > 2 && (
              <button onClick={() => removeTouchpoint(idx)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Label</label>
              <input
                type="text"
                value={tp.label}
                onChange={e => update(idx, "label", e.target.value)}
                className="w-full bg-card border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Obiettivo</label>
              <select
                value={tp.objective}
                onChange={e => update(idx, "objective", e.target.value)}
                className="w-full bg-card border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Campagna</label>
              <select
                value={tp.campaignId}
                onChange={e => update(idx, "campaignId", e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-card border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Seleziona —</option>
                {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Canale</label>
              <select
                value={tp.channel}
                onChange={e => update(idx, "channel", e.target.value)}
                className="w-full bg-card border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-muted-foreground">Ritardo dal touchpoint precedente (giorni)</label>
              <input
                type="number"
                min={0}
                value={tp.delayDays}
                onChange={e => update(idx, "delayDays", Number(e.target.value))}
                className="w-full bg-card border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={addTouchpoint}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/40 text-primary/70 hover:border-primary hover:text-primary text-xs transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Aggiungi Touchpoint
      </button>
    </div>
  );
}

// ─── Retargeting Config ───────────────────────────────────────────────────────

function RetargetingConfig({ campaignId, setCampaignId, maxExposures, setMaxExposures, intervalDays, setIntervalDays, campaigns }: any) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Simula N esposizioni dello stesso contenuto. Trova la frequenza ottimale prima che il retargeting diventi irritante.</p>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Campagna</label>
        <select value={campaignId} onChange={e => setCampaignId(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">— Seleziona campagna —</option>
          {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Numero max esposizioni</label>
          <input type="number" min={3} max={20} value={maxExposures} onChange={e => setMaxExposures(Number(e.target.value))}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Intervallo (giorni)</label>
          <input type="number" min={1} max={30} value={intervalDays} onChange={e => setIntervalDays(Number(e.target.value))}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>
    </div>
  );
}

// ─── Media Mix Config ─────────────────────────────────────────────────────────

function MediaMixConfig({ campaignId, setCampaignId, scenarios, setScenarios, campaigns }: any) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Testa scenari di allocazione budget. Ogni piattaforma raggiunge segmenti diversi con efficacia diversa.</p>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Campagna</label>
        <select value={campaignId} onChange={e => setCampaignId(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">— Seleziona campagna —</option>
          {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Scenari di allocazione</p>
        {scenarios.map((scenario: any, idx: number) => (
          <div key={idx} className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs font-semibold mb-2">{scenario.name}</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(scenario.allocation).map(([platform, pct]) => (
                <span key={platform} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {platform}: {((pct as number) * 100).toFixed(0)}%
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Competitive Config ───────────────────────────────────────────────────────

function CompetitiveConfig({ clientCampaignId, setClientCampaignId, competitorCampaignId, setCompetitorCampaignId, campaigns }: any) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Prima espone gli agenti alla campagna del competitor, poi alla tua. Misura l'effetto anchoring.</p>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">La tua campagna (cliente)</label>
        <select value={clientCampaignId} onChange={e => setClientCampaignId(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">— Seleziona campagna —</option>
          {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Campagna competitor</label>
        <select value={competitorCampaignId} onChange={e => setCompetitorCampaignId(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">— Seleziona campagna —</option>
          {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Content Calendar Config ──────────────────────────────────────────────────

function ContentCalendarConfig({ items, setItems, campaigns }: any) {
  function update(idx: number, field: string, value: any) {
    setItems(items.map((item: any, i: number) => i === idx ? { ...item, [field]: value } : item));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Definisci la sequenza del calendario editoriale. Il sistema ottimizzerà l'ordine per massimizzare il sentiment cumulativo.</p>
      {items.map((item: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6 text-right">{idx + 1}.</span>
          <input
            type="text"
            value={item.label}
            onChange={e => update(idx, "label", e.target.value)}
            placeholder="Label contenuto"
            className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <select
            value={item.campaignId}
            onChange={e => update(idx, "campaignId", e.target.value === "" ? "" : Number(e.target.value))}
            className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">— Campagna —</option>
            {campaigns.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {items.length > 2 && (
            <button onClick={() => setItems(items.filter((_: any, i: number) => i !== idx))} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => setItems([...items, { campaignId: "", label: `Post ${items.length + 1}` }])}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/40 text-primary/70 hover:border-primary hover:text-primary text-xs transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Aggiungi Contenuto
      </button>
    </div>
  );
}

// ─── Simulation Results ───────────────────────────────────────────────────────

function SimulationResults({
  simData,
  isRunning,
  isComplete,
  isFailed,
  simType,
}: {
  simData: any;
  isRunning: boolean;
  isComplete: boolean;
  isFailed: boolean;
  simType: SimType;
}) {
  const [expandedSection, setExpandedSection] = useState<string | null>("summary");

  if (!simData) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const results = simData.results as any;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Status header */}
      <div className={cn(
        "px-4 py-3 flex items-center gap-3 border-b border-border",
        isRunning ? "bg-yellow-500/10" : isComplete ? "bg-green-500/10" : "bg-red-500/10"
      )}>
        {isRunning && <RefreshCw className="w-4 h-4 animate-spin text-yellow-500" />}
        {isComplete && <CheckCircle className="w-4 h-4 text-green-500" />}
        {isFailed && <AlertCircle className="w-4 h-4 text-red-500" />}
        <div>
          <p className="text-sm font-medium">
            {isRunning ? "Simulazione in corso..." : isComplete ? "Simulazione completata" : "Simulazione fallita"}
          </p>
          {simData.totalAgents > 0 && (
            <p className="text-xs text-muted-foreground">{simData.totalAgents} agenti simulati</p>
          )}
        </div>
      </div>

      {/* Results content */}
      {isComplete && results && (
        <div className="p-4 space-y-3">
          {simType === "journey" && <JourneyResults results={results} expandedSection={expandedSection} setExpandedSection={setExpandedSection} />}
          {simType === "retargeting" && <RetargetingResults results={results} />}
          {simType === "media_mix" && <MediaMixResults results={results} />}
          {simType === "competitive" && <CompetitiveResults results={results} />}
          {simType === "content_calendar" && <ContentCalendarResults results={results} />}
        </div>
      )}

      {isFailed && (
        <div className="p-4">
          <p className="text-sm text-destructive">{simData.error ?? "Errore sconosciuto"}</p>
        </div>
      )}
    </div>
  );
}

// ─── Journey Results ──────────────────────────────────────────────────────────

function JourneyResults({ results, expandedSection, setExpandedSection }: any) {
  const { touchpoints, funnelSummary, dropoutAnalysis, segmentInsights, recommendations } = results;

  return (
    <div className="space-y-3">
      {/* Funnel summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Awareness", value: funnelSummary.awarenessRate, color: "text-blue-400" },
          { label: "Consideration", value: funnelSummary.considerationRate, color: "text-yellow-400" },
          { label: "Conversion", value: funnelSummary.conversionRate, color: "text-green-400" },
          { label: "Recovery", value: funnelSummary.recoveryRate, color: "text-purple-400" },
        ].map(item => (
          <div key={item.label} className="rounded-lg bg-background border border-border p-2 text-center">
            <p className={cn("text-lg font-bold", item.color)}>{(item.value * 100).toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Touchpoint timeline */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Touchpoint</p>
        {touchpoints.map((tp: any, idx: number) => (
          <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-background border border-border">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{tp.label}</p>
              <p className="text-[10px] text-muted-foreground">{tp.channel} • +{tp.delayDays}gg</p>
            </div>
            <div className="text-right shrink-0">
              <ScoreBadge score={tp.avgScore} />
              <p className="text-[10px] text-muted-foreground mt-0.5">{(tp.positiveRate * 100).toFixed(0)}% positivi</p>
            </div>
            {idx < touchpoints.length - 1 && (
              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <p className="text-xs font-semibold text-primary mb-2">Raccomandazioni</p>
          <ul className="space-y-1">
            {recommendations.map((rec: string, i: number) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Retargeting Results ──────────────────────────────────────────────────────

function RetargetingResults({ results }: any) {
  const { exposureCurve, optimalFrequency, inversionPoint, recommendations } = results;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-background border border-border p-3 text-center">
          <p className="text-xl font-bold text-green-400">{optimalFrequency.overall}x</p>
          <p className="text-[10px] text-muted-foreground">Frequenza ottimale</p>
        </div>
        <div className="rounded-lg bg-background border border-border p-3 text-center">
          <p className="text-xl font-bold text-red-400">{inversionPoint}x</p>
          <p className="text-[10px] text-muted-foreground">Punto inversione</p>
        </div>
        <div className="rounded-lg bg-background border border-border p-3 text-center">
          <p className="text-xl font-bold text-primary">{results.intervalDays}gg</p>
          <p className="text-[10px] text-muted-foreground">Intervallo</p>
        </div>
      </div>

      {/* Frequency curve */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Curva di Frequenza</p>
        {exposureCurve.map((point: any) => (
          <div key={point.exposure} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-6 text-right">{point.exposure}x</span>
            <div className="flex-1 h-4 bg-background rounded overflow-hidden border border-border">
              <div
                className={cn("h-full transition-all", point.avgScore > 0 ? "bg-green-500/60" : "bg-red-500/60")}
                style={{ width: `${Math.abs(point.avgScore) * 50 + 50}%` }}
              />
            </div>
            <span className={cn("text-[10px] w-12 text-right font-mono", point.avgScore > 0 ? "text-green-400" : "text-red-400")}>
              {point.avgScore.toFixed(2)}
            </span>
            {point.irritationRate > 0.3 && (
              <span className="text-[10px] text-orange-400">⚠</span>
            )}
          </div>
        ))}
      </div>

      {recommendations.length > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <p className="text-xs font-semibold text-primary mb-2">Raccomandazioni</p>
          <ul className="space-y-1">
            {recommendations.map((rec: string, i: number) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Media Mix Results ────────────────────────────────────────────────────────

function MediaMixResults({ results }: any) {
  const { scenarios, recommendedScenario, recommendations } = results;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {scenarios.map((scenario: any) => (
          <div key={scenario.name} className={cn(
            "rounded-lg border p-3",
            scenario.name === recommendedScenario
              ? "border-primary/50 bg-primary/10"
              : "border-border bg-background"
          )}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold">{scenario.name}</p>
              {scenario.name === recommendedScenario && (
                <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Raccomandato</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-bold text-blue-400">{(scenario.reachRate * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-muted-foreground">Reach</p>
              </div>
              <div>
                <ScoreBadge score={scenario.avgScore} />
                <p className="text-[10px] text-muted-foreground mt-0.5">Score medio</p>
              </div>
              <div>
                <p className="text-sm font-bold text-purple-400">{(scenario.positiveRate * 100).toFixed(0)}%</p>
                <p className="text-[10px] text-muted-foreground">Positivi</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recommendations.length > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <p className="text-xs font-semibold text-primary mb-2">Raccomandazioni</p>
          <ul className="space-y-1">
            {recommendations.map((rec: string, i: number) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Competitive Results ──────────────────────────────────────────────────────

function CompetitiveResults({ results }: any) {
  const { baselineScore, afterCompetitorScore, anchoringEffect, vulnerableSegments, recommendations } = results;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-background border border-border p-3 text-center">
          <ScoreBadge score={baselineScore} />
          <p className="text-[10px] text-muted-foreground mt-1">Baseline</p>
        </div>
        <div className="rounded-lg bg-background border border-border p-3 text-center">
          <ScoreBadge score={afterCompetitorScore} />
          <p className="text-[10px] text-muted-foreground mt-1">Post-competitor</p>
        </div>
        <div className="rounded-lg bg-background border border-border p-3 text-center">
          <p className={cn("text-lg font-bold", anchoringEffect < 0 ? "text-red-400" : "text-green-400")}>
            {anchoringEffect > 0 ? "+" : ""}{(anchoringEffect * 100).toFixed(0)}%
          </p>
          <p className="text-[10px] text-muted-foreground">Anchoring effect</p>
        </div>
      </div>

      {vulnerableSegments.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Segmenti più vulnerabili</p>
          {vulnerableSegments.slice(0, 4).map((seg: any) => (
            <div key={seg.segment} className="flex items-center justify-between p-2 rounded bg-background border border-border">
              <span className="text-xs">{seg.segment}</span>
              <span className={cn("text-xs font-mono", seg.delta < 0 ? "text-red-400" : "text-green-400")}>
                {seg.delta > 0 ? "+" : ""}{(seg.delta * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <p className="text-xs font-semibold text-primary mb-2">Raccomandazioni</p>
          <ul className="space-y-1">
            {recommendations.map((rec: string, i: number) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Content Calendar Results ─────────────────────────────────────────────────

function ContentCalendarResults({ results }: any) {
  const { originalSequence, optimizedSequence, sentimentLift, recommendations } = results;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sentiment Lift</p>
        <span className={cn("text-sm font-bold", sentimentLift > 0 ? "text-green-400" : "text-red-400")}>
          {sentimentLift > 0 ? "+" : ""}{(sentimentLift * 100).toFixed(0)}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Sequenza originale</p>
          {originalSequence.map((item: any) => (
            <div key={item.position} className="flex items-center gap-2 p-1.5 rounded bg-background border border-border mb-1">
              <span className="text-[10px] text-muted-foreground w-4">{item.position}.</span>
              <span className="text-[10px] flex-1 truncate">{item.label}</span>
              <ScoreBadge score={item.score} small />
            </div>
          ))}
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Sequenza ottimizzata</p>
          {optimizedSequence.map((item: any) => (
            <div key={item.position} className={cn(
              "flex items-center gap-2 p-1.5 rounded border mb-1",
              item.position !== item.originalPosition
                ? "bg-primary/10 border-primary/30"
                : "bg-background border-border"
            )}>
              <span className="text-[10px] text-muted-foreground w-4">{item.position}.</span>
              <span className="text-[10px] flex-1 truncate">{item.label}</span>
              <ScoreBadge score={item.score} small />
            </div>
          ))}
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <p className="text-xs font-semibold text-primary mb-2">Raccomandazioni</p>
          <ul className="space-y-1">
            {recommendations.map((rec: string, i: number) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Score Badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score, small }: { score: number; small?: boolean }) {
  const color = score > 0.3 ? "text-green-400" : score < -0.3 ? "text-red-400" : "text-yellow-400";
  const Icon = score > 0.1 ? TrendingUp : score < -0.1 ? TrendingDown : Minus;
  return (
    <span className={cn("flex items-center gap-0.5 font-mono font-bold", color, small ? "text-[10px]" : "text-sm")}>
      <Icon className={small ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} />
      {score.toFixed(2)}
    </span>
  );
}
