import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Brain, Zap, AlertTriangle, Network } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// ── Theme Bridge: mappa temi NLP → nodi Psyche Engine ──────────────────────────
// Estratto dal theme-bridge.ts server-side per uso client (read-only)
const NLP_TO_ENGINE_CLIENT: Record<string, string[]> = {
  // Core identity
  identity: ["identity", "shadow", "core_wound"],
  belonging: ["belonging_need", "social_standing", "reference_mirror"],
  achievement: ["core_desire", "aspiration_engine", "energy"],
  security: ["loss_aversion", "risk_calculator", "stress_level"],
  // Emotional
  fear: ["stress_level", "loss_aversion", "identity_defense"],
  hope: ["core_desire", "aspiration_engine", "emotional_arousal"],
  pride: ["social_standing", "distinction_need", "identity"],
  nostalgia: ["episodic_memory", "generational_memory", "cultural_lens"],
  // Persuasion
  urgency: ["loss_aversion", "scarcity_bias", "emotional_arousal"],
  authority: ["authority_bias", "reference_mirror", "social_standing"],
  social_proof: ["bandwagon_bias", "reference_mirror", "belonging_need"],
  scarcity: ["scarcity_bias", "loss_aversion", "risk_calculator"],
  // Cultural
  tradition: ["cultural_lens", "generational_memory", "moral_foundations"],
  innovation: ["aspiration_engine", "critical_thinking", "energy"],
  luxury: ["distinction_need", "class_consciousness", "social_standing"],
  // Tones
  empathy: ["core_wound", "current_mood", "belonging_need"],
  humor: ["humor_processor", "emotional_arousal", "energy"],
  rationality: ["critical_thinking", "confirmation_engine", "risk_calculator"],
};

const NODE_CATEGORY_COLOR: Record<string, string> = {
  identity: "#C1622F", shadow: "#C1622F", core_wound: "#C1622F", core_desire: "#C1622F",
  current_mood: "#8B6A3A", stress_level: "#8B6A3A", energy: "#8B6A3A", emotional_arousal: "#8B6A3A",
  attention_filter: "#5A5A5A", confirmation_engine: "#5A5A5A", risk_calculator: "#5A5A5A",
  aspiration_engine: "#5A5A5A", critical_thinking: "#5A5A5A", inner_voice: "#5A5A5A", episodic_memory: "#5A5A5A",
  social_standing: "#4A6A8B", belonging_need: "#4A6A8B", distinction_need: "#4A6A8B", reference_mirror: "#4A6A8B",
  loss_aversion: "#8B2A2A", bandwagon_bias: "#8B2A2A", authority_bias: "#8B2A2A",
  scarcity_bias: "#8B2A2A", identity_defense: "#8B2A2A", halo_effect: "#8B2A2A",
  cultural_lens: "#7A6A3A", class_consciousness: "#7A6A3A", generational_memory: "#7A6A3A",
  moral_foundations: "#7A6A3A", cultural_decode: "#7A6A3A",
  humor_processor: "#8B4A5A", money_relationship: "#8B4A5A", time_orientation: "#8B4A5A",
};

function getThemesFromCampaign(campaign: any): string[] {
  // Estrai temi NLP dalla campagna: tone, channel, messagingAngle, keywords
  const themes: string[] = [];
  const text = [
    campaign.tone ?? "",
    campaign.messagingAngle ?? "",
    campaign.keywords ?? "",
    campaign.name ?? "",
  ].join(" ").toLowerCase();

  Object.keys(NLP_TO_ENGINE_CLIENT).forEach((theme) => {
    if (text.includes(theme.replace("_", " ")) || text.includes(theme)) {
      themes.push(theme);
    }
  });

  // Fallback: mappa tono diretto
  if (campaign.tone) {
    const toneMap: Record<string, string[]> = {
      empathetic: ["empathy", "belonging"],
      authoritative: ["authority", "rationality"],
      playful: ["humor", "belonging"],
      urgent: ["urgency", "scarcity"],
      aspirational: ["achievement", "hope"],
      nostalgic: ["nostalgia", "tradition"],
      premium: ["luxury", "pride"],
      rational: ["rationality", "security"],
    };
    const toneThemes = toneMap[campaign.tone.toLowerCase()] ?? [];
    toneThemes.forEach((t) => { if (!themes.includes(t)) themes.push(t); });
  }

  return themes.slice(0, 6); // max 6 temi per campagna
}

