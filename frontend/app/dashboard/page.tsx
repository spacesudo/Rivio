"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { IconTrendingUp, IconTrendingDown, IconActivity, IconArrowUp } from "@tabler/icons-react";

import { getJwt } from "@/lib/enoki";
import { fetchMe, getBalance, isProfileComplete, type VeloUser, type WalletBalance } from "@/lib/api";

import { ActionBar } from "@/components/ui/ActionBar";
import { AssetRow, AssetRowSkeleton, type AssetRowData } from "@/components/ui/AssetRow";
import { TxRow, TxRowSkeleton } from "@/components/ui/TxRow";
import { Sparkline } from "@/components/ui/Sparkline";
import { FloatingNav } from "@/components/layout/FloatingNav";
import { getWalletHistory, type Activity } from "@/lib/api";

function suiToUsd(sui: string | null): string | null {
  if (!sui) return null;
  const n = parseFloat(sui);
  return (n * 3.5).toFixed(2);
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<VeloUser | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const jwt = await getJwt().catch(() => null);
      if (!jwt) { router.replace("/"); return; }
      try {
        const me = await fetchMe(jwt);
        if (!isProfileComplete(me)) { router.replace("/onboarding"); return; }
        setUser(me);
        const bal = await getBalance(jwt);
        setBalance(bal);
        const hist = await getWalletHistory(jwt);
        setActivities(hist);
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const initials = user
    ? ((user.first_name?.[0] ?? "") + (user.last_name?.[0] ?? "")).toUpperCase() || user.email?.[0]?.toUpperCase() || "R"
    : undefined;

  const totalUsd = balance
    ? (parseFloat(balance.usdc) + parseFloat(suiToUsd(balance.sui) ?? "0")).toFixed(2)
    : null;

  const assets: AssetRowData[] = balance
    ? [
        { symbol: "USDC", balance: `${parseFloat(balance.usdc).toLocaleString()} USDC`, usd_value: parseFloat(balance.usdc).toFixed(2), change_pct: 0 },
        { symbol: "SUI", balance: `${parseFloat(balance.sui).toFixed(4)} SUI`, usd_value: suiToUsd(balance.sui), change_pct: 2.14 },
      ]
    : [];

  // Mock balance history for sparkline (7 days of data)
  const balanceHistory = useMemo(() => {
    if (!balance) return [];
    const currentTotal = parseFloat(balance.usdc) + parseFloat(suiToUsd(balance.sui) || "0");
    // Generate realistic-looking historical data with some variation
    return [
      currentTotal * 0.92,
      currentTotal * 0.95,
      currentTotal * 0.91,
      currentTotal * 0.98,
      currentTotal * 1.02,
      currentTotal * 0.97,
      currentTotal,
    ];
  }, [balance]);

  const recent = activities?.slice(0, 3) ?? null;

  return (
    <div className="app-bg flex min-h-screen flex-col">
      {/* Premium Header */}
      <div className="flex items-center justify-between px-6 pb-4 pt-safe pt-8">
        <div>
          <p className="text-caption text-neutral mb-1">Good morning</p>
          <h1 className="text-display text-2xl text-white">
            rivio<span className="text-primary">.</span>
          </h1>
        </div>
        {initials && (
          <button
            onClick={() => router.push("/profile")}
            className="flex h-12 w-12 items-center justify-center rounded-full glass-strong text-sm font-semibold text-white transition-all hover:scale-105"
          >
            {initials}
          </button>
        )}
      </div>

      {/* Premium Balance Card */}
      <div className="px-6 pt-2">
        <div className="hero-card p-6">
          <div className="mb-4">
            <p className="text-caption text-neutral mb-2">Total balance</p>
            {loading ? (
              <div className="h-12 w-48 animate-pulse rounded-lg bg-white/10" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-display text-4xl text-white">
                  ${totalUsd ?? "—"}
                </p>
                {balanceHistory.length > 0 && (
                  <div className="flex items-center gap-1">
                    {balanceHistory[balanceHistory.length - 1] > balanceHistory[0] ? (
                      <IconTrendingUp size={16} className="text-emerald-400" />
                    ) : (
                      <IconTrendingDown size={16} className="text-red-400" />
                    )}
                    <span className={`text-sm font-medium ${
                      balanceHistory[balanceHistory.length - 1] > balanceHistory[0] 
                        ? "text-emerald-400" 
                        : "text-red-400"
                    }`}>
                      {balanceHistory[0] === 0 ? "0.0" : Math.abs(((balanceHistory[balanceHistory.length - 1] - balanceHistory[0]) / balanceHistory[0]) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            {loading ? (
              <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
            ) : (
              <div>
                <p className="text-sm text-neutral mb-1">Portfolio breakdown</p>
                <p className="text-body text-white">
                  {balance ? `${parseFloat(balance.usdc).toLocaleString()} USDC · ${parseFloat(balance.sui).toFixed(2)} SUI` : "—"}
                </p>
              </div>
            )}
            {balanceHistory.length > 0 && (
              <div className="text-right">
                <Sparkline 
                  data={balanceHistory} 
                  width={80} 
                  height={24}
                  positive={balanceHistory[balanceHistory.length - 1] > balanceHistory[0]}
                />
                <p className="text-caption text-neutral mt-1">7 days</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium Action Bar */}
      <ActionBar />

      {/* Assets Section */}
      <div className="mt-6 flex-1 space-y-4 px-6">
        <section className="animate-rise glass-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-headline text-lg text-white">Assets</h2>
            <button className="text-primary text-sm font-medium hover:opacity-80 transition-opacity">
              View all
            </button>
          </div>
          {loading
            ? [0, 1].map((i) => <AssetRowSkeleton key={i} />)
            : assets.map((a, i) => (
                <div key={a.symbol} className={i < assets.length - 1 ? "divider" : ""}>
                  <AssetRow asset={a} />
                </div>
              ))}
        </section>

        {/* Activity Section */}
        <section className="animate-rise glass-card p-6" style={{ animationDelay: "100ms" }}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconActivity size={18} className="text-primary" />
              <h2 className="text-headline text-lg text-white">Recent activity</h2>
            </div>
            <button 
              onClick={() => router.push("/history")} 
              className="flex items-center gap-1 text-primary text-sm font-medium hover:opacity-80 transition-opacity"
            >
              See all
              <IconArrowUp size={14} className="rotate-45" />
            </button>
          </div>
          {loading ? (
            [0, 1, 2].map((i) => <TxRowSkeleton key={i} />)
          ) : recent && recent.length > 0 ? (
            recent.map((a, i) => (
              <div key={a.uid} className={i < recent.length - 1 ? "divider" : ""}>
                <TxRow activity={a} />
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
              <IconActivity size={32} className="text-neutral mx-auto mb-2" />
              <p className="text-body text-neutral">No activity yet</p>
              <p className="text-sm text-neutral mt-1">Your transactions will appear here</p>
            </div>
          )}
        </section>
      </div>

      <FloatingNav />
    </div>
  );
}
