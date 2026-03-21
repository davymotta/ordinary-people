import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Megaphone } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Campaigns() {
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();
  const utils = trpc.useUtils();
  const deleteMutation = trpc.campaigns.delete.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      toast.success("Campaign deleted");
    },
  });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {campaigns?.length ?? 0} encoded campaigns
          </p>
        </div>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:opacity-90 text-xs"
          onClick={() => setLocation("/campaigns/new")}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> New Campaign
        </Button>
      </div>

      {campaigns && campaigns.length > 0 ? (
        <div className="space-y-3">
          {campaigns.map((c: any) => {
            const topics = (c.topics ?? []) as string[];
            return (
              <Card key={c.id} className="border border-border/50 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold tracking-[-0.02em]">{c.name}</h3>
                        <Badge variant="outline" className="text-[10px] font-mono">{c.tone}</Badge>
                        <Badge variant="outline" className="text-[10px] font-mono">{c.format}</Badge>
                        <Badge variant="outline" className="text-[10px] font-mono">{c.channel}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {topics.map((t: string) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Emotion: {(c.emotionalCharge ?? 0).toFixed(1)}</span>
                        <span>Status: {(c.statusSignal ?? 0).toFixed(1)}</span>
                        <span>Price: {(c.priceSignal ?? 0).toFixed(1)}</span>
                        <span>Novelty: {(c.noveltySignal ?? 0).toFixed(1)}</span>
                        <span>Identity: {(c.tribalIdentitySignal ?? 0).toFixed(1)}</span>
                        <span>€{c.pricePoint}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate({ id: c.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Megaphone className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No campaigns yet</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 text-xs"
            onClick={() => setLocation("/campaigns/new")}
          >
            Create your first campaign
          </Button>
        </div>
      )}
    </div>
  );
}
