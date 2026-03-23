/**
 * SocialAuthFlow
 *
 * Guided flow for authenticating social media scrapers via cookie import.
 * Supports Instagram and TikTok.
 *
 * The user exports their session cookies using a browser extension
 * (EditThisCookie, Cookie-Editor, etc.) and pastes the JSON here.
 * The server validates and stores the cookies for future scraping sessions.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Instagram,
  Cookie,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Trash2,
  RefreshCw,
  Shield,
  Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = "instagram" | "tiktok";

interface SocialAuthFlowProps {
  platform?: Platform;
  onAuthenticated?: (platform: Platform, cookieCount: number) => void;
  className?: string;
}

// ─── Step instructions ────────────────────────────────────────────────────────

const INSTRUCTIONS: Record<Platform, {
  title: string;
  domain: string;
  loginUrl: string;
  steps: string[];
  extensionUrl: string;
  keySessionCookies: string[];
}> = {
  instagram: {
    title: "Instagram",
    domain: "instagram.com",
    loginUrl: "https://www.instagram.com/",
    extensionUrl: "https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm",
    keySessionCookies: ["sessionid", "ds_user_id", "csrftoken"],
    steps: [
      "Apri Instagram nel browser e accedi al tuo account",
      "Installa l'estensione <strong>Cookie-Editor</strong> (link sotto)",
      "Con Instagram aperto, clicca sull'icona dell'estensione",
      "Clicca <strong>Export → Export as JSON</strong>",
      "Copia il JSON e incollalo nel campo qui sotto",
    ],
  },
  tiktok: {
    title: "TikTok",
    domain: "tiktok.com",
    loginUrl: "https://www.tiktok.com/",
    extensionUrl: "https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm",
    keySessionCookies: ["sessionid", "tt_webid_v2", "tt_csrf_token"],
    steps: [
      "Apri TikTok nel browser e accedi al tuo account",
      "Installa l'estensione <strong>Cookie-Editor</strong> (link sotto)",
      "Con TikTok aperto, clicca sull'icona dell'estensione",
      "Clicca <strong>Export → Export as JSON</strong>",
      "Copia il JSON e incollalo nel campo qui sotto",
    ],
  },
};

// ─── Platform selector tab ────────────────────────────────────────────────────

function PlatformTab({
  platform,
  active,
  onClick,
  hasSession,
}: {
  platform: Platform;
  active: boolean;
  onClick: () => void;
  hasSession: boolean;
}) {
  const icons: Record<Platform, React.ReactNode> = {
    instagram: <Instagram className="w-4 h-4" />,
    tiktok: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
      </svg>
    ),
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {icons[platform]}
      {platform === "instagram" ? "Instagram" : "TikTok"}
      {hasSession && (
        <span className={`w-2 h-2 rounded-full ${active ? "bg-emerald-300" : "bg-emerald-500"}`} />
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SocialAuthFlow({ platform: initialPlatform = "instagram", onAuthenticated, className }: SocialAuthFlowProps) {
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [cookiesJson, setCookiesJson] = useState("");
  const [showInstructions, setShowInstructions] = useState(true);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; reason?: string; cookieCount?: number } | null>(null);

  const info = INSTRUCTIONS[platform];

  // Queries
  const instagramStatus = trpc.socialAuth.getStatus.useQuery({ platform: "instagram" }, { refetchInterval: 0 });
  const tiktokStatus = trpc.socialAuth.getStatus.useQuery({ platform: "tiktok" }, { refetchInterval: 0 });

  const statusQuery = platform === "instagram" ? instagramStatus : tiktokStatus;
  const hasSession = statusQuery.data?.hasSession ?? false;

  // Mutations
  const importMutation = trpc.socialAuth.importCookies.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.cookieCount} cookie importati per ${info.title}`);
      statusQuery.refetch();
      setCookiesJson("");
      onAuthenticated?.(platform, data.cookieCount);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = trpc.socialAuth.deleteSession.useMutation({
    onSuccess: () => {
      toast.success(`Sessione ${info.title} rimossa`);
      statusQuery.refetch();
      setVerifyResult(null);
    },
  });

  const verifyMutation = trpc.socialAuth.verifySession.useMutation({
    onSuccess: (data) => {
      setVerifyResult(data);
      if (data.valid) {
        toast.success("Sessione valida — cookie di sessione trovati");
      } else {
        toast.warning(`Sessione non valida: ${data.reason}`);
      }
    },
  });

  function handleImport() {
    if (!cookiesJson.trim()) {
      toast.error("Incolla il JSON dei cookie prima di importare");
      return;
    }
    importMutation.mutate({ platform, cookiesJson: cookiesJson.trim() });
  }

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {/* Platform selector */}
      <div className="flex gap-2">
        <PlatformTab
          platform="instagram"
          active={platform === "instagram"}
          onClick={() => { setPlatform("instagram"); setVerifyResult(null); }}
          hasSession={instagramStatus.data?.hasSession ?? false}
        />
        <PlatformTab
          platform="tiktok"
          active={platform === "tiktok"}
          onClick={() => { setPlatform("tiktok"); setVerifyResult(null); }}
          hasSession={tiktokStatus.data?.hasSession ?? false}
        />
      </div>

      {/* Session status banner */}
      {hasSession ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Sessione {info.title} attiva
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {statusQuery.data?.cookieCount} cookie salvati
                  {statusQuery.data?.savedAt && (
                    <> · salvati il {new Date(statusQuery.data.savedAt).toLocaleDateString("it-IT")}</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => verifyMutation.mutate({ platform })}
                disabled={verifyMutation.isPending}
                className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Verifica
              </button>
              <button
                onClick={() => deleteMutation.mutate({ platform })}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Rimuovi
              </button>
            </div>
          </div>
          {/* Verify result */}
          {verifyResult && (
            <div className={`mt-3 pt-3 border-t ${verifyResult.valid ? "border-emerald-200" : "border-amber-200"}`}>
              {verifyResult.valid ? (
                <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Cookie di sessione validi ({verifyResult.cookieCount} totali)
                </p>
              ) : (
                <p className="text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {verifyResult.reason}
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Nessuna sessione {info.title} salvata. Importa i cookie per abilitare lo scraping autenticato.
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowInstructions((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700"
        >
          <span className="flex items-center gap-2">
            <Cookie className="w-4 h-4 text-indigo-500" />
            Come importare i cookie di {info.title}
          </span>
          {showInstructions ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showInstructions && (
          <div className="p-4 space-y-4">
            {/* Steps */}
            <ol className="space-y-2.5">
              {info.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span
                    className="text-sm text-slate-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: step }}
                  />
                </li>
              ))}
            </ol>

            {/* Extension link */}
            <a
              href={info.extensionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors w-fit"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Installa Cookie-Editor per Chrome
            </a>

            {/* Security note */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-2">
              <Shield className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 leading-relaxed">
                I cookie vengono salvati localmente sul server e non vengono mai trasmessi a terze parti.
                Usa un account secondario dedicato allo scraping per evitare rischi sull'account principale.
                I cookie scadono automaticamente dopo 30 giorni.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cookie JSON input */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Incolla il JSON dei cookie
        </label>
        <textarea
          value={cookiesJson}
          onChange={(e) => setCookiesJson(e.target.value)}
          placeholder={`[{"name":"sessionid","value":"...","domain":".${info.domain}",...}]`}
          rows={5}
          className="w-full text-xs font-mono border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-slate-50 placeholder-slate-300"
        />
        {cookiesJson.trim() && (
          <p className="text-xs text-slate-500">
            {(() => {
              try {
                const arr = JSON.parse(cookiesJson);
                return Array.isArray(arr) ? `${arr.length} cookie rilevati` : "Formato non valido";
              } catch {
                return "JSON non valido";
              }
            })()}
          </p>
        )}
      </div>

      {/* Import button */}
      <button
        onClick={handleImport}
        disabled={importMutation.isPending || !cookiesJson.trim()}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"
      >
        {importMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Importazione in corso…
          </>
        ) : (
          <>
            <Cookie className="w-4 h-4" />
            Importa cookie {info.title}
          </>
        )}
      </button>
    </div>
  );
}
