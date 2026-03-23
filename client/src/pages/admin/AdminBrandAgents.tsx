import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Target,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

export default function AdminBrandAgents() {
  const { data: brandAgents } = trpc.onboarding.listBrandAgents.useQuery();
  const agents = (brandAgents as any[]) ?? [];

  const getGteStatus = (agent: any) => {
    if (agent.gteCalibrated) return { label: "Calibrato", color: "bg-green-500/10 text-green-500", icon: <CheckCircle2 className="w-3 h-3" /> };
    if (agent.gteNormalized) return { label: "Normalizzato", color: "bg-yellow-500/10 text-yellow-500", icon: <Clock className="w-3 h-3" /> };
    if (agent.gteHarvested) return { label: "Harvested", color: "bg-blue-500/10 text-blue-500", icon: <Target className="w-3 h-3" /> };
    return { label: "Non avviato", color: "bg-muted text-muted-foreground", icon: <AlertCircle className="w-3 h-3" /> };
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Brand Agent</h1>
          <p className="text-sm text-muted-foreground">
            Tutti i brand agent configurati dai clienti con stato GTE e calibrazione.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Brand totali", value: agents.length, color: "text-primary" },
            { label: "Calibrati", value: agents.filter((a: any) => a.gteCalibrated).length, color: "text-green-500" },
            { label: "In lavorazione", value: agents.filter((a: any) => a.gteHarvested && !a.gteCalibrated).length, color: "text-yellow-500" },
            { label: "Non avviati", value: agents.filter((a: any) => !a.gteHarvested).length, color: "text-muted-foreground" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Brand list */}
        <div className="space-y-3">
          {agents.map((agent: any) => {
            const gteStatus = getGteStatus(agent);
            return (
              <Card key={agent.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-foreground text-sm">{agent.brandName}</p>
                        {agent.sector && (
                          <Badge variant="secondary" className="text-[10px]">{agent.sector}</Badge>
                        )}
                        {agent.positioning && (
                          <Badge variant="outline" className="text-[10px] capitalize">{agent.positioning}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {agent.brandIdentity?.description ?? "Nessuna descrizione"}
                      </p>
                    </div>

                    {/* GTE status */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge className={`${gteStatus.color} border-0 text-[10px] gap-1 flex items-center`}>
                        {gteStatus.icon}
                        GTE: {gteStatus.label}
                      </Badge>
                    </div>

                    {/* Pool size */}
                    {agent.agentPoolSize && (
                      <div className="text-center shrink-0">
                        <p className="text-sm font-bold text-foreground">{agent.agentPoolSize}</p>
                        <p className="text-[10px] text-muted-foreground">Agenti pool</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/lab/gte?brandAgentId=${agent.id}`}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                          <Target className="w-3 h-3" />
                          GTE
                        </Button>
                      </Link>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {agents.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium mb-1">Nessun Brand Agent configurato</p>
              <p className="text-xs">I clienti possono creare brand agent dall'onboarding.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
