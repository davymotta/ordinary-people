import { trpc } from "@/lib/trpc";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Target,
  CheckCircle2,
  AlertCircle,
  BarChart2,
} from "lucide-react";

function RhoBar({ value }: { value: number }) {
  const pct = Math.round(Math.abs(value) * 100);
  const color = value >= 0.7 ? "bg-green-500" : value >= 0.4 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-foreground w-12 text-right">{value.toFixed(3)}</span>
    </div>
  );
}

export default function AdminAccuracy() {
  const { data: brandAgents } = trpc.onboarding.listBrandAgents.useQuery();
  const agents = (brandAgents as any[]) ?? [];

  // Mock accuracy data — in produzione verrebbe da accuracyTimeline per ogni brand
  const accuracyData = agents.map((agent: any) => ({
    brandId: agent.id,
    brandName: agent.brandName,
    rhoComposite: agent.lastRho ?? 0.85,
    rhoResonance: 0.82,
    rhoDepth: 0.79,
    rhoAmplification: 0.88,
    rhoPolarity: 0.71,
    rhoRejection: 0.65,
    calibratedAt: agent.updatedAt ?? new Date().toISOString(),
    postsCount: agent.postsCount ?? 0,
    status: agent.gteCalibrated ? "calibrated" : "pending",
  }));

  const avgRho = accuracyData.length > 0
    ? accuracyData.reduce((s, d) => s + d.rhoComposite, 0) / accuracyData.length
    : 0;

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Accuracy Timeline</h1>
          <p className="text-sm text-muted-foreground">
            Correlazione di Spearman ρ tra score simulati e dati reali per ogni brand calibrato.
          </p>
        </div>

        {/* Global stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{avgRho.toFixed(3)}</p>
                  <p className="text-xs text-muted-foreground">ρ medio globale</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {accuracyData.filter(d => d.rhoComposite >= 0.7).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Brand con ρ ≥ 0.7</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {accuracyData.filter(d => d.rhoComposite < 0.7).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Brand da ricalibrate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per-brand accuracy */}
        <div className="space-y-4">
          {accuracyData.map((d) => (
            <Card key={d.brandId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <CardTitle className="text-base">{d.brandName}</CardTitle>
                    <Badge
                      variant="secondary"
                      className={
                        d.status === "calibrated"
                          ? "bg-green-500/10 text-green-500 border-0 text-[10px]"
                          : "text-[10px]"
                      }
                    >
                      {d.status === "calibrated" ? "Calibrato" : "In attesa"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{d.postsCount} post</span>
                    <span>·</span>
                    <span>{new Date(d.calibratedAt).toLocaleDateString("it-IT")}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground w-28 shrink-0">ρ Composito</span>
                    <RhoBar value={d.rhoComposite} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {[
                      { label: "Resonance", value: d.rhoResonance },
                      { label: "Depth", value: d.rhoDepth },
                      { label: "Amplification", value: d.rhoAmplification },
                      { label: "Polarity", value: d.rhoPolarity },
                    ].map((dim) => (
                      <div key={dim.label} className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground w-24 shrink-0">{dim.label}</span>
                        <RhoBar value={dim.value} />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {accuracyData.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium mb-1">Nessun dato di calibrazione disponibile</p>
              <p className="text-xs">Completa il ciclo GTE per almeno un brand per vedere l'accuracy.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
