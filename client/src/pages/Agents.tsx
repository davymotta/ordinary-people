import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Brain, Heart, TrendingUp, TrendingDown, Users, MapPin,
  BookOpen, Smile, Frown, Meh, AlertCircle, RefreshCw, Loader2,
  ChevronRight, Layers, Star, Clock, Activity
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────

function moodIcon(valence: number) {
  if (valence > 0.3) return <Smile className="h-4 w-4 text-emerald-500" />;
  if (valence < -0.3) return <Frown className="h-4 w-4 text-red-500" />;
  return <Meh className="h-4 w-4 text-amber-500" />;
}

function moodLabel(valence: number) {
  if (valence > 0.6) return "Molto positivo";
  if (valence > 0.3) return "Positivo";
  if (valence > -0.3) return "Neutro";
  if (valence > -0.6) return "Negativo";
  return "Molto negativo";
}

function stressColor(stress: number) {
  if (stress > 0.7) return "bg-red-500";
  if (stress > 0.4) return "bg-amber-500";
  return "bg-emerald-500";
}

function trustColor(trust: number) {
  if (trust > 0.6) return "text-emerald-600";
  if (trust > 0.3) return "text-amber-600";
  return "text-red-600";
}

function generationBadgeColor(gen: string) {
  const map: Record<string, string> = {
    "Silent": "bg-slate-100 text-slate-700",
    "Boomer": "bg-blue-100 text-blue-700",
    "GenX": "bg-purple-100 text-purple-700",
    "Millennial": "bg-emerald-100 text-emerald-700",
    "GenZ": "bg-pink-100 text-pink-700",
  };
  return map[gen] ?? "bg-gray-100 text-gray-700";
}

function geoBadgeColor(geo: string) {
  const map: Record<string, string> = {
    "Nord": "bg-indigo-100 text-indigo-700",
    "Centro": "bg-orange-100 text-orange-700",
    "Sud": "bg-rose-100 text-rose-700",
    "Isole": "bg-cyan-100 text-cyan-700",
  };
  return map[geo] ?? "bg-gray-100 text-gray-700";
}

function maslowLabel(level: number) {
  const labels = ["", "Fisiologico", "Sicurezza", "Appartenenza", "Stima", "Autorealizzazione"];
  return labels[level] ?? "Sconosciuto";
}

// ─── Agent Card ───────────────────────────────────────────────────────

