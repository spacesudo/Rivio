"use client";

import { useState } from "react";

import { createOnrampWidget } from "@/lib/api";
import { getJwt } from "@/lib/enoki";

async function requireJwt(): Promise<string> {
  const jwt = await getJwt();
  if (!jwt) throw new Error("Session expired. Please sign in again.");
  return jwt;
}

export default function OnrampPanel() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async () => {
    setError(null);
    setWidgetUrl(null);

    const fiatAmount = amount ? Number(amount) : undefined;
    if (fiatAmount !== undefined && (!Number.isFinite(fiatAmount) || fiatAmount <= 0)) {
      setError("Enter a valid amount greater than 0.");
      return;
    }

    setLoading(true);
    try {
      const jwt = await requireJwt();
      const { widget_url } = await createOnrampWidget(jwt, {
        fiat_amount: fiatAmount,
      });
      setWidgetUrl(widget_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start buy flow.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 border-t border-slate-800 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Buy crypto
        </h2>
      </div>

      {widgetUrl ? (
        <div className="space-y-3">
          <iframe
            src={widgetUrl}
            title="Transak on-ramp"
            allow="camera;microphone;payment"
            className="h-[600px] w-full rounded-lg border border-slate-800 bg-white"
          />
          <button
            onClick={() => setWidgetUrl(null)}
            className="w-full rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">Amount (USD, optional)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="100"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={handleBuy}
            disabled={loading}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? "Loading widget…" : "Buy USDC"}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
