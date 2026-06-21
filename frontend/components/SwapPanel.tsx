"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ApiError,
  executeSwap,
  getKyc,
  getSwapHistory,
  getSwapTokens,
  sponsorSwap,
  submitKyc,
  type KycRecord,
  type SwapRecord,
  type SwapToken,
} from "@/lib/api";
import { buildSwapKindBytes, getSwapQuote, minOutFromQuote, type SwapQuote } from "@/lib/aggregator";
import { config } from "@/lib/config";
import { getJwt, signSponsoredBytes } from "@/lib/enoki";

const SLIPPAGE = 0.01; // 1%
const QUOTE_DEBOUNCE_MS = 500;
const COMMISSION_BPS = config.swapCommissionBps;
const TREASURY = config.swapTreasuryAddress;

type Result = { kind: "success"; digest: string } | { kind: "error"; message: string };

async function requireJwt(): Promise<string> {
  const jwt = await getJwt();
  if (!jwt) throw new Error("Session expired. Please sign in again.");
  return jwt;
}

function toBaseUnits(scalar: number, human: number): bigint {
  return BigInt(Math.round(human * scalar));
}

function formatBaseUnits(scalar: number, base: bigint | number): string {
  return (Number(base) / scalar).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

export default function SwapPanel({ walletAddress }: { walletAddress: string }) {
  const [kyc, setKyc] = useState<KycRecord | null>(null);
  const [kycLoading, setKycLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const [tokens, setTokens] = useState<SwapToken[]>([]);
  const [reversed, setReversed] = useState(false); // false: SUI->USDC
  const [amount, setAmount] = useState("");

  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const quoteSeq = useRef(0);

  const [swapping, setSwapping] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const [history, setHistory] = useState<SwapRecord[]>([]);

  const verified = kyc?.status === "verified";

  const { fromToken, toToken } = useMemo(() => {
    const sui = tokens.find((t) => t.symbol === "SUI") ?? null;
    const usdc = tokens.find((t) => t.symbol === "USDC") ?? null;
    return reversed
      ? { fromToken: usdc, toToken: sui }
      : { fromToken: sui, toToken: usdc };
  }, [tokens, reversed]);

  const loadKyc = useCallback(async () => {
    setKycLoading(true);
    try {
      const jwt = await requireJwt();
      setKyc(await getKyc(jwt));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setKyc(null);
    } finally {
      setKycLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const jwt = await requireJwt();
      setHistory(await getSwapHistory(jwt, { limit: 10 }));
    } catch {
      // non-fatal
    }
  }, []);

  const loadTokens = useCallback(async () => {
    try {
      const jwt = await requireJwt();
      const { tokens } = await getSwapTokens(jwt);
      setTokens(tokens);
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to load swap tokens.",
      });
    }
  }, []);

  useEffect(() => {
    void loadKyc();
    void loadTokens();
    void loadHistory();
  }, [loadKyc, loadTokens, loadHistory]);

  // Debounced live quote.
  useEffect(() => {
    setQuote(null);
    setQuoteError(null);
    const humanAmount = Number(amount);
    if (!fromToken || !toToken || !Number.isFinite(humanAmount) || humanAmount <= 0) {
      return;
    }
    const seq = ++quoteSeq.current;
    setQuoting(true);
    const timer = setTimeout(async () => {
      try {
        const q = await getSwapQuote({
          tokenIn: fromToken.type,
          tokenOut: toToken.type,
          amountIn: toBaseUnits(fromToken.scalar, humanAmount),
          commissionBps: COMMISSION_BPS,
        });
        if (quoteSeq.current === seq) setQuote(q);
      } catch (err) {
        if (quoteSeq.current === seq) {
          setQuoteError(err instanceof Error ? err.message : "Failed to fetch quote.");
        }
      } finally {
        if (quoteSeq.current === seq) setQuoting(false);
      }
    }, QUOTE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [amount, fromToken, toToken]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const jwt = await requireJwt();
      setKyc(await submitKyc(jwt, { country: "US" }));
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "KYC submission failed.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSwap = async () => {
    setResult(null);
    if (!fromToken || !toToken || !quote) return;
    const humanAmount = Number(amount);
    if (!Number.isFinite(humanAmount) || humanAmount <= 0) {
      setResult({ kind: "error", message: "Enter a valid amount greater than 0." });
      return;
    }

    setSwapping(true);
    try {
      const jwt = await requireJwt();

      setStep("Building route…");
      const txBytes = await buildSwapKindBytes({
        quote,
        accountAddress: walletAddress,
        slippage: SLIPPAGE,
        treasuryAddress: TREASURY || undefined,
      });

      setStep("Sponsoring…");
      const sponsored = await sponsorSwap(jwt, {
        tx_bytes: txBytes,
        from_coin: fromToken.symbol,
        to_coin: toToken.symbol,
        amount_in: Number(toBaseUnits(fromToken.scalar, humanAmount)),
        min_out: Number(minOutFromQuote(quote, SLIPPAGE)),
      });

      setStep("Signing with zkLogin…");
      const signature = await signSponsoredBytes(sponsored.bytes);

      setStep("Executing…");
      const { digest } = await executeSwap(jwt, sponsored.digest, signature);

      setResult({ kind: "success", digest });
      setAmount("");
      setQuote(null);
      void loadHistory();
    } catch (err) {
      if (err instanceof ApiError && err.code === "kyc_required") {
        setResult({
          kind: "error",
          message: "Swaps require a verified identity. Verify below and retry.",
        });
        await loadKyc();
      } else {
        setResult({
          kind: "error",
          message: err instanceof Error ? err.message : "Swap failed.",
        });
      }
    } finally {
      setSwapping(false);
      setStep(null);
    }
  };

  return (
    <div className="mt-6 border-t border-slate-800 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Swap</h2>
        <KycBadge loading={kycLoading} status={kyc?.status ?? "none"} />
      </div>

      {!verified && (
        <div className="mb-4 rounded-lg border border-amber-900/40 bg-amber-950/30 p-3 text-xs text-amber-200">
          <p>Swaps are gated by KYC. Run the stub verification to enable them.</p>
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
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-slate-500">
              You pay{fromToken ? ` (${fromToken.symbol})` : ""}
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.0"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setReversed((r) => !r)}
            title="Reverse direction"
            className="mb-0.5 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            ⇅
          </button>
          <div className="flex-1">
            <label className="text-xs text-slate-500">
              You receive{toToken ? ` (${toToken.symbol})` : ""}
            </label>
            <div className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
              {quoting
                ? "Quoting…"
                : quote && toToken
                  ? `≈ ${formatBaseUnits(toToken.scalar, quote.expectedOut)}`
                  : "—"}
            </div>
          </div>
        </div>

        {quote?.priceImpact != null && (
          <p className="text-xs text-slate-500">
            Fee: {(COMMISSION_BPS / 100).toFixed(2)}% · Price impact:{" "}
            {(quote.priceImpact * 100).toFixed(2)}% · Max slippage:{" "}
            {(SLIPPAGE * 100).toFixed(1)}%
          </p>
        )}
        {quoteError && (
          <p className="text-xs text-red-300">{quoteError}</p>
        )}

        <button
          onClick={handleSwap}
          disabled={swapping || !verified || !quote}
          className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
        >
          {swapping
            ? (step ?? "Swapping…")
            : fromToken && toToken
              ? `Swap ${fromToken.symbol} for ${toToken.symbol}`
              : "Swap"}
        </button>
      </div>

      {result?.kind === "success" && (
        <div className="mt-4 rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-3 text-xs text-emerald-200">
          <p className="font-medium">Swap executed</p>
          <p className="mt-1 break-all font-mono">{result.digest}</p>
        </div>
      )}
      {result?.kind === "error" && (
        <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300">
          {result.message}
        </div>
      )}

      <SwapHistory records={history} tokens={tokens} />
    </div>
  );
}

function SwapHistory({ records, tokens }: { records: SwapRecord[]; tokens: SwapToken[] }) {
  if (records.length === 0) return null;
  const scalarFor = (symbol: string) =>
    tokens.find((t) => t.symbol === symbol)?.scalar ?? 1_000_000;
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Recent swaps
      </h3>
      <ul className="space-y-2">
        {records.map((r) => (
          <li
            key={r.uid}
            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs"
          >
            <div>
              <p className="font-medium text-slate-300">
                {formatBaseUnits(scalarFor(r.from_coin), r.amount_in)} {r.from_coin} →{" "}
                {r.to_coin}
              </p>
              <p className="text-slate-500">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            <StatusPill status={r.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusPill({ status }: { status: SwapRecord["status"] }) {
  const styles: Record<SwapRecord["status"], string> = {
    pending: "border-slate-700 text-slate-400",
    sponsored: "border-amber-900/50 text-amber-300",
    executed: "border-emerald-900/50 text-emerald-300",
    failed: "border-red-900/50 text-red-300",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}

function KycBadge({
  loading,
  status,
}: {
  loading: boolean;
  status: KycRecord["status"];
}) {
  if (loading) return <span className="text-xs text-slate-500">Checking KYC…</span>;
  const styles: Record<KycRecord["status"], string> = {
    none: "border-slate-700 text-slate-400",
    pending: "border-amber-900/50 text-amber-300",
    verified: "border-emerald-900/50 text-emerald-300",
    rejected: "border-red-900/50 text-red-300",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}
