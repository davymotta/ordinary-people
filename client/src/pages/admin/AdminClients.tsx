import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Search,
  ChevronRight,
  FlaskConical,
  Zap,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";

export default function AdminClients() {
  const [search, setSearch] = useState("");
  const { data: usersData } = trpc.auth.me.useQuery();
  const { data: simulations } = trpc.simulations.list.useQuery();
  const { data: brandAgentsData } = trpc.onboarding.listBrandAgents.useQuery(undefined, { retry: false });

  // Raggruppa simulazioni per utente
  const simsByUser = (simulations ?? []).reduce((acc: Record<string, any[]>, sim: any) => {
    const uid = sim.userId ?? "unknown";
    if (!acc[uid]) acc[uid] = [];
    acc[uid].push(sim);
    return acc;
  }, {});

  // Mock client list (in produzione verrebbe da una query users admin)
  const clients = [
    {
      id: "current",
      name: (usersData as any)?.username ?? "Cliente Demo",
      email: (usersData as any)?.email ?? "demo@example.com",
      role: (usersData as any)?.role ?? "user",
      simCount: simulations?.length ?? 0,
      brandCount: (brandAgentsData as any)?.length ?? 0,
      lastActive: "Oggi",
      status: "active",
    },
  ];

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Clienti</h1>
          <p className="text-sm text-muted-foreground">
            Panoramica di tutti i clienti attivi, le loro simulazioni e i brand agent configurati.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Clienti attivi", value: clients.length, icon: <Building2 className="w-4 h-4" />, color: "text-primary" },
            { label: "Simulazioni totali", value: simulations?.length ?? 0, icon: <FlaskConical className="w-4 h-4" />, color: "text-chart-2" },
            { label: "Brand Agent", value: (brandAgentsData as any)?.length ?? 0, icon: <Zap className="w-4 h-4" />, color: "text-chart-3" },
            { label: "Attivi oggi", value: 1, icon: <TrendingUp className="w-4 h-4" />, color: "text-chart-4" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`${stat.color} opacity-80`}>{stat.icon}</div>
                <div>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cerca cliente per nome o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Client list */}
        <div className="space-y-3">
          {filtered.map((client) => (
            <Card key={client.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-foreground text-sm">{client.name}</p>
                      <Badge
                        variant="secondary"
                        className={client.role === "admin" ? "bg-primary/20 text-primary border-0 text-[10px]" : "text-[10px]"}
                      >
                        {client.role === "admin" ? "Operator" : "Client"}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-green-500/10 text-green-500 border-0 text-[10px]"
                      >
                        {client.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{client.email}</p>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-6 text-center">
                    <div>
                      <p className="text-lg font-bold text-foreground">{client.simCount}</p>
                      <p className="text-[10px] text-muted-foreground">Simulazioni</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">{client.brandCount}</p>
                      <p className="text-[10px] text-muted-foreground">Brand</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{client.lastActive}</p>
                      <p className="text-[10px] text-muted-foreground">Ultimo accesso</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/admin/simulations?userId=${client.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <FlaskConical className="w-3 h-3" />
                        Simulazioni
                      </Button>
                    </Link>
                    <Link href={`/admin/brand-agents?userId=${client.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Zap className="w-3 h-3" />
                        Brand
                      </Button>
                    </Link>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nessun cliente trovato</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
