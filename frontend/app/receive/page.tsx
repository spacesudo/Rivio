"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft, IconCopy, IconCheck, IconWallet } from "@tabler/icons-react";

import { getJwt } from "@/lib/enoki";
import { fetchMe } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { BeautifulQR } from "@/components/ui/BeautifulQR";
import { FloatingNav } from "@/components/layout/FloatingNav";

export default function ReceivePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [address, setAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const jwt = await getJwt().catch(() => null);
      if (!jwt) { router.replace("/"); return; }
      const me = await fetchMe(jwt).catch(() => null);
      if (me) setAddress(me.wallet_address);
    })();
  }, [router]);

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast("Address copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const short = address
    ? address.slice(0, 10) + "…" + address.slice(-8)
    : null;

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
        <h1 className="text-headline text-xl text-white">Receive</h1>
      </div>

      <div className="flex flex-1 flex-col items-center px-4 pt-6">
        {!address ? (
          <Spinner size={28} className="mt-10" />
        ) : (
          <>
            {/* Beautiful QR Code */}
            <div className="animate-rise mb-8">
              <BeautifulQR value={address} size={200} />
            </div>

            {/* Address info */}
            <div className="glass-card mb-6 w-full rounded-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <IconWallet size={16} className="text-primary" />
                <p className="text-caption text-neutral">Your Rivio address</p>
              </div>
              <p className="mb-4 font-mono text-sm font-medium text-white text-center">{short}</p>
              
              <button
                onClick={copy}
                className="flex w-full items-center justify-center gap-2 rounded-btn bg-primary px-4 py-3 font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              >
                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                {copied ? "Copied!" : "Copy address"}
              </button>
            </div>

            {/* Asset info */}
            <div className="glass-accent w-full rounded-card px-4 py-3 text-xs text-primary">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-positive" />
                <span>Only send SUI, USDC, or other Sui-native assets to this address.</span>
              </div>
            </div>
          </>
        )}
      </div>

      <FloatingNav />
    </div>
  );
}
