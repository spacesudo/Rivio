"use client";

import { useCallback, useEffect, useState } from "react";

import { getAssets, type WalletAssets } from "@/lib/api";
import { getJwt } from "@/lib/enoki";

function formatAmount(value: string, maxDecimals: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

function formatUsd(value: string | null): string | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function BalancePanel() {
  const [assets, setAssets] = useState<WalletAssets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const jwt = await getJwt();
      if (!jwt) throw new Error("Session expired. Please sign in again.");
      const data = await getAssets(jwt);
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load balances.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mt-6 border-t border-slate-800 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Balances
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-slate-400 transition hover:text-slate-200 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300">
          {error}
        </div>
      ) : (
        <>
          <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total worth</p>
            {loading && !assets ? (
              <div className="mt-2 h-6 w-28 animate-pulse rounded bg-slate-800" />
            ) : (
              <p className="mt-1 text-2xl font-semibold">
                {assets ? (formatUsd(assets.total_usd) ?? "—") : "—"}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(assets?.assets ?? [null, null]).map((a, i) => (
              <BalanceCard
                key={a?.symbol ?? i}
                symbol={a?.symbol ?? (i === 0 ? "SUI" : "USDC")}
                amount={a ? formatAmount(a.balance, a.symbol === "SUI" ? 9 : 6) : "—"}
                usdValue={a ? formatUsd(a.usd_value) : null}
                loading={loading && !assets}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BalanceCard({
  symbol,
  amount,
  usdValue,
  loading,
}: {
  symbol: string;
  amount: string;
  usdValue: string | null;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{symbol}</p>
      {loading ? (
        <div className="mt-2 h-5 w-20 animate-pulse rounded bg-slate-800" />
      ) : (
        <>
          <p className="mt-1 break-all text-lg font-semibold">{amount}</p>
          {usdValue && <p className="text-xs text-slate-500">{usdValue}</p>}
        </>
      )}
    </div>
  );
}
