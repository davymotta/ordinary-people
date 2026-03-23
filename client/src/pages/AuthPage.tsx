import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft,
  Sparkles,
  Shield,
  CheckCircle2,
  Users,
  BarChart2,
  Zap,
} from "lucide-react";

// Google SVG icon
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// LinkedIn SVG icon
function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect width="18" height="18" rx="3" fill="#0A66C2"/>
      <path d="M4.5 7.5h2v6h-2v-6zm1-3a1 1 0 110 2 1 1 0 010-2zm3 3h1.9v.82h.03c.27-.5.92-1.02 1.89-1.02 2.02 0 2.39 1.33 2.39 3.06V13.5h-2v-2.7c0-.65-.01-1.48-.9-1.48-.9 0-1.04.7-1.04 1.43V13.5h-2v-6z" fill="white"/>
    </svg>
  );
}

const BENEFITS = [
  { icon: <Users className="w-4 h-4" />, text: "Panel di 10.000+ agenti calibrati" },
  { icon: <BarChart2 className="w-4 h-4" />, text: "Report dettagliato in ~3 minuti" },
  { icon: <Zap className="w-4 h-4" />, text: "Nessuna configurazione tecnica" },
  { icon: <Shield className="w-4 h-4" />, text: "Dati protetti e cifrati" },
];

export default function AuthPage() {
  const [location] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  // Parse query params
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "signin";
  const plan = params.get("plan");

  // Redirect se già autenticato
  useEffect(() => {
    if (!loading && isAuthenticated) {
      window.location.href = "/app";
    }
  }, [isAuthenticated, loading]);

  const loginUrl = getLoginUrl();

  // Aggiungi il piano al redirect se presente
  const loginUrlWithPlan = plan
    ? loginUrl + `&plan=${plan}`
    : loginUrl;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-muted/30 border-r border-border/30 p-12">
        <div>
          <Link href="/">
            <div className="flex items-center gap-2.5 mb-16 group cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">OP</span>
              </div>
              <span className="font-display font-semibold text-foreground">Ordinary People</span>
            </div>
          </Link>

          <div className="mb-8">
            <Badge variant="secondary" className="mb-4 text-xs border border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="w-3 h-3 mr-1" />
              Market Simulation Engine
            </Badge>
            <h2 className="text-3xl font-display font-bold text-foreground leading-tight mb-4">
              Testa le campagne<br />prima di lanciarle.
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Agenti digitali con 50 anni di storia vissuta reagiscono alle tue creatività in tempo reale — calibrati sul tuo brand.
            </p>
          </div>

          <div className="space-y-3">
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  {b.icon}
                </div>
                {b.text}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          © 2025 Ordinary People. Tutti i diritti riservati.
        </p>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link href="/">
            <div className="flex items-center gap-2 mb-8 lg:hidden cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-[10px] font-bold">OP</span>
              </div>
              <span className="font-display font-semibold text-sm text-foreground">Ordinary People</span>
            </div>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              {mode === "register" ? "Crea il tuo account" : "Bentornato"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "register"
                ? plan
                  ? `Stai attivando il piano ${plan.charAt(0).toUpperCase() + plan.slice(1)}. 14 giorni gratuiti.`
                  : "14 giorni di prova gratuita. Nessuna carta richiesta."
                : "Accedi al tuo workspace di simulazione."}
            </p>
          </div>

          {plan && (
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-foreground font-medium">
                    Piano {plan.charAt(0).toUpperCase() + plan.slice(1)} selezionato
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  Attivazione automatica dopo la registrazione.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {/* Google OAuth */}
            <a href={loginUrlWithPlan} className="block">
              <Button
                variant="outline"
                className="w-full h-11 gap-3 border-border/60 hover:border-border hover:bg-muted/50 transition-all"
              >
                <GoogleIcon />
                <span className="text-sm font-medium">
                  {mode === "register" ? "Registrati con Google" : "Accedi con Google"}
                </span>
              </Button>
            </a>

            {/* LinkedIn OAuth */}
            <a href={loginUrlWithPlan} className="block">
              <Button
                variant="outline"
                className="w-full h-11 gap-3 border-border/60 hover:border-border hover:bg-muted/50 transition-all"
              >
                <LinkedInIcon />
                <span className="text-sm font-medium">
                  {mode === "register" ? "Registrati con LinkedIn" : "Accedi con LinkedIn"}
                </span>
              </Button>
            </a>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/30" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground">oppure</span>
            </div>
          </div>

          {/* Email OAuth (via portale Manus) */}
          <a href={loginUrlWithPlan} className="block">
            <Button className="w-full h-11 gap-2 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              {mode === "register" ? "Continua con email" : "Accedi con email"}
            </Button>
          </a>

          <p className="text-xs text-muted-foreground text-center mt-6">
            {mode === "register" ? (
              <>
                Hai già un account?{" "}
                <Link href="/auth">
                  <span className="text-primary hover:underline cursor-pointer">Accedi</span>
                </Link>
              </>
            ) : (
              <>
                Non hai un account?{" "}
                <Link href="/auth?mode=register">
                  <span className="text-primary hover:underline cursor-pointer">Registrati gratis</span>
                </Link>
              </>
            )}
          </p>

          <p className="text-[11px] text-muted-foreground/60 text-center mt-4 leading-relaxed">
            Continuando accetti i{" "}
            <a href="#" className="hover:text-muted-foreground">Termini di servizio</a>
            {" "}e la{" "}
            <a href="#" className="hover:text-muted-foreground">Privacy Policy</a>.
          </p>
        </div>

        <Link href="/">
          <div className="mt-8 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" />
            Torna alla homepage
          </div>
        </Link>
      </div>
    </div>
  );
}
