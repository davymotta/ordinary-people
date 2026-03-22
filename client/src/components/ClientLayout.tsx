import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/app",
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    label: "Nuovo Test",
    href: "/app/simulate/new",
    icon: <Sparkles className="w-4 h-4" />,
    badge: "NEW",
  },
  {
    label: "Le mie Simulazioni",
    href: "/app/simulations",
    icon: <FlaskConical className="w-4 h-4" />,
  },
  {
    label: "Report",
    href: "/app/reports",
    icon: <FileText className="w-4 h-4" />,
  },
  {
    label: "Il mio Panel",
    href: "/app/panel",
    icon: <Users className="w-4 h-4" />,
  },
];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-border bg-sidebar shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-border">
          <Link href="/app">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-bold font-display">OP</span>
              </div>
              <div>
                <p className="font-display font-semibold text-sm text-foreground leading-tight">Ordinary People</p>
                <p className="text-xs text-muted-foreground">Market Simulation</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/app" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer group",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <span className={cn(isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground")}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-semibold bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-border space-y-0.5">
          <Link href="/app/settings">
            <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer">
              <Settings className="w-4 h-4" />
              <span>Impostazioni</span>
            </div>
          </Link>
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
