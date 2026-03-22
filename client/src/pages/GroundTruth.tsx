import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Target, TrendingUp, Upload, RefreshCw,
  BarChart3, CheckCircle, AlertTriangle, Info, Zap,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

// ─── Accuracy Badge ───────────────────────────────────────────────────────────

function AccuracyBadge({ rho }: { rho: number }) {
  if (rho >= 0.80) return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">Eccellente ρ={rho.toFixed(2)}</Badge>;
  if (rho >= 0.65) return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">Buono ρ={rho.toFixed(2)}</Badge>;
  if (rho >= 0.50) return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">Moderato ρ={rho.toFixed(2)}</Badge>;
  return <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px]">Debole ρ={rho.toFixed(2)}</Badge>;
}

function RhoBar({ rho, label }: { rho: number; label: string }) {
  const pct = Math.max(0, Math.min(100, (rho + 1) / 2 * 100));
  const color = rho >= 0.80 ? "bg-emerald-500" : rho >= 0.65 ? "bg-blue-500" : rho >= 0.50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground capitalize">{label}</span>
        <span className="text-[10px] font-mono font-bold">{rho.toFixed(3)}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GroundTruth() {
  const utils = trpc.useUtils();

  // Legacy ground truth (old system)
  const { data: gtList, isLoading: loadingGT } = trpc.groundTruth.list.useQuery();
  const { data: campaigns } = trpc.campaigns.list.useQuery();
  const { data: personas } = trpc.personas.list.useQuery();

  // Brand agents
  const { data: brandAgents } = trpc.onboarding.listBrandAgents.useQuery();
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

  // GTE state
  const [harvestKeyword, setHarvestKeyword] = useState("");
  const [harvestYtChannel, setHarvestYtChannel] = useState("");
  const [harvestMaxPosts, setHarvestMaxPosts] = useState("30");
  const [csvContent, setCsvContent] = useState("");
  const [csvPlatform, setCsvPlatform] = useState<"instagram" | "facebook">("instagram");
  const [calibrationReport, setCalibrationReport] = useState<Record<string, unknown> | null>(null);

  // GTE queries
  const { data: normalizedPosts, refetch: refetchPosts } = trpc.groundTruth.getNormalizedPosts.useQuery(
    { brandAgentId: selectedBrandId ?? 0 },
    { enabled: !!selectedBrandId }
  );
  const { data: accuracyTimeline, refetch: refetchTimeline } = trpc.groundTruth.getAccuracyTimeline.useQuery(
    { brandAgentId: selectedBrandId ?? 0 },
    { enabled: !!selectedBrandId }
  );

  // GTE mutations
  const harvestTikTok = trpc.groundTruth.harvestTikTok.useMutation({
    onSuccess: (data) => {
      toast.success(`Raccolti ${data.harvested} post TikTok (${data.skipped} già presenti)`);
      refetchPosts();
    },
    onError: (err) => toast.error(err.message),
  });

  const harvestYouTube = trpc.groundTruth.harvestYouTube.useMutation({
    onSuccess: (data) => {
      toast.success(`Raccolti ${data.harvested} video YouTube (${data.skipped} già presenti)`);
      refetchPosts();
    },
    onError: (err) => toast.error(err.message),
  });

  const ingestCsv = trpc.groundTruth.ingestCsv.useMutation({
    onSuccess: (data) => {
      toast.success(`Importati ${data.harvested} post dal CSV (${data.skipped} duplicati)`);
      setCsvContent("");
      refetchPosts();
    },
    onError: (err) => toast.error(err.message),
  });

  const normalizeMutation = trpc.groundTruth.normalize.useMutation({
    onSuccess: (data) => {
      toast.success(`Normalizzati ${data.count} post — percentile rank calcolati`);
      refetchPosts();
    },
    onError: (err) => toast.error(err.message),
  });

  const calibrateMutation = trpc.groundTruth.runGteCalibration.useMutation({
    onSuccess: (data) => {
      setCalibrationReport(data as unknown as Record<string, unknown>);
      toast.success(`Calibrazione completata — ρ composito: ${(data as { overallAccuracy: number }).overallAccuracy.toFixed(3)}`);
      refetchTimeline();
    },
    onError: (err) => toast.error(`Calibrazione fallita: ${err.message}`),
  });

  // Legacy form
  const [showLegacyForm, setShowLegacyForm] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [segmentScores, setSegmentScores] = useState<Record<string, string>>({});
  const [dataSource, setDataSource] = useState("");

  const createMutation = trpc.groundTruth.create.useMutation({
    onSuccess: () => {
      utils.groundTruth.list.invalidate();
      toast.success("Ground truth data saved");
      setShowLegacyForm(false);
      setSegmentScores({});
      setSelectedCampaignId(null);
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const personaMap = useMemo(() => {
    const m: Record<number, { label: string }> = {};
    if (personas) for (const p of personas) m[p.id] = p;
    return m;
  }, [personas]);

  const handleLegacySubmit = () => {
    if (!selectedCampaignId) { toast.error("Select a campaign"); return; }
    const parsed: Record<string, number> = {};
    for (const [k, v] of Object.entries(segmentScores)) {
      if (v.trim() !== "") {
        const n = parseFloat(v);
        if (!isNaN(n) && n >= -1 && n <= 1) parsed[k] = n;
      }
    }
    if (Object.keys(parsed).length === 0) { toast.error("Enter at least one segment score"); return; }
    createMutation.mutate({ campaignId: selectedCampaignId, segmentResults: parsed, dataSource: dataSource || undefined });
  };

  const latestTimeline = accuracyTimeline?.[accuracyTimeline.length - 1];

  if (loadingGT) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Ground Truth Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calibra il modello su dati reali — misura l'accuratezza, trova i bias, ottimizza i parametri
          </p>
        </div>
        {latestTimeline?.rollingRhoComposite !== undefined && latestTimeline.rollingRhoComposite !== null && (
          <AccuracyBadge rho={latestTimeline.rollingRhoComposite} />
        )}
      </div>

      <Tabs defaultValue="gte">
        <TabsList className="h-8 text-xs">
          <TabsTrigger value="gte" className="text-xs">GTE — Calibrazione Brand</TabsTrigger>
          <TabsTrigger value="legacy" className="text-xs">Legacy — Segment Scores</TabsTrigger>
        </TabsList>

        {/* ─── GTE Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="gte" className="space-y-5 mt-4">

          {/* Brand selector */}
          <Card className="border border-border/50 shadow-none">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Brand Agent</h3>
              <Select
                value={selectedBrandId ? String(selectedBrandId) : ""}
                onValueChange={v => setSelectedBrandId(Number(v))}
              >
                <SelectTrigger className="h-9 text-xs max-w-xs">
                  <SelectValue placeholder="Seleziona un brand agent" />
                </SelectTrigger>
                <SelectContent>
                  {brandAgents?.map((b: { id: number; brandName: string }) => (
                    <SelectItem key={b.id} value={String(b.id)} className="text-xs">{b.brandName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedBrandId && (
            <>
              {/* Harvest section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TikTok */}
                <Card className="border border-border/50 shadow-none">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-pink-500" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Harvest TikTok</h3>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Keyword / Brand Handle</Label>
                      <Input
                        value={harvestKeyword}
                        onChange={e => setHarvestKeyword(e.target.value)}
                        placeholder="es. @brandname oppure keyword"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max post</Label>
                      <Input
                        type="number"
                        value={harvestMaxPosts}
                        onChange={e => setHarvestMaxPosts(e.target.value)}
                        className="h-8 text-xs w-24"
                        min="5" max="100"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="text-xs h-8 w-full"
                      disabled={!harvestKeyword || harvestTikTok.isPending}
                      onClick={() => harvestTikTok.mutate({
                        brandAgentId: selectedBrandId,
                        keyword: harvestKeyword,
                        maxPosts: parseInt(harvestMaxPosts),
                      })}
                    >
                      {harvestTikTok.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                      Raccogli da TikTok
                    </Button>
                  </CardContent>
                </Card>

                {/* YouTube */}
                <Card className="border border-border/50 shadow-none">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-3.5 w-3.5 text-red-500" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Harvest YouTube</h3>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Channel ID</Label>
                      <Input
                        value={harvestYtChannel}
                        onChange={e => setHarvestYtChannel(e.target.value)}
                        placeholder="es. UCxxxxxxxxxxxxxxxx"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max video</Label>
                      <Input
                        type="number"
                        value={harvestMaxPosts}
                        onChange={e => setHarvestMaxPosts(e.target.value)}
                        className="h-8 text-xs w-24"
                        min="5" max="100"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="text-xs h-8 w-full"
                      disabled={!harvestYtChannel || harvestYouTube.isPending}
                      onClick={() => harvestYouTube.mutate({
                        brandAgentId: selectedBrandId,
                        channelId: harvestYtChannel,
                        maxPosts: parseInt(harvestMaxPosts),
                      })}
                    >
                      {harvestYouTube.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                      Raccogli da YouTube
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* CSV Upload */}
              <Card className="border border-border/50 shadow-none">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Upload className="h-3.5 w-3.5 text-blue-500" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Import CSV — Instagram / Manual</h3>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded text-[10px] text-muted-foreground">
                    <Info className="h-3 w-3 flex-shrink-0" />
                    Colonne richieste: <code className="ml-1">post_id, platform, published_at, content_type, likes_48h, comments_48h, shares_48h, brand_followers</code>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-3 space-y-2">
                      <Label className="text-xs">Contenuto CSV</Label>
                      <Textarea
                        value={csvContent}
                        onChange={e => setCsvContent(e.target.value)}
                        placeholder="post_id,platform,published_at,content_type,likes_48h,comments_48h,shares_48h,brand_followers&#10;abc123,instagram,2024-01-15,image,1250,87,34,45000"
                        className="text-xs font-mono h-24 resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Piattaforma</Label>
                      <Select value={csvPlatform} onValueChange={v => setCsvPlatform(v as "instagram" | "facebook")}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instagram" className="text-xs">Instagram</SelectItem>
                          <SelectItem value="facebook" className="text-xs">Facebook</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="text-xs h-8 w-full mt-2"
                        disabled={!csvContent || ingestCsv.isPending}
                        onClick={() => ingestCsv.mutate({ brandAgentId: selectedBrandId, csvContent, platform: csvPlatform })}
                      >
                        {ingestCsv.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Importa"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Normalize + Calibrate */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  disabled={normalizeMutation.isPending || !normalizedPosts}
                  onClick={() => normalizeMutation.mutate({ brandAgentId: selectedBrandId })}
                >
                  {normalizeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                  Normalizza ({normalizedPosts?.length ?? 0} post)
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-8 bg-primary text-primary-foreground hover:opacity-90"
                  disabled={calibrateMutation.isPending || (normalizedPosts?.length ?? 0) < 5}
                  onClick={() => calibrateMutation.mutate({ brandAgentId: selectedBrandId })}
                >
                  {calibrateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Target className="h-3 w-3 mr-1" />}
                  Esegui Calibrazione
                </Button>
                {(normalizedPosts?.length ?? 0) < 5 && (
                  <span className="text-[10px] text-muted-foreground self-center">
                    Servono almeno 5 post normalizzati con simulazioni
                  </span>
                )}
              </div>

              {/* Calibration Report */}
              {calibrationReport && (
                <Card className="border border-primary/30 shadow-none">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold tracking-[-0.02em]">Report di Calibrazione</h3>
                      <div className="flex items-center gap-2">
                        {(calibrationReport as { isProductionReady: boolean }).isProductionReady ? (
                          <div className="flex items-center gap-1 text-emerald-600 text-xs">
                            <CheckCircle className="h-3.5 w-3.5" /> Production Ready
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-600 text-xs">
                            <AlertTriangle className="h-3.5 w-3.5" /> Calibrazione necessaria
                          </div>
                        )}
                        <AccuracyBadge rho={(calibrationReport as { overallAccuracy: number }).overallAccuracy} />
                      </div>
                    </div>

                    {/* Dimension ρ bars */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {Object.entries((calibrationReport as { postCalibration: Record<string, { rho: number }> }).postCalibration ?? {}).map(([dim, val]) => (
                        <RhoBar key={dim} rho={val.rho} label={dim} />
                      ))}
                    </div>

                    {/* Holdout validation */}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Post totali: <strong className="text-foreground">{(calibrationReport as { totalPosts: number }).totalPosts}</strong></span>
                      <span>Training: <strong className="text-foreground">{(calibrationReport as { trainingPosts: number }).trainingPosts}</strong></span>
                      <span>Holdout: <strong className="text-foreground">{(calibrationReport as { holdoutPosts: number }).holdoutPosts}</strong></span>
                      <span>Holdout ρ: <strong className="text-foreground">{(calibrationReport as { holdoutValidation: { composite: number } }).holdoutValidation.composite.toFixed(3)}</strong></span>
                    </div>

                    {/* Key findings */}
                    {((calibrationReport as { keyFindings: string[] }).keyFindings ?? []).length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Risultati chiave</p>
                        {(calibrationReport as { keyFindings: string[] }).keyFindings.map((f, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs">
                            <CheckCircle className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Warnings */}
                    {((calibrationReport as { warnings: string[] }).warnings ?? []).length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avvertimenti</p>
                        {(calibrationReport as { warnings: string[] }).warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Accuracy Timeline */}
              {accuracyTimeline && accuracyTimeline.length > 0 && (
                <Card className="border border-border/50 shadow-none">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Storico Accuratezza</h3>
                    <div className="space-y-2">
                      {accuracyTimeline.slice(-10).reverse().map((entry: {
                        id: number;
                        measuredAt: Date | string;
                        rollingRhoComposite: number | null;
                        rollingRhoResonance: number | null;
                        totalCalibrationPosts: number | null;
                      }) => (
                        <div key={entry.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {new Date(entry.measuredAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{entry.totalCalibrationPosts ?? 0} post</span>
                            {entry.rollingRhoComposite !== null && (
                              <AccuracyBadge rho={entry.rollingRhoComposite} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Normalized Posts Preview */}
              {normalizedPosts && normalizedPosts.length > 0 && (
                <Card className="border border-border/50 shadow-none">
                  <CardContent className="p-4 space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Post Normalizzati ({normalizedPosts.length})
                    </h3>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {normalizedPosts.slice(0, 20).map((post: {
                        id: number;
                        resonance: number;
                        depth: number;
                        amplification: number;
                        composite: number;
                      }) => (
                        <div key={post.id} className="flex items-center gap-3 text-[10px] font-mono">
                          <span className="text-muted-foreground w-8">#{post.id}</span>
                          <span className="text-blue-600">R:{post.resonance.toFixed(0)}</span>
                          <span className="text-purple-600">D:{post.depth.toFixed(0)}</span>
                          <span className="text-green-600">A:{post.amplification.toFixed(0)}</span>
                          <span className="font-bold">∑:{post.composite.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ─── Legacy Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="legacy" className="space-y-5 mt-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:opacity-90 text-xs"
              onClick={() => setShowLegacyForm(!showLegacyForm)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Data
            </Button>
          </div>

          {showLegacyForm && (
            <Card className="border border-primary/30 shadow-none">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Ground Truth Entry</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Campaign</Label>
                    <Select value={selectedCampaignId ? String(selectedCampaignId) : ""} onValueChange={v => setSelectedCampaignId(Number(v))}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select campaign" /></SelectTrigger>
                      <SelectContent>
                        {campaigns?.map((c: { id: number; name: string }) => (
                          <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Data Source</Label>
                    <Input value={dataSource} onChange={e => setDataSource(e.target.value)} placeholder="e.g. Meta Ads Manager" className="h-9 text-sm" />
                  </div>
                </div>
                {selectedCampaignId && personas && (
                  <div className="space-y-2">
                    <Label className="text-xs">Segment Scores (-1.0 to +1.0)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {personas.map((p: { id: number; label: string }) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-32 truncate">{p.label}</span>
                          <Input type="number" step="0.01" min="-1" max="1" value={segmentScores[String(p.id)] ?? ""} onChange={e => setSegmentScores(prev => ({ ...prev, [String(p.id)]: e.target.value }))} className="h-7 text-xs w-20" placeholder="—" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button onClick={handleLegacySubmit} disabled={createMutation.isPending} className="bg-primary text-primary-foreground hover:opacity-90 text-xs">
                  {createMutation.isPending ? "Saving..." : "Save Ground Truth"}
                </Button>
              </CardContent>
            </Card>
          )}

          {gtList && gtList.length > 0 ? (
            <div className="space-y-3">
              {gtList.map((gt: { id: number; campaignId: number; segmentResults: unknown; dataSource?: string | null; createdAt: Date | string }) => {
                const segResults = gt.segmentResults as Record<string, number>;
                const campaign = campaigns?.find((c: { id: number }) => c.id === gt.campaignId);
                return (
                  <Card key={gt.id} className="border border-border/50 shadow-none">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-bold tracking-[-0.02em]">{(campaign as { name: string } | undefined)?.name ?? `Campaign #${gt.campaignId}`}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{gt.dataSource ?? "—"} · {new Date(gt.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(segResults).map(([pId, score]) => (
                          <span key={pId} className="text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded">
                            {personaMap[Number(pId)]?.label?.slice(0, 15) ?? pId}: {Number(score).toFixed(2)}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            !showLegacyForm && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Target className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No ground truth data yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Add real campaign performance data to enable calibration</p>
              </div>
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
