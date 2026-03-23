import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Database,
  Zap,
} from "lucide-react";

interface RetrainingRun {
  id: string;
  triggeredAt: string;
  triggeredBy: string;
  status: "completed" | "running" | "failed" | "pending";
  brandsTrained: string[];
  deltaRho: number;
  durationMin: number;
  notes: string;
}

const mockRuns: RetrainingRun[] = [
  {
    id: "run-001",
    triggeredAt: "2026-03-23T16:00:00Z",
    triggeredBy: "Sistema (auto)",
    status: "completed",
    brandsTrained: ["Loewe"],
    deltaRho: +0.023,
    durationMin: 4,
    notes: "Prima calibrazione GTE Loewe. 159 post normalizzati.",
  },
];

const statusConfig = {
  completed: { label: "Completato", color: "bg-green-500/10 text-green-500", icon: <CheckCircle2 className="w-3 h-3" /> },
  running: { label: "In corso", color: "bg-blue-500/10 text-blue-500", icon: <Clock className="w-3 h-3" /> },
  failed: { label: "Fallito", color: "bg-red-500/10 text-red-500", icon: <AlertCircle className="w-3 h-3" /> },
  pending: { label: "In attesa", color: "bg-muted text-muted-foreground", icon: <Clock className="w-3 h-3" /> },
};

export default function AdminRetraining() {
  return (
    <AdminLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Retraining Log</h1>
            <p className="text-sm text-muted-foreground">
              Storico delle sessioni di retraining del modello con delta ρ e brand coinvolti.
            </p>
          </div>
          <Button className="gap-2" disabled>
            <Play className="w-4 h-4" />
            Avvia retraining
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{mockRuns.length}</p>
                <p className="text-xs text-muted-foreground">Run totali</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">+{mockRuns.reduce((s, r) => s + r.deltaRho, 0).toFixed(3)}</p>
                <p className="text-xs text-muted-foreground">Δρ cumulativo</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-3">
              <Database className="w-5 h-5 text-chart-3" />
              <div>
                <p className="text-2xl font-bold">159</p>
                <p className="text-xs text-muted-foreground">Post nel training set</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trigger conditions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Condizioni di trigger automatico
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {[
                { condition: "Nuovo brand calibrato con ρ > 0.6", active: true },
                { condition: "Deriva rilevata: ρ scende di > 0.05 rispetto al baseline", active: false },
                { condition: "Accumulo di > 500 nuovi post GTE", active: false },
                { condition: "Trigger manuale dall'operatore", active: true },
              ].map((t) => (
                <div key={t.condition} className="flex items-center gap-3 py-1.5">
                  <div className={`w-2 h-2 rounded-full ${t.active ? "bg-green-400" : "bg-muted-foreground/30"}`} />
                  <p className="text-sm text-foreground">{t.condition}</p>
                  <Badge variant="secondary" className={`ml-auto text-[10px] ${t.active ? "bg-green-500/10 text-green-500 border-0" : ""}`}>
                    {t.active ? "Attivo" : "Disabilitato"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Run log */}
        <div className="space-y-3">
          {mockRuns.map((run) => {
            const status = statusConfig[run.status];
            return (
              <Card key={run.id}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground font-mono">{run.id}</p>
                        <Badge className={`${status.color} border-0 text-[10px] gap-1 flex items-center`}>
                          {status.icon}
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{run.notes}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Avviato: {new Date(run.triggeredAt).toLocaleString("it-IT")}</span>
                        <span>·</span>
                        <span>Da: {run.triggeredBy}</span>
                        <span>·</span>
                        <span>Durata: {run.durationMin} min</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-center shrink-0">
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {run.brandsTrained.join(", ")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Brand</p>
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${run.deltaRho >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {run.deltaRho >= 0 ? "+" : ""}{run.deltaRho.toFixed(3)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Δρ</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {mockRuns.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium mb-1">Nessun retraining eseguito</p>
              <p className="text-xs">Il log si popola automaticamente dopo ogni sessione di calibrazione GTE.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
