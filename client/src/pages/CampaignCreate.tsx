import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const TONES = ["aspirational", "practical", "provocative", "informational", "emotional"] as const;
const FORMATS = ["short_video", "image", "long_article", "carousel", "story"] as const;
const CHANNELS = ["instagram", "facebook", "tiktok", "youtube", "linkedin", "tv", "radio", "print", "ooh", "email"];

export default function CampaignCreate() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      toast.success("Campaign created");
      setLocation("/campaigns");
    },
    onError: (err) => toast.error(err.message),
  });

  const [name, setName] = useState("");
  const [topicsStr, setTopicsStr] = useState("");
  const [tone, setTone] = useState<typeof TONES[number]>("aspirational");
  const [format, setFormat] = useState<typeof FORMATS[number]>("short_video");
  const [channel, setChannel] = useState("instagram");
  const [emotionalCharge, setEmotionalCharge] = useState(0.5);
  const [statusSignal, setStatusSignal] = useState(0.5);
  const [priceSignal, setPriceSignal] = useState(0.5);
  const [noveltySignal, setNoveltySignal] = useState(0.5);
  const [tribalIdentitySignal, setTribalIdentitySignal] = useState(0.5);
  const [pricePoint, setPricePoint] = useState(50);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const topics = topicsStr.split(",").map(t => t.trim()).filter(Boolean);
    createMutation.mutate({
      name,
      topics,
      tone,
      format,
      emotionalCharge,
      statusSignal,
      priceSignal,
      noveltySignal,
      tribalIdentitySignal,
      pricePoint,
      channel,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/campaigns")} className="h-8">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em]">Campaign Encoder</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Encode a campaign with signal vectors for simulation
        </p>
      </div>

      {/* Basic Info */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Basic Info
          </h3>
          <div className="space-y-2">
            <Label className="text-xs">Campaign Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Summer Sale 2025"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Topics (comma-separated)</Label>
            <Input
              value={topicsStr}
              onChange={e => setTopicsStr(e.target.value)}
              placeholder="e.g. fashion, sustainability, luxury"
              className="h-9 text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Tone</Label>
              <Select value={tone} onValueChange={v => setTone(v as any)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Format</Label>
              <Select value={format} onValueChange={v => setFormat(v as any)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATS.map(f => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Price Point (€)</Label>
            <Input
              type="number"
              value={pricePoint}
              onChange={e => setPricePoint(Number(e.target.value))}
              className="h-9 text-sm w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Signal Vectors */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Signal Vectors
          </h3>
          <SignalSlider label="Emotional Charge" value={emotionalCharge} onChange={setEmotionalCharge} />
          <SignalSlider label="Status Signal" value={statusSignal} onChange={setStatusSignal} />
          <SignalSlider label="Price Signal" value={priceSignal} onChange={setPriceSignal} />
          <SignalSlider label="Novelty Signal" value={noveltySignal} onChange={setNoveltySignal} />
          <SignalSlider label="Tribal Identity Signal" value={tribalIdentitySignal} onChange={setTribalIdentitySignal} />
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={createMutation.isPending}
        className="bg-primary text-primary-foreground hover:opacity-90 font-semibold"
      >
        <Save className="h-4 w-4 mr-2" />
        {createMutation.isPending ? "Saving..." : "Save Campaign"}
      </Button>
    </div>
  );
}

function SignalSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-40 shrink-0">{label}</span>
      <Slider
        value={[value]}
        onValueChange={v => onChange(v[0])}
        min={0}
        max={1}
        step={0.05}
        className="flex-1"
      />
      <span className="text-xs font-mono w-8 text-right">{value.toFixed(2)}</span>
    </div>
  );
}
