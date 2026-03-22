import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, Brain } from "lucide-react";
import { useLocation } from "wouter";

export default function Results() {
  const { data: simulations, isLoading } = trpc.simulations.list.useQuery();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {simulations?.length ?? 0} simulation runs
        </p>
      </div>

      {simulations && simulations.length > 0 ? (
        <div className="space-y-3">
          {simulations.map((s: any) => {
            const metrics = s.metrics as any;
            const config = s.config as any;
            const isHybrid = config?.mode === "hybrid";
            const alignment = metrics?.alignment;
            return (
              <Card
                key={s.id}
                className="border border-border/50 shadow-none cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setLocation(`/results/${s.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold tracking-[-0.02em]">{s.name}</h3>
                      {isHybrid && (
                        <Badge className="bg-[#CCFF00] text-black text-[9px] px-1.5 py-0">
                          <Brain className="h-2.5 w-2.5 mr-0.5" /> HYBRID
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant={s.status === "complete" ? "default" : s.status === "failed" ? "destructive" : "secondary"}
                      className="text-[10px] font-mono"
                    >
                      {s.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.completedAt ? new Date(s.completedAt).toLocaleString() : "—"}
                  </p>
                  {metrics && (
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{metrics.totalPersonas} personas</span>
                      <span>{metrics.totalCampaigns} campaigns</span>
                      <span>{metrics.resultCount} results</span>
                      {metrics.weightedMarketInterest != null && (
                        <span className="font-mono">WMI: {Number(metrics.weightedMarketInterest).toFixed(3)}</span>
                      )}
                      {isHybrid && alignment && (
                        <span className="font-mono text-[#CCFF00]">
                          Alignment: {(alignment.rate * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No simulation results yet</p>
        </div>
      )}
    </div>
  );
}
