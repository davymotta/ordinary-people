import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Play } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const REGIMES = ["stable", "growth", "crisis", "trauma", "post_crisis_recovery", "stagnation"];

export default function Simulation() {
  const { data: campaigns, isLoading: loadingCampaigns } = trpc.campaigns.list.useQuery();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [simName, setSimName] = useState("");
  const [regimeState, setRegimeState] = useState<Record<string, number>>({
    stable: 0.6,
    growth: 0.2,
    crisis: 0.1,
    trauma: 0.05,
    post_crisis_recovery: 0.05,
    stagnation: 0.0,
  });

  const runMutation = trpc.simulations.run.useMutation({
    onSuccess: (data) => {
      utils.simulations.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success(`Simulation complete — ${data.results.length} results`);
      setLocation(`/results/${data.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const totalWeight = useMemo(
    () => Object.values(regimeState).reduce((s, v) => s + v, 0),
    [regimeState]
  );

  const toggleCampaign = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleRun = () => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one campaign");
      return;
    }
    runMutation.mutate({
      name: simName || `Sim ${new Date().toLocaleString()}`,
      campaignIds: selectedIds,
      regimeState,
    });
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
          Select campaigns, set regime state, and run the S1/S2 simulation engine
        </p>
      </div>

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
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Select Campaigns
          </h3>
          {campaigns && campaigns.length > 0 ? (
            <div className="space-y-2">
              {campaigns.map((c: any) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 cursor-pointer transition-colors"
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
                min={0}
                max={1}
                step={0.05}
                className="flex-1"
              />
              <span className="text-xs font-mono w-8 text-right">
                {(regimeState[regime] ?? 0).toFixed(2)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        onClick={handleRun}
        disabled={runMutation.isPending || selectedIds.length === 0}
        className="bg-primary text-primary-foreground hover:opacity-90 font-semibold"
      >
        {runMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" /> Run Simulation
          </>
        )}
      </Button>
    </div>
  );
}
