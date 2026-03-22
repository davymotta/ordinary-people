import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Megaphone, Play, Target, ArrowRight, TrendingUp, Brain } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ordinary People — Market Simulation Engine
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Personas"
          value={isLoading ? "—" : String(stats?.personaCount ?? 0)}
          icon={<Users className="h-4 w-4" />}
          onClick={() => setLocation("/personas")}
        />
        <StatCard
          label="Campaigns"
          value={isLoading ? "—" : String(stats?.campaignCount ?? 0)}
          icon={<Megaphone className="h-4 w-4" />}
          onClick={() => setLocation("/campaigns")}
        />
        <StatCard
          label="Simulations"
          value={isLoading ? "—" : String(stats?.simulationCount ?? 0)}
          icon={<Play className="h-4 w-4" />}
          onClick={() => setLocation("/results")}
        />
        <StatCard
          label="Prompt Coverage"
          value={
            isLoading
              ? "—"
              : stats?.promptCount != null
                ? `${stats.promptCount}/${stats.personaCount ?? 0}`
                : "0/0"
          }
          icon={<Brain className="h-4 w-4" />}
          onClick={() => setLocation("/personas")}
        />
        <StatCard
          label="Best Spearman ρ"
          value={
            isLoading
              ? "—"
              : stats?.calibration?.metrics
                ? formatRho((stats.calibration.metrics as any).spearmanRho)
                : "N/A"
          }
          icon={<Target className="h-4 w-4" />}
          onClick={() => setLocation("/calibration")}
        />
      </div>

      {/* Calibration Progress + Last Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calibration Progress */}
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold tracking-[-0.02em] uppercase text-muted-foreground">
                Calibration Progress
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setLocation("/calibration")}
              >
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            {stats?.calibrationHistory && stats.calibrationHistory.length > 0 ? (
              <div className="space-y-3">
                {stats.calibrationHistory.slice(-5).map((run, i) => {
                  const metrics = run.metrics as any;
                  const rho = metrics?.spearmanRho ?? 0;
                  const mae = metrics?.mae ?? 1;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">
                        Iter {run.iteration}
                      </span>
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.max(0, Math.min(100, (rho + 1) * 50))}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono w-12 text-right">
                        ρ {rho.toFixed(2)}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground w-16 text-right">
                        MAE {mae.toFixed(3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No calibration runs yet
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Add ground truth data and run calibration
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Simulation */}
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold tracking-[-0.02em] uppercase text-muted-foreground">
                Last Simulation
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setLocation("/results")}
              >
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            {stats?.lastSimulation ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{stats.lastSimulation.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats.lastSimulation.completedAt
                      ? new Date(stats.lastSimulation.completedAt as any).toLocaleString()
                      : "—"}
                  </p>
                </div>
                {(stats.lastSimulation.metrics as any) && (
                  <div className="grid grid-cols-3 gap-3">
                    <MiniStat
                      label="Personas"
                      value={String((stats.lastSimulation.metrics as any).totalPersonas ?? 0)}
                    />
                    <MiniStat
                      label="Campaigns"
                      value={String((stats.lastSimulation.metrics as any).totalCampaigns ?? 0)}
                    />
                    <MiniStat
                      label="WMI"
                      value={formatWmi((stats.lastSimulation.metrics as any).weightedMarketInterest)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Play className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No simulations yet
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Create a campaign and run a simulation
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold tracking-[-0.02em] uppercase text-muted-foreground mb-3">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-border/50"
            onClick={() => setLocation("/personas")}
          >
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Browse Personas
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-border/50"
            onClick={() => setLocation("/campaigns/new")}
          >
            <Megaphone className="h-3.5 w-3.5 mr-1.5" />
            New Campaign
          </Button>
          <Button
            size="sm"
            className="text-xs bg-primary text-primary-foreground hover:opacity-90"
            onClick={() => setLocation("/simulation")}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Run Simulation
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-[#CCFF00]/50 text-foreground"
            onClick={() => setLocation("/simulation")}
          >
            <Brain className="h-3.5 w-3.5 mr-1.5" />
            Run Hybrid (LLM)
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Card
      className="border border-border/50 shadow-none cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <p className="text-2xl font-extrabold tracking-[-0.04em]">{value}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/50 rounded-md p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function formatRho(val: unknown): string {
  if (typeof val !== "number" || isNaN(val)) return "N/A";
  return val.toFixed(3);
}

function formatWmi(val: unknown): string {
  if (typeof val !== "number" || isNaN(val)) return "N/A";
  return val.toFixed(3);
}
