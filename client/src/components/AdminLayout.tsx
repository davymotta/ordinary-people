import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Globe,
  Brain,
  Activity,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  group?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="w-4 h-4" />, group: "overview" },
  { label: "Agenti Vivi", href: "/admin/agents", icon: <Users className="w-4 h-4" />, group: "population" },
  { label: "World Engine", href: "/admin/world", icon: <Globe className="w-4 h-4" />, group: "population" },
  { label: "Life History", href: "/admin/life-history", icon: <Brain className="w-4 h-4" />, group: "population" },
  { label: "Simulazioni", href: "/admin/simulations", icon: <Activity className="w-4 h-4" />, group: "operations" },
  { label: "Impostazioni", href: "/admin/settings", icon: <Settings className="w-4 h-4" />, group: "system" },
];

const groups: Record<string, string> = {
  overview: "Panoramica",
  population: "Popolazione",
  operations: "Operazioni",
  system: "Sistema",
};

export function AdminLayout({ children }: { children: React.ReactNode }) {
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
    <div className="admin-theme flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-border bg-sidebar shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground leading-tight">Admin Console</p>
              <p className="text-xs text-muted-foreground">Ordinary People</p>
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
                  const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
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
          <div className="flex items-center gap-2 px-3 py-2 mb-1 rounded-md bg-sidebar-accent/30">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-muted-foreground">Sistema attivo</span>
          </div>
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
