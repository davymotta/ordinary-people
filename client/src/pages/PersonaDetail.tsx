import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function PersonaDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: persona, isLoading } = trpc.personas.get.useQuery({ id });
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Persona not found
      </div>
    );
  }

  const p = persona as any;
  const bibRefs = (p.bibliographyRefs ?? []) as string[];
  const topics = (p.topics ?? []) as string[];
  const channels = (p.channels ?? []) as string[];
  const formats = (p.formats ?? []) as string[];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/personas")} className="h-8">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em]">{p.label}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-mono text-muted-foreground">{p.archetype}</span>
          <Badge variant="outline" className="text-xs font-mono">
            Pop. {((p.populationShare ?? 0) * 100).toFixed(1)}%
          </Badge>
          <Badge variant="outline" className="text-xs font-mono">
            Spend {((p.marketSpendShare ?? 0) * 100).toFixed(1)}%
          </Badge>
        </div>
      </div>

      {/* Demographics */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Demographics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Age Range" value={`${p.ageMin}–${p.ageMax}`} />
            <Field label="Income" value={`€${(p.incomeMin / 1000).toFixed(0)}k–€${(p.incomeMax / 1000).toFixed(0)}k`} />
            <Field label="Region" value={p.region ?? "—"} />
            <Field label="Education" value={p.education ?? "—"} />
            <Field label="Household" value={p.householdType ?? "—"} />
            <Field label="Employment" value={p.employment ?? "—"} />
            <Field label="Urbanization" value={p.urbanization ?? "—"} />
            <Field label="Digital Literacy" value={p.digitalLiteracy ?? "—"} />
          </div>
        </CardContent>
      </Card>

      {/* Psychographics */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Psychographics
          </h3>
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

      {/* Preferences */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Preferences
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Topics</p>
              <div className="flex flex-wrap gap-1">
                {topics.length > 0 ? topics.map((t: string) => (
                  <Badge key={t} variant="secondary" className="text-[10px] font-mono">{t}</Badge>
                )) : <span className="text-xs text-muted-foreground">—</span>}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Channels</p>
              <div className="flex flex-wrap gap-1">
                {channels.length > 0 ? channels.map((c: string) => (
                  <Badge key={c} variant="secondary" className="text-[10px] font-mono">{c}</Badge>
                )) : <span className="text-xs text-muted-foreground">—</span>}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Formats</p>
              <div className="flex flex-wrap gap-1">
                {formats.length > 0 ? formats.map((f: string) => (
                  <Badge key={f} variant="secondary" className="text-[10px] font-mono">{f}</Badge>
                )) : <span className="text-xs text-muted-foreground">—</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bibliography References */}
      {bibRefs.length > 0 && (
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Bibliography References
            </h3>
            <div className="space-y-1">
              {bibRefs.map((ref: string, i: number) => (
                <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                  {ref}
                </p>
              ))}
            </div>
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
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${v * 100}%` }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right">{v.toFixed(2)}</span>
    </div>
  );
}
