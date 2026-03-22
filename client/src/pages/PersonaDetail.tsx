import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Brain, Sparkles } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function PersonaDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: persona, isLoading, refetch } = trpc.personas.get.useQuery({ id });
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const generatePrompt = trpc.personas.generatePrompt.useMutation({
    onSuccess: () => {
      toast.success("System prompt generated");
      refetch();
      utils.personas.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!persona) {
    return <div className="py-20 text-center text-muted-foreground">Persona not found</div>;
  }

  const p = persona as any;
  const topicAffinities = (p.topicAffinities ?? {}) as Record<string, number>;
  const channelUsage = (p.channelUsage ?? {}) as Record<string, number>;
  const identityProfile = (p.identityProfile ?? {}) as Record<string, number>;
  const mediaDiet = (p.mediaDiet ?? {}) as Record<string, number>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/personas")} className="h-8">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em]">{p.label}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-mono text-muted-foreground">{p.archetypeId}</span>
            <Badge variant="outline" className="text-xs font-mono">Pop. {((p.populationShare ?? 0) * 100).toFixed(1)}%</Badge>
            <Badge variant="outline" className="text-xs font-mono">Spend {((p.marketSpendShare ?? 0) * 100).toFixed(1)}%</Badge>
            {p.generationalCohort && <Badge variant="outline" className="text-xs">{p.generationalCohort}</Badge>}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generatePrompt.mutate({ id })}
          disabled={generatePrompt.isPending}
          className="shrink-0"
        >
          {generatePrompt.isPending ? (
            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="h-3 w-3 mr-1" /> {p.systemPrompt ? "Regenerate" : "Generate"} Prompt</>
          )}
        </Button>
      </div>

      {/* System Prompt */}
      {p.systemPrompt && (
        <Card className="border border-[#CCFF00]/30 shadow-none bg-[#CCFF00]/5">
          <CardContent className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Brain className="h-3.5 w-3.5" /> System Prompt (Identity)
            </h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{p.systemPrompt}</p>
          </CardContent>
        </Card>
      )}

      {/* Demographics */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Demographics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Age Range" value={`${p.ageMin}–${p.ageMax}`} />
            <Field label="Income Band" value={p.incomeBand ?? "—"} />
            <Field label="Geography" value={p.geo ?? "—"} />
            <Field label="Education" value={p.education ?? "—"} />
            <Field label="Household" value={p.householdType ?? "—"} />
            <Field label="Cohort" value={p.generationalCohort ?? "—"} />
            <Field label="Reference Group" value={p.referenceGroup ?? "—"} />
            <Field label="Rejection Group" value={p.rejectionGroup ?? "—"} />
          </div>
        </CardContent>
      </Card>

      {/* Psychographics */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Psychographics</h3>
          <div className="space-y-2">
            <PsychBar label="Novelty Seeking" value={p.noveltySeeking} />
            <PsychBar label="Status Orientation" value={p.statusOrientation} />
            <PsychBar label="Price Sensitivity" value={p.priceSensitivity} />
            <PsychBar label="Risk Aversion" value={p.riskAversion} />
            <PsychBar label="Emotional Susceptibility" value={p.emotionalSusceptibility} />
            <PsychBar label="Identity Defensiveness" value={p.identityDefensiveness} />
            <PsychBar label="Conformism Index" value={p.conformismIndex} />
            <PsychBar label="Authority Trust" value={p.authorityTrust} />
            <PsychBar label="Delayed Gratification" value={p.delayedGratification} />
            <PsychBar label="Cultural Capital" value={p.culturalCapital} />
            <PsychBar label="Locus of Control" value={p.locusOfControl} />
          </div>
        </CardContent>
      </Card>

      {/* Topic Affinities */}
      {Object.keys(topicAffinities).length > 0 && (
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Topic Affinities</h3>
            <div className="space-y-1.5">
              {Object.entries(topicAffinities).sort((a, b) => b[1] - a[1]).map(([topic, score]) => (
                <div key={topic} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-32 shrink-0 capitalize">{topic.replace(/_/g, " ")}</span>
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-[#CCFF00] rounded-full" style={{ width: `${score * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono w-8 text-right">{score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel Usage */}
      {Object.keys(channelUsage).length > 0 && (
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Channel Usage</h3>
            <div className="space-y-1.5">
              {Object.entries(channelUsage).sort((a, b) => b[1] - a[1]).map(([ch, score]) => (
                <div key={ch} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-32 shrink-0 capitalize">{ch.replace(/_/g, " ")}</span>
                  <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-foreground/30 rounded-full" style={{ width: `${score * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono w-8 text-right">{score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Identity Profile */}
      {Object.keys(identityProfile).length > 0 && (
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Identity Profile</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(identityProfile).sort((a, b) => b[1] - a[1]).map(([trait, score]) => (
                <Badge key={trait} variant="outline" className="text-xs font-mono">
                  {trait.replace(/_/g, " ")} <span className="ml-1 text-muted-foreground">{score.toFixed(2)}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Media Diet */}
      {Object.keys(mediaDiet).length > 0 && (
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Media Diet</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(mediaDiet).sort((a, b) => b[1] - a[1]).map(([source, score]) => (
                <Badge key={source} variant="secondary" className="text-xs font-mono">
                  {source.replace(/_/g, " ")} <span className="ml-1 text-muted-foreground">{score.toFixed(2)}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bibliography Notes */}
      {p.bibliographyNotes && (
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Bibliography Notes</h3>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{p.bibliographyNotes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

function PsychBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-44 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${v * 100}%` }} />
      </div>
      <span className="text-xs font-mono w-8 text-right">{v.toFixed(2)}</span>
    </div>
  );
}
