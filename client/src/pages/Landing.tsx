import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Users,
  Brain,
  BarChart2,
  Zap,
  CheckCircle2,
  Star,
  ChevronRight,
  Play,
  Shield,
  Clock,
  TrendingUp,
  Target,
  Sparkles,
  Building2,
  Globe,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";

// ── Dati ────────────────────────────────────────────────────────────────────

const STATS = [
  { value: "50+", label: "anni di storia per agente" },
  { value: "10K+", label: "agenti nel panel" },
  { value: "~3 min", label: "per simulazione completa" },
  { value: "94%", label: "tasso di risposta medio" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: <Building2 className="w-6 h-6" />,
    title: "Configura il tuo Brand Agent",
    desc: "Carica il profilo del brand, lo storico campagne e i dati social. Il sistema costruisce un'impronta comportamentale precisa del tuo pubblico.",
    color: "text-chart-1",
    bg: "bg-chart-1/10 border-chart-1/20",
  },
  {
    step: "02",
    icon: <Users className="w-6 h-6" />,
    title: "Seleziona il panel demografico",
    desc: "Scegli il segmento target per età, valori, stile di vita e area geografica. Ogni agente ha 50 anni di storia vissuta e memoria episodica.",
    color: "text-chart-2",
    bg: "bg-chart-2/10 border-chart-2/20",
  },
  {
    step: "03",
    icon: <Sparkles className="w-6 h-6" />,
    title: "Lancia la simulazione",
    desc: "Carica immagine, video, copy o PDF. In 3 minuti ottieni reazioni autentiche: Resonance, Depth, Amplification, Polarity, Rejection.",
    color: "text-chart-3",
    bg: "bg-chart-3/10 border-chart-3/20",
  },
  {
    step: "04",
    icon: <BarChart2 className="w-6 h-6" />,
    title: "Leggi il report e itera",
    desc: "Score per dimensione, citazioni verbatim degli agenti, confronto varianti e suggerimenti di ottimizzazione. Tutto in un report scaricabile.",
    color: "text-chart-4",
    bg: "bg-chart-4/10 border-chart-4/20",
  },
];

const USE_CASES = [
  {
    icon: <Target className="w-5 h-5" />,
    title: "Campagne ADV",
    desc: "Testa headline, visual e copy prima del lancio. Riduci il rischio di flop su Meta e Google.",
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Copy & Claim",
    desc: "Confronta varianti di testo su un panel calibrato sul tuo brand. Scegli il claim che risuona di più.",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    title: "Naming & Packaging",
    desc: "Valuta nomi, loghi e packaging su segmenti demografici specifici prima della produzione.",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Lancio prodotto",
    desc: "Simula la risposta del mercato a un nuovo prodotto con agenti calibrati sui tuoi clienti reali.",
  },
  {
    icon: <Brain className="w-5 h-5" />,
    title: "Ricerca qualitativa",
    desc: "Sostituisci o integra focus group con simulazioni scalabili, ripetibili e tracciabili.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "A/B Test predittivo",
    desc: "Prevedi il vincitore di un A/B test prima di spendere budget pubblicitario reale.",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "€490",
    period: "/mese",
    desc: "Per team marketing che vogliono testare campagne in autonomia.",
    features: [
      "5 simulazioni/mese",
      "Panel standard (1.000 agenti)",
      "Report PDF scaricabile",
      "1 Brand Agent",
      "Supporto email",
    ],
    cta: "Inizia gratis 14 giorni",
    highlight: false,
    priceId: "starter",
  },
  {
    name: "Professional",
    price: "€1.490",
    period: "/mese",
    desc: "Per agenzie e brand con esigenze di testing continuativo.",
    features: [
      "25 simulazioni/mese",
      "Panel calibrato (10.000 agenti)",
      "Hook Analyser incluso",
      "3 Brand Agent",
      "GTE Calibration",
      "Supporto prioritario",
    ],
    cta: "Inizia gratis 14 giorni",
    highlight: true,
    badge: "Più popolare",
    priceId: "professional",
  },
  {
    name: "Enterprise",
    price: "Su misura",
    period: "",
    desc: "Per grandi organizzazioni con panel dedicati e integrazioni custom.",
    features: [
      "Simulazioni illimitate",
      "Panel dedicato calibrato sul brand",
      "API access",
      "Brand Agent illimitati",
      "SLA garantito",
      "Account manager dedicato",
    ],
    cta: "Contattaci",
    highlight: false,
    priceId: "enterprise",
  },
];

const TESTIMONIALS = [
  {
    quote: "Abbiamo ridotto del 60% il tempo di validazione delle campagne. Il report è più ricco di qualsiasi focus group che abbiamo fatto.",
    author: "Direttore Marketing",
    company: "Brand fashion italiano",
    initials: "DM",
  },
  {
    quote: "La calibrazione GTE sul nostro storico dati ha reso le simulazioni sorprendentemente accurate. È diventato parte del nostro processo creativo.",
    author: "Head of Strategy",
    company: "Agenzia creativa",
    initials: "HS",
  },
  {
    quote: "Finalmente uno strumento che parla la lingua del marketing, non quella dei data scientist. Intuitivo e potente.",
    author: "Brand Manager",
    company: "FMCG multinazionale",
    initials: "BM",
  },
];

