import { useRoute } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Route,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  BarChart2,
} from "lucide-react";
import { useLocation } from "wouter";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ScoreBar({ value, max = 1 }: { value: number; max?: number }) {
  const pct = Math.round(((value + max) / (max * 2)) * 100);
  const color = value > 0.3 ? "bg-green-500" : value > -0.1 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-10 text-right">
        {value >= 0 ? "+" : ""}{value.toFixed(2)}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending:  { label: "In coda",     className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
    running:  { label: "In esecuzione", className: "bg-blue-100 text-blue-700 border-blue-200" },
    complete: { label: "Completata",  className: "bg-green-100 text-green-700 border-green-200" },
    failed:   { label: "Fallita",     className: "bg-red-100 text-red-700 border-red-200" },
  };
  const s = map[status] ?? map.pending;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${s.className}`}>{s.label}</span>;
}

const OBJECTIVE_COLORS: Record<string, string> = {
  awareness:     "bg-blue-100 text-blue-700 border-blue-200",
  consideration: "bg-amber-100 text-amber-700 border-amber-200",
  conversion:    "bg-green-100 text-green-700 border-green-200",
  recovery:      "bg-red-100 text-red-700 border-red-200",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function JourneyResults() {
  const [, params] = useRoute("/app/journey/:id");
  const [, navigate] = useLocation();
  const simId = params?.id ? Number(params.id) : 0;

  const { data: sim, refetch, isLoading } = trpc.strategicSimulations.getSimulation.useQuery(
    { id: simId! },
    { enabled: simId > 0, refetchInterval: (data) => {
      const status = (data as any)?.status;
      return status === "running" || status === "pending" ? 3000 : false;
    }}
  );

  if (!simId || simId === 0) return null;

  const results = sim?.results as any;
  const isJourney = results?.simulationType === "journey";

  return (
    <ClientLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Route className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-display font-bold text-foreground">
                {sim?.name ?? "Journey Simulation"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {sim && <StatusBadge status={sim.status ?? "pending"} />}
              {sim?.totalAgents && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {sim.totalAgents} agenti
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Aggiorna
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/app/simulate/journey")} className="gap-1.5">
              <Route className="w-3.5 h-3.5" />
              Nuovo journey
            </Button>
          </div>
        </div>

        {/* Loading / Pending */}
        {(isLoading || sim?.status === "pending" || sim?.status === "running") && (
          <Card>
            <CardContent className="py-12 text-center">
              <RefreshCw className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
              <p className="text-sm font-medium text-foreground">
                {sim?.status === "running" ? "Simulazione in corso..." : "In attesa di avvio..."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Gli agenti stanno attraversando il funnel. Aggiornamento automatico ogni 3 secondi.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Failed */}
        {sim?.status === "failed" && (
          <Card className="border-red-200">
            <CardContent className="py-8 text-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Simulazione fallita</p>
              <p className="text-xs text-muted-foreground mt-1">{(sim as any).error ?? "Errore sconosciuto"}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {sim?.status === "complete" && isJourney && results && (
          <div className="space-y-6">
            {/* Summary metrics */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Agenti totali</p>
                  <p className="text-2xl font-bold text-foreground">{results.totalAgents}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Touchpoints</p>
                  <p className="text-2xl font-bold text-foreground">{results.touchpointResults?.length ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Score finale medio</p>
                  <p className={`text-2xl font-bold ${results.funnelSummary?.finalAvgScore > 0 ? "text-green-600" : "text-red-600"}`}>
                    {results.funnelSummary?.finalAvgScore != null
                      ? `${results.funnelSummary.finalAvgScore >= 0 ? "+" : ""}${results.funnelSummary.finalAvgScore.toFixed(2)}`
                      : "—"}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Conversion rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {results.funnelSummary?.conversionRate != null
                      ? `${Math.round(results.funnelSummary.conversionRate * 100)}%`
                      : "—"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Touchpoint results */}
            {results.touchpointResults?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    Risultati per touchpoint
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.touchpointResults.map((tp: any, idx: number) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-sm font-medium text-foreground">{tp.label}</span>
                          <Badge variant="outline" className="text-xs">{tp.channel}</Badge>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${OBJECTIVE_COLORS[tp.objective] ?? ""}`}>
                            {tp.objective}
                          </span>
                          {idx < results.touchpointResults.length - 1 && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              +{(results.touchpointResults[idx + 1]?.delayDays ?? 0) - tp.delayDays}d →
                            </span>
                          )}
                        </div>
                        <div className="ml-8 grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <p className="text-muted-foreground mb-1">Score medio</p>
                            <ScoreBar value={tp.avgScore} />
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Positive rate</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.round(tp.positiveRate * 100)}%` }} />
                              </div>
                              <span className="font-mono w-8 text-right">{Math.round(tp.positiveRate * 100)}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Irritazione</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.round(tp.irritationRate * 100)}%` }} />
                              </div>
                              <span className="font-mono w-8 text-right">{Math.round(tp.irritationRate * 100)}%</span>
                            </div>
                          </div>
                        </div>
                        {/* Top reactions */}
                        {tp.topReactions?.length > 0 && (
                          <div className="ml-8 space-y-1">
                            {tp.topReactions.slice(0, 2).map((r: any, rIdx: number) => (
                              <div key={rIdx} className="flex items-start gap-2 bg-muted/30 rounded p-2">
                                <span className={`text-xs font-medium shrink-0 ${r.score > 0 ? "text-green-600" : "text-red-600"}`}>
                                  {r.score >= 0 ? "+" : ""}{r.score.toFixed(2)}
                                </span>
                                <p className="text-xs text-muted-foreground italic flex-1">"{r.quote}"</p>
                                <span className="text-xs text-muted-foreground shrink-0">{r.agentName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dropout analysis */}
            {results.dropoutAnalysis?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-amber-500" />
                    Analisi dropout
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.dropoutAnalysis.map((d: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground w-6 text-right">{idx + 1}</span>
                        <span className="font-medium flex-1">{d.touchpointLabel}</span>
                        <span className="text-red-600 font-mono">{d.droppedAgents} agenti persi</span>
                        <span className="text-muted-foreground text-xs">{d.reason}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Funnel summary */}
            {results.funnelSummary && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Sommario funnel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Score iniziale → finale</p>
                      <p className="font-mono">
                        {results.funnelSummary.initialAvgScore?.toFixed(2)} → {results.funnelSummary.finalAvgScore?.toFixed(2)}
                        <span className={`ml-2 text-xs ${results.funnelSummary.sentimentLift > 0 ? "text-green-600" : "text-red-600"}`}>
                          {(results.funnelSummary.sentimentLift ?? 0) >= 0 ? "+" : ""}{(results.funnelSummary.sentimentLift ?? 0).toFixed(2)})
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Familiarity lift</p>
                      <p className="font-mono">{(results.funnelSummary.familiarityLift * 100)?.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Touchpoint ottimale</p>
                      <p className="font-medium">{results.funnelSummary.bestTouchpoint ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Touchpoint critico</p>
                      <p className="font-medium text-amber-600">{results.funnelSummary.worstTouchpoint ?? "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Insights */}
            {results.insights?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Insights chiave
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {results.insights.map((insight: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-foreground">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {results.recommendations?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-primary" />
                    Raccomandazioni strategiche
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {results.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-bold shrink-0">{idx + 1}.</span>
                        <span className="text-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Non-journey results placeholder */}
        {sim?.status === "complete" && !isJourney && results && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Tipo di simulazione: <strong>{results.simulationType}</strong>. Visualizzazione disponibile in <a href="/app/lab/strategic" className="text-primary underline">Lab → Simulazioni Strategiche</a>.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
