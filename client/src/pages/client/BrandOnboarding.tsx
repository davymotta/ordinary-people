/**
 * Brand Agent Onboarding
 *
 * Chat conversazionale a 3 momenti:
 *   Momento 1 — Identità: il brand manager inserisce nome brand, sito, social
 *   Momento 2 — Ricerca live: il sistema analizza il brand in tempo reale
 *   Momento 3 — Validazione: Brand Profile editabile + Pool Preview + salvataggio
 *
 * Dopo il salvataggio, il Brand Agent è disponibile per pre-configurare
 * le simulazioni nel TargetingPanel.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Building2, Globe, Instagram, Twitter, Search, CheckCircle2,
  ChevronRight, Edit3, Users, BarChart3, Loader2, ArrowRight,
  Sparkles, AlertCircle, Save
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

type Step = "identity" | "researching" | "profile" | "saved";

interface ChatMessage {
  role: "ai" | "user";
  text: string;
  timestamp: Date;
}

interface BrandFormData {
  brandName: string;
  websiteUrl: string;
  instagram: string;
  twitter: string;
}

// ─── Sub-components ───────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isAI = msg.role === "ai";
  return (
    <div className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"} mb-4`}>
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isAI
            ? "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
            : "bg-indigo-600 text-white rounded-tr-sm"
        }`}
        dangerouslySetInnerHTML={{
          __html: msg.text
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n/g, "<br/>"),
        }}
      />
    </div>
  );
}

function ProgressStep({
  label,
  icon: Icon,
  active,
  done,
}: {
  label: string;
  icon: any;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 text-xs font-medium ${
      done ? "text-emerald-600" : active ? "text-indigo-600" : "text-slate-400"
    }`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
        done ? "bg-emerald-100" : active ? "bg-indigo-100" : "bg-slate-100"
      }`}>
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
      </div>
      {label}
    </div>
  );
}

// ─── Brand Profile Card ───────────────────────────────────────────────

function BrandProfileCard({
  profile,
  onUpdate,
}: {
  profile: any;
  onUpdate: (updated: any) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [localProfile, setLocalProfile] = useState(profile);

  const identity = localProfile?.brandIdentity ?? {};
  const target = localProfile?.targetAudience?.primary ?? {};
  const pool = localProfile?.defaultAgentPool ?? {};
  const competitors = localProfile?.competitors ?? [];

  const positioningColors: Record<string, string> = {
    luxury: "bg-purple-100 text-purple-700",
    premium: "bg-blue-100 text-blue-700",
    "mid-market": "bg-teal-100 text-teal-700",
    "mass-market": "bg-orange-100 text-orange-700",
    value: "bg-slate-100 text-slate-700",
  };

  const positioningColor = positioningColors[identity.positioning ?? "mid-market"] ?? "bg-slate-100 text-slate-700";

  function handleFieldEdit(field: string, value: string) {
    const updated = {
      ...localProfile,
      brandIdentity: { ...identity, [field]: value },
    };
    setLocalProfile(updated);
    onUpdate(updated);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold">{identity.name ?? "Brand"}</h3>
            <p className="text-indigo-200 text-sm mt-0.5">{identity.sector ?? "—"}</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${positioningColor}`}>
            {identity.positioning ?? "—"}
          </span>
        </div>
        <p className="text-indigo-100 text-sm mt-3 italic">"{identity.aesthetic ?? "—"}"</p>
      </div>

      <div className="p-6 space-y-5">
        {/* Tone of voice */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tone of Voice</p>
          <div className="flex flex-wrap gap-2">
            {(identity.toneOfVoice ?? []).map((t: string) => (
              <span key={t} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Brand values */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Valori</p>
          <div className="flex flex-wrap gap-2">
            {(identity.brandValues ?? []).map((v: string) => (
              <span key={v} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                {v}
              </span>
            ))}
          </div>
        </div>

        {/* Target audience */}
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Target Primario
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Genere</p>
              <p className="font-medium text-slate-800 capitalize">{target.gender ?? "—"}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Età</p>
              <p className="font-medium text-slate-800">
                {target.ageRange ? `${target.ageRange[0]}–${target.ageRange[1]} anni` : "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Generazioni</p>
              <p className="font-medium text-slate-800 capitalize">
                {(target.generation ?? []).join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Archetipo dominante</p>
              <p className="font-medium text-slate-800 capitalize">
                {(target.pearsonArchetypesDominant ?? []).slice(0, 2).join(", ") || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Agent pool */}
        <div className="bg-indigo-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Pool Agenti Pre-selezionato
          </p>
          <p className="text-2xl font-bold text-indigo-700">{pool.totalAgents ?? 100}</p>
          <p className="text-xs text-indigo-500 mt-0.5">agenti pronti per la simulazione</p>
          {pool.composition?.byGeneration && (
            <div className="mt-3 space-y-1.5">
              {Object.entries(pool.composition.byGeneration as Record<string, number>)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 4)
                .map(([gen, pct]) => (
                  <div key={gen} className="flex items-center gap-2">
                    <div className="flex-1 bg-indigo-200 rounded-full h-1.5">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full"
                        style={{ width: `${Math.round((pct as number) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-indigo-600 w-20 capitalize">{gen}</span>
                    <span className="text-xs text-indigo-500 w-8 text-right">
                      {Math.round((pct as number) * 100)}%
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Competitors */}
        {competitors.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Competitor</p>
            <div className="flex flex-wrap gap-2">
              {competitors.slice(0, 5).map((c: any) => (
                <span key={c.name} className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full">
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

export default function BrandOnboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("identity");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: "Ciao! Sono il tuo Brand Intelligence Agent.\n\nIn pochi minuti analizzerò il tuo brand, capirò il tuo target e pre-selezionerò il panel di agenti più adatto per testare le tue campagne.\n\n**Come si chiama il tuo brand?**",
      timestamp: new Date(),
    },
  ]);
  const [form, setForm] = useState<BrandFormData>({
    brandName: "",
    websiteUrl: "",
    instagram: "",
    twitter: "",
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rawData, setRawData] = useState<any>(null);
  const [brandProfile, setBrandProfile] = useState<any>(null);
  const [progressStep, setProgressStep] = useState("");
   const [savedAgentId, setSavedAgentId] = useState<number | null>(null);
  const [calibrationId, setCalibrationId] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const researchMutation = trpc.onboarding.researchBrand.useMutation();
  const buildProfileMutation = trpc.onboarding.buildProfile.useMutation();
  const matchPoolMutation = trpc.onboarding.matchPool.useMutation();
  const saveMutation = trpc.onboarding.saveBrandAgent.useMutation();
  const calibrationRunMutation = trpc.brandCalibration.run.useMutation({
    onSuccess: (data) => {
      setCalibrationId(data.calibrationId);
      toast.success("Calibrazione avviata — i risultati appariranno in pochi minuti");
    },
    onError: (err) => toast.error("Errore calibrazione: " + err.message),
  });
  const calibrationQuery = trpc.brandCalibration.get.useQuery(
    { calibrationId: calibrationId ?? 0 },
    {
      enabled: calibrationId !== null,
      refetchInterval: (data: any) =>
        data?.status === "complete" || data?.status === "failed" ? false : 3000,
    }
  );;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function addMessage(role: "ai" | "user", text: string) {
    setMessages(prev => [...prev, { role, text, timestamp: new Date() }]);
  }

  async function handleStartResearch() {
    if (!form.brandName.trim()) {
      toast.error("Inserisci il nome del brand");
      return;
    }

    addMessage("user", `**${form.brandName}**${form.websiteUrl ? `\nSito: ${form.websiteUrl}` : ""}${form.instagram ? `\nInstagram: ${form.instagram}` : ""}`);
    setStep("researching");
    addMessage("ai", `Perfetto! Sto analizzando **${form.brandName}**...\n\nEsamino il sito web, cerco la presenza social e identifico il posizionamento. Ci vorranno circa 30 secondi.`);

    try {
      // Step 1: Research
      setProgressStep("Analizzando homepage e social...");
      const raw = await researchMutation.mutateAsync({
        brandName: form.brandName,
        websiteUrl: form.websiteUrl || undefined,
        socialHandles: {
          instagram: form.instagram || undefined,
          twitter: form.twitter || undefined,
        },
      });
      setRawData(raw);

      // Step 2: Build profile
      setProgressStep("Costruendo il Brand Profile...");
      addMessage("ai", "Ho raccolto i dati. Sto costruendo il profilo strutturato del brand...");
      const { profile, presentation } = await buildProfileMutation.mutateAsync({ rawData: raw });
      setBrandProfile(profile);

      // Step 3: Match pool
      setProgressStep("Selezionando il panel di agenti...");
      const poolResult = await matchPoolMutation.mutateAsync({
        targetAudience: profile.targetAudience,
        defaultAgentPool: profile.defaultAgentPool,
        maxAgents: 100,
      });

      // Update pool in profile with real counts
      const updatedProfile = {
        ...profile,
        defaultAgentPool: {
          ...profile.defaultAgentPool,
          totalAgents: poolResult.totalFound > 0 ? poolResult.totalFound : profile.defaultAgentPool?.totalAgents ?? 100,
        },
      };
      setBrandProfile(updatedProfile);

      // Show presentation
      addMessage("ai", presentation + "\n\n" + poolResult.summary);
      addMessage("ai", "Controlla il profilo qui a destra. Puoi modificare qualsiasi parametro prima di salvare. Quando sei pronto, clicca **Salva Brand Agent**.");

      setStep("profile");
      setProgressStep("");
    } catch (err: any) {
      addMessage("ai", `Mi dispiace, ho incontrato un problema durante l'analisi: ${err.message}\n\nPuoi riprovare o continuare manualmente.`);
      setStep("identity");
      setProgressStep("");
    }
  }

  async function handleSave() {
    if (!brandProfile) return;

    try {
      const identity = brandProfile.brandIdentity ?? {};
      const saved = await saveMutation.mutateAsync({
        brandName: identity.name ?? form.brandName,
        sector: identity.sector,
        positioning: identity.positioning,
        brandIdentity: brandProfile.brandIdentity,
        marketPresence: brandProfile.marketPresence,
        digitalPresence: brandProfile.digitalPresence,
        targetAudience: brandProfile.targetAudience,
        competitors: brandProfile.competitors,
        defaultAgentPool: brandProfile.defaultAgentPool,
        researchRaw: rawData,
      });

      setSavedAgentId((saved as any)?.id ?? null);
      setStep("saved");
      addMessage("ai", `**Brand Agent salvato!** 🎉\n\nD'ora in poi, ogni volta che lanci una simulazione, il sistema pre-caricherà automaticamente il panel di ${brandProfile.defaultAgentPool?.totalAgents ?? 100} agenti selezionati per **${identity.name ?? form.brandName}**.\n\nPuoi procedere a testare la tua prima campagna.`);
      toast.success("Brand Agent salvato con successo");
    } catch (err: any) {
      toast.error(`Errore nel salvataggio: ${err.message}`);
    }
  }

  const isResearching = step === "researching";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Brand Agent Onboarding
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Configura il tuo Brand Agent in 3 passi
            </p>
          </div>
          {/* Progress steps */}
          <div className="hidden md:flex items-center gap-4">
            <ProgressStep
              label="Identità"
              icon={Building2}
              active={step === "identity"}
              done={step !== "identity"}
            />
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <ProgressStep
              label="Ricerca"
              icon={Search}
              active={step === "researching"}
              done={step === "profile" || step === "saved"}
            />
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <ProgressStep
              label="Validazione"
              icon={CheckCircle2}
              active={step === "profile"}
              done={step === "saved"}
            />
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Chat */}
        <div className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-1" style={{ minHeight: 400, maxHeight: 520 }}>
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}
            {isResearching && progressStep && (
              <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-500 italic">
                  {progressStep}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area — only in identity step */}
          {step === "identity" && (
            <div className="border-t border-slate-100 p-5 space-y-4">
              {/* Brand name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Nome Brand *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.brandName}
                    onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))}
                    placeholder="es. Bata Italia, Barilla, Valentino..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    onKeyDown={e => e.key === "Enter" && !showAdvanced && handleStartResearch()}
                  />
                </div>
              </div>

              {/* Advanced toggle */}
              <button
                onClick={() => setShowAdvanced(v => !v)}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-90" : ""}`} />
                {showAdvanced ? "Nascondi" : "Aggiungi"} sito web e social (opzionale)
              </button>

              {showAdvanced && (
                <div className="space-y-3">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.websiteUrl}
                      onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
                      placeholder="www.bataitalia.com"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={form.instagram}
                        onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))}
                        placeholder="@bataitalia"
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="relative">
                      <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={form.twitter}
                        onChange={e => setForm(f => ({ ...f, twitter: e.target.value }))}
                        placeholder="@bataitalia"
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleStartResearch}
                disabled={!form.brandName.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Search className="w-4 h-4" />
                Analizza Brand
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Save button — in profile step */}
          {step === "profile" && (
            <div className="border-t border-slate-100 p-5">
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salva Brand Agent
              </button>
            </div>
          )}

          {/* Navigate after save */}
          {step === "saved" && (
            <div className="border-t border-slate-100 p-5 space-y-3">
              {/* Calibration Report */}
              {calibrationId !== null && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Auto-Calibration Report
                  </p>
                  {calibrationQuery.data?.status === "complete" ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-indigo-700">
                            {((calibrationQuery.data?.calibrationResults as any)?.spearmanRho ?? 0).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-slate-500">Spearman ρ</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-600">
                            {(calibrationQuery.data?.calibrationResults as any)?.interpretation ?? ""}
                          </p>
                        </div>
                      </div>
                      {(calibrationQuery.data?.outliers as any[])?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Outlier principali</p>
                          {((calibrationQuery.data?.outliers as any[]) ?? []).slice(0, 2).map((o: any, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-600 mb-1">
                              <span className={o.direction === "over_predicted" ? "text-red-500" : "text-emerald-500"}>
                                {o.direction === "over_predicted" ? "↑" : "↓"}
                              </span>
                              <span className="flex-1">{o.title?.slice(0, 60) ?? o.contentUrl}: {o.diagnosis?.slice(0, 80)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : calibrationQuery.data?.status === "failed" ? (
                    <p className="text-xs text-red-600">{calibrationQuery.data?.errorMessage ?? "Calibrazione fallita"}</p>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Calibrazione in corso…
                    </div>
                  )}
                </div>
              )}
              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => navigate("/app/simulate/new")}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <BarChart3 className="w-4 h-4" />
                  Lancia Simulazione
                </button>
                {savedAgentId !== null && calibrationId === null && (
                  <button
                    onClick={() => calibrationRunMutation.mutate({ brandAgentId: savedAgentId })}
                    disabled={calibrationRunMutation.isPending}
                    className="flex-1 bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    {calibrationRunMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Avvio…</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Calibra Modello</>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Brand Profile card (visible after research) */}
        <div className="flex flex-col gap-4">
          {(step === "profile" || step === "saved") && brandProfile ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-indigo-500" />
                  Brand Profile — clicca per modificare
                </h2>
                {brandProfile?.confidenceScore && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    brandProfile.confidenceScore >= 0.7
                      ? "bg-emerald-100 text-emerald-700"
                      : brandProfile.confidenceScore >= 0.5
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    Confidenza: {Math.round((brandProfile.confidenceScore ?? 0) * 100)}%
                  </span>
                )}
              </div>
              <BrandProfileCard
                profile={brandProfile}
                onUpdate={setBrandProfile}
              />
              {brandProfile?.profilingNotes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">{brandProfile.profilingNotes}</p>
                </div>
              )}
            </>
          ) : step === "researching" ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4" style={{ minHeight: 400 }}>
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Analisi in corso</p>
                <p className="text-sm text-slate-500 mt-1">{progressStep || "Raccogliendo dati sul brand..."}</p>
              </div>
              <div className="w-full max-w-xs space-y-2 text-left">
                {[
                  "Analisi homepage e posizionamento",
                  "Ricerca presenza YouTube",
                  "Ricerca profilo Twitter/X",
                  "Identificazione competitor",
                  "Costruzione Brand Profile",
                  "Selezione panel agenti",
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3" style={{ minHeight: 400 }}>
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-slate-400" />
              </div>
              <p className="font-medium text-slate-600">Il Brand Profile apparirà qui</p>
              <p className="text-sm text-slate-400 max-w-xs">
                Inserisci il nome del brand e avvia l'analisi per vedere il profilo generato automaticamente
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
