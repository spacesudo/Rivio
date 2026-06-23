"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconInfoCircle, IconTrendingUp, IconTrendingDown } from "@tabler/icons-react";

import { getJwt, signSponsoredBytes } from "@/lib/enoki";
import {
  getLendingAssets,
  sponsorLending,
  executeLending,
  getBalance,
  type LendingAsset,
  type LendingActionType,
  type WalletBalance,
} from "@/lib/api";
import { buildLendingKindBytes, getUserLending, getMarket, type LendingMarket, type UserLending } from "@/lib/navi";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { AmountInput } from "@/components/ui/AmountInput";
import { TokenSelector } from "@/components/ui/TokenSelector";
import { HealthBar } from "@/components/ui/HealthBar";
import { FloatingNav } from "@/components/layout/FloatingNav";

const TABS: LendingActionType[] = ["supply", "borrow", "repay", "withdraw"];

function formatApy(rate: number): string {
  // Rate is already in percentage form from Navi SDK
  return `${rate.toFixed(2)}%`;
}

function formatBalance(balance: number, scalar: number, symbol: string): string {
  const human = balance / scalar;
  return symbol === "USDC" ? human.toFixed(2) : human.toFixed(4);
}

export default function BorrowPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [tab, setTab] = useState<LendingActionType>("supply");
  const [assets, setAssets] = useState<LendingAsset[]>([]);
  const [assetSym, setAssetSym] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [healthFactor, setHealthFactor] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [market, setMarket] = useState<LendingMarket | null>(null);
  const [userLending, setUserLending] = useState<UserLending | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);

  useEffect(() => {
    (async () => {
      const jwt = await getJwt().catch(() => null);
      if (!jwt) { router.replace("/"); return; }
      
      try {
        const [assetsData, me, walletBalance] = await Promise.all([
          getLendingAssets(jwt),
          import("@/lib/api").then((m) => m.fetchMe(jwt)),
          getBalance(jwt),
        ]);
        
        setAssets(assetsData.assets);
        setBalance(walletBalance);
        if (me) {
          setWalletAddress(me.wallet_address);
          
          const symbolByCoinType = assetsData.assets.reduce((acc, asset) => {
            acc[asset.type] = asset.symbol;
            return acc;
          }, {} as Record<string, string>);
          
          const [userState, hf] = await Promise.all([
            getUserLending(me.wallet_address, symbolByCoinType).catch(() => null),
            getUserLending(me.wallet_address, symbolByCoinType).then(state => state.healthFactor).catch(() => null),
          ]);
          
          if (userState) setUserLending(userState);
          if (hf != null) setHealthFactor(hf);
        }
      } catch {
        // Keep empty state on error
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!assetSym || assets.length === 0) return;
    
    const selectedAsset = assets.find((a) => a.symbol === assetSym);
    if (!selectedAsset) return;
    
    (async () => {
      try {
        const marketData = await getMarket(assetSym, selectedAsset.type);
        setMarket(marketData);
      } catch {
        setMarket(null);
      }
    })();
  }, [assetSym, assets]);

  const selectedAsset = assets.find((a) => a.symbol === assetSym);
  const userPosition = userLending?.positions.find((p) => p.symbol === assetSym);

  const currentBalance = balance && selectedAsset 
    ? (assetSym === "USDC" ? parseFloat(balance.usdc) : parseFloat(balance.sui))
    : 0;
  const enteredAmount = parseFloat(amount) || 0;
  const hasInsufficientBalance = (tab === "supply" || tab === "repay") && enteredAmount > currentBalance && currentBalance > 0;

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) { toast("Enter an amount.", "error"); return; }
    if (!walletAddress || !selectedAsset) { toast("Not ready.", "error"); return; }
    
    if ((tab === "supply" || tab === "repay") && balance) {
      const currentBalance = assetSym === "USDC" ? parseFloat(balance.usdc) : parseFloat(balance.sui);
      const enteredAmount = parseFloat(amount);
      if (enteredAmount > currentBalance) {
        toast(`Insufficient balance. You have ${currentBalance.toFixed(assetSym === "USDC" ? 2 : 4)} ${assetSym}.`, "error");
        return;
      }
    }
    
    if (tab === "borrow" && healthFactor !== null && healthFactor < 1.1) {
      toast("Health factor too low to borrow more.", "error");
      return;
    }
    if ((tab === "withdraw" || tab === "repay") && (!userPosition || (userPosition.supplied === 0 && userPosition.borrowed === 0))) {
      toast("No position to withdraw/repay.", "error");
      return;
    }
    
    setBusy(true);
    try {
      const jwt = await getJwt();
      if (!jwt) throw new Error("Not signed in.");
      const rawAmount = Math.round(parseFloat(amount) * selectedAsset.scalar);
      const txBytes = await buildLendingKindBytes({ action: tab, coinType: selectedAsset.type, amount: rawAmount, sender: walletAddress });
      const sponsored = await sponsorLending(jwt, {
        tx_bytes: txBytes,
        action: tab,
        asset: assetSym,
        amount: rawAmount,
      });
      const signature = await signSponsoredBytes(sponsored.bytes);
      await executeLending(jwt, sponsored.digest, signature);
      toast(`${tab.charAt(0).toUpperCase() + tab.slice(1)} complete!`, "success");
      setAmount("");
      
      if (walletAddress) {
        const symbolByCoinType = assets.reduce((acc, asset) => {
          acc[asset.type] = asset.symbol;
          return acc;
        }, {} as Record<string, string>);
        
        const [newState, newHf] = await Promise.all([
          getUserLending(walletAddress, symbolByCoinType).catch(() => null),
          getUserLending(walletAddress, symbolByCoinType).then(state => state.healthFactor).catch(() => null),
        ]);
        
        if (newState) setUserLending(newState);
        if (newHf != null) setHealthFactor(newHf);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Transaction failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const tabLabel: Record<LendingActionType, string> = {
    supply: "Supply collateral",
    borrow: "Borrow",
    repay: "Repay loan",
    withdraw: "Withdraw",
  };

  const ctaLabel: Record<LendingActionType, string> = {
    supply: "Supply",
    borrow: "Borrow",
    repay: "Repay",
    withdraw: "Withdraw",
  };

  return (
    <div className="app-bg flex min-h-screen flex-col pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pb-4 pt-safe pt-8">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-full glass-strong text-neutral transition-all hover:scale-105"
        >
          <IconArrowLeft size={20} />
        </button>
        <h1 className="text-headline text-xl text-white">Borrow & Lend</h1>
        <div className="flex-1" />
        <div className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
      </div>

      <div className="flex-1 px-6">
        {/* Tab selector */}
        <div className="glass-card animate-rise mb-4 flex rounded-btn p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-btn py-2.5 text-xs font-semibold capitalize transition-all ${
                tab === t
                  ? "bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg"
                  : "text-neutral hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Health factor */}
        <div className="glass-card animate-rise mb-3 p-4" style={{ animationDelay: "40ms" }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-white/50">Health Factor</span>
            {loading ? (
              <Skeleton className="h-4 w-12 rounded" />
            ) : (
              <span className={`text-sm font-semibold ${
                healthFactor === null ? "text-white/40" :
                healthFactor < 1.1 ? "text-red-400" :
                healthFactor < 1.5 ? "text-amber-400" :
                "text-emerald-400"
              }`}>
                {healthFactor === null ? "—" : healthFactor.toFixed(2)}
              </span>
            )}
          </div>
          <HealthBar value={healthFactor} />
        </div>

        {/* Position summary */}
        {userPosition && (userPosition.supplied > 0 || userPosition.borrowed > 0) && (
          <div className="glass-card animate-rise mb-3 p-4" style={{ animationDelay: "60ms" }}>
            <h3 className="mb-3 text-xs font-medium text-white/50">Your Position</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <IconTrendingUp size={12} />
                  <span className="text-xs font-medium">Supplied</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatBalance(userPosition.supplied, selectedAsset?.scalar || 1_000_000, assetSym)}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-red-400">
                  <IconTrendingDown size={12} />
                  <span className="text-xs font-medium">Borrowed</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatBalance(userPosition.borrowed, selectedAsset?.scalar || 1_000_000, assetSym)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main form */}
        <div className="animate-rise space-y-3" style={{ animationDelay: "80ms" }}>
          {/* Asset selector with APY */}
          <div className="glass-card p-4">
            <label className="mb-2 block text-xs font-medium text-white/50">Asset</label>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {loading ? (
                  <Skeleton className="h-10 w-full rounded-pill" />
                ) : (
                  <TokenSelector
                    tokens={assets}
                    value={assetSym}
                    onChange={setAssetSym}
                  />
                )}
              </div>
            </div>
            {market && (
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-white/50">Supply APY</span>
                  <p className="text-sm font-semibold text-emerald-400">{formatApy(market.supplyRate)}</p>
                </div>
                <div>
                  <span className="text-xs text-white/50">Borrow APY</span>
                  <p className="text-sm font-semibold text-red-400">{formatApy(market.borrowRate)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Amount input */}
          <div className="glass-card p-4">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-white/50">
                {tabLabel[tab]}
              </label>
              {userPosition && (
                <button
                  onClick={() => {
                    const max = tab === "supply" || tab === "repay" 
                      ? userPosition.supplied 
                      : userPosition.borrowed;
                    if (max > 0 && selectedAsset) {
                      setAmount(formatBalance(max, selectedAsset.scalar, assetSym));
                    }
                  }}
                  className="text-xs text-primary hover:opacity-80 transition-opacity"
                >
                  MAX
                </button>
              )}
            </div>
            <AmountInput value={amount} onChange={setAmount} placeholder="0.00" disabled={busy} />
            {(tab === "supply" || tab === "repay") && balance && selectedAsset && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-white/40">Available</span>
                <span className={`text-xs font-medium ${
                  hasInsufficientBalance ? "text-red-400" : "text-white/60"
                }`}>
                  {currentBalance.toFixed(assetSym === "USDC" ? 2 : 4)} {assetSym}
                </span>
              </div>
            )}
          </div>

          {/* Warnings */}
          {hasInsufficientBalance && (
            <div className="flex items-start gap-2 rounded-card bg-red-500/15 px-4 py-3 text-xs text-red-300" style={{ border: "0.5px solid rgba(239,68,68,0.4)" }}>
              <IconInfoCircle size={14} className="mt-0.5 shrink-0" />
              <span>Insufficient balance. You need {enteredAmount.toFixed(assetSym === "USDC" ? 2 : 4)} {assetSym} but only have {currentBalance.toFixed(assetSym === "USDC" ? 2 : 4)} {assetSym}.</span>
            </div>
          )}

          {tab === "borrow" && healthFactor != null && healthFactor < 1.5 && (
            <div className="flex items-start gap-2 rounded-card bg-amber-500/15 px-4 py-3 text-xs text-amber-300" style={{ border: "0.5px solid rgba(251,191,36,0.4)" }}>
              <IconInfoCircle size={14} className="mt-0.5 shrink-0" />
              <span>Your health factor is low. Borrowing more may increase liquidation risk.</span>
            </div>
          )}

          {tab === "withdraw" && healthFactor != null && healthFactor < 1.2 && (
            <div className="flex items-start gap-2 rounded-card bg-red-500/15 px-4 py-3 text-xs text-red-300" style={{ border: "0.5px solid rgba(239,68,68,0.4)" }}>
              <IconInfoCircle size={14} className="mt-0.5 shrink-0" />
              <span>Withdrawing collateral may reduce your health factor below safe levels.</span>
            </div>
          )}

          {/* Info notice */}
          <div className="glass-accent rounded-card px-4 py-3 text-xs text-primary">
            Gas fees are sponsored by Rivio. Powered by Navi Protocol on Sui.
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={handleAction}
          disabled={busy || !amount || loading || hasInsufficientBalance}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-gradient-to-br from-primary to-primary-dark font-semibold text-white shadow-lg transition-all hover:opacity-90 hover:shadow-xl disabled:opacity-40 active:scale-[0.98]"
        >
          {busy ? <Spinner size={16} /> : null}
          {busy ? "Processing…" : hasInsufficientBalance ? "Insufficient Balance" : ctaLabel[tab]}
        </button>
      </div>

      <FloatingNav />
    </div>
  );
}
