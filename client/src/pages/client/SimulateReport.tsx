/**
 * SimulateReport — /app/simulate/:id/report
 *
 * Pagina report completo della simulazione.
 * Mostra: executive summary, KPI aggregati, distribuzione score,
 * citazioni agenti, risk flags, raccomandazioni strategiche.
 */

import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  Share2,
  Zap,
  CheckCircle2,
  MessageSquareQuote,
  BarChart3,
  Lightbulb,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────

function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 0.5) return "text-emerald-600";
  if (score >= 0.1) return "text-amber-600";
  if (score >= -0.1) return "text-muted-foreground";
  return "text-red-600";
}

function scoreBg(score: number | null | undefined): string {
  if (score == null) return "bg-muted/30";
  if (score >= 0.5) return "bg-emerald-50 border-emerald-200";
  if (score >= 0.1) return "bg-amber-50 border-amber-200";
  if (score >= -0.1) return "bg-muted/30";
  return "bg-red-50 border-red-200";
}

function pct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}

function fmtScore(v: number | null | undefined): string {
  if (v == null) return "—";
  return (v > 0 ? "+" : "") + v.toFixed(2);
}

// ─── KPI Card ─────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  colorClass = "text-foreground",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  colorClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Component ───────────────────────────────────────────────────────

export default function SimulateReport() {
  const [, params] = useRoute("/app/simulate/:id/report");
  const [, navigate] = useLocation();
  const testId = params?.id ? parseInt(params.id, 10) : null;

  const testQuery = trpc.campaignTesting.get.useQuery(
    { id: testId! },
    { enabled: testId != null }
  );

  const reactionsQuery = trpc.campaignTesting.getReactions.useQuery(
    { campaignTestId: testId! },
    { enabled: testId != null }
  );

  const reportQuery = trpc.campaignTesting.getReport.useQuery(
    { campaignTestId: testId! },
    { enabled: testId != null }
  );

  const test = testQuery.data;
  const reactions = (reactionsQuery.data ?? []) as any[];
  const report = reportQuery.data as any;

  const isLoading = testQuery.isLoading || reactionsQuery.isLoading || reportQuery.isLoading;

  if (!testId) {
    return (
      <ClientLayout>
        <div className="p-8 text-center text-muted-foreground">ID simulazione non valido.</div>
      </ClientLayout>
    );
  }

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="p-8 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Caricamento report…
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

  // Compute aggregate stats from reactions
  const completed = reactions.filter((r: any) => r.status === "complete");
  const n = completed.length;

  const avg = (key: string) =>
    n > 0 ? completed.reduce((s: number, r: any) => s + (r[key] ?? 0), 0) / n : null;

  const avgScore = avg("overallScore");
  const avgBuy = avg("buyProbability");
  const avgShare = avg("shareProbability");
  const avgAttraction = avg("attractionScore");
  const avgRepulsion = avg("repulsionScore");
  const avgEmotional = avg("emotionalValence");

  // Score distribution buckets
  const buckets = {
    "Molto positivo (≥0.5)": completed.filter((r: any) => (r.overallScore ?? 0) >= 0.5).length,
    "Positivo (0.1–0.5)": completed.filter((r: any) => (r.overallScore ?? 0) >= 0.1 && (r.overallScore ?? 0) < 0.5).length,
    "Neutro (−0.1–0.1)": completed.filter((r: any) => (r.overallScore ?? 0) >= -0.1 && (r.overallScore ?? 0) < 0.1).length,
    "Negativo (<−0.1)": completed.filter((r: any) => (r.overallScore ?? 0) < -0.1).length,
  };

  // Top quotes
  const topQuotes = completed
    .filter((r: any) => r.quote)
    .sort((a: any, b: any) => Math.abs(b.overallScore ?? 0) - Math.abs(a.overallScore ?? 0))
    .slice(0, 6);

  return (
    <ClientLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <button
              onClick={() => navigate(`/app/simulate/${testId}`)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Torna alla simulazione live
            </button>
            <h1 className="text-2xl font-display font-bold text-foreground">{test.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {n} agenti · completata {test.completedAt
                ? new Date(test.completedAt).toLocaleDateString("it-IT", {
                    day: "numeric", month: "long", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })
                : "—"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/app/simulate/new")}
            className="gap-2"
          >
            Nuova simulazione
          </Button>
        </div>

        {/* Executive Summary */}
        {report?.executiveSummary && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">
                {String(report.executiveSummary)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Score medio"
            value={fmtScore(avgScore)}
            sub={avgScore != null ? (avgScore >= 0.3 ? "Risposta positiva" : avgScore >= -0.1 ? "Risposta neutro" : "Risposta negativa") : undefined}
            icon={BarChart3}
            colorClass={scoreColor(avgScore)}
          />
          <KpiCard
            label="Prob. acquisto"
            value={pct(avgBuy)}
            sub="media panel"
            icon={ShoppingCart}
            colorClass={avgBuy != null && avgBuy >= 0.4 ? "text-emerald-600" : "text-foreground"}
          />
          <KpiCard
            label="Prob. condivisione"
            value={pct(avgShare)}
            sub="media panel"
            icon={Share2}
          />
          <KpiCard
            label="Intensità emotiva"
            value={pct(avg("emotionalIntensity"))}
            sub={avgEmotional != null ? (avgEmotional >= 0 ? "valenza positiva" : "valenza negativa") : undefined}
            icon={Zap}
            colorClass={scoreColor(avgEmotional)}
          />
        </div>

        {/* Attraction vs Repulsion */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-semibold">Attrazione media</p>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{pct(avgAttraction)}</p>
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.round((avgAttraction ?? 0) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <p className="text-sm font-semibold">Repulsione media</p>
              </div>
              <p className="text-3xl font-bold text-red-500">{pct(avgRepulsion)}</p>
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${Math.round((avgRepulsion ?? 0) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Score distribution */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Distribuzione risposte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(buckets).map(([label, count]) => {
                const pctVal = n > 0 ? Math.round((count / n) * 100) : 0;
                const isPositive = label.startsWith("Molto positivo") || label.startsWith("Positivo");
                const isNegative = label.startsWith("Negativo");
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-44 shrink-0">{label}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isPositive ? "bg-emerald-500" : isNegative ? "bg-red-500" : "bg-amber-400"}`}
                        style={{ width: `${pctVal}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-foreground w-8 text-right">{count}</span>
                    <span className="text-xs text-muted-foreground w-8">{pctVal}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Common patterns & Key divergences */}
        {(report?.commonPatterns || report?.keyDivergences) && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {report.commonPatterns && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Pattern comuni
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground leading-relaxed">
                    {String(report.commonPatterns)}
                  </p>
                </CardContent>
              </Card>
            )}
            {report.keyDivergences && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Divergenze chiave
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground leading-relaxed">
                    {String(report.keyDivergences)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Recommendations */}
        {report?.recommendations && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                Raccomandazioni strategiche
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {String(report.recommendations)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Risk Flags */}
        {report?.riskFlags && (report.riskFlags as string[]).length > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                Risk Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(report.riskFlags as string[]).map((flag: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <p className="text-sm text-red-800">{flag}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Quotes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquareQuote className="w-4 h-4 text-primary" />
              Voci dal panel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nessuna citazione disponibile.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {topQuotes.map((r: any) => (
                  <div
                    key={r.id}
                    className={`border rounded-lg p-3 ${scoreBg(r.overallScore)}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">Agente #{r.agentId}</span>
                      <span className={`text-xs font-semibold ${scoreColor(r.overallScore)}`}>
                        {fmtScore(r.overallScore)}
                      </span>
                    </div>
                    <blockquote className="text-sm italic text-foreground">
                      "{String(r.quote ?? '')}"
                    </blockquote>
                    {r.gutReaction && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                        {String(r.gutReaction)}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(Array.isArray(r.attractions) ? r.attractions as string[] : []).slice(0, 1).map((a: string, i: number) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          + {a}
                        </span>
                      ))}
                      {(Array.isArray(r.repulsions) ? r.repulsions as string[] : []).slice(0, 1).map((rep: string, i: number) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                          − {rep}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
