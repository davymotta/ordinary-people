import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Users,
  ArrowRight,
  Upload,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

type FilterState = {
  culturalCluster: string;
  generation: string;
  gender: string;
  politicalOrientation: string;
  urbanization: string;
  panelSize: number;
};

const CULTURAL_CLUSTERS = [
  { value: "", label: "Tutti i cluster" },
  { value: "southern_europe", label: "Europa del Sud" },
  { value: "northern_europe", label: "Europa del Nord" },
  { value: "western_europe", label: "Europa Occidentale" },
  { value: "north_america", label: "Nord America" },
  { value: "latin_america", label: "America Latina" },
  { value: "east_asia", label: "Asia Orientale" },
  { value: "south_asia", label: "Asia del Sud" },
  { value: "middle_east_north_africa", label: "Medio Oriente / Nord Africa" },
  { value: "sub_saharan_africa", label: "Africa Sub-Sahariana" },
];

const GENERATIONS = [
  { value: "", label: "Tutte le generazioni" },
  { value: "silent", label: "Silent Generation (1928–1945)" },
  { value: "boomer", label: "Baby Boomer (1946–1964)" },
  { value: "genx", label: "Generazione X (1965–1980)" },
  { value: "millennial", label: "Millennial (1981–1996)" },
  { value: "genz", label: "Generazione Z (1997–2012)" },
];

const GENDERS = [
  { value: "", label: "Tutti i generi" },
  { value: "male", label: "Maschile" },
  { value: "female", label: "Femminile" },
  { value: "non_binary", label: "Non binario" },
];

const POLITICAL = [
  { value: "", label: "Tutti gli orientamenti" },
  { value: "far_left", label: "Estrema sinistra" },
  { value: "left", label: "Sinistra" },
  { value: "center_left", label: "Centro-sinistra" },
  { value: "center", label: "Centro" },
  { value: "center_right", label: "Centro-destra" },
  { value: "right", label: "Destra" },
  { value: "far_right", label: "Estrema destra" },
];

const URBANIZATION = [
  { value: "", label: "Tutti i contesti" },
  { value: "rural", label: "Rurale" },
  { value: "suburban", label: "Suburbano" },
  { value: "urban", label: "Urbano" },
  { value: "metropolitan", label: "Metropolitano" },
];

const ARCHETYPE_COLORS: Record<string, string> = {
  hero: "bg-orange-500",
  caregiver: "bg-amber-500",
  explorer: "bg-cyan-600",
  rebel: "bg-red-600",
  lover: "bg-rose-500",
  creator: "bg-violet-600",
  ruler: "bg-stone-700",
  magician: "bg-indigo-600",
  sage: "bg-blue-600",
  innocent: "bg-yellow-400",
  jester: "bg-lime-500",
  everyman: "bg-zinc-500",
};

