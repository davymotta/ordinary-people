import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ArrowRight,
  FlaskConical,
  Users,
  TrendingUp,
  Clock,
  ChevronRight,
} from "lucide-react";

export default function ClientDashboard() {
  const { data: simulations } = trpc.simulations.list.useQuery();

  const stats = [
    { label: "Simulazioni completate", value: simulations?.length ?? 0, icon: <FlaskConical className="w-5 h-5" />, color: "text-primary" },
    { label: "Agenti nel panel", value: 10, icon: <Users className="w-5 h-5" />, color: "text-chart-2" },
    { label: "Tasso di risposta medio", value: "94%", icon: <TrendingUp className="w-5 h-5" />, color: "text-chart-3" },
    { label: "Tempo medio simulazione", value: "~3 min", icon: <Clock className="w-5 h-5" />, color: "text-chart-4" },
  ];

  return (
    <ClientLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Benvenuto in Ordinary People
          </h1>
          <p className="text-muted-foreground text-base">
            Testa le tue campagne su persone digitali con 50 anni di storia vissuta.
          </p>
        </div>

        {/* CTA principale */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-sm font-semibold text-primary uppercase tracking-wide">Inizia ora</span>
                </div>
                <h2 className="text-xl font-display font-semibold text-foreground mb-2">
                  Lancia una nuova simulazione
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Scegli il tuo target demografico, carica la campagna (immagine, video, copy o PDF) e ottieni le reazioni di persone digitali calibrate su dati sociologici reali.
                </p>
                <Link href="/app/simulate/new">
                  <Button className="gap-2">
                    Crea simulazione
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="hidden md:flex flex-col gap-2 text-right">
                <div className="text-xs text-muted-foreground">Cosa puoi testare</div>
                {["Campagne ADV", "Packaging", "Naming", "Copy & Claim", "Video spot"].map((item) => (
                  <Badge key={item} variant="secondary" className="text-xs justify-end">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className={`mb-2 ${stat.color}`}>{stat.icon}</div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Simulazioni recenti */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Simulazioni recenti</CardTitle>
              <Link href="/app/simulations">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  Vedi tutte <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!(simulations as any)?.length ? (
              <div className="text-center py-8">
                <FlaskConical className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">Nessuna simulazione ancora.</p>
                <p className="text-xs text-muted-foreground mt-1">Crea la tua prima simulazione per vedere i risultati qui.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(simulations as any[]).map((sim: any) => (
                  <Link key={sim.id} href={`/app/simulate/${sim.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{sim.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sim.status === "completed" ? "Completata" : sim.status === "running" ? "In corso..." : "In attesa"}
                          {" · "}
                          {new Date(sim.createdAt).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={sim.status === "completed" ? "default" : sim.status === "running" ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {sim.status === "completed" ? "Completata" : sim.status === "running" ? "In corso" : "Attesa"}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
