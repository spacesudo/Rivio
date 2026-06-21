"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconArrowsUpDown, IconSettings, IconX } from "@tabler/icons-react";

import { getJwt, signSponsoredBytes } from "@/lib/enoki";
import {
  getSwapTokens,
  sponsorSwap,
  executeSwap,
  getBalance,
  type SwapToken,
  type WalletBalance,
} from "@/lib/api";
import { getSwapQuote, buildSwapKindBytes, type SwapQuote } from "@/lib/aggregator";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { AmountInput } from "@/components/ui/AmountInput";
import { TokenSelector } from "@/components/ui/TokenSelector";
import { FloatingNav } from "@/components/layout/FloatingNav";

const SLIPPAGE_OPTIONS = [
  { label: "0.5%", value: 0.005 },
  { label: "1%", value: 0.01 },
  { label: "2%", value: 0.02 },
];

export default function SwapPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [tokens, setTokens] = useState<SwapToken[]>([]);
  const [fromSym, setFromSym] = useState("USDC");
  const [toSym, setToSym] = useState("SUI");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [slippage, setSlippage] = useState(0.01);
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const jwt = await getJwt().catch(() => null);
      if (!jwt) { router.replace("/"); return; }
      try {
        const [t, b] = await Promise.all([
          getSwapTokens(jwt),
          getBalance(jwt),
        ]);
        setTokens(t.tokens);
        setBalance(b);
      } catch {
        // Keep empty tokens array on error
      } finally {
        setLoadingTokens(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    if (!amount || parseFloat(amount) <= 0 || tokens.length === 0) { setQuote(null); return; }
    quoteTimer.current = setTimeout(async () => {
      setQuoting(true);
      try {
        const jwt = await getJwt();
        if (!jwt) return;
        const fromToken = tokens.find((t) => t.symbol === fromSym);
        const toToken = tokens.find((t) => t.symbol === toSym);
        if (!fromToken || !toToken) return;
        const rawIn = Math.round(parseFloat(amount) * fromToken.scalar);
        const q = await getSwapQuote({ 
          tokenIn: fromToken.type, 
          tokenOut: toToken.type, 
          amountIn: BigInt(rawIn),
          commissionBps: 85,
        });
        setQuote(q);
      } catch {
        setQuote(null);
      } finally {
        setQuoting(false);
      }
    }, 600);
    return () => { if (quoteTimer.current) clearTimeout(quoteTimer.current); };
  }, [amount, fromSym, toSym, tokens]);

  const flip = () => {
    setFromSym(toSym);
    setToSym(fromSym);
    setAmount("");
    setQuote(null);
  };

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) { toast("Enter an amount.", "error"); return; }
    if (!quote) { toast("Invalid quote.", "error"); return; }
    
    // Check balance
    if (balance && fromToken) {
      const currentBalance = fromSym === "USDC" ? parseFloat(balance.usdc) : parseFloat(balance.sui);
      const enteredAmount = parseFloat(amount);
      if (enteredAmount > currentBalance) {
        toast(`Insufficient balance. You have ${currentBalance.toFixed(fromSym === "USDC" ? 2 : 4)} ${fromSym}.`, "error");
        return;
      }
    }
    
    // Check price impact warning
    if (quote.priceImpact && quote.priceImpact > 5) {
      if (!confirm(`High price impact detected (${quote.priceImpact.toFixed(2)}%). Continue anyway?`)) {
        return;
      }
    }

    setBusy(true);
    try {
      const jwt = await getJwt();
      if (!jwt) throw new Error("Not signed in.");
      const fromToken = tokens.find((t) => t.symbol === fromSym)!;
      const toToken = tokens.find((t) => t.symbol === toSym)!;
      const rawIn = Math.round(parseFloat(amount) * fromToken.scalar);
      const me = await import("@/lib/api").then((m) => m.fetchMe(jwt));
      
      const txBytes = await buildSwapKindBytes({ 
        quote, 
        accountAddress: me.wallet_address, 
        slippage,
      });
      
      const minOut = Number((quote.expectedOut * BigInt(Math.round((1 - slippage) * 10_000))) / BigInt(10_000));
      
      const sponsored = await sponsorSwap(jwt, {
        tx_bytes: txBytes,
        from_coin: fromSym,
        to_coin: toSym,
        amount_in: rawIn,
        min_out: minOut,
      });
      
      const signature = await signSponsoredBytes(sponsored.bytes);
      await executeSwap(jwt, sponsored.digest, signature);
      toast("Swap complete!", "success");
      router.push("/dashboard");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Swap failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  const fromToken = tokens.find((t) => t.symbol === fromSym);
  const toToken = tokens.find((t) => t.symbol === toSym);
  const expectedOut = quote ? (Number(quote.expectedOut) / (toToken?.scalar || 1_000_000)).toFixed(toSym === "USDC" ? 2 : 4) : null;
  const rate = expectedOut && amount ? (parseFloat(expectedOut) / parseFloat(amount)).toFixed(4) : null;
  const minReceived = quote && expectedOut 
    ? (parseFloat(expectedOut) * (1 - slippage)).toFixed(toSym === "USDC" ? 2 : 4)
    : null;

  // Balance validation
  const currentBalance = balance && fromToken 
    ? (fromSym === "USDC" ? parseFloat(balance.usdc) : parseFloat(balance.sui))
    : 0;
  const enteredAmount = parseFloat(amount) || 0;
  const hasInsufficientBalance = enteredAmount > currentBalance && currentBalance > 0;

  // Price impact color
  const getPriceImpactColor = (impact: number | null) => {
    if (!impact) return "text-white/60";
    if (impact < 0.5) return "text-emerald-400";
    if (impact < 2) return "text-yellow-400";
    return "text-red-400";
  };

  const getPriceImpactText = (impact: number | null) => {
    if (!impact) return "—";
    return `${impact > 0 ? '+' : ''}${impact.toFixed(2)}%`;
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
        <h1 className="text-headline text-xl text-white">Swap</h1>
        <div className="flex-1" />
        <button
          onClick={() => setShowSlippageSettings(true)}
          className="flex items-center gap-1.5 rounded-pill border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-all hover:bg-white/10"
        >
          <IconSettings size={14} />
          {slippage === 0.005 ? "0.5%" : slippage === 0.01 ? "1%" : slippage === 0.02 ? "2%" : `${(slippage * 100).toFixed(1)}%`}
        </button>
      </div>

      <div className="flex-1 px-4">
        {/* Swap cards */}
        <div className="animate-rise relative space-y-2">
          {/* You pay */}
          <div className="glass-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-white/50">You pay</p>
              {loadingTokens ? (
                <Skeleton className="h-6 w-16 rounded-pill" />
              ) : fromToken ? (
                <TokenSelector tokens={tokens} value={fromSym} onChange={(s) => { setFromSym(s); setQuote(null); }} />
              ) : null}
            </div>
            <AmountInput value={amount} onChange={setAmount} placeholder="0.00" disabled={busy} />
            {balance && fromToken && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-white/40">Available</span>
                <span className={`text-xs font-medium ${
                  hasInsufficientBalance ? "text-red-400" : "text-white/60"
                }`}>
                  {currentBalance.toFixed(fromSym === "USDC" ? 2 : 4)} {fromSym}
                </span>
              </div>
            )}
          </div>

          {/* Flip button */}
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <button
              onClick={flip}
              disabled={busy}
              className="glass-strong flex h-10 w-10 items-center justify-center rounded-full text-primary transition-all hover:bg-white/15 disabled:opacity-50"
            >
              <IconArrowsUpDown size={16} />
            </button>
          </div>

          {/* You receive */}
          <div className="glass-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-white/50">You receive</p>
              {loadingTokens ? (
                <Skeleton className="h-6 w-16 rounded-pill" />
              ) : toToken ? (
                <TokenSelector tokens={tokens} value={toSym} onChange={(s) => { setToSym(s); setQuote(null); }} />
              ) : null}
            </div>
            <div className="flex h-12 items-center">
              {quoting ? (
                <Spinner size={18} />
              ) : expectedOut ? (
                <p className="text-3xl font-semibold text-white">{expectedOut}</p>
              ) : (
                <p className="text-3xl font-semibold text-white/30">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Insufficient balance warning */}
        {hasInsufficientBalance && (
          <div className="glass-card mt-3 border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-start gap-2">
              <span className="text-red-400">⚠️</span>
              <div>
                <p className="text-sm font-medium text-red-400">Insufficient balance</p>
                <p className="mt-1 text-xs text-red-300">
                  You need {enteredAmount.toFixed(fromSym === "USDC" ? 2 : 4)} {fromSym} but only have {currentBalance.toFixed(fromSym === "USDC" ? 2 : 4)} {fromSym}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Swap details */}
        {quote && expectedOut && (
          <div className="glass-card mt-3 space-y-2 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Rate</span>
              <span className="font-medium text-white">
                1 {fromSym} ≈ {rate} {toSym}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Price impact</span>
              <span className={`font-medium ${getPriceImpactColor(quote.priceImpact)}`}>
                {getPriceImpactText(quote.priceImpact)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Slippage tolerance</span>
              <span className="font-medium text-white">{(slippage * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Minimum received</span>
              <span className="font-medium text-white">{minReceived} {toSym}</span>
            </div>
            <div className="divider my-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Network fee</span>
              <span className="font-medium text-emerald-400">Sponsored</span>
            </div>
          </div>
        )}

        {/* Fee notice */}
        <div className="glass-accent mt-2 rounded-btn px-4 py-2.5 text-xs text-primary">
          0.85% fee taken by 7K Protocol • Gas sponsored by Rivio
        </div>

        {/* Swap button */}
        <button
          onClick={handleSwap}
          disabled={busy || !amount || !quote || !expectedOut || hasInsufficientBalance}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-gradient-to-br from-primary to-primary-dark font-semibold text-white shadow-lg transition-all hover:opacity-90 hover:shadow-xl disabled:opacity-40 active:scale-[0.98]"
        >
          {busy ? <Spinner size={16} /> : null}
          {busy ? "Swapping…" : hasInsufficientBalance ? "Insufficient Balance" : quote?.priceImpact && quote.priceImpact > 5 ? "Swap Anyway" : "Swap"}
        </button>
      </div>

      {/* Slippage settings modal */}
      {showSlippageSettings && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60">
          <div className="glass-sheet w-full max-w-shell rounded-t-[28px] p-5 animate-rise">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Slippage tolerance</h2>
              <button
                onClick={() => setShowSlippageSettings(false)}
                className="text-white/50 hover:text-white"
              >
                <IconX size={20} />
              </button>
            </div>
            <p className="mb-4 text-xs text-white/50">
              Your transaction will revert if the price changes unfavorably by more than this percentage.
            </p>
            <div className="space-y-2">
              {SLIPPAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSlippage(opt.value); setShowSlippageSettings(false); }}
                  className={`w-full rounded-btn px-4 py-3 text-left text-sm font-medium transition-all ${
                    slippage === opt.value
                      ? "glass-accent text-primary ring-1 ring-primary"
                      : "glass-card text-white hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <FloatingNav />
    </div>
  );
}
