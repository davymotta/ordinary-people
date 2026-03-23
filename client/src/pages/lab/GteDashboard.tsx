/**
 * GTE Dashboard — Ground Truth Engine
 * Visualizza i post raccolti, le statistiche di calibrazione e il workflow GTE.
 */
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Target, TrendingUp, BarChart3, RefreshCw,
  CheckCircle, AlertTriangle, Eye, ThumbsUp, MessageSquare,
  Play, Zap, Database, Youtube, ExternalLink, Info, Brain, Star, Shield,
} from "lucide-react";
import { SocialAuthFlow } from "@/components/SocialAuthFlow";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";

// ─── Utility Components ───────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, color = "default"
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: "default" | "green" | "blue" | "amber" | "red";
}) {
  const colorMap = {
    default: "text-foreground",
    green: "text-emerald-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
    red: "text-red-600",
  };
  return (
    <Card className="border border-border/50 shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
            <p className={`text-2xl font-bold tracking-tight mt-1 ${colorMap[color]}`}>{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="text-muted-foreground/50">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function RhoBar({ rho, label }: { rho: number; label: string }) {
  const pct = Math.max(0, Math.min(100, (rho + 1) / 2 * 100));
  const color = rho >= 0.80 ? "bg-emerald-500" : rho >= 0.65 ? "bg-blue-500" : rho >= 0.50 ? "bg-amber-500" : "bg-red-500";
  const textColor = rho >= 0.80 ? "text-emerald-600" : rho >= 0.65 ? "text-blue-600" : rho >= 0.50 ? "text-amber-600" : "text-red-600";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground capitalize font-medium">{label}</span>
        <span className={`text-xs font-mono font-bold ${textColor}`}>{rho.toFixed(3)}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AccuracyBadge({ rho }: { rho: number }) {
  if (rho >= 0.80) return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Eccellente ρ={rho.toFixed(2)}</Badge>;
  if (rho >= 0.65) return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Buono ρ={rho.toFixed(2)}</Badge>;
  if (rho >= 0.50) return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Moderato ρ={rho.toFixed(2)}</Badge>;
  return <Badge className="bg-red-500/15 text-red-600 border-red-500/30">Debole ρ={rho.toFixed(2)}</Badge>;
}

function ViewsBar({ views, maxViews }: { views: number; maxViews: number }) {
  const pct = maxViews > 0 ? (views / maxViews) * 100 : 0;
  return (
    <div className="h-1.5 bg-secondary rounded-full overflow-hidden w-24">
      <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  );
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ─── Workflow Step ────────────────────────────────────────────────────────────

function WorkflowStep({
  step, title, desc, status, action
}: {
  step: number;
  title: string;
  desc: string;
  status: "done" | "active" | "pending";
  action?: React.ReactNode;
}) {
  const statusConfig = {
    done: { bg: "bg-emerald-500/10 border-emerald-500/30", icon: <CheckCircle className="h-4 w-4 text-emerald-500" />, text: "text-emerald-600" },
    active: { bg: "bg-primary/10 border-primary/30", icon: <Zap className="h-4 w-4 text-primary" />, text: "text-primary" },
    pending: { bg: "bg-secondary border-border/50", icon: <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />, text: "text-muted-foreground" },
  };
  const cfg = statusConfig[status];
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg}`}>
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-background border border-border/50 shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-muted-foreground">{step}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {cfg.icon}
          <p className={`text-xs font-semibold ${cfg.text}`}>{title}</p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GteDashboard() {
  const [selectedBrandId, setSelectedBrandId] = useState<number>(1); // Default: Loewe
  const [calibrationReport, setCalibrationReport] = useState<Record<string, unknown> | null>(null);

  // Queries
  const { data: brandAgents } = trpc.onboarding.listBrandAgents.useQuery();
  const { data: gteStats, refetch: refetchStats } = trpc.groundTruth.getStats.useQuery(
    { brandAgentId: selectedBrandId },
    { enabled: selectedBrandId > 0 }
  );
  const { data: posts, isLoading: loadingPosts, refetch: refetchPosts } = trpc.groundTruth.getPosts.useQuery(
    { brandAgentId: selectedBrandId, limit: 100 },
    { enabled: selectedBrandId > 0 }
  );
  const { data: normalizedPosts, refetch: refetchNormalized } = trpc.groundTruth.getNormalizedPosts.useQuery(
    { brandAgentId: selectedBrandId },
    { enabled: selectedBrandId > 0 }
  );
  const { data: accuracyTimeline, refetch: refetchTimeline } = trpc.groundTruth.getAccuracyTimeline.useQuery(
    { brandAgentId: selectedBrandId },
    { enabled: selectedBrandId > 0 }
  );
  const { data: simStats, refetch: refetchSimStats } = trpc.groundTruth.getSimulationStats.useQuery(
    { brandAgentId: selectedBrandId },
    { enabled: selectedBrandId > 0 }
  );

  // Mutations
  const harvestYouTube = trpc.groundTruth.harvestYouTube.useMutation({
    onSuccess: (data) => {
      toast.success(`Raccolti ${data.harvested} video YouTube (${data.skipped} già presenti)`);
      refetchPosts();
      refetchStats();
    },
    onError: (err) => toast.error(err.message),
  });

  const normalizeMutation = trpc.groundTruth.normalize.useMutation({
    onSuccess: (data) => {
      toast.success(`Normalizzati ${data.count} post — percentile rank calcolati`);
      refetchPosts();
      refetchNormalized();
      refetchStats();
    },
    onError: (err) => toast.error(err.message),
  });

  const simulateMutation = trpc.groundTruth.runGteSimulation.useMutation({
    onSuccess: (data) => {
      const d = data as { processed: number; skipped: number; total: number };
      if (d.processed > 0) {
        toast.success(`Simulazione completata — ${d.processed} post processati, ${d.skipped} già simulati`);
      } else {
        toast.info(`Tutti i ${d.skipped} post erano già simulati`);
      }
      refetchSimStats();
    },
    onError: (err) => toast.error(`Simulazione fallita: ${err.message}`),
  });

  const calibrateMutation = trpc.groundTruth.runGteCalibration.useMutation({
    onSuccess: (data) => {
      setCalibrationReport(data as unknown as Record<string, unknown>);
      const report = data as { overallAccuracy?: number };
      toast.success(`Calibrazione completata — ρ: ${(report.overallAccuracy ?? 0).toFixed(3)}`);
      refetchTimeline();
    },
    onError: (err) => toast.error(`Calibrazione fallita: ${err.message}`),
  });

  // Computed
  const selectedBrand = brandAgents?.find((b: { id: number }) => b.id === selectedBrandId);
  const latestTimeline = accuracyTimeline?.[accuracyTimeline.length - 1] as {
    rollingRhoComposite: number | null;
  } | undefined;
  const postsWithViews = useMemo(() => {
    if (!posts) return [];
    return posts
      .filter(p => {
        const m = p.metrics48h as Record<string, number> | null;
        return m && m.views && m.views > 0;
      })
      .sort((a, b) => {
        const av = (a.metrics48h as Record<string, number>)?.views ?? 0;
        const bv = (b.metrics48h as Record<string, number>)?.views ?? 0;
        return bv - av;
      });
  }, [posts]);

  const maxViews = useMemo(() => {
    if (!postsWithViews.length) return 1;
    return Math.max(...postsWithViews.map(p => (p.metrics48h as Record<string, number>)?.views ?? 0));
  }, [postsWithViews]);

  // Workflow status
  const step1Status = (gteStats?.total ?? 0) > 0 ? "done" : "active";
  const step2Status = (gteStats?.normalized ?? 0) > 0 ? "done" : step1Status === "done" ? "active" : "pending";
  const simulated = simStats?.simulated ?? 0;
  const step3Status: "done" | "active" | "pending" = simulated > 0 ? "done" : step2Status === "done" ? "active" : "pending";
  const step4Status: "done" | "active" | "pending" = (accuracyTimeline && accuracyTimeline.length > 0) ? "done" : step3Status === "done" ? "active" : "pending";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-[-0.03em]">Ground Truth Engine</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Calibra il modello su dati social reali — misura l'accuratezza predittiva degli agenti sintetici
          </p>
        </div>
        {latestTimeline?.rollingRhoComposite !== undefined && latestTimeline.rollingRhoComposite !== null && (
          <AccuracyBadge rho={latestTimeline.rollingRhoComposite} />
        )}
      </div>

      {/* Brand selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground font-medium">Brand:</span>
        <div className="flex gap-2">
          {brandAgents?.map((b: { id: number; brandName: string }) => (
            <button
              key={b.id}
              onClick={() => setSelectedBrandId(b.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                selectedBrandId === b.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border/50 hover:border-primary/50"
              }`}
            >
              {b.brandName}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Post Raccolti"
          value={gteStats?.total ?? 0}
          sub={`${gteStats?.platforms?.youtube ?? 0} YouTube · ${gteStats?.platforms?.tiktok ?? 0} TikTok`}
          icon={<Database className="h-5 w-5" />}
          color={gteStats?.total ? "blue" : "default"}
        />
        <StatCard
          label="Post Normalizzati"
          value={gteStats?.normalized ?? 0}
          sub={`${gteStats?.total ? Math.round((gteStats.normalized / gteStats.total) * 100) : 0}% del totale`}
          icon={<BarChart3 className="h-5 w-5" />}
          color={gteStats?.normalized ? "green" : "default"}
        />
        <StatCard
          label="Views Medie"
          value={gteStats?.viewsStats ? formatViews(gteStats.viewsStats.avg) : "—"}
          sub={`Max: ${gteStats?.viewsStats ? formatViews(gteStats.viewsStats.max) : "—"}`}
          icon={<Eye className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          label="Accuratezza ρ"
          value={latestTimeline?.rollingRhoComposite != null ? latestTimeline.rollingRhoComposite.toFixed(3) : "—"}
          sub={latestTimeline ? `Ultima calibrazione` : "Non ancora calibrato"}
          icon={<TrendingUp className="h-5 w-5" />}
          color={latestTimeline?.rollingRhoComposite ? (latestTimeline.rollingRhoComposite >= 0.65 ? "green" : "amber") : "default"}
        />
      </div>

      <Tabs defaultValue="workflow">
        <TabsList className="h-8 text-xs">
          <TabsTrigger value="workflow" className="text-xs">Workflow GTE</TabsTrigger>
          <TabsTrigger value="posts" className="text-xs">Post Raccolti ({gteStats?.total ?? 0})</TabsTrigger>
          <TabsTrigger value="calibration" className="text-xs">Calibrazione</TabsTrigger>
          <TabsTrigger value="hook" className="text-xs flex items-center gap-1"><Brain className="h-3 w-3" />Hook Analyser</TabsTrigger>
          <TabsTrigger value="auth" className="text-xs flex items-center gap-1"><Shield className="h-3 w-3" />Social Auth</TabsTrigger>
          {accuracyTimeline && accuracyTimeline.length > 0 && (
            <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
          )}
        </TabsList>

        {/* ─── WORKFLOW TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="workflow" className="space-y-4 mt-4">
          <Card className="border border-border/50 shadow-none">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Ciclo di Calibrazione GTE</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Il Ground Truth Engine confronta le reazioni degli agenti sintetici con i dati reali dei social media.
                Il coefficiente di Spearman ρ misura quanto bene il modello predice l'ordine relativo di performance dei contenuti.
              </p>

              <div className="space-y-2 mt-4">
                <WorkflowStep
                  step={1}
                  title="Raccolta Dati (Harvest)"
                  desc={`${gteStats?.total ?? 0} post raccolti da YouTube/TikTok per ${selectedBrand?.brandName ?? "il brand"}`}
                  status={step1Status}
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      disabled={harvestYouTube.isPending}
                      onClick={() => harvestYouTube.mutate({
                        brandAgentId: selectedBrandId,
                        channelId: "UCIkFEXV_zvjOlmOcKEHW_hg",
                        maxPosts: 60,
                        brandFollowers: 50000,
                      })}
                    >
                      {harvestYouTube.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                      Aggiorna
                    </Button>
                  }
                />

                <WorkflowStep
                  step={2}
                  title="Normalizzazione"
                  desc={`Calcola percentile rank per Resonance, Depth, Amplification, Polarity, Rejection — ${gteStats?.normalized ?? 0}/${gteStats?.total ?? 0} normalizzati`}
                  status={step2Status}
                  action={
                    <Button
                      size="sm"
                      variant={step2Status === "active" ? "default" : "outline"}
                      className="text-xs h-7"
                      disabled={normalizeMutation.isPending || (gteStats?.total ?? 0) === 0}
                      onClick={() => normalizeMutation.mutate({ brandAgentId: selectedBrandId })}
                    >
                      {normalizeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <BarChart3 className="h-3 w-3 mr-1" />}
                      Normalizza
                    </Button>
                  }
                />

                <WorkflowStep
                  step={3}
                  title="Simulazione Agenti"
                  desc={`Genera reazioni sintetiche per ogni post con il panel di agenti — ${simStats?.simulated ?? 0}/${simStats?.total ?? 0} simulati`}
                  status={step3Status}
                  action={
                    <Button
                      size="sm"
                      variant={step3Status === "active" ? "default" : "outline"}
                      className="text-xs h-7"
                      disabled={simulateMutation.isPending || (gteStats?.normalized ?? 0) === 0}
                      onClick={() => simulateMutation.mutate({ brandAgentId: selectedBrandId })}
                    >
                      {simulateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                      Simula
                    </Button>
                  }
                />

                <WorkflowStep
                  step={4}
                  title="Calibrazione (Spearman ρ)"
                  desc={`Confronta score simulati vs metriche reali. Grid search per ottimizzare i parametri del sistema.${latestTimeline?.rollingRhoComposite != null ? ` Ultimo ρ: ${latestTimeline.rollingRhoComposite.toFixed(3)}` : ""}`}
                  status={step4Status}
                  action={
                    <Button
                      size="sm"
                      variant={step4Status === "active" ? "default" : "outline"}
                      className="text-xs h-7"
                      disabled={calibrateMutation.isPending || (simStats?.simulated ?? 0) < 5}
                      onClick={() => calibrateMutation.mutate({ brandAgentId: selectedBrandId })}
                    >
                      {calibrateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Target className="h-3 w-3 mr-1" />}
                      Calibra
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Info box sulle 5 dimensioni */}
          <Card className="border border-border/50 shadow-none bg-secondary/30">
            <CardContent className="p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Le 5 Dimensioni GTE</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {[
                  { name: "Resonance", desc: "Engagement rate normalizzato — quanto il contenuto risuona con il pubblico", color: "text-blue-600" },
                  { name: "Depth", desc: "Qualità dell'engagement — commenti vs like, lunghezza commenti", color: "text-purple-600" },
                  { name: "Amplification", desc: "Viralità — share rate, reach organica oltre i follower", color: "text-emerald-600" },
                  { name: "Polarity", desc: "Intensità emotiva — quanto il contenuto polarizza (positivo o negativo)", color: "text-amber-600" },
                  { name: "Rejection", desc: "Segnali di rifiuto — hide, unfollow, commenti negativi", color: "text-red-600" },
                ].map(d => (
                  <div key={d.name} className="space-y-1">
                    <p className={`text-xs font-bold ${d.color}`}>{d.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{d.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── POSTS TAB ────────────────────────────────────────────────────── */}
        <TabsContent value="posts" className="space-y-3 mt-4">
          {loadingPosts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : postsWithViews.length > 0 ? (
            <>
              {/* Distribution chart */}
              <Card className="border border-border/50 shadow-none">
                <CardContent className="p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Top 20 Post per Views
                  </h3>
                  <div className="space-y-2">
                    {postsWithViews.slice(0, 20).map((post) => {
                      const m = post.metrics48h as Record<string, number>;
                      const views = m?.views ?? 0;
                      const isNormalized = post.normComposite !== null;
                      return (
                        <div key={post.id} className="flex items-center gap-3 group">
                          <div className="w-4 h-4 shrink-0 text-muted-foreground/50">
                            <Youtube className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium truncate max-w-xs">{post.caption ?? post.postId}</p>
                              {isNormalized && (
                                <Badge className="text-[9px] py-0 px-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0">
                                  norm
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <ViewsBar views={views} maxViews={maxViews} />
                              <span className="text-[10px] font-mono text-muted-foreground">{formatViews(views)} views</span>
                              {m?.likes > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <ThumbsUp className="h-2.5 w-2.5" /> {formatViews(m.likes)}
                                </span>
                              )}
                              {m?.comments > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <MessageSquare className="h-2.5 w-2.5" /> {formatViews(m.comments)}
                                </span>
                              )}
                            </div>
                          </div>
                          <a
                            href={post.postUrl ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Posts without views */}
              {posts && posts.length > postsWithViews.length && (
                <Card className="border border-border/50 shadow-none bg-secondary/20">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">{posts.length - postsWithViews.length} post UGC</strong> senza dati di views
                      (contenuto di creator/reviewer — utile per analisi qualitativa)
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Database className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nessun post raccolto</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Usa il workflow per raccogliere post da YouTube o TikTok
              </p>
            </div>
          )}
        </TabsContent>

        {/* ─── CALIBRATION TAB ──────────────────────────────────────────────── */}
        <TabsContent value="calibration" className="space-y-4 mt-4">
          {calibrationReport ? (
            <Card className="border border-primary/30 shadow-none">
              <CardContent className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold tracking-[-0.02em]">Report di Calibrazione</h3>
                  <div className="flex items-center gap-2">
                    {(calibrationReport.isProductionReady as boolean) ? (
                      <div className="flex items-center gap-1 text-emerald-600 text-xs">
                        <CheckCircle className="h-3.5 w-3.5" /> Production Ready
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-600 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5" /> Calibrazione necessaria
                      </div>
                    )}
                    <AccuracyBadge rho={calibrationReport.overallAccuracy as number} />
                  </div>
                </div>

                {/* Dimension bars */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Accuratezza per Dimensione (Spearman ρ)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                    {Object.entries(
                      (calibrationReport.postCalibration as Record<string, { rho: number }>) ?? {}
                    ).map(([dim, val]) => (
                      <RhoBar key={dim} rho={val.rho} label={dim} />
                    ))}
                  </div>
                </div>

                {/* Holdout validation */}
                <div className="grid grid-cols-4 gap-3 pt-3 border-t border-border/50">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Post totali</p>
                    <p className="text-sm font-bold">{calibrationReport.totalPosts as number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Training</p>
                    <p className="text-sm font-bold">{calibrationReport.trainingPosts as number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Holdout</p>
                    <p className="text-sm font-bold">{calibrationReport.holdoutPosts as number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Holdout ρ</p>
                    <p className="text-sm font-bold">
                      {(calibrationReport.holdoutValidation as { composite: number })?.composite?.toFixed(3) ?? "—"}
                    </p>
                  </div>
                </div>

                {/* Diagnostics */}
                {(calibrationReport.diagnostics as Record<string, unknown>) && (
                  <div className="pt-3 border-t border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Diagnostica
                    </p>
                    <div className="space-y-1">
                      {Object.entries(
                        (calibrationReport.diagnostics as Record<string, { bias: number; rmse: number; interpretation: string }>)
                      ).map(([dim, diag]) => (
                        <div key={dim} className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground capitalize w-24">{dim}</span>
                          <span className="font-mono text-[10px]">
                            bias={diag.bias?.toFixed(3)} rmse={diag.rmse?.toFixed(3)}
                          </span>
                          <span className="text-muted-foreground text-[10px]">{diag.interpretation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border/50 shadow-none">
              <CardContent className="p-8 text-center">
                <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nessuna calibrazione eseguita</p>
                <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
                  Normalizza i post e poi esegui la calibrazione per vedere i risultati
                </p>
                <Button
                  size="sm"
                  className="text-xs"
                  disabled={calibrateMutation.isPending || (gteStats?.normalized ?? 0) < 5}
                  onClick={() => calibrateMutation.mutate({ brandAgentId: selectedBrandId })}
                >
                  {calibrateMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Target className="h-3 w-3 mr-1" />
                  )}
                  Esegui Prima Calibrazione
                </Button>
                {(gteStats?.normalized ?? 0) < 5 && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Servono almeno 5 post normalizzati con simulazioni
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── TIMELINE TAB ─────────────────────────────────────────────────── */}
        {accuracyTimeline && accuracyTimeline.length > 0 && (
          <TabsContent value="timeline" className="space-y-3 mt-4">
            <Card className="border border-border/50 shadow-none">
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Evoluzione Accuratezza nel Tempo
                </h3>
                <div className="space-y-3">
                  {accuracyTimeline.map((entry: {
                    id: number;
                    brandAgentId: number;
                    measuredAt: Date;
                    rollingRhoComposite: number | null;
                    rollingRhoResonance: number | null;
                    rollingRhoDepth: number | null;
                    rollingRhoAmplification: number | null;
                    totalCalibrationPosts: number | null;
                    postsLast30Days: number | null;
                    modelParamsVersion: number | null;
                  }) => (
                    <div key={entry.id} className="flex items-center gap-4 py-2 border-b border-border/30 last:border-0">
                      <div className="w-32 shrink-0">
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(entry.measuredAt).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      {entry.rollingRhoComposite !== null && (
                        <AccuracyBadge rho={entry.rollingRhoComposite} />
                      )}
                      <div className="flex gap-4 text-[10px] text-muted-foreground">
                        {entry.rollingRhoResonance !== null && <span>Resonance: <strong>{entry.rollingRhoResonance.toFixed(3)}</strong></span>}
                        {entry.rollingRhoDepth !== null && <span>Depth: <strong>{entry.rollingRhoDepth.toFixed(3)}</strong></span>}
                        {entry.rollingRhoAmplification !== null && <span>Amplification: <strong>{entry.rollingRhoAmplification.toFixed(3)}</strong></span>}
                        {entry.totalCalibrationPosts !== null && <span>n={entry.totalCalibrationPosts}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {/* ─── HOOK ANALYSER TAB ─────────────────────────────────────────────── */}
        <TabsContent value="hook" className="space-y-4 mt-4">
          <HookAnalyserPanel selectedBrandId={selectedBrandId} />
        </TabsContent>

        {/* ─── SOCIAL AUTH TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="auth" className="space-y-4 mt-4">
          <div className="max-w-lg">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-500" />
                Autenticazione Social Scraper
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Importa i cookie di sessione per abilitare lo scraping autenticato di Instagram e TikTok.
                Questo permette di raccogliere dati di engagement (likes, commenti, saves) che non sono
                disponibili senza autenticazione. Usa un account secondario dedicato allo scraping.
              </p>
            </div>
            <SocialAuthFlow
              onAuthenticated={(platform, count) => {
                toast.success(`Sessione ${platform} attiva — ${count} cookie salvati`);
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Platform colors for forecast ───────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, Record<string, string>> = {
  instagram: { high: "#E1306C", medium: "#f0a0c0", low: "#888" },
  tiktok: { high: "#69C9D0", medium: "#f90", low: "#888" },
  linkedin: { high: "#0A66C2", medium: "#f90", low: "#888" },
};

// ─── Hook Analyser Panel ──────────────────────────────────────────────────────

type HookResult = {
  hookScore?: number;
  verdict?: string;
  emotionalTone?: string;
  triggers?: Array<{ name: string; strength: number; description: string }>;
  dimensions?: Record<string, number>;
  platformForecast?: Record<string, string>;
  strengths?: string[];
  weaknesses?: string[];
  rewrites?: Array<{ label: string; text: string }>;
};

function HookAnalyserPanel({ selectedBrandId }: { selectedBrandId: number | null }) {
  const [hookText, setHookText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<HookResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const analyzeHookMutation = trpc.scrapers.analyzeHook.useMutation({
    onSuccess: (data) => {
      setResult(data as unknown as HookResult);
      toast.success("Analisi hook completata");
    },
    onError: (err) => toast.error(`Errore: ${err.message}`),
  });

  const analyzeFingerprintMutation = trpc.scrapers.analyzeBrandHookFingerprint.useMutation({
    onSuccess: (data) => {
      const d = data as { analyzedCount: number; fingerprint: { hookArchetype: string; avgHookScore: number } };
      toast.success(`Hook fingerprint: "${d.fingerprint.hookArchetype}" (score medio: ${d.fingerprint.avgHookScore}) su ${d.analyzedCount} post`);
    },
    onError: (err) => toast.error(`Errore fingerprint: ${err.message}`),
  });

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImageBase64(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hook / Caption / Script</p>
          <textarea
            value={hookText}
            onChange={(e) => setHookText(e.target.value)}
            placeholder="Incolla qui il tuo hook, caption, script o prima frase del video..."
            rows={4}
            className="w-full bg-transparent border border-border/40 rounded-md p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={`border border-dashed rounded-md p-3 text-center cursor-pointer text-xs transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/50"
            }`}
          >
            {imageFile
              ? <span className="text-primary">📎 {imageFile.name}</span>
              : <span className="text-muted-foreground">+ Aggiungi immagine (opzionale)</span>
            }
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => analyzeHookMutation.mutate({ text: hookText, imageBase64: imageBase64 ?? undefined, imageMediaType: imageFile?.type, platform: "instagram" })}
              disabled={analyzeHookMutation.isPending || (!hookText.trim() && !imageBase64)}
              className="flex-1 text-xs h-8"
            >
              {analyzeHookMutation.isPending
                ? <><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Analisi in corso...</>
                : <><Brain className="h-3 w-3 mr-1" />Analizza Hook</>
              }
            </Button>
            {selectedBrandId && (
              <Button
                variant="outline"
                onClick={() => analyzeFingerprintMutation.mutate({ brandAgentId: selectedBrandId, maxPosts: 20 })}
                disabled={analyzeFingerprintMutation.isPending}
                className="text-xs h-8"
              >
                {analyzeFingerprintMutation.isPending
                  ? <><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Calcolo...</>
                  : <><TrendingUp className="h-3 w-3 mr-1" />Brand Fingerprint</>
                }
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Score + Verdict */}
          <Card className="border border-border/50 shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 shrink-0">
                  <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
                    <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                    <circle cx="40" cy="40" r="32" fill="none"
                      stroke={(result.hookScore ?? 0) >= 75 ? "#AAFF5E" : (result.hookScore ?? 0) >= 50 ? "#FFD166" : "#FF6B6B"}
                      strokeWidth="6"
                      strokeDasharray={`${((result.hookScore ?? 0) / 100) * (2 * Math.PI * 32)} ${2 * Math.PI * 32}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold font-mono" style={{ color: (result.hookScore ?? 0) >= 75 ? "#AAFF5E" : (result.hookScore ?? 0) >= 50 ? "#FFD166" : "#FF6B6B" }}>
                      {result.hookScore}
                    </span>
                    <span className="text-[9px] text-muted-foreground tracking-widest">SCORE</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold leading-snug mb-2">{result.verdict}</p>
                  <Badge variant="secondary" className="text-[10px]">{result.emotionalTone}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dimensions */}
          {result.dimensions && (
            <Card className="border border-border/50 shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Analisi Dimensionale</p>
                <div className="space-y-2">
                  {Object.entries(result.dimensions).map(([key, val]) => (
                    <div key={key}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">{key.replace(/([A-Z])/g, " $1").toUpperCase()}</span>
                        <span className="text-[10px] font-mono" style={{ color: val >= 75 ? "#AAFF5E" : val >= 50 ? "#FFD166" : "#FF6B6B" }}>{val}</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, background: val >= 75 ? "#AAFF5E" : val >= 50 ? "#FFD166" : "#FF6B6B" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Triggers */}
          {result.triggers && result.triggers.length > 0 && (
            <Card className="border border-border/50 shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Behavioral Triggers</p>
                <div className="space-y-2">
                  {result.triggers.map((t, i) => (
                    <div key={i} className="p-2 rounded-md bg-muted/30 border border-border/30">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium">{t.name}</span>
                        <span className="flex gap-0.5">
                          {Array.from({ length: 5 }, (_, j) => (
                            <Star key={j} className="h-2.5 w-2.5" fill={j < t.strength ? "#AAFF5E" : "none"} stroke={j < t.strength ? "#AAFF5E" : "currentColor"} />
                          ))}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{t.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Platform Forecast */}
          {result.platformForecast && (
            <Card className="border border-border/50 shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Performance Forecast</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(result.platformForecast).map(([platform, level]) => (
                    <div key={platform} className="text-center p-2 rounded-md bg-muted/30 border border-border/30">
                      <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ background: PLATFORM_COLORS[platform]?.[level] ?? "#888" }} />
                      <p className="text-xs font-medium capitalize">{platform}</p>
                      <p className="text-[10px]" style={{ color: PLATFORM_COLORS[platform]?.[level] ?? "#888" }}>
                        {level === "high" ? "Alto" : level === "medium" ? "Medio" : "Basso"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-2 gap-3">
            {result.strengths && result.strengths.length > 0 && (
              <Card className="border border-border/50 shadow-none">
                <CardContent className="p-3">
                  <p className="text-[10px] font-medium text-green-500 uppercase tracking-wider mb-2">✓ Punti Forti</p>
                  {result.strengths.map((s, i) => (
                    <div key={i} className="text-[11px] text-muted-foreground mb-1 pl-2 border-l-2 border-green-500/30">{s}</div>
                  ))}
                </CardContent>
              </Card>
            )}
            {result.weaknesses && result.weaknesses.length > 0 && (
              <Card className="border border-border/50 shadow-none">
                <CardContent className="p-3">
                  <p className="text-[10px] font-medium text-red-500 uppercase tracking-wider mb-2">✗ Criticità</p>
                  {result.weaknesses.map((w, i) => (
                    <div key={i} className="text-[11px] text-muted-foreground mb-1 pl-2 border-l-2 border-red-500/30">{w}</div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Rewrites */}
          {result.rewrites && result.rewrites.length > 0 && (
            <Card className="border border-border/50 shadow-none">
              <CardContent className="p-4">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Versioni Ottimizzate</p>
                <div className="space-y-2">
                  {result.rewrites.map((rw, i) => (
                    <div key={i} className="p-3 rounded-md bg-muted/20 border border-border/30">
                      <p className="text-[10px] font-medium text-primary uppercase tracking-wider mb-1">{rw.label}</p>
                      <p className="text-sm leading-relaxed">{rw.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
