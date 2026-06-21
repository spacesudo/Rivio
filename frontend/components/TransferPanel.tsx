"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  buildSuiTransfer,
  executeTransfer,
  getKyc,
  submitKyc,
  type KycRecord,
} from "@/lib/api";
import { getJwt, signSponsoredBytes } from "@/lib/enoki";

const MIST_PER_SUI = 1_000_000_000;

type Result = { kind: "success"; digest: string } | { kind: "error"; message: string };

async function requireJwt(): Promise<string> {
  const jwt = await getJwt();
  if (!jwt) throw new Error("Session expired. Please sign in again.");
  return jwt;
}

export default function TransferPanel() {
  const [kyc, setKyc] = useState<KycRecord | null>(null);
  const [kycLoading, setKycLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const verified = kyc?.status === "verified";

  const loadKyc = useCallback(async () => {
    setKycLoading(true);
    try {
      const jwt = await requireJwt();
      const record = await getKyc(jwt);
      setKyc(record);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setKyc(null); // no record yet
      }
      // other errors are non-fatal for the panel
    } finally {
      setKycLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKyc();
  }, [loadKyc]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const jwt = await requireJwt();
      const record = await submitKyc(jwt, { country: "US" });
      setKyc(record);
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "KYC submission failed.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSend = async () => {
    setResult(null);
    const mist = Math.round(Number(amount) * MIST_PER_SUI);
    if (!recipient.startsWith("0x")) {
      setResult({ kind: "error", message: "Recipient must be a 0x Sui address." });
      return;
    }
    if (!Number.isFinite(mist) || mist <= 0) {
      setResult({ kind: "error", message: "Enter a valid amount greater than 0." });
      return;
    }

    setSending(true);
    try {
      const jwt = await requireJwt();

      setStep("Sponsoring transaction…");
      const sponsored = await buildSuiTransfer(jwt, recipient, mist);

      setStep("Signing with zkLogin…");
      const signature = await signSponsoredBytes(sponsored.bytes);

      setStep("Executing…");
      const { digest } = await executeTransfer(jwt, sponsored.digest, signature);

      setResult({ kind: "success", digest });
      setAmount("");
    } catch (err) {
      if (err instanceof ApiError && err.code === "kyc_required") {
        setResult({
          kind: "error",
          message: "Transfers require a verified identity. Verify below and retry.",
        });
        await loadKyc();
      } else {
        setResult({
          kind: "error",
          message: err instanceof Error ? err.message : "Transfer failed.",
        });
      }
    } finally {
      setSending(false);
      setStep(null);
    }
  };

  return (
    <div className="mt-6 border-t border-slate-800 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Send SUI
        </h2>
        <KycBadge loading={kycLoading} status={kyc?.status ?? "none"} />
      </div>

      {!verified && (
        <div className="mb-4 rounded-lg border border-amber-900/40 bg-amber-950/30 p-3 text-xs text-amber-200">
          <p>Transfers are gated by KYC. Run the stub verification to enable them.</p>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="mt-2 rounded-md bg-amber-400/90 px-3 py-1.5 font-medium text-amber-950 transition hover:bg-amber-300 disabled:opacity-60"
          >
            {verifying ? "Verifying…" : "Verify identity (stub)"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="text-xs text-slate-500">Recipient address</label>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
            placeholder="0x…"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500">Amount (SUI)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.1"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !verified}
          className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
        >
          {sending ? (step ?? "Sending…") : "Send SUI"}
        </button>
      </div>

      {result?.kind === "success" && (
        <div className="mt-4 rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-3 text-xs text-emerald-200">
          <p className="font-medium">Transfer executed</p>
          <p className="mt-1 break-all font-mono">{result.digest}</p>
        </div>
      )}
      {result?.kind === "error" && (
        <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300">
          {result.message}
        </div>
      )}
    </div>
  );
}

function KycBadge({ loading, status }: { loading: boolean; status: string }) {
  if (loading) return <span className="text-xs text-slate-500">checking…</span>;
  const styles: Record<string, string> = {
    verified: "bg-emerald-500/15 text-emerald-300",
    pending: "bg-amber-500/15 text-amber-300",
    rejected: "bg-red-500/15 text-red-300",
    none: "bg-slate-700/40 text-slate-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${styles[status] ?? styles.none}`}>
      KYC: {status}
    </span>
  );
}
