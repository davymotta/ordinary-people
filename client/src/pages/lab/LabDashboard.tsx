import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { LabLayout } from "@/components/LabLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  BarChart2,
  Clock,
  FlaskConical,
  Database,
  ChevronRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function LabDashboard() {
  const { data: archetypeStats } = trpc.archetypeMatrix.stats.useQuery();
  const { data: lifeHistoryStats } = trpc.lifeHistory.archiveStats.useQuery();

  const engines = [
    {
      id: "archetypes",
      label: "Archetype Matrix",
      description: "Big Five × Pearson × Haidt × Hofstede. Genera profili psicologici coerenti on-demand.",
      href: "/lab/archetypes",
      icon: <Layers className="w-5 h-5" />,
      status: archetypeStats ? "ready" : "empty",
      stats: archetypeStats ? [
        { label: "Profili generati", value: (archetypeStats as any).totalProfiles ?? 0 },
        { label: "Cluster culturali", value: (archetypeStats as any).totalClusters ?? 0 },
        { label: "Archetipi", value: (archetypeStats as any).totalArchetypes ?? 0 },
      ] : [],
    },
    {
      id: "sampler",
      label: "Calibrated Sampler",
      description: "Sampling statisticamente calibrato da 307k soggetti reali. Gaussiane Big Five, shift di genere, correlazioni inter-tratto.",
      href: "/lab/sampler",
      icon: <BarChart2 className="w-5 h-5" />,
      status: "ready",
      stats: [
        { label: "Dataset", value: "307k soggetti" },
        { label: "Paesi Hofstede", value: "111" },
        { label: "Cluster", value: "12" },
      ],
    },
    {
      id: "life-history",
      label: "Life History Engine",
      description: "Archivio storico 1950-2025: eventi, TV italiana, pubblicità iconiche. Genera memorie biografiche in prima persona.",
      href: "/lab/life-history",
      icon: <Clock className="w-5 h-5" />,
      status: lifeHistoryStats ? "ready" : "empty",
      stats: lifeHistoryStats ? [
        { label: "Eventi storici", value: (lifeHistoryStats as any).historicalEvents ?? 0 },
        { label: "Programmi TV", value: (lifeHistoryStats as any).tvPrograms ?? 0 },
        { label: "Pubblicità", value: (lifeHistoryStats as any).iconicAds ?? 0 },
      ] : [],
    },
    {
      id: "campaign-testing",
      label: "Campaign Testing",
      description: "Test multimodale: ogni agente elabora la campagna attraverso la propria lente psicologica. Report aggregato con KPI e narrativa.",
      href: "/lab/campaign-testing",
      icon: <FlaskConical className="w-5 h-5" />,
      status: "ready",
      stats: [],
    },
  ];

  return (
    <LabLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Laboratorio</h1>
          <p className="text-sm text-muted-foreground">
            Motori di generazione, dataset sociologici e strumenti di testing.
          </p>
        </div>

        {/* Engines grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {engines.map((engine) => (
            <Card key={engine.id} className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                      {engine.icon}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{engine.label}</CardTitle>
                    </div>
                  </div>
                  <Badge
                    variant={engine.status === "ready" ? "default" : "secondary"}
                    className="text-[10px] shrink-0"
                  >
                    {engine.status === "ready" ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-2.5 h-2.5" /> Pronto
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" /> Da inizializzare
                      </span>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  {engine.description}
                </p>
                {engine.stats.length > 0 && (
                  <div className="flex gap-4 mb-4">
                    {engine.stats.map((stat) => (
                      <div key={stat.label}>
                        <div className="text-sm font-semibold text-foreground">{stat.value}</div>
                        <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}
                <Link href={engine.href}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    Apri motore <ChevronRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dataset status */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Dataset & Fonti</CardTitle>
              <Link href="/lab/datasets">
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                  Dettagli <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { name: "Big Five IPIP (307k soggetti)", source: "Open-Source Psychometrics Project", status: "loaded" },
                { name: "Hofstede Country Scores (111 paesi)", source: "Hofstede Insights", status: "loaded" },
                { name: "Pearson/Jung Archetypes (12)", source: "Margaret Mark & Carol Pearson", status: "loaded" },
                { name: "Haidt Moral Foundations (6)", source: "Jonathan Haidt, MFT", status: "loaded" },
                { name: "Inglehart-Welzel Cultural Map", source: "World Values Survey", status: "loaded" },
                { name: "Bourdieu Capital Distribution", source: "ISTAT quintili 2023", status: "loaded" },
                { name: "Archivio TV italiana 1954-2025", source: "Curato manualmente + Wikipedia", status: "loaded" },
                { name: "GDELT News Feed (presente dinamico)", source: "GDELT Project", status: "pending" },
              ].map((ds) => (
                <div key={ds.name} className="flex items-center gap-3 py-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ds.status === "loaded" ? "bg-green-400" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{ds.name}</p>
                    <p className="text-[10px] text-muted-foreground">{ds.source}</p>
                  </div>
                  <Badge variant={ds.status === "loaded" ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {ds.status === "loaded" ? "Caricato" : "In attesa"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </LabLayout>
  );
}
