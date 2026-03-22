import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Globe, Plus, Play, Loader2, TrendingUp, TrendingDown, Minus,
  Zap, AlertTriangle, Heart, Tv, Music, Cloud, ChevronRight,
  Clock, Users, BarChart2
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { value: "macro_economic", label: "Macro-economico", icon: BarChart2, color: "text-blue-600" },
  { value: "personal_life", label: "Vita personale", icon: Heart, color: "text-rose-600" },
  { value: "social", label: "Sociale", icon: Users, color: "text-purple-600" },
  { value: "media", label: "Media / Notizia", icon: Tv, color: "text-amber-600" },
  { value: "cultural", label: "Culturale", icon: Music, color: "text-emerald-600" },
  { value: "natural", label: "Naturale / Ambientale", icon: Cloud, color: "text-cyan-600" },
];

const SCOPES = [
  { value: "global", label: "Globale" },
  { value: "national", label: "Nazionale" },
  { value: "regional", label: "Regionale" },
  { value: "personal", label: "Personale" },
  { value: "segment", label: "Segmento" },
];

function eventTypeLabel(type: string) {
  return EVENT_TYPES.find(t => t.value === type)?.label ?? type;
}

function eventTypeColor(type: string) {
  const colors: Record<string, string> = {
    macro_economic: "bg-blue-100 text-blue-700",
    personal_life: "bg-rose-100 text-rose-700",
    social: "bg-purple-100 text-purple-700",
    media: "bg-amber-100 text-amber-700",
    cultural: "bg-emerald-100 text-emerald-700",
    natural: "bg-cyan-100 text-cyan-700",
  };
  return colors[type] ?? "bg-gray-100 text-gray-700";
}

function intensityLabel(intensity: number) {
  if (intensity > 0.7) return "Alta";
  if (intensity > 0.4) return "Media";
  return "Bassa";
}

function intensityColor(intensity: number) {
  if (intensity > 0.7) return "text-red-600";
  if (intensity > 0.4) return "text-amber-600";
  return "text-emerald-600";
}

function economicImpactIcon(impact: number) {
  if (impact > 0.1) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (impact < -0.1) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
}

// ─── Create Event Form ────────────────────────────────────────────────

function CreateEventDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("macro_economic");
  const [scope, setScope] = useState("national");
  const [intensity, setIntensity] = useState(0.5);
  const [economicImpact, setEconomicImpact] = useState(0);
  const [mediaUrls, setMediaUrls] = useState("");

  const createMutation = trpc.worldEvents.create.useMutation({
    onSuccess: (data) => {
      toast.success("Evento creato con successo");
      onCreated(data.id);
      onClose();
      // Reset
      setTitle(""); setDescription(""); setEventType("macro_economic");
      setScope("national"); setIntensity(0.5); setEconomicImpact(0); setMediaUrls("");
    },
    onError: (err) => toast.error(`Errore: ${err.message}`),
  });

  function handleSubmit() {
    if (!title.trim() || !description.trim()) {
      toast.error("Titolo e descrizione sono obbligatori");
      return;
    }
    const urls = mediaUrls.trim() ? mediaUrls.split("\n").map(u => u.trim()).filter(Boolean) : undefined;
    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      eventType: eventType as any,
      scope: scope as any,
      intensity,
      economicImpact,
      mediaUrls: urls,
      mediaType: urls && urls.length > 0 ? "image" : "none",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crea Evento Mondiale</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Titolo *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Es. Inflazione supera il 5% in Italia"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descrizione *</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrivi l'evento in dettaglio. Più è specifico, più la reazione degli agenti sarà autentica."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo evento</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Portata</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Intensità</Label>
              <span className={`text-sm font-medium ${intensityColor(intensity)}`}>{intensityLabel(intensity)} ({(intensity * 100).toFixed(0)}%)</span>
            </div>
            <Slider
              value={[intensity]}
              onValueChange={([v]) => setIntensity(v)}
              min={0} max={1} step={0.05}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Impatto economico</Label>
              <span className={`text-sm font-medium ${economicImpact > 0 ? "text-emerald-600" : economicImpact < 0 ? "text-red-600" : "text-gray-500"}`}>
                {economicImpact > 0 ? "+" : ""}{(economicImpact * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[economicImpact]}
              onValueChange={([v]) => setEconomicImpact(v)}
              min={-1} max={1} step={0.05}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label>URL media (opzionale, uno per riga)</Label>
            <Textarea
              value={mediaUrls}
              onChange={e => setMediaUrls(e.target.value)}
              placeholder="https://example.com/image.jpg"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Immagini o video associati all'evento. Gli agenti li "vedranno" durante l'elaborazione.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Crea Evento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────

function EventCard({
  event,
  onProcess,
  processing,
}: {
  event: any;
  onProcess: (id: number) => void;
  processing: boolean;
}) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold leading-snug">{event.title}</CardTitle>
            <CardDescription className="text-xs mt-1 line-clamp-2">{event.description}</CardDescription>
          </div>
          {economicImpactIcon(event.economicImpact)}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${eventTypeColor(event.eventType)}`}>
            {eventTypeLabel(event.eventType)}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {SCOPES.find(s => s.value === event.scope)?.label ?? event.scope}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 ${intensityColor(event.intensity)}`}>
            Intensità {intensityLabel(event.intensity)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(event.occurredAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onProcess(event.id)}
            disabled={processing}
            className="h-7 text-xs"
          >
            {processing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Play className="h-3 w-3 mr-1" />
            )}
            Processa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function WorldEvents() {
  const [createOpen, setCreateOpen] = useState(false);
  const [processingEventId, setProcessingEventId] = useState<number | null>(null);
  const [lastResults, setLastResults] = useState<any[] | null>(null);
  const [resultsEventTitle, setResultsEventTitle] = useState("");

  const { data: events = [], isLoading, refetch } = trpc.worldEvents.list.useQuery();
  const { data: agents = [] } = trpc.agents.list.useQuery();

  const processMutation = trpc.worldEvents.process.useMutation({
    onSuccess: (data, variables) => {
      const event = events.find((e: any) => e.id === variables.eventId);
      setResultsEventTitle(event?.title ?? "Evento");
      setLastResults(data.results);
      toast.success(`Evento processato: ${data.processed} agenti aggiornati`);
      setProcessingEventId(null);
    },
    onError: (err) => {
      toast.error(`Errore: ${err.message}`);
      setProcessingEventId(null);
    },
  });

  function handleProcess(eventId: number) {
    setProcessingEventId(eventId);
    processMutation.mutate({ eventId });
  }

  function handleCreated(id: number) {
    refetch();
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">World Events</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crea eventi del mondo reale e osserva come gli agenti reagiscono
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Evento
        </Button>
      </div>

      {/* Info Banner */}
      {agents.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-sm text-amber-800">
              <strong>Nessun agente inizializzato.</strong> Vai alla sezione <strong>Agenti</strong> e clicca "Inizializza Agenti" prima di processare eventi.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Results */}
      {lastResults && lastResults.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Risultati: {resultsEventTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {lastResults.map((r: any) => (
                  <div key={r.agentSlug} className="flex items-start gap-3 p-2 rounded-lg bg-background border">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {r.agentSlug.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{r.agentSlug}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.reaction}</div>
                    </div>
                    <div className={`text-xs font-semibold shrink-0 ${r.stateChanges?.moodValence !== undefined ? (r.stateChanges.moodValence > 0 ? "text-emerald-600" : r.stateChanges.moodValence < 0 ? "text-red-600" : "text-gray-500") : "text-gray-500"}`}>
                      {r.memoryCreated ? "💾" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Events Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <Card className="p-12 text-center">
          <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold mb-2">Nessun evento ancora</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crea un evento del mondo reale per osservare come gli agenti reagiscono.
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crea Primo Evento
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event: any) => (
            <EventCard
              key={event.id}
              event={event}
              onProcess={handleProcess}
              processing={processingEventId === event.id}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateEventDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
