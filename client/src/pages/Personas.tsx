import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Personas() {
  const { data: personas, isLoading, refetch } = trpc.personas.list.useQuery();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const generateAll = trpc.personas.generateAllPrompts.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.results.filter(r => r.success).length} system prompts`);
      refetch();
      utils.dashboard.stats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const withPrompt = personas?.filter((p: any) => p.systemPrompt) ?? [];
  const total = personas?.length ?? 0;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Personas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} Italian consumer archetypes — ISTAT 2024 + behavioral economics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-mono">{withPrompt.length}/{total} prompts</span>
            </div>
            <div className="w-24 h-1 bg-secondary rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-[#CCFF00] rounded-full transition-all"
                style={{ width: `${total > 0 ? (withPrompt.length / total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateAll.mutate()}
            disabled={generateAll.isPending}
            className="text-xs"
          >
            {generateAll.isPending ? (
              <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="h-3 w-3 mr-1" /> Generate All Prompts</>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {personas?.map((p: any) => (
          <Card
            key={p.id}
            className="border border-border/50 shadow-none cursor-pointer hover:border-primary/30 transition-colors group"
            onClick={() => setLocation(`/personas/${p.id}`)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold tracking-[-0.02em] group-hover:text-primary transition-colors">
                      {p.label}
                    </h3>
                    {p.systemPrompt && (
                      <Brain className="h-3 w-3 text-[#CCFF00]" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {p.archetypeId}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                    Pop. {((p.populationShare ?? 0) * 100).toFixed(1)}%
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                    Spend {((p.marketSpendShare ?? 0) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>

              {/* Demographics */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <MiniField label="Age" value={`${p.ageMin ?? "?"}-${p.ageMax ?? "?"}`} />
                <MiniField label="Income" value={p.incomeBand ?? "—"} />
                <MiniField label="Geo" value={p.geo ?? "—"} />
              </div>

              {/* Psychographics radar mini */}
              <div className="flex flex-wrap gap-1.5">
                <PsychTag label="NS" value={p.noveltySeeking} />
                <PsychTag label="SO" value={p.statusOrientation} />
                <PsychTag label="PS" value={p.priceSensitivity} />
                <PsychTag label="RA" value={p.riskAversion} />
                <PsychTag label="ES" value={p.emotionalSusceptibility} />
                <PsychTag label="ID" value={p.identityDefensiveness} />
              </div>

              {/* System prompt preview */}
              {p.systemPrompt && (
                <p className="text-[11px] text-muted-foreground mt-3 line-clamp-2 italic">
                  "{p.systemPrompt.slice(0, 120)}..."
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value}</p>
    </div>
  );
}

function PsychTag({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  const intensity = v > 0.7 ? "bg-[#CCFF00]/20 text-foreground" : v > 0.4 ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${intensity}`}>
      {label} {v.toFixed(1)}
    </span>
  );
}
