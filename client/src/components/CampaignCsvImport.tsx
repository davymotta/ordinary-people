/**
 * CampaignCsvImport
 *
 * Drag-and-drop CSV importer for:
 * - Google Ad Manager (Campaign Manager 360) exports
 * - Meta Ads Manager exports
 * - Generic campaign CSV (custom mapping)
 *
 * Parses the CSV client-side, normalizes columns, and sends the data
 * to the server via the tRPC importCampaignCsv mutation.
 */

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, CheckCircle2, AlertTriangle, X, ChevronDown, ChevronUp, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type CsvFormat = "meta" | "google" | "generic";

interface ParsedCampaignRow {
  campaignName: string;
  adSetName?: string;
  adName?: string;
  platform: string;
  startDate?: string;
  endDate?: string;
  impressions: number;
  clicks: number;
  spend: number;
  currency: string;
  ctr?: number;
  cpm?: number;
  cpc?: number;
  reach?: number;
  frequency?: number;
  videoViews?: number;
  videoViewRate?: number;
  conversions?: number;
  conversionRate?: number;
  roas?: number;
  objective?: string;
  status?: string;
  rawRow: Record<string, string>;
}

interface CsvImportProps {
  brandAgentId?: number;
  onImportComplete?: (count: number) => void;
  className?: string;
}

// ─── Column mappings ──────────────────────────────────────────────────────────

const META_COLUMN_MAP: Record<string, keyof ParsedCampaignRow> = {
  "campaign name": "campaignName",
  "ad set name": "adSetName",
  "ad name": "adName",
  "platform": "platform",
  "starts": "startDate",
  "ends": "endDate",
  "impressions": "impressions",
  "link clicks": "clicks",
  "amount spent (eur)": "spend",
  "amount spent (usd)": "spend",
  "amount spent": "spend",
  "ctr (link click-through rate)": "ctr",
  "cpm (cost per 1,000 impressions)": "cpm",
  "cpc (cost per link click)": "cpc",
  "reach": "reach",
  "frequency": "frequency",
  "3-second video plays": "videoViews",
  "video plays at 100%": "videoViews",
  "results": "conversions",
  "objective": "objective",
  "delivery": "status",
};

const GOOGLE_COLUMN_MAP: Record<string, keyof ParsedCampaignRow> = {
  "campaign": "campaignName",
  "campaign name": "campaignName",
  "ad group": "adSetName",
  "ad": "adName",
  "start date": "startDate",
  "end date": "endDate",
  "impressions": "impressions",
  "clicks": "clicks",
  "cost": "spend",
  "ctr": "ctr",
  "avg. cpm": "cpm",
  "avg. cpc": "cpc",
  "reach": "reach",
  "conversions": "conversions",
  "conv. rate": "conversionRate",
  "roas": "roas",
  "status": "status",
  "campaign type": "objective",
};

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function detectFormat(headers: string[]): CsvFormat {
  const lower = headers.map((h) => h.toLowerCase().trim());
  if (lower.some((h) => h.includes("ad set") || h.includes("amount spent"))) return "meta";
  if (lower.some((h) => h.includes("ad group") || h.includes("avg. cpm"))) return "google";
  return "generic";
}

