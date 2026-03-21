import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Target } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function GroundTruth() {
  const { data: gtList, isLoading: loadingGT } = trpc.groundTruth.list.useQuery();
  const { data: campaigns } = trpc.campaigns.list.useQuery();
  const { data: personas } = trpc.personas.list.useQuery();
  const utils = trpc.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [segmentScores, setSegmentScores] = useState<Record<string, string>>({});
  const [dataSource, setDataSource] = useState("");

  const createMutation = trpc.groundTruth.create.useMutation({
    onSuccess: () => {
      utils.groundTruth.list.invalidate();
      toast.success("Ground truth data saved");
      setShowForm(false);
      setSegmentScores({});
      setSelectedCampaignId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const personaMap = useMemo(() => {
    const m: Record<number, any> = {};
    if (personas) for (const p of personas) m[p.id] = p;
    return m;
  }, [personas]);

  const handleSubmit = () => {
    if (!selectedCampaignId) {
      toast.error("Select a campaign");
      return;
    }
    const parsed: Record<string, number> = {};
    for (const [k, v] of Object.entries(segmentScores)) {
      if (v.trim() !== "") {
        const n = parseFloat(v);
        if (!isNaN(n) && n >= -1 && n <= 1) {
          parsed[k] = n;
        }
      }
    }
    if (Object.keys(parsed).length === 0) {
      toast.error("Enter at least one segment score");
      return;
    }
    createMutation.mutate({
      campaignId: selectedCampaignId,
      segmentResults: parsed,
      dataSource: dataSource || undefined,
    });
  };

  if (loadingGT) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Ground Truth</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real performance data for calibration loop
          </p>
        </div>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:opacity-90 text-xs"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Data
        </Button>
      </div>

      {/* Input Form */}
      {showForm && (
        <Card className="border border-primary/30 shadow-none">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              New Ground Truth Entry
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Campaign</Label>
                <Select
                  value={selectedCampaignId ? String(selectedCampaignId) : ""}
                  onValueChange={v => setSelectedCampaignId(Number(v))}
                >
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select campaign" /></SelectTrigger>
                  <SelectContent>
                    {campaigns?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Data Source</Label>
                <Input
                  value={dataSource}
                  onChange={e => setDataSource(e.target.value)}
                  placeholder="e.g. Meta Ads Manager"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {selectedCampaignId && personas && (
              <div className="space-y-2">
                <Label className="text-xs">Segment Scores (-1.0 to +1.0)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {personas.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-32 truncate">{p.label}</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="-1"
                        max="1"
                        value={segmentScores[String(p.id)] ?? ""}
                        onChange={e => setSegmentScores(prev => ({ ...prev, [String(p.id)]: e.target.value }))}
                        className="h-7 text-xs w-20"
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="bg-primary text-primary-foreground hover:opacity-90 text-xs"
            >
              {createMutation.isPending ? "Saving..." : "Save Ground Truth"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Existing Ground Truth */}
      {gtList && gtList.length > 0 ? (
        <div className="space-y-3">
          {gtList.map((gt: any) => {
            const segResults = gt.segmentResults as Record<string, number>;
            const campaign = campaigns?.find((c: any) => c.id === gt.campaignId);
            return (
              <Card key={gt.id} className="border border-border/50 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold tracking-[-0.02em]">
                        {campaign?.name ?? `Campaign #${gt.campaignId}`}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {gt.dataSource ?? "—"} · {new Date(gt.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(segResults).map(([pId, score]) => (
                      <span key={pId} className="text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded">
                        {personaMap[Number(pId)]?.label?.slice(0, 15) ?? pId}: {Number(score).toFixed(2)}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        !showForm && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No ground truth data yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Add real campaign performance data to enable calibration
            </p>
          </div>
        )
      )}
    </div>
  );
}
