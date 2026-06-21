"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ApiError,
  executeLending,
  getKyc,
  getLendingAssets,
  getLendingHistory,
  sponsorLending,
  submitKyc,
  type KycRecord,
  type LendingActionType,
  type LendingAsset,
  type LendingPosition,
} from "@/lib/api";
import {
  buildLendingKindBytes,
  getMarket,
  getUserLending,
  type LendingMarket,
  type UserLending,
} from "@/lib/navi";
import { getJwt, signSponsoredBytes } from "@/lib/enoki";

type Result = { kind: "success"; digest: string } | { kind: "error"; message: string };

const ACTIONS: { value: LendingActionType; label: string }[] = [
  { value: "supply", label: "Supply" },
  { value: "withdraw", label: "Withdraw" },
  { value: "borrow", label: "Borrow" },
  { value: "repay", label: "Repay" },
];

const POSITION_POLL_MS = 20_000;

type RiskTier = { level: "danger" | "warning" | "caution"; message: string };

function liquidationRisk(hf: number | null, hasDebt: boolean): RiskTier | null {
  if (hf == null || !hasDebt) return null;
  if (hf < 1.0) {
    return {
      level: "danger",
      message: `Health factor ${hf.toFixed(2)} — your position is eligible for liquidation. Repay debt or supply more collateral immediately.`,
    };
  }
  if (hf < 1.2) {
    return {
      level: "warning",
      message: `Health factor ${hf.toFixed(2)} — high liquidation risk. Repay debt or add collateral soon.`,
    };
  }
  if (hf < 1.5) {
    return {
      level: "caution",
      message: `Health factor ${hf.toFixed(2)} — approaching liquidation territory. Monitor your position.`,
    };
  }
  return null;
}

const RISK_STYLES: Record<RiskTier["level"], string> = {
  danger: "border-red-800/60 bg-red-950/50 text-red-200",
  warning: "border-amber-800/60 bg-amber-950/40 text-amber-200",
  caution: "border-yellow-800/50 bg-yellow-950/30 text-yellow-200",
};

async function requireJwt(): Promise<string> {
  const jwt = await getJwt();
  if (!jwt) throw new Error("Session expired. Please sign in again.");
  return jwt;
}

function toBaseUnits(scalar: number, human: number): bigint {
  return BigInt(Math.round(human * scalar));
}

