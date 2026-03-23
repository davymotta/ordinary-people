import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Globe,
  Brain,
  Activity,
  ChevronRight,
  Zap,
  AlertCircle,
  TrendingUp,
  Clock,
  Building2,
  Target,
  Database,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

export default function AdminDashboard() {
  const { data: agentsData } = trpc.agents.list.useQuery();
  const { data: worldEvents } = trpc.worldEvents.list.useQuery();

  const agents = agentsData ?? [];
  const events = (worldEvents as any)?.items ?? worldEvents ?? [];

  const emotionCounts = agents.reduce((acc: Record<string, number>, agent: any) => {
    const emotion = agent.currentEmotion ?? "neutral";
    acc[emotion] = (acc[emotion] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const emotionColors: Record<string, string> = {
    joy: "text-yellow-500",
    trust: "text-green-500",
    fear: "text-purple-500",
    surprise: "text-blue-400",
    sadness: "text-blue-600",
    disgust: "text-orange-600",
    anger: "text-red-500",
    anticipation: "text-amber-500",
    neutral: "text-muted-foreground",
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Operator Console</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Panoramica operativa: clienti, simulazioni, calibrazione GTE e training.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/admin/clients">
              <Button variant="outline" size="sm" className="gap-2">
                <Building2 className="w-4 h-4" />
                Clienti
              </Button>
            </Link>
            <Link href="/lab/gte">
              <Button variant="outline" size="sm" className="gap-2">
                <Target className="w-4 h-4" />
                GTE
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick links operativi */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Clienti", sub: "Gestione account", href: "/admin/clients", icon: <Building2 className="w-4 h-4" />, color: "text-primary" },
            { label: "Brand Agent", sub: "Configurazioni brand", href: "/admin/brand-agents", icon: <Zap className="w-4 h-4" />, color: "text-chart-2" },
            { label: "Accuracy GTE", sub: "Spearman ρ timeline", href: "/admin/accuracy", icon: <Target className="w-4 h-4" />, color: "text-chart-3" },
            { label: "Dataset", sub: "Training data", href: "/admin/dataset", icon: <Database className="w-4 h-4" />, color: "text-chart-4" },
          ].map((q) => (
            <Link key={q.href} href={q.href}>
              <Card className="hover:border-primary/30 transition-colors cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={q.color}>{q.icon}</span>
                    <span className="text-xs font-semibold text-foreground">{q.label}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{q.sub}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 mb-6">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-green-400 font-medium">Sistema operativo</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {agents.length} agenti attivi · {Array.isArray(events) ? events.length : 0} eventi recenti
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Agenti vivi</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{agents.length}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-chart-2" />
                <span className="text-xs text-muted-foreground">World Events</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {Array.isArray(events) ? events.length : 0}
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-chart-3" />
                <span className="text-xs text-muted-foreground">Memorie totali</span>
              </div>
              <div className="text-2xl font-bold text-foreground">—</div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-chart-4" />
                <span className="text-xs text-muted-foreground">Simulazioni</span>
              </div>
              <div className="text-2xl font-bold text-foreground">—</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stato emotivo agenti */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Stato emotivo popolazione</CardTitle>
                <Link href="/admin/agents">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                    Gestisci <ChevronRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-xs text-muted-foreground">Nessun agente inizializzato.</p>
                  <Link href="/admin/agents">
                    <Button size="sm" variant="outline" className="mt-3 text-xs">
                      Inizializza agenti
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(emotionCounts).map(([emotion, count]) => (
                    <div key={emotion} className="flex items-center gap-3">
                      <span className={`text-xs font-medium capitalize w-24 ${emotionColors[emotion] ?? "text-muted-foreground"}`}>
                        {emotion}
                      </span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full"
                          style={{ width: `${(count / agents.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-4 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* World Events recenti */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">World Events recenti</CardTitle>
                <Link href="/admin/world">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                    Gestisci <ChevronRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {!Array.isArray(events) || events.length === 0 ? (
                <div className="text-center py-6">
                  <Globe className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-xs text-muted-foreground">Nessun evento nel mondo.</p>
                  <Link href="/admin/world">
                    <Button size="sm" variant="outline" className="mt-3 text-xs">
                      Crea evento
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 5).map((event: any) => (
                    <div key={event.id} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/30 transition-colors">
                      <Zap className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.eventType} · Intensità {event.intensity}/10
                        </p>
                      </div>
                      <Badge
                        variant={event.processed ? "default" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {event.processed ? "Processato" : "In attesa"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="border-border/50 md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Azioni rapide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link href="/admin/agents">
                  <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col text-xs">
                    <Users className="w-4 h-4" />
                    Gestisci agenti
                  </Button>
                </Link>
                <Link href="/admin/world">
                  <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col text-xs">
                    <Globe className="w-4 h-4" />
                    World Engine
                  </Button>
                </Link>
                <Link href="/admin/life-history">
                  <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col text-xs">
                    <Clock className="w-4 h-4" />
                    Life History
                  </Button>
                </Link>
                <Link href="/admin/simulations">
                  <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col text-xs">
                    <TrendingUp className="w-4 h-4" />
                    Simulazioni
                  </Button>
                </Link>
                <Link href="/admin/social-auth">
                  <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col text-xs">
                    <ShieldCheck className="w-4 h-4" />
                    Social Auth
                  </Button>
                </Link>
                <Link href="/admin/retraining">
                  <Button variant="outline" className="w-full gap-2 h-auto py-3 flex-col text-xs">
                    <RefreshCw className="w-4 h-4" />
                    Retraining
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
