import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Layers,
  BarChart2,
  Clock,
  FlaskConical,
  Database,
  Settings,
  LogOut,
  ChevronRight,
  Microscope,
  Target,
  Route,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  group?: string;
}

const navItems: NavItem[] = [
  { label: "Archetype Matrix", href: "/lab/archetypes", icon: <Layers className="w-4 h-4" />, group: "engines" },
  { label: "Calibrated Sampler", href: "/lab/sampler", icon: <BarChart2 className="w-4 h-4" />, group: "engines" },
  { label: "Life History", href: "/lab/life-history", icon: <Clock className="w-4 h-4" />, group: "engines" },
  { label: "Campaign Testing", href: "/lab/campaign-testing", icon: <FlaskConical className="w-4 h-4" />, group: "engines" },
  { label: "Ground Truth Engine", href: "/lab/gte", icon: <Target className="w-4 h-4" />, group: "calibration" },
  { label: "Simulazioni Strategiche", href: "/lab/strategic", icon: <Route className="w-4 h-4" />, group: "calibration" },
  { label: "Dataset", href: "/lab/datasets", icon: <Database className="w-4 h-4" />, group: "data" },
  { label: "Configurazione", href: "/lab/settings", icon: <Settings className="w-4 h-4" />, group: "system" },
];

const groups: Record<string, string> = {
  engines: "Motori",
  calibration: "Calibrazione",
  data: "Dati",
  system: "Sistema",
};

export function LabLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  const groupedItems = navItems.reduce((acc, item) => {
    const g = item.group ?? "other";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <div className="lab-theme flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-border bg-sidebar shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Microscope className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground leading-tight">Laboratorio</p>
              <p className="text-xs text-muted-foreground">Motori & Dataset</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {Object.entries(groupedItems).map(([groupKey, items]) => (
            <div key={groupKey} className="mb-4">
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {groups[groupKey] ?? groupKey}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive = location === item.href || (item.href !== "/lab" && location.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer group",
                          isActive
                            ? "bg-primary/20 text-primary font-medium border border-primary/20"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <span className={cn(isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-accent-foreground")}>
                          {item.icon}
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={() => logoutMutation.mutate()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Esci</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
