import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useMemo } from "react";

export default function SimulationDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: sim, isLoading } = trpc.simulations.get.useQuery({ id });
  const { data: personas } = trpc.personas.list.useQuery();
  const { data: campaigns } = trpc.campaigns.list.useQuery();
  const [, setLocation] = useLocation();

  const results = useMemo(() => {
    if (!sim?.results) return [];
    return sim.results as any[];
  }, [sim]);

  const personaMap = useMemo(() => {
    const m: Record<string, any> = {};
    if (personas) for (const p of personas) m[String(p.id)] = p;
    return m;
  }, [personas]);

  const campaignMap = useMemo(() => {
    const m: Record<number, any> = {};
    if (campaigns) for (const c of campaigns) m[c.id] = c;
    return m;
  }, [campaigns]);

  // Group results by campaign
  const byCampaign = useMemo(() => {
    const grouped: Record<number, any[]> = {};
    for (const r of results) {
      if (!grouped[r.campaignId]) grouped[r.campaignId] = [];
      grouped[r.campaignId].push(r);
    }
    return grouped;
  }, [results]);

  // Unique persona IDs
  const personaIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of results) ids.add(r.personaId);
    return Array.from(ids);
  }, [results]);

  // Unique campaign IDs
  const campaignIds = useMemo(() => {
    return Object.keys(byCampaign).map(Number);
  }, [byCampaign]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sim) {
    return <div className="py-20 text-center text-muted-foreground">Simulation not found</div>;
  }

  const metrics = sim.metrics as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/results")} className="h-8">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em]">{sim.name}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {sim.completedAt ? new Date(sim.completedAt as any).toLocaleString() : "—"}
          {metrics && (
            <span className="ml-3 font-mono">
              WMI: {Number(metrics.weightedMarketInterest ?? 0).toFixed(3)}
            </span>
          )}
        </p>
      </div>

      {/* Heatmap */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Reaction Heatmap (Persona x Campaign)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left p-1.5 font-medium text-muted-foreground w-40">Persona</th>
                  {campaignIds.map(cId => (
                    <th key={cId} className="text-center p-1.5 font-medium text-muted-foreground min-w-[80px]">
                      {campaignMap[cId]?.name?.slice(0, 12) ?? `C${cId}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {personaIds.map(pId => (
                  <tr key={pId} className="border-t border-border/30">
                    <td className="p-1.5 font-medium truncate max-w-[160px]">
                      {personaMap[pId]?.label ?? pId}
                    </td>
                    {campaignIds.map(cId => {
                      const r = byCampaign[cId]?.find((x: any) => x.personaId === pId);
                      const score = r?.breakdown?.finalScore ?? 0;
                      return (
                        <td key={cId} className="text-center p-1.5">
                          <span
                            className="inline-block w-full py-0.5 rounded font-mono text-[10px]"
                            style={{
                              backgroundColor: scoreColor(score),
                              color: Math.abs(score) > 0.5 ? "#fff" : "#000",
                            }}
                          >
                            {score.toFixed(2)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Segment Ranking per Campaign */}
      {campaignIds.map(cId => {
        const cResults = (byCampaign[cId] ?? []).sort(
          (a: any, b: any) => b.breakdown.finalScore - a.breakdown.finalScore
        );
        const cName = campaignMap[cId]?.name ?? `Campaign ${cId}`;
        return (
          <Card key={cId} className="border border-border/50 shadow-none">
            <CardContent className="p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {cName} — Segment Ranking
              </h3>
              <div className="space-y-1.5">
                {cResults.map((r: any, i: number) => {
                  const p = personaMap[r.personaId];
                  const bd = r.breakdown;
                  const hasRisk = bd.riskFlags && bd.riskFlags.length > 0;
                  return (
                    <div key={r.personaId} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-5 text-right">{i + 1}</span>
                      <span className="text-xs font-medium w-40 truncate">{p?.label ?? r.personaId}</span>
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.abs(bd.finalScore) * 50 + 50}%`,
                            backgroundColor: scoreColor(bd.finalScore),
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono w-12 text-right">{bd.finalScore.toFixed(2)}</span>
                      {hasRisk && (
                        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Score Breakdown Detail */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Score Breakdown Detail
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-1.5 font-medium text-muted-foreground">Persona</th>
                  <th className="text-left p-1.5 font-medium text-muted-foreground">Campaign</th>
                  <th className="text-center p-1.5 font-medium text-muted-foreground">S1</th>
                  <th className="text-center p-1.5 font-medium text-muted-foreground">S2</th>
                  <th className="text-center p-1.5 font-medium text-muted-foreground">Final</th>
                  <th className="text-center p-1.5 font-medium text-muted-foreground">Dominant</th>
                  <th className="text-left p-1.5 font-medium text-muted-foreground">Risk Flags</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 60).map((r: any, i: number) => {
                  const bd = r.breakdown;
                  return (
                    <tr key={i} className="border-t border-border/20">
                      <td className="p-1.5 truncate max-w-[120px]">{personaMap[r.personaId]?.label ?? r.personaId}</td>
                      <td className="p-1.5 truncate max-w-[120px]">{campaignMap[r.campaignId]?.name ?? r.campaignId}</td>
                      <td className="text-center p-1.5 font-mono">{bd.s1Score?.toFixed(2) ?? "—"}</td>
                      <td className="text-center p-1.5 font-mono">{bd.s2Score?.toFixed(2) ?? "—"}</td>
                      <td className="text-center p-1.5 font-mono font-bold">{bd.finalScore.toFixed(2)}</td>
                      <td className="text-center p-1.5">
                        {bd.dominantSignal && (
                          <Badge variant="outline" className="text-[9px] font-mono">{bd.dominantSignal}</Badge>
                        )}
                      </td>
                      <td className="p-1.5">
                        {bd.riskFlags?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {bd.riskFlags.map((f: string, j: number) => (
                              <Badge key={j} variant="destructive" className="text-[9px]">{f}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function scoreColor(score: number): string {
  if (score > 0.5) return "#CCFF00";
  if (score > 0.2) return "#a3cc00";
  if (score > 0) return "#7a9900";
  if (score > -0.2) return "#cc8800";
  if (score > -0.5) return "#cc4400";
  return "#cc0000";
}