function FilterSelect({ label, value, onChange, options, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <Info className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function TargetingPanel() {
  const [, navigate] = useLocation();
  const [filters, setFilters] = useState<FilterState>({
    culturalCluster: "",
    generation: "",
    gender: "",
    politicalOrientation: "",
    urbanization: "",
    panelSize: 10,
  });
  const [campaignName, setCampaignName] = useState("");
  const [campaignBrief, setCampaignBrief] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const batchStatsMutation = trpc.calibratedSampler.batchStats.useMutation();
  const batchStats = batchStatsMutation.data;
  const refetchStats = () => batchStatsMutation.mutate({
    count: filters.panelSize,
    culturalCluster: filters.culturalCluster || undefined,
    generation: (filters.generation || undefined) as "silent" | "boomer" | "genx" | "millennial" | "genz" | "alpha" | undefined,
  });

  const updateFilter = (key: keyof FilterState, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleLaunch = () => {
    // TODO: creare simulazione e navigare a /app/simulate/:id
    navigate("/app/simulations");
  };

  const archetypeData = batchStats?.archetype_distribution
    ? Object.entries(batchStats.archetype_distribution as Record<string, number>).sort((a, b) => b[1] - a[1])
    : [];

  const generationData = batchStats?.generation_distribution
    ? Object.entries(batchStats.generation_distribution as Record<string, number>).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <ClientLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">Nuova simulazione</h1>
          <p className="text-sm text-muted-foreground">Definisci il target demografico e carica la campagna da testare.</p>
        </div>

        <div className="flex gap-6 items-start">
          {/* Colonna sinistra: filtri */}
          <div className="w-80 shrink-0 space-y-4">
            {/* Nome campagna */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Campagna</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Nome simulazione</Label>
                  <Input
                    placeholder="es. Lancio Barilla Estate 2025"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Brief (opzionale)</Label>
                  <Textarea
                    placeholder="Descrivi il prodotto, il messaggio chiave, il contesto..."
                    value={campaignBrief}
                    onChange={(e) => setCampaignBrief(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>
                {/* Upload placeholder */}
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Trascina immagine, video o PDF</p>
                  <p className="text-xs text-muted-foreground mt-0.5">oppure <span className="text-primary underline">sfoglia</span></p>
                </div>
              </CardContent>
            </Card>

            {/* Filtri demografici */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Target demografico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <FilterSelect
                  label="Cluster culturale"
                  value={filters.culturalCluster}
                  onChange={(v) => updateFilter("culturalCluster", v)}
                  options={CULTURAL_CLUSTERS}
                  hint="Determina i valori culturali di base (Hofstede)"
                />
                <FilterSelect
                  label="Generazione"
                  value={filters.generation}
                  onChange={(v) => updateFilter("generation", v)}
                  options={GENERATIONS}
                />
                <FilterSelect
                  label="Genere"
                  value={filters.gender}
                  onChange={(v) => updateFilter("gender", v)}
                  options={GENDERS}
                />

                {/* Advanced */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Filtri avanzati
                </button>

                {showAdvanced && (
                  <div className="space-y-3 pt-1">
                    <FilterSelect
                      label="Orientamento politico"
                      value={filters.politicalOrientation}
                      onChange={(v) => updateFilter("politicalOrientation", v)}
                      options={POLITICAL}
                    />
                    <FilterSelect
                      label="Contesto urbano"
                      value={filters.urbanization}
                      onChange={(v) => updateFilter("urbanization", v)}
                      options={URBANIZATION}
                    />
                  </div>
                )}

                {/* Panel size */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Dimensione panel</Label>
                    <span className="text-sm font-semibold text-primary">{filters.panelSize} persone</span>
                  </div>
                  <Slider
                    min={5}
                    max={50}
                    step={5}
                    value={[filters.panelSize]}
                    onValueChange={([v]) => updateFilter("panelSize", v)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5</span>
                    <span>50</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonna destra: preview pool */}
          <div className="flex-1 space-y-4">
            {/* Counter + refresh */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{filters.panelSize}</p>
                      <p className="text-xs text-muted-foreground">persone nel panel</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchStats()} className="gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Aggiorna preview
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Distribuzione archetipi */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Distribuzione archetipi</CardTitle>
              </CardHeader>
              <CardContent>
                {archetypeData.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Clicca "Aggiorna preview" per vedere la distribuzione
                  </div>
                ) : (
                  <div className="space-y-2">
                    {archetypeData.map(([archetype, count]) => {
                      const pct = Math.round((count / filters.panelSize) * 100);
                      return (
                        <div key={archetype} className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${ARCHETYPE_COLORS[archetype] ?? "bg-muted"}`} />
                          <span className="text-xs text-foreground capitalize w-24">{archetype}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${ARCHETYPE_COLORS[archetype] ?? "bg-primary"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distribuzione generazioni */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Distribuzione generazionale</CardTitle>
              </CardHeader>
              <CardContent>
                {generationData.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Clicca "Aggiorna preview" per vedere la distribuzione
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {generationData.map(([gen, count]) => (
                      <Badge key={gen} variant="secondary" className="gap-1.5">
                        <span className="capitalize">{gen}</span>
                        <span className="font-bold">{count}</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Big Five preview */}
            {batchStats?.big_five_distribution && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Profilo Big Five medio del panel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(batchStats.big_five_distribution as Record<string, Record<string, number>>).map(([trait, dist]) => {
                      const vals = Object.values(dist);
                      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                      const value = avg / 100;
                      return (
                        <div key={trait} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-24 capitalize">{trait}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${Math.round(value * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {Math.round(value * 100)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* CTA */}
            <div className="flex justify-end">
              <Button
                size="lg"
                disabled={!campaignName.trim()}
                onClick={handleLaunch}
                className="gap-2"
              >
                Lancia simulazione
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
