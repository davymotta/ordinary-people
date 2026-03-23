import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Plus,
  Trash2,
  Building2,
  CheckCircle2,
  Route,
  ChevronDown,
  ChevronUp,
  Info,
  GripVertical,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TouchpointDraft {
  id: string;
  campaignId: number | null;
  channel: string;
  delayDays: number;
  label: string;
  objective: "awareness" | "consideration" | "conversion" | "recovery";
}

const CHANNELS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "email", label: "Email" },
  { value: "tv", label: "TV" },
  { value: "display", label: "Display" },
  { value: "search", label: "Search" },
];

const OBJECTIVES = [
  { value: "awareness", label: "Awareness", color: "bg-blue-500" },
  { value: "consideration", label: "Consideration", color: "bg-amber-500" },
  { value: "conversion", label: "Conversion", color: "bg-green-500" },
  { value: "recovery", label: "Recovery", color: "bg-red-500" },
];

const OBJECTIVE_COLORS: Record<string, string> = {
  awareness: "bg-blue-100 text-blue-700 border-blue-200",
  consideration: "bg-amber-100 text-amber-700 border-amber-200",
  conversion: "bg-green-100 text-green-700 border-green-200",
  recovery: "bg-red-100 text-red-700 border-red-200",
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function JourneySimulationPanel() {
  const [, navigate] = useLocation();
  const [journeyName, setJourneyName] = useState("");
  const [selectedBrandAgentId, setSelectedBrandAgentId] = useState<number | null>(null);
  const [touchpoints, setTouchpoints] = useState<TouchpointDraft[]>([
    { id: uid(), campaignId: null, channel: "instagram", delayDays: 0, label: "Awareness — Video 15s", objective: "awareness" },
    { id: uid(), campaignId: null, channel: "instagram", delayDays: 3, label: "Consideration — Carosello", objective: "consideration" },
    { id: uid(), campaignId: null, channel: "email", delayDays: 7, label: "Conversion — Offerta", objective: "conversion" },
  ]);
  const [showCampaignInfo, setShowCampaignInfo] = useState(false);

  // Queries
  const brandAgentsQuery = trpc.onboarding.listBrandAgents.useQuery();
  const brandAgents = brandAgentsQuery.data ?? [];
  const campaignsQuery = trpc.campaigns.list.useQuery();
  const campaigns = (campaignsQuery.data ?? []) as Array<{ id: number; name: string; channel: string; format: string }>;

  // Mutation
  const runJourneyMutation = trpc.strategicSimulations.runJourney.useMutation({
    onSuccess: (data) => {
      navigate(`/app/journey/${data.simulationId}`);
    },
    onError: (err) => {
      toast.error(`Errore lancio: ${err.message}`);
    },
  });

  // ─── Touchpoint helpers ───────────────────────────────────────────────────

  const addTouchpoint = () => {
    const last = touchpoints[touchpoints.length - 1];
    setTouchpoints(prev => [...prev, {
      id: uid(),
      campaignId: null,
      channel: last?.channel ?? "instagram",
      delayDays: (last?.delayDays ?? 0) + 7,
      label: "",
      objective: "consideration",
    }]);
  };

  const removeTouchpoint = (id: string) => {
    setTouchpoints(prev => prev.filter(t => t.id !== id));
  };

  const updateTouchpoint = (id: string, updates: Partial<TouchpointDraft>) => {
    setTouchpoints(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  // ─── Launch ───────────────────────────────────────────────────────────────

  const canLaunch = journeyName.trim() && touchpoints.length >= 2 && touchpoints.every(t => t.campaignId !== null && t.label.trim());

  const handleLaunch = () => {
    if (!canLaunch) return;
    toast.info("Avvio Journey Simulation...", { description: "Sarai reindirizzato ai risultati" });
    runJourneyMutation.mutate({
      brandAgentId: selectedBrandAgentId ?? undefined,
      name: journeyName.trim(),
      touchpoints: touchpoints.map(t => ({
        campaignId: t.campaignId!,
        channel: t.channel,
        delayDays: t.delayDays,
        label: t.label.trim(),
        objective: t.objective,
      })),
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ClientLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Route className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-display font-bold text-foreground">Journey Simulation</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Simula un funnel multi-touchpoint sugli stessi agenti in sequenza. Ogni agente mantiene il proprio stato tra i touchpoint (familiarity, sentiment, saturazione).
          </p>
        </div>

        <div className="flex gap-6 items-start">
          {/* Colonna sinistra: configurazione */}
          <div className="w-80 shrink-0 space-y-4">
            {/* Nome journey */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Configurazione</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Nome journey</Label>
                  <Input
                    placeholder="es. Lancio Barilla — Funnel Estate 2025"
                    value={journeyName}
                    onChange={(e) => setJourneyName(e.target.value)}
                  />
                </div>

                {/* Brand Agent selector */}
                {brandAgents.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      Brand Agent
                    </Label>
                    <select
                      value={selectedBrandAgentId ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedBrandAgentId(val === "" ? null : Number(val));
                      }}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Nessun brand agent</option>
                      {brandAgents.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.brandName} — {a.sector}</option>
                      ))}
                    </select>
                    {selectedBrandAgentId && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        Stato persistente brand abilitato
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info campagne disponibili */}
            <Card>
              <CardHeader className="pb-2">
                <button
                  onClick={() => setShowCampaignInfo(!showCampaignInfo)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    Campagne disponibili ({campaigns.length})
                  </CardTitle>
                  {showCampaignInfo ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
              </CardHeader>
              {showCampaignInfo && (
                <CardContent className="pt-0">
                  {campaigns.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nessuna campagna disponibile. Creane una prima.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {campaigns.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 py-1">
                          <span className="text-xs font-mono text-muted-foreground w-6">{c.id}</span>
                          <span className="text-xs text-foreground flex-1 truncate">{c.name}</span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0">{c.channel}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* CTA */}
            <Button
              size="lg"
              className="w-full gap-2"
              disabled={!canLaunch || runJourneyMutation.isPending}
              onClick={handleLaunch}
            >
              {runJourneyMutation.isPending ? "Avvio..." : "Lancia Journey"}
              <ArrowRight className="w-4 h-4" />
            </Button>

            {!canLaunch && (
              <p className="text-xs text-muted-foreground text-center">
                {!journeyName.trim()
                  ? "Inserisci un nome per il journey"
                  : touchpoints.length < 2
                  ? "Aggiungi almeno 2 touchpoint"
                  : "Seleziona una campagna per ogni touchpoint"}
              </p>
            )}
          </div>

          {/* Colonna destra: touchpoints */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Touchpoints ({touchpoints.length})
              </h2>
              <Button variant="outline" size="sm" onClick={addTouchpoint} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Aggiungi touchpoint
              </Button>
            </div>

            {/* Funnel visual */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {touchpoints.map((tp, idx) => (
                <div key={tp.id} className="flex items-center gap-1 shrink-0">
                  <div className={`px-2 py-1 rounded text-xs font-medium border ${OBJECTIVE_COLORS[tp.objective]}`}>
                    {tp.label || `Touchpoint ${idx + 1}`}
                  </div>
                  {idx < touchpoints.length - 1 && (
                    <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <ArrowRight className="w-3 h-3" />
                      <span>{touchpoints[idx + 1].delayDays - tp.delayDays}d</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Touchpoint cards */}
            <div className="space-y-3">
              {touchpoints.map((tp, idx) => (
                <Card key={tp.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Index */}
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </div>

                      <div className="flex-1 grid grid-cols-2 gap-3">
                        {/* Label */}
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">Etichetta touchpoint</Label>
                          <Input
                            placeholder="es. Awareness — Video 15s"
                            value={tp.label}
                            onChange={(e) => updateTouchpoint(tp.id, { label: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>

                        {/* Campaign */}
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">Campagna</Label>
                          <select
                            value={tp.campaignId ?? ""}
                            onChange={(e) => updateTouchpoint(tp.id, { campaignId: e.target.value === "" ? null : Number(e.target.value) })}
                            className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">Seleziona campagna...</option>
                            {campaigns.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Channel */}
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Canale</Label>
                          <select
                            value={tp.channel}
                            onChange={(e) => updateTouchpoint(tp.id, { channel: e.target.value })}
                            className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {CHANNELS.map((ch) => (
                              <option key={ch.value} value={ch.value}>{ch.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Objective */}
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Obiettivo</Label>
                          <select
                            value={tp.objective}
                            onChange={(e) => updateTouchpoint(tp.id, { objective: e.target.value as TouchpointDraft["objective"] })}
                            className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {OBJECTIVES.map((obj) => (
                              <option key={obj.value} value={obj.value}>{obj.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Delay */}
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Giorno (dal lancio)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={tp.delayDays}
                            onChange={(e) => updateTouchpoint(tp.id, { delayDays: Math.max(0, Number(e.target.value)) })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* Delete */}
                      {touchpoints.length > 2 && (
                        <button
                          onClick={() => removeTouchpoint(tp.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Add touchpoint CTA */}
            <button
              onClick={addTouchpoint}
              className="w-full border-2 border-dashed border-border rounded-lg py-4 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Aggiungi touchpoint
            </button>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
