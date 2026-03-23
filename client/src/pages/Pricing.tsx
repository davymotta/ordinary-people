import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, Zap, Building2, ArrowLeft, Loader2 } from "lucide-react";

const PLAN_FEATURES = {
  starter: [
    "1 Brand Agent",
    "50 simulazioni/mese",
    "Panel di 100 agenti",
    "GTE Harvest (YouTube)",
    "Report PDF",
    "Supporto email",
  ],
  professional: [
    "5 Brand Agent",
    "Simulazioni illimitate",
    "Panel fino a 500 agenti",
    "GTE Harvest (YouTube + TikTok + Instagram)",
    "Hook Analyser comportamentale",
    "Meta Ad Library + TikTok Creative Center",
    "Import CSV campagne (Meta/Google/TikTok)",
    "Calibrazione GTE con Spearman ρ",
    "API access",
    "Supporto prioritario",
  ],
};

export default function Pricing() {
  const [, navigate] = useLocation();

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const { data: plans } = trpc.payments.getPlans.useQuery();
  const { data: user } = trpc.auth.me.useQuery();
  const createCheckout = trpc.payments.createCheckout.useMutation();

  const handleSelectPlan = async (planId: "starter" | "professional") => {
    if (!user) {
      navigate(`/auth?plan=${planId}`);
      return;
    }
    setLoadingPlan(planId);
    try {
      const { url } = await createCheckout.mutateAsync({ planId });
      toast.success("Reindirizzamento al checkout…", { description: "Apertura pagina di pagamento Stripe" });
      window.open(url, "_blank");
    } catch (err: any) {
      toast.error("Errore", { description: err.message });
    } finally {
      setLoadingPlan(null);
    }
  };

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla home
          </button>
          <span className="text-sm font-semibold tracking-tight">Ordinary People</span>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
        <Badge variant="outline" className="mb-4 text-xs uppercase tracking-widest">
          Prezzi
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Scegli il piano giusto
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          14 giorni di prova gratuita su tutti i piani. Nessuna carta di credito richiesta per iniziare.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Starter */}
          <Card className="relative border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Starter</CardTitle>
                  <p className="text-sm text-muted-foreground">Per brand emergenti e agenzie</p>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">
                  {plans ? formatPrice(plans.find((p: any) => p.id === "starter")?.priceMonthly ?? 29900) : "€299"}
                </span>
                <span className="text-muted-foreground">/mese</span>
              </div>
              <p className="text-xs text-muted-foreground">+ IVA. Fatturazione mensile.</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-8">
                {PLAN_FEATURES.starter.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleSelectPlan("starter")}
                disabled={loadingPlan === "starter"}
              >
                {loadingPlan === "starter" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Caricamento…</>
                ) : (
                  "Inizia la prova gratuita"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Professional */}
          <Card className="relative border-primary/50 shadow-lg shadow-primary/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground text-xs uppercase tracking-widest px-4">
                Più popolare
              </Badge>
            </div>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Professional</CardTitle>
                  <p className="text-sm text-muted-foreground">Per brand consolidati e grandi agenzie</p>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">
                  {plans ? formatPrice(plans.find((p: any) => p.id === "professional")?.priceMonthly ?? 79900) : "€799"}
                </span>
                <span className="text-muted-foreground">/mese</span>
              </div>
              <p className="text-xs text-muted-foreground">+ IVA. Fatturazione mensile.</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-8">
                {PLAN_FEATURES.professional.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                onClick={() => handleSelectPlan("professional")}
                disabled={loadingPlan === "professional"}
              >
                {loadingPlan === "professional" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Caricamento…</>
                ) : (
                  "Inizia la prova gratuita"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Enterprise CTA */}
        <div className="mt-12 text-center p-8 rounded-2xl border border-border/40 bg-muted/20">
          <h3 className="text-xl font-semibold mb-2">Hai esigenze enterprise?</h3>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Panel personalizzati, integrazione con i tuoi sistemi CRM/CDP, SLA dedicato, e formazione del team.
            Contattaci per un preventivo su misura.
          </p>
          <Button variant="outline" size="lg" onClick={() => window.open("mailto:hello@ordinarypeople.ai", "_blank")}>
            Parla con il team
          </Button>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h3 className="text-2xl font-semibold text-center mb-8">Domande frequenti</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                q: "Come funziona la prova gratuita?",
                a: "14 giorni completi senza limitazioni. Nessuna carta di credito richiesta. Al termine del periodo puoi scegliere se abbonarti o no.",
              },
              {
                q: "Posso cambiare piano in qualsiasi momento?",
                a: "Sì. Puoi fare upgrade o downgrade in qualsiasi momento dal pannello di gestione abbonamento. Il cambio è immediato.",
              },
              {
                q: "I dati delle simulazioni sono privati?",
                a: "Sì. I dati del tuo brand, le configurazioni degli agenti e i risultati delle simulazioni sono visibili solo a te e al tuo team.",
              },
              {
                q: "Posso usare i dati per il mio training interno?",
                a: "I dati delle simulazioni sono tuoi. Puoi esportarli in CSV e usarli come preferisci per analisi interne.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="space-y-2">
                <h4 className="font-medium text-sm">{q}</h4>
                <p className="text-sm text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
