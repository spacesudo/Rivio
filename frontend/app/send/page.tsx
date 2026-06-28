"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconQrcode } from "@tabler/icons-react";

import { getJwt, signSponsoredBytes } from "@/lib/enoki";
import { getBalance, buildSuiTransfer, buildUsdcTransfer, executeTransfer, type WalletBalance } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { AmountInput } from "@/components/ui/AmountInput";
import { TokenSelector } from "@/components/ui/TokenSelector";
import { FloatingNav } from "@/components/layout/FloatingNav";

const TOKENS = [
  { symbol: "USDC", type: "usdc", scalar: 1_000_000 },
  { symbol: "SUI", type: "sui", scalar: 1_000_000_000 },
];

export default function SendPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [token, setToken] = useState("USDC");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const jwt = await getJwt().catch(() => null);
      if (!jwt) { router.replace("/"); return; }
      const bal = await getBalance(jwt).catch(() => null);
      setBalance(bal);
    })();
  }, [router]);

  const selectedToken = TOKENS.find((t) => t.symbol === token)!;
  const available = balance
    ? token === "USDC"
      ? parseFloat(balance.usdc).toFixed(2)
      : parseFloat(balance.sui).toFixed(4)
    : null;

  const handleSend = async () => {
    if (!recipient || !amount || parseFloat(amount) <= 0) {
      toast("Enter a valid address and amount.", "error");
      return;
    }
    setBusy(true);
    try {
      const jwt = await getJwt();
      if (!jwt) throw new Error("Not signed in.");
      const rawAmount = Math.round(parseFloat(amount) * selectedToken.scalar);
      const sponsored = selectedToken.type === "usdc"
        ? await buildUsdcTransfer(jwt, recipient, rawAmount)
        : await buildSuiTransfer(jwt, recipient, rawAmount);
      const signature = await signSponsoredBytes(sponsored.bytes);
      await executeTransfer(jwt, sponsored.digest, signature);
      toast("Transfer sent!", "success");
      router.push("/dashboard");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Transfer failed.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-bg flex min-h-screen flex-col pb-28">
      <div className="flex items-center gap-3 px-6 pb-4 pt-safe pt-8">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-full glass-strong text-neutral transition-all hover:scale-105"
        >
          <IconArrowLeft size={20} />
        </button>
        <h1 className="text-headline text-xl text-white">Send</h1>
      </div>

      <div className="flex-1 px-6">
        <div className="animate-rise space-y-4">
          <div className="glass-card p-5">
            <label className="text-caption text-neutral mb-3 block">Token</label>
            <div className="flex items-center justify-between">
              <TokenSelector tokens={TOKENS} value={token} onChange={setToken} dropUp />
              {available && (
                <div className="text-right">
                  <p className="text-caption text-neutral">Available</p>
                  <p className="text-body font-semibold text-white">{available} {token}</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-5">
            <label className="text-caption text-neutral mb-3 block">Recipient address</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="flex-1 bg-transparent text-body text-white placeholder:text-neutral/40 outline-none"
              />
              <button
                aria-label="Scan QR code"
                className="flex h-10 w-10 items-center justify-center rounded-xl glass-strong text-primary transition-all hover:scale-105"
              >
                <IconQrcode size={18} />
              </button>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-caption text-neutral">Amount</label>
              {available && (
                <button
                  onClick={() => setAmount(available)}
                  className="text-primary text-xs font-semibold hover:opacity-80 transition-opacity"
                >
                  Use max
                </button>
              )}
            </div>
            <AmountInput value={amount} onChange={setAmount} placeholder="0.00" />
          </div>

          <div className="glass-accent rounded-card px-4 py-3 text-xs text-primary">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-positive" />
              <span>Gas fees are covered by Rivio. You only pay what you send.</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={busy || !recipient || !amount}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-primary font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? <Spinner size={16} /> : null}
          {busy ? "Sending…" : "Send"}
        </button>
      </div>

      <FloatingNav />
    </div>
  );
}
