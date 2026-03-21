import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";

export default function Calibration() {
  const { data: calibrations, isLoading } = trpc.calibration.list.useQuery();
  const utils = trpc.useUtils();

  const runMutation = trpc.calibration.run.useMutation({
    onSuccess: (data: any) => {
      utils.calibration.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success(`Calibration complete — Spearman ρ: ${data.spearmanRho?.toFixed(3) ?? "N/A"}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const defaultRegimeState: Record<string, number> = {
    stable: 0.6, growth: 0.2, crisis: 0.1, trauma: 0.05,
    post_crisis_recovery: 0.05, stagnation: 0.0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Calibration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Karpathy loop — compare simulations with ground truth, adjust weights iteratively
          </p>
        </div>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:opacity-90 text-xs"
          onClick={() => runMutation.mutate({ regimeState: defaultRegimeState })}
          disabled={runMutation.isPending}
        >
          {runMutation.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Running...</>
          ) : (
            <><Zap className="h-3.5 w-3.5 mr-1" /> Run Calibration</>
          )}
        </Button>
      </div>

      {/* Explanation */}
      <Card className="border border-border/50 shadow-none bg-secondary/30">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            The calibration engine compares simulation predictions against ground truth data using
            <strong> Spearman rank correlation (ρ)</strong>. Each iteration adjusts persona psychographic
            weights and regime modifiers to minimize prediction error. The process follows the
            <strong> Karpathy loop</strong>: simulate → compare → adjust → repeat.
          </p>
        </CardContent>
      </Card>

      {/* Calibration History */}
      {calibrations && calibrations.length > 0 ? (
        <div className="space-y-3">
          {calibrations.map((cal: any, i: number) => {
            const adjustments = cal.adjustments as any;
            return (
              <Card key={cal.id} className="border border-border/50 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold tracking-[-0.02em]">
                          Iteration #{calibrations.length - i}
                        </h3>
                        <Badge
                          variant={cal.status === "complete" ? "default" : "secondary"}
                          className="text-[10px] font-mono"
                        >
                          {cal.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cal.completedAt ? new Date(cal.completedAt).toLocaleString() : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        <span className="text-lg font-extrabold font-mono tracking-tight">
                          {cal.spearmanRho != null ? Number(cal.spearmanRho).toFixed(3) : "—"}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Spearman ρ</p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                    <span>MAE: {cal.mae != null ? Number(cal.mae).toFixed(4) : "—"}</span>
                    <span>RMSE: {cal.rmse != null ? Number(cal.rmse).toFixed(4) : "—"}</span>
                    <span>Pairs: {cal.pairsCompared ?? "—"}</span>
                  </div>

                  {/* Adjustments summary */}
                  {adjustments && (
                    <div className="mt-3 pt-3 border-t border-border/30">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Adjustments Applied
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {adjustments.personaAdjustments && Object.keys(adjustments.personaAdjustments).length > 0 && (
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {Object.keys(adjustments.personaAdjustments).length} persona weights
                          </Badge>
                        )}
                        {adjustments.regimeAdjustments && Object.keys(adjustments.regimeAdjustments).length > 0 && (
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {Object.keys(adjustments.regimeAdjustments).length} regime modifiers
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <RefreshCw className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No calibration runs yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Add ground truth data first, then run calibration to improve predictions
          </p>
        </div>
      )}
    </div>
  );
}