function AgentCard({
  agent,
  state,
  onClick,
}: {
  agent: any;
  state: any;
  onClick: () => void;
}) {
  const valence = state?.moodValence ?? 0;
  const stress = state?.financialStress ?? 0.3;
  const socialTrust = state?.socialTrust ?? 0.5;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {agent.firstName} {agent.lastName}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5 truncate">
              {agent.profession} · {agent.city}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {moodIcon(valence)}
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${generationBadgeColor(agent.generation)}`}>
            {agent.generation}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${geoBadgeColor(agent.geo)}`}>
            {agent.geo}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {agent.age} anni
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Mood */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Umore</span>
            <span className="font-medium">{moodLabel(valence)}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400 rounded-full transition-all"
              style={{ width: `${((valence + 1) / 2) * 100}%` }}
            />
          </div>
        </div>
        {/* Financial Stress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Stress finanziario</span>
            <span className="font-medium">{Math.round(stress * 100)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${stressColor(stress)}`}
              style={{ width: `${stress * 100}%` }}
            />
          </div>
        </div>
        {/* Social Trust */}
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Fiducia sociale</span>
          <span className={`font-semibold ${trustColor(socialTrust)}`}>
            {Math.round(socialTrust * 100)}%
          </span>
        </div>
        {/* Maslow */}
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Bisogno Maslow</span>
          <span className="font-medium">Lv.{state?.maslowCurrent ?? agent.maslowBaseline} · {maslowLabel(state?.maslowCurrent ?? agent.maslowBaseline)}</span>
        </div>
        {/* Active Concerns */}
        {state?.activeConcerns && (state.activeConcerns as string[]).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(state.activeConcerns as string[]).slice(0, 2).map((c: string, i: number) => (
              <span key={i} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200">
                {c}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Agent Detail Dialog ──────────────────────────────────────────────

function AgentDetailDialog({
  agent,
  state,
  memories,
  open,
  onClose,
}: {
  agent: any;
  state: any;
  memories: any[];
  open: boolean;
  onClose: () => void;
}) {
  if (!agent) return null;

  const valence = state?.moodValence ?? 0;
  const arousal = state?.moodArousal ?? 0.5;
  const stress = state?.financialStress ?? 0.3;
  const socialTrust = state?.socialTrust ?? 0.5;
  const instTrust = state?.institutionalTrust ?? 0.5;
  const maslowLevel = state?.maslowCurrent ?? agent.maslowBaseline;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary font-bold text-lg">
              {agent.firstName?.charAt(0)}
            </div>
            <div>
              <div className="text-lg font-bold">{agent.firstName} {agent.lastName}</div>
              <div className="text-sm text-muted-foreground font-normal">{agent.profession} · {agent.city} · {agent.age} anni</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <Tabs defaultValue="state">
            <TabsList className="w-full">
              <TabsTrigger value="state" className="flex-1">Stato Attuale</TabsTrigger>
              <TabsTrigger value="profile" className="flex-1">Profilo</TabsTrigger>
              <TabsTrigger value="memories" className="flex-1">Memorie ({memories.length})</TabsTrigger>
            </TabsList>

            {/* ── Stato Attuale ── */}
            <TabsContent value="state" className="space-y-4 mt-4">
              {/* Emotional State */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    {moodIcon(valence)}
                    <span className="text-sm font-medium">Valenza emotiva</span>
                  </div>
                  <div className="text-2xl font-bold">{(valence * 100).toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{moodLabel(valence)}</div>
                  <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400 rounded-full" style={{ width: `${((valence + 1) / 2) * 100}%` }} />
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Arousal</span>
                  </div>
                  <div className="text-2xl font-bold">{(arousal * 100).toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{arousal > 0.6 ? "Attivato" : arousal > 0.3 ? "Moderato" : "Calmo"}</div>
                  <Progress value={arousal * 100} className="mt-2 h-1.5" />
                </div>
              </div>

              {/* Stress & Trust */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">Stress finanziario</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={stress * 100} className="w-24 h-2" />
                    <span className="text-sm font-semibold w-10 text-right">{Math.round(stress * 100)}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Fiducia sociale</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={socialTrust * 100} className="w-24 h-2" />
                    <span className="text-sm font-semibold w-10 text-right">{Math.round(socialTrust * 100)}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Fiducia istituzionale</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={instTrust * 100} className="w-24 h-2" />
                    <span className="text-sm font-semibold w-10 text-right">{Math.round(instTrust * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Maslow */}
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Livello Maslow attuale</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(level => (
                    <div
                      key={level}
                      className={`flex-1 h-6 rounded text-[10px] flex items-center justify-center font-medium transition-all ${level <= maslowLevel ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {level}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  Lv.{maslowLevel} — {maslowLabel(maslowLevel)}
                </div>
              </div>

              {/* Active Concerns */}
              {state?.activeConcerns && (state.activeConcerns as string[]).length > 0 && (
                <div className="p-3 rounded-lg border bg-card">
                  <div className="text-sm font-medium mb-2">Preoccupazioni attive</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(state.activeConcerns as string[]).map((c: string, i: number) => (
                      <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Profilo ── */}
            <TabsContent value="profile" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Generazione</span><span className="font-medium">{agent.generation}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Istruzione</span><span className="font-medium">{agent.education}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Reddito</span><span className="font-medium">{agent.incomeEstimate?.toLocaleString("it-IT")}€</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Fascia</span><span className="font-medium">{agent.incomeBand}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Nucleo familiare</span><span className="font-medium">{agent.householdType}</span></div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Sistema 1</span><span className="font-medium">{Math.round((agent.system1Dominance ?? 0.5) * 100)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Avversione perdita</span><span className="font-medium">×{(agent.lossAversionCoeff ?? 2).toFixed(1)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Sensibilità prezzo</span><span className="font-medium">{Math.round((agent.priceSensitivity ?? 0.5) * 100)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Orientamento status</span><span className="font-medium">{Math.round((agent.statusOrientation ?? 0.5) * 100)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Quota pop.</span><span className="font-medium">{((agent.populationShare ?? 0) * 100).toFixed(1)}%</span></div>
                </div>
              </div>

              <Separator />

              {/* Topic Affinities */}
              {agent.topicAffinities && (
                <div>
                  <div className="text-sm font-medium mb-2">Affinità tematiche</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(agent.topicAffinities as Record<string, number>).map(([topic, score]) => (
                      <div key={topic} className="flex items-center gap-2">
                        <div className="flex-1 text-xs text-muted-foreground truncate">{topic}</div>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(score as number) * 100}%` }} />
                        </div>
                        <div className="text-xs w-6 text-right">{Math.round((score as number) * 100)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* System Prompt Preview */}
              {agent.systemPrompt && (
                <div>
                  <div className="text-sm font-medium mb-2">System Prompt (anteprima)</div>
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 leading-relaxed max-h-32 overflow-y-auto">
                    {agent.systemPrompt.substring(0, 400)}...
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Memorie ── */}
            <TabsContent value="memories" className="mt-4">
              {memories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Nessun ricordo ancora.</p>
                  <p className="text-xs mt-1">I ricordi si formano quando l'agente elabora eventi significativi.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {memories.map((memory: any) => (
                    <div key={memory.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{memory.title}</div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{memory.content}</div>
                        </div>
                        <div className={`text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${memory.emotionalValence > 0.2 ? "bg-emerald-100 text-emerald-700" : memory.emotionalValence < -0.2 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                          {memory.emotionalValence > 0 ? "+" : ""}{(memory.emotionalValence * 100).toFixed(0)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{memory.memoryType}</span>
                        <span className="text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-0.5" />
                          {new Date(memory.occurredAt ?? memory.createdAt).toLocaleDateString("it-IT")}
                        </span>
                        {(memory.tags as string[])?.slice(0, 2).map((tag: string, i: number) => (
                          <span key={i} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function Agents() {
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [selectedAgentState, setSelectedAgentState] = useState<any>(null);
  const [selectedMemories, setSelectedMemories] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: agents = [], isLoading: loadingAgents } = trpc.agents.list.useQuery();
  const { data: allStates = [] } = trpc.agents.allStates.useQuery();

  const seedMutation = trpc.agents.seed.useMutation({
    onSuccess: (data) => {
      toast.success(`Agenti inizializzati: ${data.created} creati, ${data.updated} aggiornati`);
    },
    onError: (err) => {
      toast.error(`Errore: ${err.message}`);
    },
  });

  const seedBatchMutation = trpc.agents.seedBatch.useMutation({
    onSuccess: (data) => {
      toast.success(`Panel calibrato: ${data.created} creati, ${data.updated} aggiornati${data.errors > 0 ? `, ${data.errors} errori` : ''}`);
    },
    onError: (err) => {
      toast.error(`Errore seed batch: ${err.message}`);
    },
  });

  const memoriesQuery = trpc.agents.getMemories.useQuery(
    { agentId: selectedAgent?.id ?? 0 },
    { enabled: !!selectedAgent }
  );

  function handleAgentClick(agent: any) {
    const state = allStates.find((s: any) => s.agentId === agent.id);
    setSelectedAgent(agent);
    setSelectedAgentState(state ?? null);
    setDialogOpen(true);
  }

  // Update memories when query resolves
  if (memoriesQuery.data && dialogOpen) {
    if (selectedMemories !== memoriesQuery.data) {
      setSelectedMemories(memoriesQuery.data);
    }
  }

  const stateMap = new Map(allStates.map((s: any) => [s.agentId, s]));

  // Stats
  const avgMood = agents.length > 0
    ? agents.reduce((sum: number, a: any) => sum + (stateMap.get(a.id)?.moodValence ?? 0), 0) / agents.length
    : 0;
  const avgStress = agents.length > 0
    ? agents.reduce((sum: number, a: any) => sum + (stateMap.get(a.id)?.financialStress ?? 0.3), 0) / agents.length
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenti Vivi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {agents.length} persone sintetiche con memoria persistente e stati emotivi dinamici
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {agents.length === 0 ? "Inizializza Agenti" : "Re-seed"}
          </Button>
          <Button
            size="sm"
            onClick={() => seedBatchMutation.mutate({ count: 200 })}
            disabled={seedBatchMutation.isPending}
            title="Genera 200 agenti calibrati statisticamente (Vita Interiore + Bias Vector)"
          >
            {seedBatchMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            Seed 200 agenti
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      {agents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Brain className="h-3.5 w-3.5" /> Agenti attivi
            </div>
            <div className="text-2xl font-bold">{agents.length}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Heart className="h-3.5 w-3.5" /> Umore medio
            </div>
            <div className="text-2xl font-bold">{avgMood > 0 ? "+" : ""}{(avgMood * 100).toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">{moodLabel(avgMood)}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <AlertCircle className="h-3.5 w-3.5" /> Stress medio
            </div>
            <div className="text-2xl font-bold">{Math.round(avgStress * 100)}%</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <BookOpen className="h-3.5 w-3.5" /> Memorie totali
            </div>
            <div className="text-2xl font-bold">—</div>
            <div className="text-xs text-muted-foreground">Clicca un agente</div>
          </Card>
        </div>
      )}

      {/* Agent Grid */}
      {loadingAgents ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : agents.length === 0 ? (
        <Card className="p-12 text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold mb-2">Nessun agente ancora</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Inizializza il panel con i 10 agenti prototipo per cominciare.
          </p>
          <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            {seedMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
            Inizializza 10 Agenti
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents.map((agent: any) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              state={stateMap.get(agent.id)}
              onClick={() => handleAgentClick(agent)}
            />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <AgentDetailDialog
        agent={selectedAgent}
        state={selectedAgentState}
        memories={memoriesQuery.data ?? []}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