function parseNumber(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/[^0-9.,\-]/g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);

  // Skip summary rows (Meta exports have them at the end)
  const dataLines = lines.slice(1).filter((l) => {
    const lower = l.toLowerCase();
    return !lower.startsWith("total") && !lower.startsWith("report") && !lower.startsWith("date range");
  });

  const rows = dataLines.map((line) => {
    const values = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

function normalizeRows(
  rows: Record<string, string>[],
  headers: string[],
  format: CsvFormat
): ParsedCampaignRow[] {
  const columnMap = format === "meta" ? META_COLUMN_MAP : format === "google" ? GOOGLE_COLUMN_MAP : {};
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  return rows
    .map((row) => {
      const normalized: Partial<ParsedCampaignRow> & { rawRow: Record<string, string> } = {
        rawRow: row,
        campaignName: "",
        platform: format === "meta" ? "meta" : format === "google" ? "google" : "unknown",
        impressions: 0,
        clicks: 0,
        spend: 0,
        currency: "EUR",
      };

      for (const [header, value] of Object.entries(row)) {
        const lowerHeader = header.toLowerCase().trim();
        const mappedKey = columnMap[lowerHeader];
        if (mappedKey) {
          if (["impressions", "clicks", "spend", "ctr", "cpm", "cpc", "reach", "frequency", "videoViews", "videoViewRate", "conversions", "conversionRate", "roas"].includes(mappedKey as string)) {
            (normalized as Record<string, unknown>)[mappedKey as string] = parseNumber(value);
          } else {
            (normalized as Record<string, unknown>)[mappedKey as string] = value;
          }
        }
      }

      // Detect currency from column headers
      const spendHeader = lowerHeaders.find((h) => h.includes("amount spent") || h === "cost");
      if (spendHeader?.includes("(eur)")) normalized.currency = "EUR";
      else if (spendHeader?.includes("(usd)")) normalized.currency = "USD";
      else if (spendHeader?.includes("(gbp)")) normalized.currency = "GBP";

      // Generic mapping: try to find campaign name
      if (!normalized.campaignName) {
        const nameKey = Object.keys(row).find((k) =>
          k.toLowerCase().includes("campaign") || k.toLowerCase().includes("nome")
        );
        if (nameKey) normalized.campaignName = row[nameKey] ?? "";
      }

      return normalized as ParsedCampaignRow;
    })
    .filter((r) => r.campaignName || r.impressions > 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CampaignCsvImport({ brandAgentId, onImportComplete, className = "" }: CsvImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedCampaignRow[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<CsvFormat | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "parsing" | "ready" | "importing" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const importMutation = trpc.scrapers.importCampaignCsv.useMutation({
    onSuccess: (data) => {
      setImportStatus("done");
      toast.success(`${data.imported} campagne importate con successo`);
      onImportComplete?.(data.imported);
    },
    onError: (err) => {
      setImportStatus("error");
      setErrorMessage(err.message);
      toast.error(`Errore importazione: ${err.message}`);
    },
  });

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".tsv") && !file.name.endsWith(".txt")) {
      setErrorMessage("Formato non supportato. Carica un file .csv o .tsv");
      setImportStatus("error");
      return;
    }

    setFileName(file.name);
    setImportStatus("parsing");
    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { headers, rows } = parseCsvText(text);

        if (rows.length === 0) {
          setErrorMessage("Il file è vuoto o il formato non è riconoscibile");
          setImportStatus("error");
          return;
        }

        const format = detectFormat(headers);
        const normalized = normalizeRows(rows, headers, format);

        setDetectedFormat(format);
        setParsedRows(normalized);
        setImportStatus("ready");
      } catch (err) {
        setErrorMessage(`Errore parsing: ${String(err)}`);
        setImportStatus("error");
      }
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleImport = () => {
    if (!parsedRows.length) return;
    setImportStatus("importing");

    importMutation.mutate({
      brandAgentId: brandAgentId ?? null,
      format: detectedFormat ?? "generic",
      rows: parsedRows.map((r) => ({
        campaignName: r.campaignName,
        adSetName: r.adSetName ?? null,
        adName: r.adName ?? null,
        platform: r.platform,
        startDate: r.startDate ?? null,
        endDate: r.endDate ?? null,
        impressions: r.impressions,
        clicks: r.clicks,
        spend: r.spend,
        currency: r.currency,
        ctr: r.ctr ?? null,
        cpm: r.cpm ?? null,
        cpc: r.cpc ?? null,
        reach: r.reach ?? null,
        frequency: r.frequency ?? null,
        videoViews: r.videoViews ?? null,
        conversions: r.conversions ?? null,
        roas: r.roas ?? null,
        objective: r.objective ?? null,
        status: r.status ?? null,
      })),
    });
  };

  const handleReset = () => {
    setParsedRows([]);
    setDetectedFormat(null);
    setFileName("");
    setImportStatus("idle");
    setErrorMessage("");
    setShowPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatLabel: Record<CsvFormat, string> = {
    meta: "Meta Ads Manager",
    google: "Google Ad Manager / Campaign Manager 360",
    generic: "CSV Generico",
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
          <FileText className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Importa Storico Campagne</p>
          <p className="text-xs text-slate-500">CSV da Meta Ads Manager o Google Ad Manager</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Esporta il report campagne da <strong>Meta Ads Manager → Colonne → Esporta</strong> o da{" "}
          <strong>Google Campaign Manager 360 → Report → Scarica CSV</strong>. Il sistema rileva il formato automaticamente.
        </p>
      </div>

      {/* Drop zone */}
      {importStatus === "idle" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-indigo-400 bg-indigo-50"
              : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
          }`}
        >
          <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? "text-indigo-500" : "text-slate-400"}`} />
          <p className="text-sm font-medium text-slate-700">
            Trascina qui il file CSV
          </p>
          <p className="text-xs text-slate-400 mt-1">oppure clicca per selezionare</p>
          <p className="text-xs text-slate-400 mt-2">.csv · .tsv · .txt</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Parsing state */}
      {importStatus === "parsing" && (
        <div className="border border-slate-200 rounded-xl p-6 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-600">Analisi del file in corso…</p>
        </div>
      )}

      {/* Error state */}
      {importStatus === "error" && (
        <div className="border border-red-200 bg-red-50 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">Errore</p>
            <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
          </div>
          <button onClick={handleReset} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Ready state */}
      {(importStatus === "ready" || importStatus === "importing") && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {/* Summary bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-xs font-semibold text-slate-700">{fileName}</p>
                <p className="text-xs text-slate-500">
                  {detectedFormat && formatLabel[detectedFormat]} · {parsedRows.length} righe
                </p>
              </div>
            </div>
            <button onClick={handleReset} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 px-4 py-3">
            <div className="text-center px-2">
              <p className="text-lg font-bold text-slate-800">
                {parsedRows.reduce((s, r) => s + r.impressions, 0).toLocaleString("it-IT")}
              </p>
              <p className="text-xs text-slate-500">Impressioni totali</p>
            </div>
            <div className="text-center px-2">
              <p className="text-lg font-bold text-slate-800">
                {parsedRows.reduce((s, r) => s + r.clicks, 0).toLocaleString("it-IT")}
              </p>
              <p className="text-xs text-slate-500">Click totali</p>
            </div>
            <div className="text-center px-2">
              <p className="text-lg font-bold text-slate-800">
                {parsedRows.reduce((s, r) => s + r.spend, 0).toFixed(0)}
                {" "}{parsedRows[0]?.currency ?? "EUR"}
              </p>
              <p className="text-xs text-slate-500">Spesa totale</p>
            </div>
          </div>

          {/* Preview toggle */}
          <div className="border-t border-slate-100">
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-500 hover:bg-slate-50"
            >
              <span>Anteprima righe ({Math.min(parsedRows.length, 5)} di {parsedRows.length})</span>
              {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showPreview && (
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Campagna</th>
                      <th className="text-right px-3 py-2 text-slate-500 font-medium">Impressioni</th>
                      <th className="text-right px-3 py-2 text-slate-500 font-medium">Click</th>
                      <th className="text-right px-3 py-2 text-slate-500 font-medium">Spesa</th>
                      <th className="text-right px-3 py-2 text-slate-500 font-medium">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate">
                          {row.campaignName || "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {row.impressions.toLocaleString("it-IT")}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {row.clicks.toLocaleString("it-IT")}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {row.spend.toFixed(2)} {row.currency}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {row.ctr ? `${row.ctr.toFixed(2)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Import button */}
          <div className="border-t border-slate-100 p-4">
            <button
              onClick={handleImport}
              disabled={importStatus === "importing"}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
            >
              {importStatus === "importing" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importazione in corso…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Importa {parsedRows.length} campagne
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Done state */}
      {importStatus === "done" && (
        <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-700">Importazione completata</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {parsedRows.length} campagne importate nel database
            </p>
          </div>
          <button onClick={handleReset} className="text-emerald-400 hover:text-emerald-600 text-xs underline">
            Importa altro
          </button>
        </div>
      )}
    </div>
  );
}
