/**
 * SimulateLive — /app/simulate/:id
 *
 * Pagina live della simulazione in corso.
 * Fa polling ogni 3s su campaignTesting.get e campaignTesting.getReactions
 * per mostrare avanzamento agenti e feed citazioni in tempo reale.
 * Quando il test è "complete" mostra il pulsante "Vedi report".
 */

import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquareQuote,
} from "lucide-react";

// ─── Score color helper ───────────────────────────────────────────────

function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 0.5) return "text-emerald-600";
  if (score >= 0.1) return "text-amber-600";
  if (score >= -0.1) return "text-muted-foreground";
  return "text-red-600";
}

function scoreLabel(score: number | null | undefined): string {
  if (score == null) return "—";
  if (score >= 0.6) return "Molto positivo";
  if (score >= 0.2) return "Positivo";
  if (score >= -0.2) return "Neutro";
  if (score >= -0.6) return "Negativo";
  return "Molto negativo";
}

function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}

// ─── Component ───────────────────────────────────────────────────────

export default function SimulateLive() {
  const [, params] = useRoute("/app/simulate/:id");
  const [, navigate] = useLocation();
  const testId = params?.id ? parseInt(params.id, 10) : null;

  const [pollingEnabled, setPollingEnabled] = useState(true);

  // Poll test status
  const testQuery = trpc.campaignTesting.get.useQuery(
    { id: testId! },
    {
      enabled: testId != null,
      refetchInterval: pollingEnabled ? 3000 : false,
    }
  );

  // Poll reactions
  const reactionsQuery = trpc.campaignTesting.getReactions.useQuery(
    { campaignTestId: testId! },
    {
      enabled: testId != null,
      refetchInterval: pollingEnabled ? 3000 : false,
    }
  );

  const test = testQuery.data;
  const reactions = reactionsQuery.data ?? [];

  // Stop polling when complete or failed
  useEffect(() => {
    if (test?.status === "complete" || test?.status === "failed") {
      setPollingEnabled(false);
    }
  }, [test?.status]);

  if (!testId) {
    return (
      <ClientLayout>
        <div className="p-8 text-center text-muted-foreground">ID simulazione non valido.</div>
      </ClientLayout>
    );
  }

  if (testQuery.isLoading) {
    return (
      <ClientLayout>
        <div className="p-8 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Caricamento simulazione…
        </div>
      </ClientLayout>
    );
  }

  if (!test) {
    return (
      <ClientLayout>
        <div className="p-8 text-center text-muted-foreground">Simulazione non trovata.</div>
      </ClientLayout>
    );
  }

  const isRunning = test.status === "running" || test.status === "pending";
  const isComplete = test.status === "complete";
  const isFailed = test.status === "failed";

  const progress = test.totalAgents > 0
    ? Math.round((test.completedAgents / test.totalAgents) * 100)
    : 0;

  // Reactions with quotes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reactionsWithQuotes = (reactions as any[]).filter((r: any) => r.quote && r.status === "complete");

  // Aggregate quick stats from completed reactions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completed = (reactions as any[]).filter((r: any) => r.status === "complete");
  const avgScore = completed.length > 0
    ? completed.reduce((s, r) => s + (r.overallScore ?? 0), 0) / completed.length
    : null;
  const avgBuy = completed.length > 0
    ? completed.reduce((s, r) => s + (r.buyProbability ?? 0), 0) / completed.length
    : null;

  return (
    <ClientLayout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isRunning && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              {isComplete && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {isFailed && <AlertCircle className="w-4 h-4 text-red-500" />}
              <h1 className="text-2xl font-display font-bold text-foreground">{test.name}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {isRunning && "Simulazione in corso — le reazioni arrivano in tempo reale"}
              {isComplete && "Simulazione completata — tutti gli agenti hanno reagito"}
              {isFailed && "Simulazione fallita"}
            </p>
          </div>
          {isComplete && (
            <Button
              onClick={() => navigate(`/app/simulate/${testId}/report`)}
              className="gap-2"
            >
              Vedi report completo
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Progress bar */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {test.completedAgents} / {test.totalAgents} agenti
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isRunning && (
                  <Badge variant="secondary" className="gap-1.5 text-xs">
                    <Clock className="w-3 h-3" />
                    In corso
                  </Badge>
                )}
                {isComplete && (
                  <Badge className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    Completata
                  </Badge>
                )}
                {isFailed && (
                  <Badge variant="destructive" className="gap-1.5 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    Fallita
                  </Badge>
                )}
                <span className="text-sm font-bold text-primary">{progress}%</span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick stats (live) */}
        {completed.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Score medio</p>
                <p className={`text-2xl font-bold ${scoreColor(avgScore)}`}>
                  {avgScore != null ? (avgScore > 0 ? "+" : "") + avgScore.toFixed(2) : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{scoreLabel(avgScore)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Prob. acquisto</p>
                <p className="text-2xl font-bold text-foreground">{pct(avgBuy)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">media panel</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Agenti completati</p>
                <p className="text-2xl font-bold text-foreground">{completed.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">su {test.totalAgents}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Feed citazioni */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquareQuote className="w-4 h-4 text-primary" />
              Voci dal panel
              {isRunning && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  — aggiornamento automatico ogni 3s
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reactionsWithQuotes.length === 0 ? (
              <div className="py-8 text-center">
                {isRunning ? (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <p className="text-sm">Le prime reazioni arriveranno tra poco…</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nessuna citazione disponibile.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {reactionsWithQuotes.map((reaction) => (
                  <div
                    key={reaction.id}
                    className="border border-border rounded-lg p-4 bg-muted/20"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {reaction.agentId}
                        </div>
                        <span className="text-xs text-muted-foreground">Agente #{reaction.agentId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {reaction.overallScore != null && (
                          <span className={`text-xs font-semibold ${scoreColor(reaction.overallScore)}`}>
                            {reaction.overallScore > 0 ? "+" : ""}{reaction.overallScore.toFixed(2)}
                          </span>
                        )}
                        {reaction.buyProbability != null && (
                          <Badge variant="outline" className="text-xs">
                            acquisto {pct(reaction.buyProbability)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {/* Quote */}
                    <blockquote className="text-sm italic text-foreground border-l-2 border-primary/40 pl-3 mb-2">
                      "{String(reaction.quote ?? '')}"
                    </blockquote>
                    {reaction.gutReaction ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {String(reaction.gutReaction)}
                      </p>
                    ) : null}
                    {/* Attractions / Repulsions */}
                    {(reaction.attractions || reaction.repulsions) && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(Array.isArray(reaction.attractions) ? reaction.attractions as string[] : []).slice(0, 2).map((a: string, i: number) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            + {a}
                          </span>
                        ))}
                        {(Array.isArray(reaction.repulsions) ? reaction.repulsions as string[] : []).slice(0, 2).map((r: string, i: number) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                            − {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom CTA when complete */}
        {isComplete && (
          <div className="mt-6 flex justify-end">
            <Button
              size="lg"
              onClick={() => navigate(`/app/simulate/${testId}/report`)}
              className="gap-2"
            >
              Leggi il report completo
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
