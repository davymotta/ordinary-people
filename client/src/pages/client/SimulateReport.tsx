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
  Download,
  Brain,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

// ─── PDF Export ───────────────────────────────────────────────────────
// Usa la route server-side /api/report/:id/pdf per un PDF professionale
function exportToPdf(testId: number, testName: string) {
  const url = `/api/report/${testId}/pdf`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `${testName.replace(/[^a-zA-Z0-9_\-]/g, "_")}_report.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

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

  // Psyche diagnostics aggregates
  const psycheReactions = completed.filter((r: any) => r.psycheMood);
  const hasPsyche = psycheReactions.length > 0;

  const moodCounts: Record<string, number> = {};
  for (const r of psycheReactions) {
    const m = String(r.psycheMood);
    moodCounts[m] = (moodCounts[m] ?? 0) + 1;
  }
  const topMoods = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const woundActiveCount = completed.filter((r: any) => r.psycheWoundActive).length;
  const woundRate = n > 0 ? Math.round((woundActiveCount / n) * 100) : 0;

  const biasCounts: Record<string, number> = {};
  for (const r of completed) {
    if (Array.isArray(r.psycheActiveBiases)) {
      for (const b of r.psycheActiveBiases as string[]) {
        biasCounts[b] = (biasCounts[b] ?? 0) + 1;
      }
    }
  }
  const topBiases = Object.entries(biasCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Psyche Delta — impatto psicologico della campagna
  // Calcola per ogni nodo Psyche quanti agenti lo hanno attivato (bias attivi)
  // e il delta mood (valence shift) rispetto al baseline neutro
  const PSYCHE_NODES_ORDERED = [
    "identity", "core_wound", "shadow", "inner_voice", "defense_mechanism",
    "loss_aversion", "risk_calculator", "reward_anticipation", "aspiration_engine",
    "belonging_need", "distinction_need", "social_mirror", "conformity_pressure",
    "status_signaling", "reciprocity_engine", "fairness_monitor", "trust_calibrator",
    "nostalgia_module", "scarcity_detector", "authority_bias", "anchoring_effect",
    "identity_defense", "cognitive_dissonance", "emotional_memory", "arousal_regulator",
    "attention_filter", "narrative_constructor", "meaning_maker", "time_perception",
    "body_schema", "episodic_memory", "prospection_engine",
  ];

  // Conta quante volte ogni bias è stato attivato (già in biasCounts)
  // Calcola il delta mood: quanti agenti sono passati a mood positivo vs negativo
  const positiveMoods = ["joy", "excitement", "contentment", "trust", "anticipation"];
  const negativeMoods = ["fear", "anger", "sadness", "disgust", "anxiety", "shame", "guilt"];
  const moodPositiveCount = psycheReactions.filter((r: any) => positiveMoods.includes(String(r.psycheMood))).length;
  const moodNegativeCount = psycheReactions.filter((r: any) => negativeMoods.includes(String(r.psycheMood))).length;
  const moodNeutralCount = psycheReactions.length - moodPositiveCount - moodNegativeCount;
  const moodValenceDelta = psycheReactions.length > 0
    ? Math.round(((moodPositiveCount - moodNegativeCount) / psycheReactions.length) * 100)
    : 0;

  // Top nodi attivati (bias con frequenza > 0, ordinati per frequenza)
  const topActivatedNodes = Object.entries(biasCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([node, count]) => ({
      node,
      count,
      pct: Math.round((count / n) * 100),
    }));

  // Nodi "a rischio" = attivati in >40% degli agenti e con valenza negativa
  const riskNodes = topActivatedNodes.filter(n => n.pct > 40 &&
    ["core_wound", "shadow", "loss_aversion", "cognitive_dissonance", "fairness_monitor", "identity_defense"].includes(n.node)
  );

  const hasPsycheDelta = psycheReactions.length > 0;

  // Big Five radar data from reactions
  const bigFiveKeys = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"] as const;
  const bigFiveLabels: Record<string, string> = {
    openness: "Apertura",
    conscientiousness: "Coscienziosità",
    extraversion: "Estroversione",
    agreeableness: "Gradevolezza",
    neuroticism: "Nevroticismo",
  };

  const radarData = bigFiveKeys.map((key) => {
    const vals = completed
      .map((r: any) => r.agentBigFive?.[key] ?? null)
      .filter((v: any) => v != null) as number[];
    const mean = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    return { trait: bigFiveLabels[key], value: Math.round(mean * 100) };
  });

  const hasRadarData = radarData.some((d) => d.value > 0);

  return (
    <ClientLayout>
      <div id="report-content" className="p-8 max-w-5xl mx-auto">
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => exportToPdf(testId!, test.name ?? "report")}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Esporta PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/app/simulate/new")}
              className="gap-2"
            >
              Nuova simulazione
            </Button>
          </div>
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

        {/* Big Five Radar Chart */}
        {hasRadarData && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Profilo Big Five del panel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="trait"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Radar
                      name="Panel"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Valori medi Big Five degli agenti che hanno risposto (0–100)
              </p>
            </CardContent>
          </Card>
        )}

        {/* Psyche Diagnostics */}
        {hasPsyche && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-500" />
                Psyche Diagnostics
                <Badge variant="outline" className="text-xs ml-auto">Motore cognitivo interno</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Mood distribution */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3">Distribuzione mood</p>
                  <div className="space-y-2">
                    {topMoods.map(([mood, count]) => (
                      <div key={mood} className="flex items-center gap-2">
                        <div
                          className="h-2 rounded-full bg-violet-400 flex-shrink-0"
                          style={{ width: `${Math.round((count / psycheReactions.length) * 100)}%`, minWidth: "4px", maxWidth: "80px" }}
                        />
                        <span className="text-xs text-foreground capitalize">{mood}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Wound activation */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3">Ferita primaria attivata</p>
                  <div className="flex items-end gap-3">
                    <p className={`text-3xl font-bold ${woundRate > 50 ? "text-rose-600" : woundRate > 25 ? "text-amber-600" : "text-emerald-600"}`}>
                      {woundRate}%
                    </p>
                    <p className="text-xs text-muted-foreground pb-1">
                      {woundActiveCount} / {n} agenti<br />
                      {woundRate > 50 ? "⚠ Campagna divisiva" : woundRate > 25 ? "Attenzione moderata" : "Bassa attivazione"}
                    </p>
                  </div>
                </div>
                {/* Top biases */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3">Bias cognitivi dominanti</p>
                  <div className="flex flex-wrap gap-1.5">
                    {topBiases.map(([bias, count]) => (
                      <span
                        key={bias}
                        className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200"
                        title={`${count} agenti`}
                      >
                        {bias}
                      </span>
                    ))}
                    {topBiases.length === 0 && (
                      <span className="text-xs text-muted-foreground">Nessun bias rilevato</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Psyche Impact Report */}
        {hasPsycheDelta && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-500" />
                Impatto Psicologico
                <Badge variant="outline" className="text-xs ml-auto">Psyche Delta Report</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mood Valence Delta */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-lg border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Delta Valenza Mood</p>
                  <p className={`text-2xl font-bold ${
                    moodValenceDelta > 20 ? "text-emerald-600" :
                    moodValenceDelta < -20 ? "text-rose-600" : "text-amber-600"
                  }`}>
                    {moodValenceDelta > 0 ? "+" : ""}{moodValenceDelta}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {moodValenceDelta > 20 ? "Risposta emotiva positiva" :
                     moodValenceDelta < -20 ? "Risposta emotiva negativa" : "Risposta ambivalente"}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Mood Positivi</p>
                  <p className="text-2xl font-bold text-emerald-600">{moodPositiveCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">{psycheReactions.length > 0 ? Math.round((moodPositiveCount / psycheReactions.length) * 100) : 0}% del panel</p>
                </div>
                <div className="rounded-lg border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Mood Negativi</p>
                  <p className="text-2xl font-bold text-rose-600">{moodNegativeCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">{psycheReactions.length > 0 ? Math.round((moodNegativeCount / psycheReactions.length) * 100) : 0}% del panel</p>
                </div>
                <div className="rounded-lg border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Mood Neutri</p>
                  <p className="text-2xl font-bold text-slate-500">{moodNeutralCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">{psycheReactions.length > 0 ? Math.round((moodNeutralCount / psycheReactions.length) * 100) : 0}% del panel</p>
                </div>
              </div>

              {/* Nodi attivati */}
              {topActivatedNodes.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-medium text-muted-foreground mb-3">Nodi cognitivi attivati dalla campagna</p>
                  <div className="space-y-2">
                    {topActivatedNodes.map(({ node, count, pct }) => {
                      const isRisk = ["core_wound", "shadow", "loss_aversion", "cognitive_dissonance", "fairness_monitor", "identity_defense"].includes(node);
                      const isPositive = ["reward_anticipation", "aspiration_engine", "trust_calibrator", "belonging_need"].includes(node);
                      return (
                        <div key={node} className="flex items-center gap-3">
                          <div className="w-36 text-xs text-muted-foreground truncate flex-shrink-0">
                            {node.replace(/_/g, " ")}
                          </div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isRisk ? "bg-rose-500" : isPositive ? "bg-emerald-500" : "bg-indigo-400"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="w-16 text-right">
                            <span className={`text-xs font-medium ${
                              isRisk ? "text-rose-600" : isPositive ? "text-emerald-600" : "text-indigo-600"
                            }`}>{pct}%</span>
                            <span className="text-xs text-muted-foreground ml-1">({count})</span>
                          </div>
                          {isRisk && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex-shrink-0">⚠ rischio</span>
                          )}
                          {isPositive && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">✓ positivo</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Risk nodes alert */}
              {riskNodes.length > 0 && (
                <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-rose-800 mb-1">Nodi a rischio attivati</p>
                      <p className="text-xs text-rose-700">
                        La campagna ha attivato nodi cognitivi ad alto rischio in oltre il 40% degli agenti:
                        {" "}{riskNodes.map(n => n.node.replace(/_/g, " ")).join(", ")}.
                        Considera di riformulare il messaggio per ridurre l'attivazione di ferite primarie e meccanismi difensivi.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Nessun nodo attivato */}
              {topActivatedNodes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nessun nodo cognitivo attivato. Esegui una simulazione per vedere i dati.
                </p>
              )}
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