// ── Componenti ───────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">OP</span>
          </div>
          <span className="font-display font-semibold text-foreground">Ordinary People</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#how" className="hover:text-foreground transition-colors">Come funziona</a>
          <a href="#use-cases" className="hover:text-foreground transition-colors">Casi d'uso</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Prezzi</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth">
            <Button variant="ghost" size="sm" className="text-sm">Accedi</Button>
          </Link>
          <Link href="/auth?mode=register">
            <Button size="sm" className="gap-2 text-sm">
              Inizia gratis
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-32 pb-24 px-6 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-chart-2/6 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative">
        <Badge variant="secondary" className="mb-6 gap-2 px-4 py-1.5 text-xs border border-primary/20 bg-primary/10 text-primary">
          <Zap className="w-3 h-3" />
          Powered by Synthetic Population Engine
        </Badge>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-foreground leading-[1.05] tracking-tight mb-6">
          Testa le tue campagne<br />
          <span className="text-primary">prima di lanciarle.</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Ordinary People simula la reazione del tuo pubblico a campagne, copy e creatività usando agenti digitali con 50 anni di storia vissuta — calibrati sul tuo brand.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/auth?mode=register">
            <Button size="lg" className="gap-2 px-8 h-12 text-base font-semibold">
              <Sparkles className="w-4 h-4" />
              Inizia gratis — 14 giorni
            </Button>
          </Link>
          <a href="#how">
            <Button variant="outline" size="lg" className="gap-2 px-8 h-12 text-base border-border/60">
              <Play className="w-4 h-4" />
              Come funziona
            </Button>
          </a>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {STATS.map((s) => (
            <div key={s.label} className="p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="text-2xl font-bold text-primary mb-1">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how" className="py-24 px-6 border-t border-border/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-xs border border-border/50">Come funziona</Badge>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Dal brief al report in 4 passi
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Nessuna configurazione complessa. Carica il materiale, scegli il target e ottieni insights in minuti.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="relative">
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-border/50 to-transparent z-10" />
              )}
              <Card className={`border ${step.bg} h-full`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl border ${step.bg} flex items-center justify-center ${step.color}`}>
                      {step.icon}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground font-semibold">{step.step}</span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 leading-tight">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCasesSection() {
  return (
    <section id="use-cases" className="py-24 px-6 border-t border-border/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-xs border border-border/50">Casi d'uso</Badge>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Cosa puoi testare
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Dalla campagna ADV al naming, ogni decisione creativa può essere validata prima di investire.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {USE_CASES.map((uc, i) => (
            <Card key={i} className="border-border/50 hover:border-primary/30 transition-all group cursor-default">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    {uc.icon}
                  </div>
                  <h3 className="font-semibold text-foreground">{uc.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{uc.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24 px-6 border-t border-border/30 bg-muted/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-xs border border-border/50">Testimonial</Badge>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Chi lo usa già
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <Card key={i} className="border-border/50 bg-card/50">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{t.initials}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t.author}</p>
                    <p className="text-[10px] text-muted-foreground">{t.company}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-6 border-t border-border/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-xs border border-border/50">Prezzi</Badge>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Scegli il piano giusto
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            14 giorni di prova gratuita su tutti i piani. Nessuna carta di credito richiesta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING.map((plan, i) => (
            <Card
              key={i}
              className={`relative border ${
                plan.highlight
                  ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border/50"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              <CardContent className="p-8">
                <div className="mb-6">
                  <h3 className="font-display font-bold text-lg text-foreground mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.priceId === "enterprise" ? "/contact" : `/auth?mode=register&plan=${plan.priceId}`}>
                  <Button
                    className="w-full gap-2"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-center gap-6 mt-10 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Dati protetti e cifrati
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Cancella in qualsiasi momento
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Nessuna carta richiesta per la prova
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="py-24 px-6 border-t border-border/30">
      <div className="max-w-3xl mx-auto text-center">
        <div className="relative p-12 rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-primary/10 rounded-full blur-[60px]" />
          </div>
          <div className="relative">
            <Badge variant="secondary" className="mb-6 text-xs border border-primary/20 bg-primary/10 text-primary">
              Inizia oggi
            </Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Smetti di indovinare.<br />Inizia a simulare.
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Unisciti ai team marketing che usano Ordinary People per validare le campagne prima del lancio. 14 giorni gratuiti, nessuna carta richiesta.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth?mode=register">
                <Button size="lg" className="gap-2 px-8 h-12 text-base font-semibold">
                  <Sparkles className="w-4 h-4" />
                  Inizia gratis
                </Button>
              </Link>
              <a href="mailto:hello@ordinarypeople.ai">
                <Button variant="outline" size="lg" className="gap-2 px-8 h-12 text-base border-border/60">
                  Parla con noi
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/30 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-[10px] font-bold">OP</span>
            </div>
            <span className="font-display font-semibold text-sm text-foreground">Ordinary People</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Termini di servizio</a>
            <a href="mailto:hello@ordinarypeople.ai" className="hover:text-foreground transition-colors">Contatti</a>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 Ordinary People. Tutti i diritti riservati.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <HeroSection />
      <HowItWorksSection />
      <UseCasesSection />
      <TestimonialsSection />
      <PricingSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
