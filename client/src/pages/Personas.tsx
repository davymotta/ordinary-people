import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Personas() {
  const { data: personas, isLoading } = trpc.personas.list.useQuery();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Personas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {personas?.length ?? 0} Italian consumer archetypes — ISTAT 2024 + behavioral economics
        </p>
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
                  <h3 className="text-sm font-bold tracking-[-0.02em] group-hover:text-primary transition-colors">
                    {p.label}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {p.archetype}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                  {((p.populationShare ?? 0) * 100).toFixed(1)}%
                </Badge>
              </div>

              {/* Demographics */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <MiniField label="Age" value={`${p.ageMin ?? "?"}-${p.ageMax ?? "?"}`} />
                <MiniField label="Income" value={`€${((p.incomeMin ?? 0) / 1000).toFixed(0)}-${((p.incomeMax ?? 0) / 1000).toFixed(0)}k`} />
                <MiniField label="Region" value={p.region ?? "—"} />
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
  const intensity = v > 0.7 ? "bg-primary/20 text-primary-foreground" : v > 0.4 ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${intensity}`}>
      {label} {v.toFixed(1)}
    </span>
  );
}