function ThemeBridgePanel({ selectedIds, campaigns }: { selectedIds: number[]; campaigns: any[] }) {
  const selected = campaigns.filter((c: any) => selectedIds.includes(c.id));
  if (selected.length === 0) return null;

  // Aggrega tutti i temi e i nodi attivati
  const allThemes: string[] = [];
  const allNodes: Set<string> = new Set();

  selected.forEach((c: any) => {
    const themes = getThemesFromCampaign(c);
    themes.forEach((t) => {
      if (!allThemes.includes(t)) allThemes.push(t);
      (NLP_TO_ENGINE_CLIENT[t] ?? []).forEach((n) => allNodes.add(n));
    });
  });

  if (allThemes.length === 0) return null;

  return (
    <Card className="border border-border/50 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Network className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Psyche Theme Bridge
          </h3>
          <Badge variant="outline" className="text-[10px]">Psyche 3.0</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Temi NLP rilevati nelle campagne selezionate e nodi del grafo Psyche che verranno attivati durante la simulazione.
        </p>

        {/* Temi NLP rilevati */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Temi rilevati</p>
          <div className="flex flex-wrap gap-1.5">
            {allThemes.map((theme) => (
              <span
                key={theme}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{ background: "#f4f0ec", color: "#5a4a3a" }}
              >
                {theme.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>

        {/* Nodi Psyche attivati */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Nodi Psyche attivati ({allNodes.size}/32)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(allNodes).map((nodeId) => (
              <span
                key={nodeId}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
                style={{
                  borderColor: NODE_CATEGORY_COLOR[nodeId] ?? "#ccc",
                  color: NODE_CATEGORY_COLOR[nodeId] ?? "#888",
                  background: `${NODE_CATEGORY_COLOR[nodeId] ?? "#888888"}15`,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: NODE_CATEGORY_COLOR[nodeId] ?? "#888",
                    flexShrink: 0,
                  }}
                />
                {nodeId.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>

        {/* Mappa NLP → Engine */}
        <div className="mt-4 pt-4 border-t border-border/30">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Mapping NLP → Engine</p>
          <div className="space-y-1.5">
            {allThemes.slice(0, 5).map((theme) => {
              const nodes = NLP_TO_ENGINE_CLIENT[theme] ?? [];
              return (
                <div key={theme} className="flex items-center gap-2 text-xs">
                  <span className="w-28 shrink-0 text-muted-foreground">{theme.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground/50">→</span>
                  <div className="flex flex-wrap gap-1">
                    {nodes.map((n) => (
                      <span
                        key={n}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: `${NODE_CATEGORY_COLOR[n]}20`, color: NODE_CATEGORY_COLOR[n] ?? "#888" }}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {allThemes.length > 5 && (
              <p className="text-[10px] text-muted-foreground">+{allThemes.length - 5} altri temi...</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const REGIMES = ["stable", "growth", "crisis", "trauma", "post_crisis_recovery", "stagnation"];

export default function Simulation() {
  const { data: campaigns, isLoading: loadingCampaigns } = trpc.campaigns.list.useQuery();
  const { data: personas } = trpc.personas.list.useQuery();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [simName, setSimName] = useState("");
  const [mode, setMode] = useState<"formula" | "hybrid">("hybrid");
  const [regimeState, setRegimeState] = useState<Record<string, number>>({
    stable: 0.6, growth: 0.2, crisis: 0.1, trauma: 0.05, post_crisis_recovery: 0.05, stagnation: 0.0,
  });

  const runFormula = trpc.simulations.run.useMutation({
    onSuccess: (data) => {
      utils.simulations.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success(`Formula simulation complete — ${data.results.length} results`);
      setLocation(`/results/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const runHybrid = trpc.simulations.runHybrid.useMutation({
    onSuccess: (data) => {
      utils.simulations.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Hybrid simulation complete — personas have spoken");
      setLocation(`/results/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const isRunning = runFormula.isPending || runHybrid.isPending;
  const promptCount = personas?.filter((p: any) => p.systemPrompt).length || 0;
  const totalPersonas = personas?.length || 0;

  const totalWeight = useMemo(
    () => Object.values(regimeState).reduce((s, v) => s + v, 0),
    [regimeState]
  );

  const toggleCampaign = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleRun = () => {
    if (selectedIds.length === 0) { toast.error("Select at least one campaign"); return; }
    const input = {
      name: simName || `${mode === "hybrid" ? "Hybrid" : "Sim"} ${new Date().toLocaleString()}`,
      campaignIds: selectedIds,
      regimeState,
    };
    if (mode === "hybrid") {
      runHybrid.mutate(input);
    } else {
      runFormula.mutate(input);
    }
  };

  if (loadingCampaigns) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Run Simulation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select campaigns, set regime state, choose mode, and launch
        </p>
      </div>

      {/* Mode Selector */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Simulation Mode
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode("formula")}
              className={`p-4 rounded-lg border-2 text-left transition-all ${mode === "formula" ? "border-foreground bg-foreground/5" : "border-border/40 hover:border-border"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4" />
                <span className="font-semibold text-sm">Formula Only</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Fast. Deterministic. S1/S2 engine with regime modifiers.
              </p>
            </button>
            <button
              onClick={() => setMode("hybrid")}
              className={`p-4 rounded-lg border-2 text-left transition-all ${mode === "hybrid" ? "border-[#CCFF00] bg-[#CCFF00]/5" : "border-border/40 hover:border-border"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4" />
                <span className="font-semibold text-sm">Hybrid</span>
                <Badge variant="outline" className="text-[10px] border-[#CCFF00] text-[#CCFF00]">v0.2</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Formula + LLM. Personas react in character with gut reaction, reflection, and quote.
              </p>
              {mode === "hybrid" && promptCount < totalPersonas && (
                <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  {promptCount}/{totalPersonas} personas have prompts.
                  <button className="underline ml-1" onClick={() => setLocation("/personas")}>Generate</button>
                </div>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Simulation Name */}
      <div className="space-y-2">
        <Label className="text-xs">Simulation Name (optional)</Label>
        <Input
          value={simName}
          onChange={e => setSimName(e.target.value)}
          placeholder="e.g. Q1 2025 Scenario Analysis"
          className="h-9 text-sm max-w-md"
        />
      </div>

      {/* Campaign Selection */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Campaigns
            </h3>
            {campaigns && campaigns.length > 0 && (
              <button
                onClick={() => setSelectedIds(selectedIds.length === campaigns.length ? [] : campaigns.map((c: any) => c.id))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {selectedIds.length === campaigns.length ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>
          {campaigns && campaigns.length > 0 ? (
            <div className="space-y-2">
              {campaigns.map((c: any) => (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${selectedIds.includes(c.id) ? "bg-[#CCFF00]/5" : "hover:bg-secondary/50"}`}
                >
                  <Checkbox
                    checked={selectedIds.includes(c.id)}
                    onCheckedChange={() => toggleCampaign(c.id)}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {c.tone} · {c.channel} · €{c.pricePoint}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No campaigns available.{" "}
              <button className="text-primary underline" onClick={() => setLocation("/campaigns/new")}>
                Create one
              </button>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Theme Bridge Panel */}
      {campaigns && selectedIds.length > 0 && (
        <ThemeBridgePanel selectedIds={selectedIds} campaigns={campaigns} />
      )}

      {/* Regime State */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Regime State Vector
            </h3>
            <span className={`text-xs font-mono ${Math.abs(totalWeight - 1) > 0.01 ? "text-destructive" : "text-muted-foreground"}`}>
              Σ = {totalWeight.toFixed(2)}
            </span>
          </div>
          {REGIMES.map(regime => (
            <div key={regime} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-40 shrink-0 capitalize">
                {regime.replace(/_/g, " ")}
              </span>
              <Slider
                value={[regimeState[regime] ?? 0]}
                onValueChange={v => setRegimeState(prev => ({ ...prev, [regime]: v[0] }))}
                min={0} max={1} step={0.05}
                className="flex-1"
              />
              <span className="text-xs font-mono w-8 text-right">
                {(regimeState[regime] ?? 0).toFixed(2)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Launch Button */}
      <Button
        onClick={handleRun}
        disabled={isRunning || selectedIds.length === 0}
        className={`font-semibold ${mode === "hybrid" ? "bg-[#CCFF00] text-black hover:bg-[#CCFF00]/90" : "bg-primary text-primary-foreground hover:opacity-90"}`}
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {mode === "hybrid" ? "Personas are reacting..." : "Computing..."}
          </>
        ) : (
          <>
            {mode === "hybrid" ? <Brain className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Run {mode === "hybrid" ? "Hybrid" : "Formula"} Simulation
          </>
        )}
      </Button>
    </div>
  );
}