function formatBaseUnits(scalar: number, base: bigint | number): string {
  return (Number(base) / scalar).toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function healthColor(hf: number | null): string {
  if (hf == null) return "text-slate-400";
  if (hf < 1.2) return "text-red-300";
  if (hf < 1.5) return "text-amber-300";
  return "text-emerald-300";
}

export default function LendingPanel({ walletAddress }: { walletAddress: string }) {
  const [kyc, setKyc] = useState<KycRecord | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [assets, setAssets] = useState<LendingAsset[]>([]);
  const [action, setAction] = useState<LendingActionType>("supply");
  const [assetSymbol, setAssetSymbol] = useState<string>("USDC");
  const [amount, setAmount] = useState("");

  const [market, setMarket] = useState<LendingMarket | null>(null);
  const [position, setPosition] = useState<UserLending | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<LendingPosition[]>([]);

  const verified = kyc?.status === "verified";

  const asset = useMemo(
    () => assets.find((a) => a.symbol === assetSymbol) ?? null,
    [assets, assetSymbol],
  );

  const symbolByCoinType = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of assets) map[a.type] = a.symbol;
    return map;
  }, [assets]);

  const risk = useMemo(() => {
    if (!position) return null;
    const hasDebt = position.positions.some((p) => p.borrowed > 0);
    return liquidationRisk(position.healthFactor, hasDebt);
  }, [position]);

  const loadKyc = useCallback(async () => {
    try {
      const jwt = await requireJwt();
      setKyc(await getKyc(jwt));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setKyc(null);
    }
  }, []);

  const loadAssets = useCallback(async () => {
    try {
      const jwt = await requireJwt();
      const { assets } = await getLendingAssets(jwt);
      setAssets(assets);
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to load lending assets.",
      });
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const jwt = await requireJwt();
      setHistory(await getLendingHistory(jwt, { limit: 10 }));
    } catch {
      // non-fatal
    }
  }, []);

  const loadPosition = useCallback(async () => {
    if (Object.keys(symbolByCoinType).length === 0) return;
    try {
      setPosition(await getUserLending(walletAddress, symbolByCoinType));
    } catch {
      // non-fatal (e.g. no position yet, or non-mainnet network)
    }
  }, [walletAddress, symbolByCoinType]);

  useEffect(() => {
    void loadKyc();
    void loadAssets();
    void loadHistory();
  }, [loadKyc, loadAssets, loadHistory]);

  useEffect(() => {
    void loadPosition();
  }, [loadPosition]);

  useEffect(() => {
    const id = setInterval(() => {
      void loadPosition();
    }, POSITION_POLL_MS);
    return () => clearInterval(id);
  }, [loadPosition]);

  useEffect(() => {
    setMarket(null);
    if (!asset) return;
    let active = true;
    getMarket(asset.symbol, asset.type)
      .then((m) => {
        if (active) setMarket(m);
      })
      .catch(() => {
        // non-fatal
      });
    return () => {
      active = false;
    };
  }, [asset]);

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

  const handleSubmit = async () => {
    setResult(null);
    if (!asset) return;
    const humanAmount = Number(amount);
    if (!Number.isFinite(humanAmount) || humanAmount <= 0) {
      setResult({ kind: "error", message: "Enter a valid amount greater than 0." });
      return;
    }
    const baseAmount = Number(toBaseUnits(asset.scalar, humanAmount));

    setSubmitting(true);
    try {
      const jwt = await requireJwt();

      setStep("Building transaction…");
      const txBytes = await buildLendingKindBytes({
        action,
        coinType: asset.type,
        amount: baseAmount,
        sender: walletAddress,
      });

      setStep("Sponsoring…");
      const sponsored = await sponsorLending(jwt, {
        tx_bytes: txBytes,
        action,
        asset: asset.symbol,
        amount: baseAmount,
      });

      setStep("Signing with zkLogin…");
      const signature = await signSponsoredBytes(sponsored.bytes);

      setStep("Executing…");
      const { digest } = await executeLending(jwt, sponsored.digest, signature);

      setResult({ kind: "success", digest });
      setAmount("");
      void loadHistory();
      void loadPosition();
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof Error ? err.message : "Lending action failed.",
      });
    } finally {
      setSubmitting(false);
      setStep(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Earn &amp; Borrow</h2>
        <span className="text-xs text-slate-500">Navi Protocol</span>
      </div>

      {position && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs">
          <span className="text-slate-400">Health factor</span>
          <span className={`font-medium ${healthColor(position.healthFactor)}`}>
            {position.healthFactor == null ? "—" : position.healthFactor.toFixed(2)}
          </span>
        </div>
      )}

      {risk && (
        <div className={`mb-4 rounded-lg border p-3 text-xs ${RISK_STYLES[risk.level]}`}>
          <p className="font-medium">
            {risk.level === "danger" ? "Liquidation imminent" : "Liquidation risk"}
          </p>
          <p className="mt-1">{risk.message}</p>
        </div>
      )}

      {!verified && (
        <div className="mb-4 rounded-lg border border-amber-900/40 bg-amber-950/30 p-3 text-xs text-amber-200">
          <p>Lending is gated by KYC. Run the stub verification to enable it.</p>
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
        <div className="grid grid-cols-4 gap-1.5">
          {ACTIONS.map((a) => (
            <button
              key={a.value}
              onClick={() => setAction(a.value)}
              className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                action === a.value
                  ? "bg-indigo-500 text-white"
                  : "border border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-slate-500">Amount</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.0"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <select
            value={assetSymbol}
            onChange={(e) => setAssetSymbol(e.target.value)}
            className="mb-0.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
          >
            {assets.map((a) => (
              <option key={a.symbol} value={a.symbol}>
                {a.symbol}
              </option>
            ))}
          </select>
        </div>

        {market && (
          <p className="text-xs text-slate-500">
            Supply APR: {market.supplyRate.toFixed(2)}% · Borrow APR: {market.borrowRate.toFixed(2)}%
            · Max LTV: {(market.ltv * 100).toFixed(0)}%
          </p>
        )}

        {position && position.positions.length > 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2 text-xs text-slate-400">
            {position.positions.map((p) => (
              <div key={p.coinType} className="flex justify-between py-0.5">
                <span>{p.symbol}</span>
                <span>
                  supplied {formatBaseUnits(asset?.scalar ?? 1, p.supplied)} · borrowed{" "}
                  {formatBaseUnits(asset?.scalar ?? 1, p.borrowed)}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !verified || !asset}
          className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
        >
          {submitting
            ? (step ?? "Working…")
            : asset
              ? `${ACTIONS.find((a) => a.value === action)?.label} ${asset.symbol}`
              : "Continue"}
        </button>
      </div>

      {result?.kind === "success" && (
        <div className="mt-3 break-all rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          Success · digest {result.digest}
        </div>
      )}
      {result?.kind === "error" && (
        <div className="mt-3 rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300">
          {result.message}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Recent activity</p>
          <div className="space-y-1">
            {history.map((h) => (
              <div
                key={h.uid}
                className="flex justify-between rounded-md border border-slate-800 bg-slate-900/40 px-2 py-1 text-xs text-slate-400"
              >
                <span className="capitalize">
                  {h.action} {h.asset}
                </span>
                <span className="text-slate-500">{h.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
