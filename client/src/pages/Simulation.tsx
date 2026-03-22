import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Brain, Zap, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

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
