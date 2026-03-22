import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FlaskConical, Play, Loader2, BarChart2, TrendingUp, TrendingDown,
  ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle2, ChevronRight,
  Star, Zap, Users, Target, MessageSquare, Lightbulb, Shield,
  Clock, Brain
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score > 0.5) return "text-emerald-600";
  if (score > 0.1) return "text-lime-600";
  if (score > -0.1) return "text-amber-600";
  if (score > -0.5) return "text-orange-600";
  return "text-red-600";
}

function scoreLabel(score: number) {
  if (score > 0.6) return "Entusiasmo";
  if (score > 0.3) return "Positivo";
  if (score > 0.1) return "Lievemente positivo";
  if (score > -0.1) return "Neutro";
  if (score > -0.3) return "Lievemente negativo";
  if (score > -0.6) return "Negativo";
  return "Rifiuto";
}

function scoreBg(score: number) {
  if (score > 0.3) return "bg-emerald-50 border-emerald-200";
  if (score > -0.3) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function probBar(value: number, color: string) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value * 100}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{Math.round(value * 100)}%</span>
    </div>
  );
}

// ─── Reaction Card ────────────────────────────────────────────────────

function ReactionCard({ reaction, agent }: { reaction: any; agent: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className={`cursor-pointer hover:shadow-sm transition-all border ${scoreBg(reaction.overallScore)}`}
      onClick={() => setExpanded(!expanded)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-white border flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {agent?.firstName?.charAt(0) ?? "?"}
              </div>
              <div>
                <div className="text-sm font-semibold leading-none">
                  {agent ? `${agent.firstName} ${agent.lastName}` : `Agente ${reaction.agentId}`}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {agent?.profession} · {agent?.generation} · {agent?.geo}
                </div>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-lg font-bold ${scoreColor(reaction.overallScore)}`}>
              {reaction.overallScore > 0 ? "+" : ""}{(reaction.overallScore * 100).toFixed(0)}
            </div>
            <div className="text-[10px] text-muted-foreground">{scoreLabel(reaction.overallScore)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {/* Quote */}
        {reaction.quote && (
          <div className="text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2">
            "{reaction.quote}"
          </div>
        )}
        {/* Gut Reaction */}
        <div className="text-xs">{reaction.gutReaction}</div>

        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-0.5">Acquisto</div>
            <div className={`text-sm font-bold ${reaction.buyProbability > 0.5 ? "text-emerald-600" : "text-muted-foreground"}`}>
              {Math.round(reaction.buyProbability * 100)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-0.5">Condivisione</div>
            <div className={`text-sm font-bold ${reaction.shareProbability > 0.4 ? "text-blue-600" : "text-muted-foreground"}`}>
              {Math.round(reaction.shareProbability * 100)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-0.5">Adeguatezza</div>
            <div className={`text-sm font-bold ${reaction.adequacyScore > 0.5 ? "text-purple-600" : "text-muted-foreground"}`}>
              {Math.round(reaction.adequacyScore * 100)}%
            </div>
          </div>
        </div>

        {/* Expanded */}
        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            {/* Reflection */}
            {reaction.reflection && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Riflessione (Sistema 2)</div>
                <div className="text-xs">{reaction.reflection}</div>
              </div>
            )}
            {/* Attractions & Repulsions */}
            <div className="grid grid-cols-2 gap-3">
              {reaction.attractions?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-emerald-700 mb-1 flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" /> Attrazioni
                  </div>
                  <ul className="space-y-0.5">
                    {reaction.attractions.map((a: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground">• {a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {reaction.repulsions?.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
                    <ThumbsDown className="h-3 w-3" /> Repulsioni
                  </div>
                  <ul className="space-y-0.5">
                    {reaction.repulsions.map((r: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {/* Tensions */}
            {reaction.tensions && (
              <div>
                <div className="text-xs font-medium text-amber-700 mb-1">Tensioni interne</div>
                <div className="text-xs text-muted-foreground">{reaction.tensions}</div>
              </div>
            )}
            {/* Motivations */}
            {reaction.motivations && (
              <div>
                <div className="text-xs font-medium text-purple-700 mb-1">Motivazioni profonde</div>
                <div className="text-xs text-muted-foreground">{reaction.motivations}</div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <span className="text-[10px] text-muted-foreground">{expanded ? "▲ Meno" : "▼ Dettagli"}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Report Panel ─────────────────────────────────────────────────────

function ReportPanel({ report, reactions }: { report: any; reactions: any[] }) {
  if (!report) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Brain className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Report in generazione...</p>
      </div>
    );
  }

  const dist = report.scoreDistribution as Record<string, number> ?? {};
  const totalDist = Object.values(dist).reduce((a: number, b: number) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border bg-card text-center">
          <div className="text-xs text-muted-foreground mb-1">Score medio</div>
          <div className={`text-2xl font-bold ${scoreColor(report.avgOverallScore ?? 0)}`}>
            {((report.avgOverallScore ?? 0) * 100).toFixed(0)}
          </div>
        </div>
        <div className="p-3 rounded-lg border bg-card text-center">
          <div className="text-xs text-muted-foreground mb-1">Acquisto medio</div>
          <div className="text-2xl font-bold text-emerald-600">
            {Math.round((report.avgBuyProbability ?? 0) * 100)}%
          </div>
        </div>
        <div className="p-3 rounded-lg border bg-card text-center">
          <div className="text-xs text-muted-foreground mb-1">Condivisione</div>
          <div className="text-2xl font-bold text-blue-600">
            {Math.round((report.avgShareProbability ?? 0) * 100)}%
          </div>
        </div>
        <div className="p-3 rounded-lg border bg-card text-center">
          <div className="text-xs text-muted-foreground mb-1">Interesse ponderato</div>
          <div className={`text-2xl font-bold ${scoreColor(report.weightedMarketInterest ?? 0)}`}>
            {((report.weightedMarketInterest ?? 0) * 100).toFixed(0)}
          </div>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="p-4 rounded-lg border bg-card">
        <div className="text-sm font-medium mb-3">Distribuzione reazioni</div>
        <div className="space-y-2">
          {[
            { key: "very_positive", label: "Molto positivo", color: "bg-emerald-500" },
            { key: "positive", label: "Positivo", color: "bg-lime-500" },
            { key: "neutral", label: "Neutro", color: "bg-amber-400" },
            { key: "negative", label: "Negativo", color: "bg-orange-500" },
            { key: "very_negative", label: "Molto negativo", color: "bg-red-500" },
          ].map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground w-28">{label}</div>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${((dist[key] ?? 0) / totalDist) * 100}%` }}
                />
              </div>
              <div className="text-xs font-medium w-6 text-right">{dist[key] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Attractions & Repulsions */}
      <div className="grid grid-cols-2 gap-4">
        {report.topAttractions?.length > 0 && (
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-sm font-medium text-emerald-700 mb-2 flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" /> Top Attrazioni
            </div>
            <ul className="space-y-1">
              {(report.topAttractions as string[]).map((a: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-emerald-500 shrink-0">•</span> {a}
                </li>
              ))}
            </ul>
          </div>
        )}
        {report.topRepulsions?.length > 0 && (
          <div className="p-4 rounded-lg border bg-card">
            <div className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
              <ThumbsDown className="h-4 w-4" /> Top Repulsioni
            </div>
            <ul className="space-y-1">
              {(report.topRepulsions as string[]).map((r: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-red-500 shrink-0">•</span> {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* LLM Report Sections */}
      {report.executiveSummary && (
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Sintesi Esecutiva
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">{report.executiveSummary}</div>
        </div>
      )}

      {report.commonPatterns && (
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" /> Pattern Comuni
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">{report.commonPatterns}</div>
        </div>
      )}

      {report.keyDivergences && (
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-500" /> Divergenze Chiave
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">{report.keyDivergences}</div>
        </div>
      )}

      {report.segmentInsights && (
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-sm font-semibold mb-2 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-amber-500" /> Analisi per Segmento
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">{report.segmentInsights}</div>
        </div>
      )}

      {report.recommendations && (
        <div className="p-4 rounded-lg border bg-card">
          <div className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-emerald-500" /> Raccomandazioni
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{report.recommendations}</div>
        </div>
      )}

      {report.riskFlags && (report.riskFlags as string[]).length > 0 && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50">
          <div className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-700">
            <Shield className="h-4 w-4" /> Segnali di Rischio
          </div>
          <ul className="space-y-1">
            {(report.riskFlags as string[]).map((flag: string, i: number) => (
              <li key={i} className="text-xs text-red-700 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /> {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Test Detail Dialog ───────────────────────────────────────────────

function TestDetailDialog({
  testId,
  open,
  onClose,
  agents,
}: {
  testId: number | null;
  open: boolean;
  onClose: () => void;
  agents: any[];
}) {
  const { data: reactions = [] } = trpc.campaignTesting.getReactions.useQuery(
    { campaignTestId: testId ?? 0 },
    { enabled: !!testId }
  );
  const { data: report } = trpc.campaignTesting.getReport.useQuery(
    { campaignTestId: testId ?? 0 },
    { enabled: !!testId }
  );

  const agentMap = new Map(agents.map(a => [a.id, a]));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Risultati Campaign Test</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <Tabs defaultValue="report">
            <TabsList className="w-full">
              <TabsTrigger value="report" className="flex-1">Report Aggregato</TabsTrigger>
              <TabsTrigger value="reactions" className="flex-1">Reazioni ({reactions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="report" className="mt-4">
              <ReportPanel report={report} reactions={reactions} />
            </TabsContent>

            <TabsContent value="reactions" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reactions.map((reaction: any) => (
                  <ReactionCard
                    key={reaction.id}
                    reaction={reaction}
                    agent={agentMap.get(reaction.agentId)}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function CampaignTesting() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [testName, setTestName] = useState("");
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: campaigns = [] } = trpc.campaigns.list.useQuery();
  const { data: agents = [] } = trpc.agents.list.useQuery();
  const { data: tests = [], refetch: refetchTests } = trpc.campaignTesting.list.useQuery();

  const runMutation = trpc.campaignTesting.run.useMutation({
    onSuccess: (data) => {
      toast.success(`Test completato: ${data.completedAgents} agenti processati`);
      refetchTests();
      setSelectedTestId(data.campaignTestId);
      setDialogOpen(true);
    },
    onError: (err) => toast.error(`Errore: ${err.message}`),
  });

  function handleRun() {
    if (!selectedCampaignId) {
      toast.error("Seleziona una campagna");
      return;
    }
    if (agents.length === 0) {
      toast.error("Nessun agente disponibile. Inizializza gli agenti prima.");
      return;
    }
    runMutation.mutate({
      campaignId: parseInt(selectedCampaignId),
      testName: testName.trim() || undefined,
    });
  }

  function handleViewTest(testId: number) {
    setSelectedTestId(testId);
    setDialogOpen(true);
  }

  const selectedCampaign = campaigns.find((c: any) => c.id.toString() === selectedCampaignId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Campaign Testing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Testa campagne su agenti vivi con analisi multimodale e report aggregato
        </p>
      </div>

      {/* Run New Test */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Nuovo Test
          </CardTitle>
          <CardDescription>
            Seleziona una campagna e avvia il test su tutti gli agenti attivi.
            Ogni agente elaborerà la campagna attraverso la propria lente psicologica.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Campagna *</Label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona una campagna..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nome test (opzionale)</Label>
              <Input
                value={testName}
                onChange={e => setTestName(e.target.value)}
                placeholder="Es. Test A/B Variante 1"
              />
            </div>
          </div>

          {/* Campaign Preview */}
          {selectedCampaign && (
            <div className="p-3 rounded-lg bg-muted/50 border text-sm space-y-1">
              <div className="font-medium">{selectedCampaign.name}</div>
              <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                <span>Canale: {selectedCampaign.channel}</span>
                <span>Formato: {selectedCampaign.format}</span>
                <span>Tono: {selectedCampaign.tone}</span>
                {selectedCampaign.pricePoint && <span>Prezzo: {selectedCampaign.pricePoint.toLocaleString("it-IT")}€</span>}
              </div>
              {selectedCampaign.copyText && (
                <div className="text-xs italic text-muted-foreground">"{selectedCampaign.copyText.substring(0, 100)}..."</div>
              )}
              {(selectedCampaign.mediaUrls as string[])?.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {(selectedCampaign.mediaUrls as string[]).slice(0, 2).map((url: string, i: number) => (
                    <img key={i} src={url} alt="" className="h-12 w-20 object-cover rounded border" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Agents info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{agents.length} agenti disponibili</span>
            {agents.length === 0 && (
              <span className="text-amber-600 font-medium">— Vai alla sezione Agenti per inizializzarli</span>
            )}
          </div>

          <Button
            onClick={handleRun}
            disabled={runMutation.isPending || !selectedCampaignId || agents.length === 0}
            className="w-full md:w-auto"
          >
            {runMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Elaborazione in corso... ({agents.length} agenti)
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Avvia Test su {agents.length} Agenti
              </>
            )}
          </Button>

          {runMutation.isPending && (
            <div className="text-xs text-muted-foreground">
              Ogni agente elabora la campagna attraverso la propria psicologia, stato emotivo e memorie.
              Il processo può richiedere 1-3 minuti.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Tests */}
      {tests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Test Precedenti</h2>
          <div className="space-y-2">
            {tests.map((test: any) => {
              const campaign = campaigns.find((c: any) => c.id === test.campaignId);
              return (
                <Card
                  key={test.id}
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => handleViewTest(test.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{test.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Campagna: {campaign?.name ?? `#${test.campaignId}`} · {test.completedAgents}/{test.totalAgents} agenti
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(test.createdAt).toLocaleDateString("it-IT")}
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${test.status === "complete" ? "bg-emerald-100 text-emerald-700" : test.status === "running" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                        {test.status}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {tests.length === 0 && campaigns.length === 0 && (
        <Card className="p-12 text-center">
          <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold mb-2">Nessuna campagna disponibile</h3>
          <p className="text-sm text-muted-foreground">
            Crea prima una campagna nella sezione <strong>Campaigns</strong>, poi torna qui per testarla.
          </p>
        </Card>
      )}

      {/* Test Detail Dialog */}
      <TestDetailDialog
        testId={selectedTestId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        agents={agents}
      />
    </div>
  );
}
