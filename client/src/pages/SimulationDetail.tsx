import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, AlertTriangle, Brain, MessageSquareQuote, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useMemo, useState } from "react";

export default function SimulationDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: sim, isLoading } = trpc.simulations.get.useQuery({ id });
  const { data: personas } = trpc.personas.list.useQuery();
  const { data: campaigns } = trpc.campaigns.list.useQuery();
  const [, setLocation] = useLocation();
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null);

  const results = useMemo(() => {
    if (!sim?.results) return [];
    return sim.results as any[];
  }, [sim]);

  const isHybrid = useMemo(() => {
    const config = sim?.config as any;
    return config?.mode === "hybrid" || results.some((r: any) => r.llm);
  }, [sim, results]);

  const personaMap = useMemo(() => {
    const m: Record<string, any> = {};
    if (personas) for (const p of personas) { m[p.archetypeId] = p; m[String(p.id)] = p; }
    return m;
  }, [personas]);

  const campaignMap = useMemo(() => {
    const m: Record<number, any> = {};
    if (campaigns) for (const c of campaigns) m[c.id] = c;
    return m;
  }, [campaigns]);

  const byCampaign = useMemo(() => {
    const grouped: Record<number, any[]> = {};
    for (const r of results) {
      if (!grouped[r.campaignId]) grouped[r.campaignId] = [];
      grouped[r.campaignId].push(r);
    }
    return grouped;
  }, [results]);

  const personaIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of results) ids.add(r.personaId);
    return Array.from(ids);
  }, [results]);

  const campaignIds = useMemo(() => Object.keys(byCampaign).map(Number), [byCampaign]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!sim) {
    return <div className="py-20 text-center text-muted-foreground">Simulation not found</div>;
  }

  const metrics = sim.metrics as any;
  const alignment = metrics?.alignment;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/results")} className="h-8">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-extrabold tracking-[-0.04em]">{sim.name}</h1>
          {isHybrid && <Badge className="bg-[#CCFF00] text-black text-[10px]">HYBRID</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {sim.completedAt ? new Date(sim.completedAt as any).toLocaleString() : "—"}
          <span className="ml-3 font-mono">WMI: {Number(metrics?.weightedMarketInterest ?? 0).toFixed(3)}</span>
          {isHybrid && metrics?.llmWeightedMarketInterest != null && (
            <span className="ml-3 font-mono">LLM-WMI: {Number(metrics.llmWeightedMarketInterest).toFixed(3)}</span>
          )}
        </p>
      </div>

      {/* Alignment Summary (hybrid only) */}
      {isHybrid && alignment && (
        <Card className="border border-[#CCFF00]/30 shadow-none bg-[#CCFF00]/5">
          <CardContent className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Brain className="h-3.5 w-3.5" /> Formula vs LLM Alignment
            </h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{(alignment.rate * 100).toFixed(0)}%</div>
                <div className="text-[10px] text-muted-foreground uppercase">Alignment Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{alignment.aligned}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Aligned</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{alignment.divergent}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Divergent</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{alignment.avgDelta?.toFixed(3)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Avg Delta</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heatmap */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Reaction Heatmap {isHybrid ? "(Formula Score | LLM Score)" : "(Persona × Campaign)"}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left p-1.5 font-medium text-muted-foreground w-40">Persona</th>
                  {campaignIds.map(cId => (
                    <th key={cId} className="text-center p-1.5 font-medium text-muted-foreground min-w-[100px]">
                      {campaignMap[cId]?.name?.slice(0, 14) ?? `C${cId}`}
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
                      const fScore = r?.breakdown?.finalScore ?? 0;
                      const lScore = r?.llm?.score;
                      const hasLLM = lScore != null;
                      return (
                        <td key={cId} className="text-center p-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <span
                              className="inline-block py-0.5 px-1 rounded font-mono text-[10px]"
                              style={{ backgroundColor: scoreColor(fScore), color: Math.abs(fScore) > 0.5 ? "#fff" : "#000" }}
                            >
                              {fScore.toFixed(2)}
                            </span>
                            {hasLLM && (
                              <>
                                <span className="text-muted-foreground text-[8px]">|</span>
                                <span
                                  className="inline-block py-0.5 px-1 rounded font-mono text-[10px] border border-[#CCFF00]/40"
                                  style={{ backgroundColor: scoreColor(lScore), color: Math.abs(lScore) > 0.5 ? "#fff" : "#000" }}
                                >
                                  {lScore.toFixed(2)}
                                </span>
                              </>
                            )}
                          </div>
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

      {/* Persona Voices (hybrid only) */}
      {isHybrid && (
        <Card className="border border-border/50 shadow-none">
          <CardContent className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <MessageSquareQuote className="h-3.5 w-3.5" /> Persona Voices
            </h3>
            <div className="space-y-3">
              {results.filter((r: any) => r.llm).slice(0, expandedPersona ? 100 : 10).map((r: any, i: number) => {
                const p = personaMap[r.personaId];
                const llm = r.llm;
                const comp = r.comparison;
                const isExpanded = expandedPersona === `${r.personaId}-${r.campaignId}`;
                const cName = campaignMap[r.campaignId]?.name || `Campaign ${r.campaignId}`;

                return (
                  <div
                    key={i}
                    className={`border rounded-lg p-4 transition-all cursor-pointer ${isExpanded ? "border-[#CCFF00]/50 bg-[#CCFF00]/5" : "border-border/30 hover:border-border/60"}`}
                    onClick={() => setExpandedPersona(isExpanded ? null : `${r.personaId}-${r.campaignId}`)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-semibold text-sm">{p?.label ?? r.personaId}</span>
                        <span className="text-xs text-muted-foreground ml-2">re: {cName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {comp && (
                          <Badge
                            variant="outline"
                            className={`text-[9px] ${comp.agreement === "aligned" ? "border-green-500 text-green-600" : "border-amber-500 text-amber-600"}`}
                          >
                            {comp.agreement === "aligned" ? "ALIGNED" : "DIVERGENT"}
                            <span className="ml-1 font-mono">Δ{comp.delta.toFixed(2)}</span>
                          </Badge>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">F:</span>
                          <span className="font-mono text-xs">{r.breakdown.finalScore.toFixed(2)}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">L:</span>
                          <span className="font-mono text-xs font-bold">{llm.score.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quote */}
                    {llm.quote && (
                      <blockquote className="mt-2 pl-3 border-l-2 border-[#CCFF00] text-sm italic text-foreground/80">
                        "{llm.quote}"
                      </blockquote>
                    )}

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 space-y-3 text-sm">
                        {llm.gutReaction && (
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Gut Reaction (Sistema 1)</span>
                            <p className="mt-0.5 text-foreground/80">{llm.gutReaction}</p>
                          </div>
                        )}
                        {llm.reflection && (
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reflection (Sistema 2)</span>
                            <p className="mt-0.5 text-foreground/80">{llm.reflection}</p>
                          </div>
                        )}
                        {llm.tensions && llm.tensions.length > 0 && (
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tensions</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {llm.tensions.map((t: string, j: number) => (
                                <Badge key={j} variant="outline" className="text-[9px]">{t}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {(llm.attraction != null || llm.repulsion != null) && (
                          <div className="flex gap-4">
                            {llm.attraction != null && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-green-500" />
                                <span className="text-[10px] text-muted-foreground">Attraction:</span>
                                <span className="font-mono text-xs">{llm.attraction.toFixed(2)}</span>
                              </div>
                            )}
                            {llm.repulsion != null && (
                              <div className="flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 text-red-500" />
                                <span className="text-[10px] text-muted-foreground">Repulsion:</span>
                                <span className="font-mono text-xs">{llm.repulsion.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {llm.reasoning && (
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reasoning</span>
                            <p className="mt-0.5 text-foreground/70 text-xs">{llm.reasoning}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {results.filter((r: any) => r.llm).length > 10 && !expandedPersona && (
                <button
                  onClick={() => setExpandedPersona("__show_all__")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Show all {results.filter((r: any) => r.llm).length} reactions...
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
                  const hasLLM = r.llm;
                  return (
                    <div key={r.personaId} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-5 text-right">{i + 1}</span>
                      <span className="text-xs font-medium w-40 truncate">{p?.label ?? r.personaId}</span>
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.abs(bd.finalScore) * 50 + 50}%`,
                            backgroundColor: scoreColor(bd.finalScore),
                          }}
                        />
                        {hasLLM && (
                          <div
                            className="absolute top-0 h-full w-0.5 bg-foreground/50"
                            style={{ left: `${Math.abs(r.llm.score) * 50 + 50}%` }}
                            title={`LLM: ${r.llm.score.toFixed(2)}`}
                          />
                        )}
                      </div>
                      <span className="text-xs font-mono w-12 text-right">{bd.finalScore.toFixed(2)}</span>
                      {hasLLM && (
                        <span className="text-[10px] font-mono text-muted-foreground w-12 text-right" title="LLM score">
                          ({r.llm.score.toFixed(2)})
                        </span>
                      )}
                      {hasRisk && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
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
                  <th className="text-center p-1.5 font-medium text-muted-foreground">Formula</th>
                  {isHybrid && <th className="text-center p-1.5 font-medium text-muted-foreground">LLM</th>}
                  {isHybrid && <th className="text-center p-1.5 font-medium text-muted-foreground">Δ</th>}
                  <th className="text-center p-1.5 font-medium text-muted-foreground">Dominant</th>
                  <th className="text-left p-1.5 font-medium text-muted-foreground">Risk Flags</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 60).map((r: any, i: number) => {
                  const bd = r.breakdown;
                  const comp = r.comparison;
                  return (
                    <tr key={i} className="border-t border-border/20">
                      <td className="p-1.5 truncate max-w-[120px]">{personaMap[r.personaId]?.label ?? r.personaId}</td>
                      <td className="p-1.5 truncate max-w-[120px]">{campaignMap[r.campaignId]?.name ?? r.campaignId}</td>
                      <td className="text-center p-1.5 font-mono">{bd.s1Score?.toFixed(2) ?? "—"}</td>
                      <td className="text-center p-1.5 font-mono">{bd.s2Score?.toFixed(2) ?? "—"}</td>
                      <td className="text-center p-1.5 font-mono font-bold">{bd.finalScore.toFixed(2)}</td>
                      {isHybrid && (
                        <td className="text-center p-1.5 font-mono font-bold">
                          {r.llm ? r.llm.score.toFixed(2) : "—"}
                        </td>
                      )}
                      {isHybrid && (
                        <td className="text-center p-1.5 font-mono">
                          {comp ? (
                            <span className={comp.agreement === "aligned" ? "text-green-600" : "text-amber-600"}>
                              {comp.delta.toFixed(2)}
                            </span>
                          ) : "—"}
                        </td>
                      )}
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
