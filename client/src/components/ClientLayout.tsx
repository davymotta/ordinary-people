import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Upload,
  FlaskConical,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
  Building2,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  description?: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/app",
    icon: <LayoutDashboard className="w-4 h-4" />,
    description: "Panoramica attività",
  },
  {
    label: "Le mie Simulazioni",
    href: "/app/simulations",
    icon: <FlaskConical className="w-4 h-4" />,
    description: "Storico test eseguiti",
  },
  {
    label: "Brand Agent",
    href: "/app/onboarding",
    icon: <Building2 className="w-4 h-4" />,
    description: "Configura il tuo brand",
  },
  {
    label: "Carica Campagna",
    href: "/app/ingest",
    icon: <Upload className="w-4 h-4" />,
    description: "Importa dati storici",
  },
];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: me } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  const username = (me as any)?.username ?? "Utente";
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-border bg-sidebar shrink-0">

        {/* Logo */}
        <div className="px-5 py-4 border-b border-border">
          <Link href="/app">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-xs font-bold font-display">OP</span>
              </div>
              <div>
                <p className="font-display font-semibold text-sm text-foreground leading-tight">Ordinary People</p>
                <p className="text-[10px] text-muted-foreground">Market Simulation Engine</p>
              </div>
            </div>
          </Link>
        </div>

        {/* CTA primario */}
        <div className="px-4 pt-4 pb-2">
          <Link href="/app/simulate/new">
            <Button className="w-full gap-2 text-sm" size="sm">
              <Sparkles className="w-3.5 h-3.5" />
              Nuovo Test
            </Button>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/app" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer group",
                    isActive
                      ? "bg-primary/15 text-primary font-medium border border-primary/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="leading-tight">{item.label}</p>
                    {item.description && !isActive && (
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                  {item.badge && !isActive && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-0 shrink-0"
                    >
                      {item.badge}
                    </Badge>
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 opacity-60 shrink-0" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Secondary nav */}
        <div className="px-3 py-2 border-t border-border space-y-0.5">
          <Link href="/app/settings">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer">
              <Settings className="w-4 h-4 shrink-0" />
              <span>Impostazioni</span>
            </div>
          </Link>
          <a
            href="mailto:support@ordinarypeople.ai"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Supporto</span>
          </a>
        </div>

        {/* User footer */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{username}</p>
              <p className="text-[10px] text-muted-foreground">Client</p>
            </div>
            <button
              onClick={() => logoutMutation.mutate()}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
              title="Esci"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
