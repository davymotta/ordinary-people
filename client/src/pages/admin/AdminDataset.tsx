import { trpc } from "@/lib/trpc";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  Users,
  FileText,
  Target,
  Zap,
  Lock,
  Globe,
} from "lucide-react";

interface DatasetStat {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  description: string;
}

export default function AdminDataset() {
  const { data: agents } = trpc.agents.list.useQuery();
  const { data: simulations } = trpc.simulations.list.useQuery();
  const { data: brandAgents } = trpc.onboarding.listBrandAgents.useQuery();
  const { data: worldEvents } = trpc.worldEvents.list.useQuery();

  const agentCount = (agents as any[])?.length ?? 0;
  const simCount = (simulations as any[])?.length ?? 0;
  const brandCount = (brandAgents as any[])?.length ?? 0;
  const eventCount = (worldEvents as any)?.items?.length ?? (worldEvents as any)?.length ?? 0;

  const stats: DatasetStat[] = [
    {
      label: "Agenti nel panel",
      value: agentCount,
      icon: <Users className="w-5 h-5" />,
      color: "text-primary",
      description: "Persone digitali con storia di vita completa",
    },
    {
      label: "Simulazioni completate",
      value: simCount,
      icon: <Target className="w-5 h-5" />,
      color: "text-chart-2",
      description: "Sessioni di test con reazioni registrate",
    },
    {
      label: "Brand Agent",
      value: brandCount,
      icon: <Zap className="w-5 h-5" />,
      color: "text-chart-3",
      description: "Profili brand con dati GTE",
    },
    {
      label: "World Events",
      value: eventCount,
      icon: <Globe className="w-5 h-5" />,
      color: "text-chart-4",
      description: "Eventi storici nel World Engine",
    },
  ];

  const dataCategories = [
    {
      name: "Life Histories",
      description: "Storie di vita complete degli agenti (nascita, famiglia, lavoro, traumi, valori)",
      records: agentCount,
      size: `~${Math.round(agentCount * 12)}KB`,
      privacy: "internal",
      status: "ready",
    },
    {
      name: "Simulation Responses",
      description: "Reazioni degli agenti a campagne reali con score su 5 dimensioni",
      records: simCount * 10,
      size: `~${Math.round(simCount * 45)}KB`,
      privacy: "client-linked",
      status: simCount > 0 ? "ready" : "empty",
    },
    {
      name: "Ground Truth Posts",
      description: "Post reali con metriche di engagement per la calibrazione GTE",
      records: brandCount * 159,
      size: `~${Math.round(brandCount * 320)}KB`,
      privacy: "client-linked",
      status: brandCount > 0 ? "ready" : "empty",
    },
    {
      name: "Hook Analysis",
      description: "Analisi comportamentale degli hook con score per dimensione e riscritture",
      records: 0,
      size: "0KB",
      privacy: "internal",
      status: "empty",
    },
    {
      name: "Calibration Runs",
      description: "Risultati delle calibrazioni GTE con parametri ottimali per brand",
      records: brandCount,
      size: `~${Math.round(brandCount * 8)}KB`,
      privacy: "internal",
      status: brandCount > 0 ? "ready" : "empty",
    },
  ];

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Dataset</h1>
            <p className="text-sm text-muted-foreground">
              Panoramica del dataset di training: struttura, dimensioni, privacy e stato per categoria.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Esporta
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Aggiorna
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className={`${stat.color} mt-0.5 opacity-80`}>{stat.icon}</div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs font-medium text-foreground/80">{stat.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{stat.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Data categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Categorie di dati
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {dataCategories.map((cat) => (
                <div key={cat.name} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-foreground">{cat.name}</p>
                      <Badge
                        variant="secondary"
                        className={
                          cat.privacy === "internal"
                            ? "bg-primary/10 text-primary border-0 text-[10px] gap-1"
                            : "bg-yellow-500/10 text-yellow-600 border-0 text-[10px] gap-1"
                        }
                      >
                        {cat.privacy === "internal" ? (
                          <><Lock className="w-2.5 h-2.5" /> Interno</>
                        ) : (
                          <><Users className="w-2.5 h-2.5" /> Client-linked</>
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  </div>
                  <div className="flex items-center gap-6 text-center shrink-0">
                    <div>
                      <p className="text-sm font-bold text-foreground">{cat.records.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Record</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{cat.size}</p>
                      <p className="text-[10px] text-muted-foreground">Dimensione</p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        cat.status === "ready"
                          ? "bg-green-500/10 text-green-500 border-0 text-[10px]"
                          : "bg-muted text-muted-foreground border-0 text-[10px]"
                      }
                    >
                      {cat.status === "ready" ? (
                        <><CheckCircle2 className="w-2.5 h-2.5 mr-1" />Pronto</>
                      ) : "Vuoto"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Privacy note */}
        <div className="mt-6 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Gestione della privacy dei dati</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                I dati <strong>Client-linked</strong> (simulazioni, post GTE) sono associati al cliente che li ha generati.
                Prima di usarli per il training globale del modello, è necessario ottenere il consenso esplicito del cliente
                o anonimizzarli rimuovendo i riferimenti al brand. I dati <strong>Interni</strong> (life histories, world events)
                possono essere usati liberamente per il training.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
