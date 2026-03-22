/**
 * Campaign Ingestion — UI del Client Portal
 * Permette al brand manager di caricare una campagna (immagine, testo, URL)
 * e visualizzare il Campaign Digest generato dal pipeline di ingestione.
 */

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  Image,
  FileText,
  Link2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Palette,
  MessageSquare,
  Target,
  Clock,
  Coins,
  ArrowRight,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type InputMode = "image_url" | "text" | "file";

interface DigestSection {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  color: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CampaignIngestion() {
  const [inputMode, setInputMode] = useState<InputMode>("image_url");
  const [imageUrl, setImageUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [campaignId, setCampaignId] = useState(`camp_${Date.now()}`);
  const [channel, setChannel] = useState("instagram");
  const [brandCategory, setBrandCategory] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["visual", "messaging"]));

  const ingestImageMutation = trpc.ingestion.ingestImageUrl.useMutation();
  const ingestTextMutation = trpc.ingestion.ingestText.useMutation();

  const isLoading = ingestImageMutation.isPending || ingestTextMutation.isPending;
  const digest = ingestImageMutation.data?.digest ?? ingestTextMutation.data?.digest;
  const error = ingestImageMutation.error?.message ?? ingestTextMutation.error?.message;

  const handleIngest = async () => {
    if (inputMode === "image_url" && imageUrl) {
      ingestImageMutation.mutate({
        campaign_id: campaignId,
        image_url: imageUrl,
        channel,
        brand_category: brandCategory || undefined,
        client_notes: clientNotes || undefined,
      });
    } else if (inputMode === "text" && textContent) {
      ingestTextMutation.mutate({
        campaign_id: campaignId,
        text: textContent,
        channel,
        brand_category: brandCategory || undefined,
        client_notes: clientNotes || undefined,
      });
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const canSubmit =
    (inputMode === "image_url" && imageUrl.startsWith("http")) ||
    (inputMode === "text" && textContent.length >= 10);

  return (
    <ClientLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-primary uppercase tracking-wide">
              Pipeline di Ingestione
            </span>
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Carica la tua campagna
          </h1>
          <p className="text-muted-foreground text-base max-w-2xl">
            Il sistema analizza la campagna e genera un{" "}
            <strong>Campaign Digest</strong> — il "pacchetto sensoriale" che ogni
            agente riceverà. Gli agenti non vedono il file grezzo: vedono questa
            descrizione strutturata, filtrata attraverso il loro profilo.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Input Panel ─────────────────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Tipo di input */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tipo di contenuto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { mode: "image_url" as InputMode, icon: <Image className="w-4 h-4" />, label: "Immagine URL" },
                    { mode: "text" as InputMode, icon: <FileText className="w-4 h-4" />, label: "Testo / Brief" },
                    { mode: "file" as InputMode, icon: <Upload className="w-4 h-4" />, label: "File upload" },
                  ].map(({ mode, icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setInputMode(mode)}
                      disabled={mode === "file"}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                        inputMode === mode
                          ? "border-primary bg-primary/5 text-primary"
                          : mode === "file"
                            ? "border-border/30 text-muted-foreground/40 cursor-not-allowed"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {icon}
                      {label}
                      {mode === "file" && (
                        <span className="text-[10px] text-muted-foreground/50">Presto</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Input specifico per tipo */}
                {inputMode === "image_url" && (
                  <div className="space-y-2">
                    <Label className="text-xs">URL immagine pubblica</Label>
                    <Input
                      placeholder="https://esempio.com/campagna.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="text-sm"
                    />
                    {imageUrl && imageUrl.startsWith("http") && (
                      <div className="relative rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                        <img
                          src={imageUrl}
                          alt="Preview campagna"
                          className="w-full h-40 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {inputMode === "text" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Brief / Copy della campagna</Label>
                    <Textarea
                      placeholder="Incolla qui il brief della campagna, il copy pubblicitario, o qualsiasi testo che descriva la campagna..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      className="text-sm min-h-[140px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      {textContent.length} caratteri
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Metadati campagna */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Metadati campagna</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">ID Campagna</Label>
                    <Input
                      value={campaignId}
                      onChange={(e) => setCampaignId(e.target.value)}
                      className="text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Canale previsto</Label>
                    <select
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    >
                      {[
                        ["instagram", "Instagram"],
                        ["tiktok", "TikTok"],
                        ["facebook", "Facebook"],
                        ["youtube", "YouTube"],
                        ["tv", "Televisione"],
                        ["print", "Stampa / Magazine"],
                        ["outdoor", "Outdoor / Billboard"],
                        ["email", "Email / Newsletter"],
                        ["web", "Web / Display"],
                      ].map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Categoria brand (opzionale)</Label>
                  <Input
                    placeholder="es: fashion, food, automotive, beauty, tech..."
                    value={brandCategory}
                    onChange={(e) => setBrandCategory(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Note per gli agenti (opzionale)</Label>
                  <Textarea
                    placeholder="Contesto aggiuntivo per gli agenti: obiettivo della campagna, target dichiarato, vincoli creativi..."
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    className="text-sm min-h-[80px] resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Button
              onClick={handleIngest}
              disabled={!canSubmit || isLoading}
              className="w-full gap-2 h-11"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analisi in corso...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Genera Campaign Digest
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            {/* Stima costo */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Coins className="w-3.5 h-3.5" />
              <span>
                Costo stimato:{" "}
                {inputMode === "image_url" ? "~$0.01 (1 chiamata Vision API)" : "~$0.005 (1 chiamata LLM)"}
              </span>
            </div>
          </div>

          {/* ── Digest Panel ─────────────────────────────────────────────────── */}
          <div className="space-y-4">
            {!digest && !isLoading && !error && (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Eye className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground font-medium">
                    Il Campaign Digest apparirà qui
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    Carica una campagna e clicca "Genera Campaign Digest" per vedere come gli agenti la percepiranno.
                  </p>
                </CardContent>
              </Card>
            )}

            {isLoading && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm font-medium text-foreground">Analisi in corso...</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {inputMode === "image_url"
                      ? "Vision API sta analizzando l'immagine"
                      : "LLM sta estraendo le informazioni dal testo"}
                  </p>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Errore durante l'ingestione</p>
                    <p className="text-xs text-muted-foreground mt-1">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {digest && (
              <>
                {/* Header del digest */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Campaign Digest generato</p>
                          <p className="text-xs text-muted-foreground">
                            {digest.campaign_id} · {digest.source_type} · {digest.source_format}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {digest.processing_time_ms}ms
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(digest.confidence_score * 100)}% conf.
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sezione Visual */}
                {digest.visual && (
                  <DigestCard
                    title="Analisi Visiva"
                    icon={<Palette className="w-4 h-4" />}
                    colorClass="text-chart-2"
                    sectionKey="visual"
                    expanded={expandedSections.has("visual")}
                    onToggle={() => toggleSection("visual")}
                  >
                    <div className="space-y-3">
                      <p className="text-sm text-foreground leading-relaxed">
                        {digest.visual.description}
                      </p>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground font-medium">Stile</span>
                          <p className="text-foreground mt-0.5">{digest.visual.style}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-medium">Mood</span>
                          <p className="text-foreground mt-0.5">{digest.visual.mood}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-medium">Composizione</span>
                          <p className="text-foreground mt-0.5">{digest.visual.composition}</p>
                        </div>
                        {digest.visual.brand_name && (
                          <div>
                            <span className="text-muted-foreground font-medium">Brand</span>
                            <p className="text-foreground mt-0.5">{digest.visual.brand_name}</p>
                          </div>
                        )}
                      </div>

                      {digest.visual.color_palette.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground font-medium">Palette cromatica</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {digest.visual.color_palette.map((color, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {color}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {(digest.visual.text_on_image.headline || digest.visual.text_on_image.cta) && (
                        <div className="border-t border-border/50 pt-3 space-y-1.5">
                          {digest.visual.text_on_image.headline && (
                            <div className="text-xs">
                              <span className="text-muted-foreground font-medium">Headline: </span>
                              <span className="text-foreground font-medium">"{digest.visual.text_on_image.headline}"</span>
                            </div>
                          )}
                          {digest.visual.text_on_image.cta && (
                            <div className="text-xs">
                              <span className="text-muted-foreground font-medium">CTA: </span>
                              <span className="text-foreground">"{digest.visual.text_on_image.cta}"</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </DigestCard>
                )}

                {/* Sezione Messaging */}
                <DigestCard
                  title="Messaggio & Tono"
                  icon={<MessageSquare className="w-4 h-4" />}
                  colorClass="text-primary"
                  sectionKey="messaging"
                  expanded={expandedSections.has("messaging")}
                  onToggle={() => toggleSection("messaging")}
                >
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-sm font-medium text-foreground">
                        "{digest.messaging.core_message}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground font-medium">Tono</span>
                        <p className="text-foreground mt-0.5">{digest.messaging.tone}</p>
                      </div>
                      {digest.messaging.call_to_action && (
                        <div>
                          <span className="text-muted-foreground font-medium">CTA</span>
                          <p className="text-foreground mt-0.5">{digest.messaging.call_to_action}</p>
                        </div>
                      )}
                    </div>

                    {digest.messaging.emotional_appeal.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground font-medium">Leve emotive</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {digest.messaging.emotional_appeal.map((appeal, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {appeal}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {digest.messaging.persuasion_tactics.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground font-medium">Tattiche persuasive</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {digest.messaging.persuasion_tactics.map((tactic, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tactic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DigestCard>

                {/* Sezione Target */}
                <DigestCard
                  title="Target percepito"
                  icon={<Target className="w-4 h-4" />}
                  colorClass="text-chart-3"
                  sectionKey="target"
                  expanded={expandedSections.has("target")}
                  onToggle={() => toggleSection("target")}
                >
                  <div className="space-y-3">
                    <p className="text-sm text-foreground">
                      {digest.messaging.target_implied}
                    </p>
                    {digest.messaging.offer_type && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Tipo offerta:</span>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {digest.messaging.offer_type.replace("_", " ")}
                        </Badge>
                      </div>
                    )}
                    {digest.messaging.price_mentioned && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Prezzo menzionato:</span>
                        <Badge variant="outline" className="text-xs">
                          {digest.messaging.price_value ?? "sì"}
                        </Badge>
                      </div>
                    )}
                  </div>
                </DigestCard>

                {/* CTA per simulazione */}
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-foreground mb-1">
                      Digest pronto per la simulazione
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Ora puoi lanciare una simulazione per vedere come gli agenti reagiscono a questa campagna.
                    </p>
                    <Button size="sm" className="gap-2 w-full">
                      <Sparkles className="w-3.5 h-3.5" />
                      Lancia simulazione con questo digest
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

// ─── DigestCard Component ─────────────────────────────────────────────────────

function DigestCard({
  title,
  icon,
  colorClass,
  sectionKey,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  sectionKey: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <span className={colorClass}>{icon}</span>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {expanded && <CardContent className="pt-3">{children}</CardContent>}
    </Card>
  );
}
